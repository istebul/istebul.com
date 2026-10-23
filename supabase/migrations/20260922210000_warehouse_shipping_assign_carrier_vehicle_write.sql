-- ============================================================
-- WarehouseIQ — Shipping carrier + vehicle assignment
--
-- Contract:
-- - authenticated caller JWT / auth.uid()
-- - account role authorization
-- - account + request_id idempotency
-- - Shipping row FOR UPDATE
-- - active carrier required
-- - active vehicle required
-- - vehicle must belong to selected carrier
-- - existing service level must remain carrier-compatible
-- - assignment allowed only before loading starts
-- - no direct browser table UPDATE grant
-- ============================================================

alter table public.warehouse_shipping_write_requests
drop constraint if exists warehouse_shipping_write_requests_action_check;
alter table public.warehouse_shipping_write_requests
add constraint warehouse_shipping_write_requests_action_check
check (
  action in (
    'create_from_packing',
    'prepare_loading',
    'start_loading',
    'confirm_item_load',
    'load_package',
    'complete_loading',
    'create_manifest',
    'generate_manifest',
    'approve_manifest',
    'submit_manifest',
    'create_asn',
    'generate_asn',
    'send_asn',
    'acknowledge_asn',
    'reject_asn',
    'cancel_asn',
    'dispatch',
    'record_proof_of_delivery',
    'create_exception',
    'resolve_exception',
    'accept_manifest',
    'release',
    'create_task',
    'assign_carrier_vehicle'
  )
);
create or replace function public.warehouse_shipping_assign_carrier_vehicle_write(
  p_request_id uuid,
  p_account_id uuid,
  p_shipping_id uuid,
  p_carrier_id uuid,
  p_vehicle_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_shipping_assign_carrier_vehicle_write$
declare
  v_user_id uuid := auth.uid();
  v_action constant text := 'assign_carrier_vehicle';

  v_payload jsonb;
  v_existing_user_id uuid;
  v_existing_action text;
  v_existing_payload jsonb;
  v_existing_response jsonb;

  v_shipping public.warehouse_shippings%rowtype;
  v_carrier public.warehouse_shipping_carriers%rowtype;
  v_vehicle public.warehouse_shipping_vehicles%rowtype;

  v_now timestamptz := now();
  v_result jsonb;
begin
  -- ==========================================================
  -- AUTH / INPUT
  -- ==========================================================

  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'WarehouseIQ oturumu gerekli.';
  end if;

  if p_request_id is null then
    raise exception using
      errcode = '22023',
      message = 'Idempotency-Key kimliği zorunludur.';
  end if;

  if p_account_id is null then
    raise exception using
      errcode = '22023',
      message = 'Firma kimliği zorunludur.';
  end if;

  if p_shipping_id is null then
    raise exception using
      errcode = '22023',
      message = 'Sevkiyat kimliği zorunludur.';
  end if;

  if p_carrier_id is null then
    raise exception using
      errcode = '22023',
      message = 'Taşıyıcı kimliği zorunludur.';
  end if;

  if p_vehicle_id is null then
    raise exception using
      errcode = '22023',
      message = 'Araç kimliği zorunludur.';
  end if;

  if not public.warehouse_has_account_role(
    p_account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager',
      'supervisor',
      'inventory_controller',
      'picker',
      'operator'
    ]::text[]
  ) then
    raise exception using
      errcode = '42501',
      message =
        'Bu firma için taşıyıcı ve araç atama yetkiniz bulunmuyor.';
  end if;

  -- ==========================================================
  -- IDEMPOTENCY
  -- ==========================================================

  v_payload := jsonb_build_object(
    'shippingId', p_shipping_id,
    'carrierId', p_carrier_id,
    'vehicleId', p_vehicle_id
  );

  select
    user_id,
    action,
    request_payload,
    response_payload
  into
    v_existing_user_id,
    v_existing_action,
    v_existing_payload,
    v_existing_response
  from public.warehouse_shipping_write_requests
  where account_id = p_account_id
    and request_id = p_request_id
  for update;

  if found then
    if v_existing_user_id <> v_user_id then
      raise exception using
        errcode = '42501',
        message = 'Bu istek kimliği başka bir kullanıcıya aittir.';
    end if;

    if v_existing_action <> v_action
      or v_existing_payload <> v_payload then
      raise exception using
        errcode = '23505',
        message =
          'Aynı istek kimliği farklı bir sevkiyat işlemi için kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception using
      errcode = '40001',
      message =
        'Aynı sevkiyat atama isteği halen işleniyor. Tekrar deneyin.';
  end if;

  insert into public.warehouse_shipping_write_requests (
    account_id,
    request_id,
    user_id,
    action,
    request_payload
  )
  values (
    p_account_id,
    p_request_id,
    v_user_id,
    v_action,
    v_payload
  );

  -- ==========================================================
  -- SHIPPING LOCK
  -- ==========================================================

  select *
  into v_shipping
  from public.warehouse_shippings
  where account_id = p_account_id
    and id = p_shipping_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Sevkiyat kaydı bulunamadı.';
  end if;

  if v_shipping.status not in (
    'draft',
    'planned',
    'released',
    'loading_ready'
  ) then
    raise exception using
      errcode = '22023',
      message =
        'Taşıyıcı ve araç yalnızca yükleme başlamadan önce atanabilir.';
  end if;

  -- ==========================================================
  -- CARRIER VALIDATION
  -- ==========================================================

  select *
  into v_carrier
  from public.warehouse_shipping_carriers
  where account_id = p_account_id
    and id = p_carrier_id
    and active = true;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'Aktif taşıyıcı bulunamadı.';
  end if;

  -- ==========================================================
  -- VEHICLE VALIDATION
  -- ==========================================================

  select *
  into v_vehicle
  from public.warehouse_shipping_vehicles
  where account_id = p_account_id
    and id = p_vehicle_id
    and active = true;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'Aktif araç bulunamadı.';
  end if;

  if v_vehicle.carrier_id is distinct from p_carrier_id then
    raise exception using
      errcode = '22023',
      message =
        'Seçilen araç seçilen taşıyıcıya bağlı değildir.';
  end if;

  -- ==========================================================
  -- SERVICE LEVEL COMPATIBILITY
  -- ==========================================================

  if v_shipping.service_level_id is not null then
    if not exists (
      select 1
      from public.warehouse_shipping_service_levels
      where account_id = p_account_id
        and id = v_shipping.service_level_id
        and carrier_id = p_carrier_id
    ) then
      raise exception using
        errcode = '22023',
        message =
          'Mevcut hizmet seviyesi seçilen taşıyıcıyla uyumlu değildir.';
    end if;
  end if;

  -- ==========================================================
  -- ATOMIC ASSIGNMENT
  -- ==========================================================

  update public.warehouse_shippings
  set
    carrier_id = p_carrier_id,
    vehicle_id = p_vehicle_id,
    updated_at = v_now
  where account_id = p_account_id
    and id = v_shipping.id
    and status in (
      'draft',
      'planned',
      'released',
      'loading_ready'
    )
  returning *
  into v_shipping;

  if not found then
    raise exception using
      errcode = '40001',
      message =
        'Sevkiyat durumu başka bir işlem tarafından değiştirildi.';
  end if;

  -- ==========================================================
  -- RESPONSE
  -- ==========================================================

  v_result := jsonb_build_object(
    'ok', true,
    'action', v_action,
    'requestId', p_request_id,
    'shippingId', v_shipping.id,
    'shippingNumber', v_shipping.shipping_number,
    'carrierId', v_shipping.carrier_id,
    'vehicleId', v_shipping.vehicle_id,
    'status', v_shipping.status,
    'updatedAt', v_shipping.updated_at
  );

  update public.warehouse_shipping_write_requests
  set
    response_payload = v_result,
    completed_at = v_now
  where account_id = p_account_id
    and request_id = p_request_id
    and user_id = v_user_id
    and action = v_action
    and response_payload is null;

  if not found then
    raise exception using
      errcode = '40001',
      message = 'Sevkiyat idempotency sonucu kaydedilemedi.';
  end if;

  return v_result;
end;
$warehouse_shipping_assign_carrier_vehicle_write$;
revoke all on function
  public.warehouse_shipping_assign_carrier_vehicle_write(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid
  )
from public;
revoke all on function
  public.warehouse_shipping_assign_carrier_vehicle_write(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid
  )
from anon;
revoke all on function
  public.warehouse_shipping_assign_carrier_vehicle_write(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid
  )
from authenticated;
grant execute on function
  public.warehouse_shipping_assign_carrier_vehicle_write(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid
  )
to authenticated;
revoke all on function
  public.warehouse_shipping_assign_carrier_vehicle_write(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid
  )
from service_role;
grant execute on function
  public.warehouse_shipping_assign_carrier_vehicle_write(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid
  )
to service_role;
