-- WarehouseIQ A9.3.8
-- Shipping manifest submit write RPC.
--
-- Source parity:
--   ShippingService.submitManifest
--   -> ShippingManifestService.submit
--
-- Domain mutation:
--   warehouse_shipping_manifests only
--
-- Security/idempotency mutation:
--   warehouse_shipping_write_requests

alter table public.warehouse_shipping_write_requests
  drop constraint if exists
    warehouse_shipping_write_requests_action_check;

alter table public.warehouse_shipping_write_requests
  add constraint
    warehouse_shipping_write_requests_action_check
  check (
    action in (
      'create_from_packing',
      'start_loading',
      'confirm_item_load',
      'load_package',
      'complete_loading',
      'create_manifest',
      'generate_manifest',
      'approve_manifest',
      'submit_manifest'
    )
  );

drop function if exists
  public.warehouse_shipping_submit_manifest_write(
    uuid,
    uuid,
    uuid,
    uuid
  );

create or replace function
  public.warehouse_shipping_submit_manifest_write(
    p_request_id uuid,
    p_account_id uuid,
    p_shipping_id uuid,
    p_manifest_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_shipping_submit_manifest_write$
declare
  v_user_id uuid := auth.uid();

  v_action constant text :=
    'submit_manifest';

  v_payload jsonb;

  v_existing
    public.warehouse_shipping_write_requests%rowtype;

  v_claimed_request_id uuid;

  v_shipping_exists boolean := false;

  v_manifest record;

  v_carrier record;

  v_now timestamptz;

  v_response jsonb;
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message =
        'Bu işlem için oturum açmanız gerekiyor.';
  end if;

  if p_request_id is null then
    raise exception using
      errcode = '22004',
      message =
        'İstek kimliği boş bırakılamaz.';
  end if;

  if p_account_id is null then
    raise exception using
      errcode = '22004',
      message =
        'Firma kimliği boş bırakılamaz.';
  end if;

  if p_shipping_id is null then
    raise exception using
      errcode = '22004',
      message =
        'Sevkiyat kimliği boş bırakılamaz.';
  end if;

  if p_manifest_id is null then
    raise exception using
      errcode = '22004',
      message =
        'Manifest kimliği boş bırakılamaz.';
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
        'Bu sevkiyat işlemi için yetkiniz bulunmuyor.';
  end if;

  v_payload :=
    jsonb_build_object(
      'shippingId',
      p_shipping_id,
      'manifestId',
      p_manifest_id
    );

  select
    request.*
  into
    v_existing
  from
    public.warehouse_shipping_write_requests
      as request
  where
    request.account_id =
      p_account_id
    and request.request_id =
      p_request_id
  for update;

  if found then
    if v_existing.user_id <> v_user_id then
      raise exception using
        errcode = '42501',
        message =
          'Bu istek kimliği başka bir kullanıcıya aittir.';
    end if;

    if
      v_existing.action <> v_action
      or v_existing.request_payload
        is distinct from v_payload
    then
      raise exception using
        errcode = '23505',
        message =
          'Aynı istek kimliği farklı bir sevkiyat işlemi için kullanılamaz.';
    end if;

    if
      v_existing.completed_at is null
      or v_existing.response_payload is null
    then
      raise exception using
        errcode = '40001',
        message =
          'Aynı sevkiyat isteği halen işleniyor. Tekrar deneyin.';
    end if;

    return v_existing.response_payload;
  end if;

  insert into
    public.warehouse_shipping_write_requests (
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
  )
  on conflict (
    account_id,
    request_id
  )
  do nothing
  returning
    request_id
  into
    v_claimed_request_id;

  if v_claimed_request_id is null then
    select
      request.*
    into
      v_existing
    from
      public.warehouse_shipping_write_requests
        as request
    where
      request.account_id =
        p_account_id
      and request.request_id =
        p_request_id
    for update;

    if not found then
      raise exception using
        errcode = '40001',
        message =
          'Aynı sevkiyat isteği halen işleniyor. Tekrar deneyin.';
    end if;

    if v_existing.user_id <> v_user_id then
      raise exception using
        errcode = '42501',
        message =
          'Bu istek kimliği başka bir kullanıcıya aittir.';
    end if;

    if
      v_existing.action <> v_action
      or v_existing.request_payload
        is distinct from v_payload
    then
      raise exception using
        errcode = '23505',
        message =
          'Aynı istek kimliği farklı bir sevkiyat işlemi için kullanılamaz.';
    end if;

    if
      v_existing.completed_at is null
      or v_existing.response_payload is null
    then
      raise exception using
        errcode = '40001',
        message =
          'Aynı sevkiyat isteği halen işleniyor. Tekrar deneyin.';
    end if;

    return v_existing.response_payload;
  end if;

  select
    true
  into
    v_shipping_exists
  from
    public.warehouse_shippings
      as shipping
  where
    shipping.account_id =
      p_account_id
    and shipping.id =
      p_shipping_id;

  if not coalesce(
    v_shipping_exists,
    false
  ) then
    raise exception using
      errcode = '22023',
      message =
        'Sevkiyat kaydı bulunamadı: '
        || p_shipping_id::text;
  end if;

  select
    manifest.id,
    manifest.account_id,
    manifest.shipping_id,
    manifest.manifest_number,
    manifest.status,
    manifest.carrier_id,
    manifest.service_level_id,
    manifest.vehicle_id,
    manifest.package_count,
    manifest.total_weight,
    manifest.total_volume,
    manifest.weight_unit,
    manifest.volume_unit,
    manifest.packages,
    manifest.generated_by,
    manifest.generated_at,
    manifest.approved_by,
    manifest.approved_at,
    manifest.submitted_at,
    manifest.accepted_at,
    manifest.rejection_reason,
    manifest.notes,
    manifest.created_by,
    manifest.created_at,
    manifest.updated_at
  into
    v_manifest
  from
    public.warehouse_shipping_manifests
      as manifest
  where
    manifest.account_id =
      p_account_id
    and manifest.shipping_id =
      p_shipping_id
    and manifest.id =
      p_manifest_id
  for update;

  if not found then
    raise exception using
      errcode = '22023',
      message =
        'Manifest bulunamadı: '
        || p_manifest_id::text;
  end if;

  if v_manifest.status <> 'approved' then
    raise exception using
      errcode = '22023',
      message =
        'Yalnızca onaylanmış manifest taşıyıcıya gönderilebilir.';
  end if;

  if v_manifest.carrier_id is null then
    raise exception using
      errcode = '22023',
      message =
        'Manifest gönderimi için taşıyıcı atanmalıdır.';
  end if;

  select
    carrier.id,
    carrier.active,
    carrier.manifest_supported
  into
    v_carrier
  from
    public.warehouse_shipping_carriers
      as carrier
  where
    carrier.account_id =
      p_account_id
    and carrier.id =
      v_manifest.carrier_id;

  if not found then
    raise exception using
      errcode = '22023',
      message =
        'Manifest taşıyıcısı bulunamadı.';
  end if;

  if not v_carrier.active then
    raise exception using
      errcode = '22023',
      message =
        'Pasif taşıyıcıya manifest gönderilemez.';
  end if;

  if not v_carrier.manifest_supported then
    raise exception using
      errcode = '22023',
      message =
        'Seçilen taşıyıcı manifest gönderimini desteklemiyor.';
  end if;

  v_now := clock_timestamp();

  update
    public.warehouse_shipping_manifests
  set
    status =
      'submitted',
    submitted_at =
      v_now,
    updated_at =
      v_now
  where
    account_id =
      p_account_id
    and shipping_id =
      p_shipping_id
    and id =
      p_manifest_id
  returning
    manifest_number,
    status,
    carrier_id,
    submitted_at,
    updated_at
  into
    v_manifest.manifest_number,
    v_manifest.status,
    v_manifest.carrier_id,
    v_manifest.submitted_at,
    v_manifest.updated_at;

  if not found then
    raise exception using
      errcode = '40001',
      message =
        'Manifest gönderim sırasında güncellenemedi.';
  end if;

  v_response :=
    jsonb_build_object(
      'ok',
      true,
      'action',
      v_action,
      'requestId',
      p_request_id,
      'shippingId',
      p_shipping_id,
      'manifestId',
      p_manifest_id,
      'manifestNumber',
      v_manifest.manifest_number,
      'status',
      v_manifest.status,
      'carrierId',
      v_manifest.carrier_id,
      'submittedAt',
      v_manifest.submitted_at,
      'updatedAt',
      v_manifest.updated_at
    );

  update
    public.warehouse_shipping_write_requests
  set
    response_payload =
      v_response,
    completed_at =
      v_now
  where
    account_id =
      p_account_id
    and request_id =
      p_request_id
    and user_id =
      v_user_id
    and action =
      v_action;

  if not found then
    raise exception using
      errcode = '40001',
      message =
        'Sevkiyat istek kaydı tamamlanamadı.';
  end if;

  return v_response;
end;
$warehouse_shipping_submit_manifest_write$;

revoke all
on function
  public.warehouse_shipping_submit_manifest_write(
    uuid,
    uuid,
    uuid,
    uuid
  )
from public;

revoke all
on function
  public.warehouse_shipping_submit_manifest_write(
    uuid,
    uuid,
    uuid,
    uuid
  )
from anon;

revoke all
on function
  public.warehouse_shipping_submit_manifest_write(
    uuid,
    uuid,
    uuid,
    uuid
  )
from authenticated;

grant execute
on function
  public.warehouse_shipping_submit_manifest_write(
    uuid,
    uuid,
    uuid,
    uuid
  )
to authenticated;
