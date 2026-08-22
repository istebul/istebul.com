-- ============================================================
-- WarehouseIQ — A9.3.5
-- Atomic Shipping Create Manifest
--
-- Contract:
-- - authenticated caller JWT / auth.uid()
-- - exact account role authorization
-- - account + request_id idempotency
-- - Shipping parent account scoped FOR UPDATE
-- - yalnız Shipping.status = loaded
-- - existing manifest set account/shipping scoped FOR UPDATE
-- - cancelled/rejected dışındaki manifest aktif kabul edilir
-- - manifest snapshot carrier/service-level/vehicle Shipping parenttan gelir
-- - notes optional normalized text
-- - actor created_by yalnız auth.uid()
-- - manifest başlangıcı draft / package_count 0 / packages []
-- - manifest numarası server-only sequence ile MNF-YYYYMMDD-000001
-- - Shipping parent veya downstream tablo mutation yok
-- ============================================================


-- ============================================================
-- Extend Shipping write ledger action allowlist
-- ============================================================

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
      'create_manifest'
    )
  );


-- ============================================================
-- Server-side Shipping manifest number sequence
-- ============================================================

create sequence if not exists
  public.warehouse_shipping_manifest_number_seq
  as bigint
  start with 1
  increment by 1
  no minvalue
  no maxvalue
  cache 1;

revoke all
on sequence public.warehouse_shipping_manifest_number_seq
from public;

revoke all
on sequence public.warehouse_shipping_manifest_number_seq
from anon;

revoke all
on sequence public.warehouse_shipping_manifest_number_seq
from authenticated;


-- ============================================================
-- Atomic create-manifest RPC
-- ============================================================

