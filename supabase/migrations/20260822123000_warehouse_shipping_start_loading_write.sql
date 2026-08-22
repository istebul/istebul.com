-- ============================================================
-- WarehouseIQ — A9.3.1
-- Atomic Shipping Start Loading
--
-- Contract:
-- - authenticated caller JWT / auth.uid()
-- - account role authorization
-- - account + request_id idempotency
-- - Shipping parent FOR UPDATE
-- - source-domain parity: released OR loading_ready
-- - en az bir load_package veya verify_packages görevi
-- - assigned dock FOR UPDATE
-- - dock active + available/reserved
-- - dock -> occupied
-- - Shipping -> loading
-- - loading_started_at server timestamp
-- - item/package/task operational mutation yok
-- - inventory / Picking / Packing mutation yok
-- ============================================================


-- ============================================================
-- Extend the existing Shipping write-ledger action allowlist
-- ============================================================

alter table
  public.warehouse_shipping_write_requests
drop constraint if exists
  warehouse_shipping_write_requests_action_check;

alter table
  public.warehouse_shipping_write_requests
add constraint
  warehouse_shipping_write_requests_action_check
check (
  action in (
    'create_from_packing',
    'start_loading'
  )
);


-- ============================================================
-- Atomic start-loading transition
-- ============================================================

