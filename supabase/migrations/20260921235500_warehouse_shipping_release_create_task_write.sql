-- ============================================================
-- WarehouseIQ — Shipping lifecycle foundation
--
-- Adds:
--   - release
--   - create_task (load_package)
--
-- Lifecycle:
--   draft/planned
--       -> release
--   released
--       -> create_task
--   load_package task = pending
--
-- No inventory mutation.
-- No Packing mutation.
-- No Picking mutation.
-- ============================================================


-- ============================================================
-- Extend Shipping write-ledger action allowlist
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
    'create_task'
  )
);
-- ============================================================
-- SHIPPING RELEASE
-- ============================================================

create or replace function public.warehouse_shipping_release_write(
  p_request_id uuid,
  p_account_id uuid,
  p_shipping_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_shipping_release_write$
declare
  v_user_id uuid := auth.uid();
  v_action constant text := 'release';

  v_payload jsonb;
  v_existing_user_id uuid;
  v_existing_action text;
  v_existing_payload jsonb;
  v_existing_response jsonb;

  v_shipping public.warehouse_shippings%rowtype;
  v_item_count integer := 0;
  v_invalid_item_count integer := 0;

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
        'Bu firma için sevkiyatı operasyona açma yetkiniz bulunmuyor.';
  end if;


  -- ==========================================================
  -- IDEMPOTENCY
  -- ==========================================================

  v_payload := jsonb_build_object(
    'shippingId',
    p_shipping_id
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
        message =
          'Bu istek kimliği başka bir kullanıcıya aittir.';
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
        'Aynı sevkiyat isteği halen işleniyor. Tekrar deneyin.';
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

  if v_shipping.status not in ('draft', 'planned') then
    raise exception using
      errcode = '22023',
      message =
        'Yalnızca taslak veya planlanmış sevkiyat operasyona açılabilir.';
  end if;


  -- ==========================================================
  -- SHIPPING ITEM GATES
  -- ==========================================================

  select count(*)
  into v_item_count
  from public.warehouse_shipping_items
  where account_id = p_account_id
    and shipping_id = v_shipping.id;

  if v_item_count = 0 then
    raise exception using
      errcode = '22023',
      message =
        'Sevkiyat operasyona açılmadan önce en az bir ürün satırı bulunmalıdır.';
  end if;

  select count(*)
  into v_invalid_item_count
  from public.warehouse_shipping_items
  where account_id = p_account_id
    and shipping_id = v_shipping.id
    and (
      requested_quantity <= 0
      or remaining_quantity <= 0
    );

  if v_invalid_item_count > 0 then
    raise exception using
      errcode = '22023',
      message =
        'Geçersiz miktar içeren sevkiyat satırı operasyona açılamaz.';
  end if;


  -- ==========================================================
  -- ATOMIC LIFECYCLE MUTATION
  -- ==========================================================

  update public.warehouse_shippings
  set
    status = 'released',
    released_at = v_now,
    updated_at = v_now
  where account_id = p_account_id
    and id = v_shipping.id
    and status in ('draft', 'planned')
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
    'status', v_shipping.status,
    'releasedAt', v_shipping.released_at
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
      message =
        'Sevkiyat idempotency sonucu kaydedilemedi.';
  end if;

  return v_result;
end;
$warehouse_shipping_release_write$;
-- ============================================================
-- SHIPPING CREATE TASK
--
-- One task per shipping package.
-- Task type is always load_package.
-- ============================================================

create or replace function public.warehouse_shipping_create_task_write(
  p_request_id uuid,
  p_account_id uuid,
  p_shipping_id uuid,
  p_shipping_package_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_shipping_create_task_write$
declare
  v_user_id uuid := auth.uid();
  v_action constant text := 'create_task';

  v_payload jsonb;
  v_existing_user_id uuid;
  v_existing_action text;
  v_existing_payload jsonb;
  v_existing_response jsonb;

  v_shipping public.warehouse_shippings%rowtype;
  v_package public.warehouse_shipping_packages%rowtype;
  v_task public.warehouse_shipping_tasks%rowtype;

  v_existing_task_count integer := 0;

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

  if p_shipping_package_id is null then
    raise exception using
      errcode = '22023',
      message = 'Sevkiyat paketi kimliği zorunludur.';
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
        'Bu firma için sevkiyat görevi oluşturma yetkiniz bulunmuyor.';
  end if;


  -- ==========================================================
  -- IDEMPOTENCY
  -- ==========================================================

  v_payload := jsonb_build_object(
    'shippingId',
    p_shipping_id,
    'shippingPackageId',
    p_shipping_package_id
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
        message =
          'Bu istek kimliği başka bir kullanıcıya aittir.';
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
        'Aynı sevkiyat isteği halen işleniyor. Tekrar deneyin.';
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

  if v_shipping.status <> 'released' then
    raise exception using
      errcode = '22023',
      message =
        'Sevkiyat görevi yalnızca operasyona açılmış sevkiyat için oluşturulabilir.';
  end if;


  -- ==========================================================
  -- SHIPPING PACKAGE LOCK
  -- ==========================================================

  select *
  into v_package
  from public.warehouse_shipping_packages
  where account_id = p_account_id
    and shipping_id = p_shipping_id
    and id = p_shipping_package_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Sevkiyat paketi bulunamadı.';
  end if;

  if v_package.status = 'cancelled' then
    raise exception using
      errcode = '22023',
      message =
        'İptal edilmiş sevkiyat paketi için görev oluşturulamaz.';
  end if;


  -- ==========================================================
  -- DUPLICATE ACTIVE TASK GATE
  -- ==========================================================

  select count(*)
  into v_existing_task_count
  from public.warehouse_shipping_tasks
  where account_id = p_account_id
    and shipping_id = p_shipping_id
    and shipping_package_id = p_shipping_package_id
    and type = 'load_package'
    and status <> 'cancelled';

  if v_existing_task_count > 0 then
    raise exception using
      errcode = '23505',
      message =
        'Bu sevkiyat paketi için aktif yükleme görevi zaten bulunmaktadır.';
  end if;


  -- ==========================================================
  -- CREATE LOAD TASK
  -- ==========================================================

  insert into public.warehouse_shipping_tasks (
    account_id,
    shipping_id,
    shipping_item_id,
    shipping_package_id,
    warehouse_id,
    shipping_location_id,
    dock_id,
    vehicle_id,
    type,
    status,
    assigned_user_id,
    assigned_equipment_id,
    priority,
    sequence,
    planned_at,
    notes,
    created_by
  )
  values (
    p_account_id,
    p_shipping_id,
    null,
    p_shipping_package_id,
    v_shipping.warehouse_id,
    v_shipping.shipping_location_id,
    v_shipping.dock_id,
    v_shipping.vehicle_id,
    'load_package',
    'pending',
    null,
    null,
    v_shipping.priority,
    v_package.loading_sequence,
    v_shipping.planned_at,
    null,
    v_user_id
  )
  returning *
  into v_task;


  -- ==========================================================
  -- RESPONSE
  -- ==========================================================

  v_result := jsonb_build_object(
    'ok', true,
    'action', v_action,
    'requestId', p_request_id,
    'shippingId', v_shipping.id,
    'shippingPackageId', v_package.id,
    'shippingTaskId', v_task.id,
    'type', v_task.type,
    'status', v_task.status,
    'sequence', v_task.sequence,
    'priority', v_task.priority
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
      message =
        'Sevkiyat görev idempotency sonucu kaydedilemedi.';
  end if;

  return v_result;
end;
$warehouse_shipping_create_task_write$;
-- ============================================================
-- FUNCTION ACL
-- ============================================================

revoke all on function
  public.warehouse_shipping_release_write(
    uuid,
    uuid,
    uuid
  )
from public, anon, authenticated;
grant execute on function
  public.warehouse_shipping_release_write(
    uuid,
    uuid,
    uuid
  )
to authenticated, service_role;
revoke all on function
  public.warehouse_shipping_create_task_write(
    uuid,
    uuid,
    uuid,
    uuid
  )
from public, anon, authenticated;
grant execute on function
  public.warehouse_shipping_create_task_write(
    uuid,
    uuid,
    uuid,
    uuid
  )
to authenticated, service_role;