create or replace function
  public.warehouse_shipping_create_manifest_write(
    p_request_id uuid,
    p_account_id uuid,
    p_shipping_id uuid,
    p_notes text default null
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_shipping_create_manifest_write$
declare
  v_user_id uuid := auth.uid();

  v_action constant text :=
    'create_manifest';

  v_payload jsonb;

  v_existing_user_id uuid;
  v_existing_action text;
  v_existing_payload jsonb;
  v_existing_response jsonb;

  v_inserted integer := 0;

  v_normalized_notes text;

  v_shipping
    public.warehouse_shippings%rowtype;

  v_manifest
    public.warehouse_shipping_manifests%rowtype;

  v_manifest_number text;
  v_now timestamptz;

  v_result jsonb;
begin
  -- ==========================================================
  -- Required request identity
  -- ==========================================================

  if v_user_id is null then
    raise exception
      using
        errcode = '42501',
        message =
          'Oturum açmış kullanıcı bulunamadı.';
  end if;

  if p_request_id is null then
    raise exception
      using
        errcode = '22023',
        message =
          'İstek kimliği zorunludur.';
  end if;

  if p_account_id is null then
    raise exception
      using
        errcode = '22023',
        message =
          'Firma kimliği zorunludur.';
  end if;

  if p_shipping_id is null then
    raise exception
      using
        errcode = '22023',
        message =
          'Sevkiyat kimliği zorunludur.';
  end if;


  -- ==========================================================
  -- Exact account authorization
  -- ==========================================================

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
    raise exception
      using
        errcode = '42501',
        message =
          'Bu sevkiyat işlemi için yetkiniz bulunmuyor.';
  end if;


  -- ==========================================================
  -- Canonical optional input
  -- ==========================================================

  v_normalized_notes :=
    nullif(
      btrim(
        coalesce(
          p_notes,
          ''
        )
      ),
      ''
    );

  v_payload :=
    jsonb_build_object(
      'shippingId',
        p_shipping_id,
      'notes',
        v_normalized_notes
    );


  -- ==========================================================
  -- Existing idempotency request
  -- ==========================================================

  select
    request.user_id,
    request.action,
    request.request_payload,
    request.response_payload
  into
    v_existing_user_id,
    v_existing_action,
    v_existing_payload,
    v_existing_response
  from public.warehouse_shipping_write_requests
    as request
  where request.account_id =
      p_account_id
    and request.request_id =
      p_request_id
  for update;

  if found then
    if v_existing_user_id <>
       v_user_id then
      raise exception
        using
          errcode = '42501',
          message =
            'Aynı istek kimliği farklı bir kullanıcı tarafından kullanılamaz.';
    end if;

    if v_existing_action <>
         v_action
       or v_existing_payload <>
         v_payload then
      raise exception
        using
          errcode = '23505',
          message =
            'Aynı istek kimliği farklı bir sevkiyat işlemi için kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception
      using
        errcode = '40001',
        message =
          'Aynı sevkiyat isteği halen işleniyor. Tekrar deneyin.';
  end if;


  -- ==========================================================
  -- Claim idempotency request
  -- ==========================================================

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
  do nothing;

  get diagnostics
    v_inserted = row_count;

  if v_inserted = 0 then
    select
      request.user_id,
      request.action,
      request.request_payload,
      request.response_payload
    into
      v_existing_user_id,
      v_existing_action,
      v_existing_payload,
      v_existing_response
    from public.warehouse_shipping_write_requests
      as request
    where request.account_id =
        p_account_id
      and request.request_id =
        p_request_id
    for update;

    if not found then
      raise exception
        using
          errcode = '40001',
          message =
            'Aynı sevkiyat isteği halen işleniyor. Tekrar deneyin.';
    end if;

    if v_existing_user_id <>
       v_user_id then
      raise exception
        using
          errcode = '42501',
          message =
            'Aynı istek kimliği farklı bir kullanıcı tarafından kullanılamaz.';
    end if;

    if v_existing_action <>
         v_action
       or v_existing_payload <>
         v_payload then
      raise exception
        using
          errcode = '23505',
          message =
            'Aynı istek kimliği farklı bir sevkiyat işlemi için kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception
      using
        errcode = '40001',
        message =
          'Aynı sevkiyat isteği halen işleniyor. Tekrar deneyin.';
  end if;


  -- ==========================================================
  -- Shipping parent lock
  -- ==========================================================

  select
    shipping.*
  into
    v_shipping
  from public.warehouse_shippings
    as shipping
  where shipping.account_id =
      p_account_id
    and shipping.id =
      p_shipping_id
  for update;

  if not found then
    raise exception
      using
        errcode = '22023',
        message =
          format(
            'Sevkiyat kaydı bulunamadı: %s',
            p_shipping_id
          );
  end if;

  if v_shipping.status <>
     'loaded' then
    raise exception
      using
        errcode = '22023',
        message =
          'Manifest yalnızca yüklemesi tamamlanmış sevkiyat için oluşturulabilir.';
  end if;


  -- ==========================================================
  -- Existing manifest set lock
  --
  -- Shipping parent lock serializes zero-row create races.
  -- ==========================================================

  perform
    1
  from public.warehouse_shipping_manifests
  where account_id =
      p_account_id
    and shipping_id =
      p_shipping_id
  for update;

  if exists (
    select
      1
    from public.warehouse_shipping_manifests
    where account_id =
        p_account_id
      and shipping_id =
        p_shipping_id
      and status not in (
        'cancelled',
        'rejected'
      )
  ) then
    raise exception
      using
        errcode = '22023',
        message =
          'Bu sevkiyat için aktif bir manifest zaten bulunmaktadır.';
  end if;


  -- ==========================================================
  -- Server timestamp + manifest number
  -- ==========================================================

  v_now :=
    now();

  loop
    v_manifest_number :=
      'MNF-' ||
      to_char(
        v_now at time zone 'UTC',
        'YYYYMMDD'
      ) ||
      '-' ||
      lpad(
        nextval(
          'public.warehouse_shipping_manifest_number_seq'::regclass
        )::text,
        6,
        '0'
      );

    exit when not exists (
      select
        1
      from public.warehouse_shipping_manifests
      where account_id =
          p_account_id
        and manifest_number =
          v_manifest_number
    );
  end loop;


  -- ==========================================================
  -- Manifest create
  -- ==========================================================

  insert into
    public.warehouse_shipping_manifests (
      id,
      account_id,
      shipping_id,
      manifest_number,
      status,
      carrier_id,
      service_level_id,
      vehicle_id,
      package_count,
      packages,
      notes,
      created_by,
      created_at,
      updated_at
    )
  values (
    gen_random_uuid(),
    p_account_id,
    v_shipping.id,
    v_manifest_number,
    'draft',
    v_shipping.carrier_id,
    v_shipping.service_level_id,
    v_shipping.vehicle_id,
    0,
    '[]'::jsonb,
    v_normalized_notes,
    v_user_id,
    v_now,
    v_now
  )
  returning *
  into v_manifest;


  -- ==========================================================
  -- Stable response
  -- ==========================================================

  v_result :=
    jsonb_build_object(
      'ok',
        true,
      'action',
        v_action,
      'requestId',
        p_request_id,
      'shippingId',
        v_manifest.shipping_id,
      'manifestId',
        v_manifest.id,
      'manifestNumber',
        v_manifest.manifest_number,
      'status',
        v_manifest.status,
      'packageCount',
        v_manifest.package_count,
      'packages',
        v_manifest.packages,
      'carrierId',
        v_manifest.carrier_id,
      'serviceLevelId',
        v_manifest.service_level_id,
      'vehicleId',
        v_manifest.vehicle_id,
      'notes',
        v_manifest.notes,
      'createdBy',
        v_manifest.created_by,
      'createdAt',
        v_manifest.created_at,
      'updatedAt',
        v_manifest.updated_at
    );


  -- ==========================================================
  -- Complete idempotency ledger
  -- ==========================================================

  update
    public.warehouse_shipping_write_requests
  set
    response_payload =
      v_result,
    completed_at =
      v_now
  where account_id =
      p_account_id
    and request_id =
      p_request_id;

  return v_result;
end;
$warehouse_shipping_create_manifest_write$;


-- ============================================================
-- RPC ACL
-- ============================================================

revoke all
on function
  public.warehouse_shipping_create_manifest_write(
    uuid,
    uuid,
    uuid,
    text
  )
from public;

revoke all
on function
  public.warehouse_shipping_create_manifest_write(
    uuid,
    uuid,
    uuid,
    text
  )
from anon;

revoke all
on function
  public.warehouse_shipping_create_manifest_write(
    uuid,
    uuid,
    uuid,
    text
  )
from authenticated;

grant execute
on function
  public.warehouse_shipping_create_manifest_write(
    uuid,
    uuid,
    uuid,
    text
  )
to authenticated;