create or replace function
  public.warehouse_shipping_start_loading_write(
    p_request_id uuid,
    p_account_id uuid,
    p_shipping_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_shipping_start_loading_write$
declare
  v_user_id uuid :=
    auth.uid();

  v_action constant text :=
    'start_loading';

  v_payload jsonb;

  v_existing_user_id uuid;
  v_existing_action text;
  v_existing_payload jsonb;
  v_existing_response jsonb;

  v_inserted integer := 0;

  v_shipping
    public.warehouse_shippings%rowtype;

  v_dock
    public.warehouse_shipping_docks%rowtype;

  v_loading_task_count integer := 0;

  v_shipping_updated integer := 0;
  v_dock_updated integer := 0;

  v_now timestamptz :=
    now();

  v_result jsonb;
begin
  -- ==========================================================
  -- AUTH / INPUT
  -- ==========================================================

  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message =
        'WarehouseIQ oturumu gerekli.';
  end if;

  if p_request_id is null then
    raise exception using
      errcode = '22023',
      message =
        'Idempotency-Key kimliği zorunludur.';
  end if;

  if p_account_id is null then
    raise exception using
      errcode = '22023',
      message =
        'Firma kimliği zorunludur.';
  end if;

  if p_shipping_id is null then
    raise exception using
      errcode = '22023',
      message =
        'Sevkiyat kimliği zorunludur.';
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
        'Bu firma için sevkiyat yüklemesini başlatma yetkiniz bulunmuyor.';
  end if;


  -- ==========================================================
  -- IDEMPOTENCY
  -- ==========================================================

  v_payload :=
    jsonb_build_object(
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
  where account_id =
      p_account_id
    and request_id =
      p_request_id
  for update;

  if found then
    if v_existing_user_id <>
      v_user_id then

      raise exception using
        errcode = '42501',
        message =
          'Bu istek kimliği başka bir kullanıcıya aittir.';
    end if;

    if v_existing_action <>
        v_action
      or v_existing_payload <>
        v_payload then

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
    v_inserted =
      row_count;

  if v_inserted = 0 then
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
    where account_id =
        p_account_id
      and request_id =
        p_request_id
    for update;

    if v_existing_user_id <>
      v_user_id then

      raise exception using
        errcode = '42501',
        message =
          'Bu istek kimliği başka bir kullanıcıya aittir.';
    end if;

    if v_existing_action <>
        v_action
      or v_existing_payload <>
        v_payload then

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


  -- ==========================================================
  -- SHIPPING PARENT LOCK
  -- ==========================================================

  select *
  into v_shipping
  from public.warehouse_shippings
  where account_id =
      p_account_id
    and id =
      p_shipping_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Sevkiyat kaydı bulunamadı.';
  end if;

  if v_shipping.status not in (
    'released',
    'loading_ready'
  ) then
    raise exception using
      errcode = '22023',
      message =
        'Yükleme yalnızca sevkiyata açılmış veya yüklemeye hazır operasyonda başlatılabilir.';
  end if;


  -- ==========================================================
  -- LOADING TASK LOCK
  --
  -- ShippingService parity:
  -- task status burada ayrıca daraltılmaz.
  -- ==========================================================

  perform 1
  from public.warehouse_shipping_tasks
  where account_id =
      p_account_id
    and shipping_id =
      p_shipping_id
    and type in (
      'load_package',
      'verify_packages'
    )
  for update;

  get diagnostics
    v_loading_task_count =
      row_count;

  if v_loading_task_count = 0 then
    raise exception using
      errcode = '22023',
      message =
        'Yükleme başlamadan önce en az bir paket yükleme veya paket doğrulama görevi oluşturulmalıdır.';
  end if;


  -- ==========================================================
  -- ASSIGNED DOCK LOCK
  -- ==========================================================

  if v_shipping.dock_id is null then
    raise exception using
      errcode = '22023',
      message =
        'Yükleme başlamadan önce rampa atanmalıdır.';
  end if;

  select *
  into v_dock
  from public.warehouse_shipping_docks
  where account_id =
      p_account_id
    and warehouse_id =
      v_shipping.warehouse_id
    and id =
      v_shipping.dock_id
  for update;

  if not found
    or not v_dock.active
    or v_dock.status not in (
      'available',
      'reserved'
    ) then

    raise exception using
      errcode = '22023',
      message =
        'Atanmış rampa yükleme için uygun değil.';
  end if;


  -- ==========================================================
  -- ATOMIC LIFECYCLE MUTATION
  -- ==========================================================

  update public.warehouse_shipping_docks
  set
    status =
      'occupied',
    updated_at =
      v_now
  where account_id =
      p_account_id
    and warehouse_id =
      v_shipping.warehouse_id
    and id =
      v_shipping.dock_id
    and active
    and status in (
      'available',
      'reserved'
    );

  get diagnostics
    v_dock_updated =
      row_count;

  if v_dock_updated <> 1 then
    raise exception using
      errcode = '40001',
      message =
        'Sevkiyat rampası başka bir işlem tarafından değiştirildi. Tekrar deneyin.';
  end if;

  update public.warehouse_shippings
  set
    status =
      'loading',
    loading_started_at =
      v_now,
    updated_at =
      v_now
  where account_id =
      p_account_id
    and id =
      p_shipping_id
    and status in (
      'released',
      'loading_ready'
    );

  get diagnostics
    v_shipping_updated =
      row_count;

  if v_shipping_updated <> 1 then
    raise exception using
      errcode = '40001',
      message =
        'Sevkiyat durumu başka bir işlem tarafından değiştirildi. Tekrar deneyin.';
  end if;


  -- ==========================================================
  -- STABLE RESPONSE
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
        v_shipping.id,
      'shippingNumber',
        v_shipping.shipping_number,
      'warehouseId',
        v_shipping.warehouse_id,
      'dockId',
        v_shipping.dock_id,
      'status',
        'loading',
      'loadingStartedAt',
        v_now,
      'dockStatus',
        'occupied'
    );

  update public.warehouse_shipping_write_requests
  set
    response_payload =
      v_result,
    completed_at =
      v_now
  where account_id =
      p_account_id
    and request_id =
      p_request_id
    and user_id =
      v_user_id
    and action =
      v_action
    and response_payload is null;

  if not found then
    raise exception using
      errcode = '40001',
      message =
        'Sevkiyat yükleme isteği sonucu kaydedilemedi. Tekrar deneyin.';
  end if;

  return v_result;
end;
$warehouse_shipping_start_loading_write$;


-- ============================================================
-- Narrow execute ACL
-- ============================================================

revoke all on function
  public.warehouse_shipping_start_loading_write(
    uuid,
    uuid,
    uuid
  )
from public;

revoke all on function
  public.warehouse_shipping_start_loading_write(
    uuid,
    uuid,
    uuid
  )
from anon;

revoke all on function
  public.warehouse_shipping_start_loading_write(
    uuid,
    uuid,
    uuid
  )
from authenticated;

grant execute on function
  public.warehouse_shipping_start_loading_write(
    uuid,
    uuid,
    uuid
  )
to authenticated;
