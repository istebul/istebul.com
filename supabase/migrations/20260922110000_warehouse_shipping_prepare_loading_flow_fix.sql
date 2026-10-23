-- ============================================================
-- WarehouseIQ — Shipping Prepare Loading Flow Fix
--
-- Existing prepare_loading contract is preserved:
--   (request_id, account_id, shipping_id, shipping_package_id)
--
-- Adds the missing operational preparation:
--   1) assign an available/reserved dock when missing
--   2) create the load_package task when missing
--   3) move the package pending -> loading_ready
--
-- start_loading remains unchanged and still requires:
--   - assigned dock
--   - load_package / verify_packages task
-- ============================================================

create or replace function
  public.warehouse_shipping_prepare_loading_write(
    p_request_id uuid,
    p_account_id uuid,
    p_shipping_id uuid,
    p_shipping_package_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_shipping_prepare_loading_write$

declare
  v_user_id uuid := auth.uid();
  v_action text := 'prepare_loading';

  v_payload jsonb;
  v_existing_user_id uuid;
  v_existing_action text;
  v_existing_payload jsonb;
  v_existing_response jsonb;

  v_inserted integer := 0;
  v_updated integer := 0;

  v_shipping public.warehouse_shippings%rowtype;
  v_package public.warehouse_shipping_packages%rowtype;
  v_dock public.warehouse_shipping_docks%rowtype;
  v_task public.warehouse_shipping_tasks%rowtype;

  v_task_count integer := 0;
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

  if p_request_id is null
     or p_account_id is null
     or p_shipping_id is null
     or p_shipping_package_id is null then
    raise exception using
      errcode = '22023',
      message = 'Sevkiyat hazırlama parametreleri zorunludur.';
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
        'Bu firma için sevkiyat paketi hazırlama işlemi yapma yetkiniz bulunmuyor.';
  end if;

  -- ==========================================================
  -- IDEMPOTENCY
  -- ==========================================================

  v_payload :=
    jsonb_build_object(
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
      message = 'Aynı sevkiyat isteği halen işleniyor. Tekrar deneyin.';
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
  )
  on conflict (
    account_id,
    request_id
  )
  do nothing;

  get diagnostics v_inserted = row_count;

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
    where account_id = p_account_id
      and request_id = p_request_id
    for update;

    if not found then
      raise exception using
        errcode = '40001',
        message =
          'Sevkiyat istek kaydı eşzamanlı olarak değişti. Tekrar deneyin.';
    end if;

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
      message = 'Aynı sevkiyat isteği halen işleniyor. Tekrar deneyin.';
  end if;

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
    'released',
    'loading_ready',
    'loading'
  ) then
    raise exception using
      errcode = '22023',
      message =
        'Sevkiyat yükleme hazırlığı için uygun durumda değil.';
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
      message =
        format(
          'Sevkiyat paketi bulunamadı: %s',
          p_shipping_package_id
        );
  end if;

  if v_package.status not in (
    'pending',
    'loading_ready',
    'loading'
  ) then
    raise exception using
      errcode = '22023',
      message =
        'Sevkiyat paketi yükleme hazırlığı için uygun durumda değil.';
  end if;

  -- ==========================================================
  -- DOCK PREPARATION
  --
  -- Do not occupy the dock here.
  -- start_loading owns the available/reserved -> occupied transition.
  -- ==========================================================

  if v_shipping.dock_id is null then

    select *
    into v_dock
    from public.warehouse_shipping_docks
    where account_id = p_account_id
      and warehouse_id = v_shipping.warehouse_id
      and active = true
      and status in (
        'available',
        'reserved'
      )
    order by code
    limit 1
    for update skip locked;

    if not found then
      raise exception using
        errcode = '22023',
        message =
          'Yükleme hazırlığı için uygun rampa bulunamadı.';
    end if;

    update public.warehouse_shippings
    set
      dock_id = v_dock.id,
      updated_at = v_now
    where account_id = p_account_id
      and id = v_shipping.id
      and dock_id is null;

    get diagnostics v_updated = row_count;

    if v_updated <> 1 then
      raise exception using
        errcode = '40001',
        message =
          'Sevkiyat rampası eşzamanlı olarak değişti. Tekrar deneyin.';
    end if;

    v_shipping.dock_id := v_dock.id;

  else

    select *
    into v_dock
    from public.warehouse_shipping_docks
    where account_id = p_account_id
      and warehouse_id = v_shipping.warehouse_id
      and id = v_shipping.dock_id
    for update;

    if not found or not v_dock.active then
      raise exception using
        errcode = '22023',
        message =
          'Atanmış rampa aktif değil.';
    end if;

    if v_shipping.status <> 'loading'
       and v_dock.status not in (
         'available',
         'reserved'
       ) then
      raise exception using
        errcode = '22023',
        message =
          'Atanmış rampa yükleme hazırlığı için uygun değil.';
    end if;

  end if;

  -- ==========================================================
  -- LOAD TASK PREPARATION
  -- ==========================================================

  select count(*)
  into v_task_count
  from public.warehouse_shipping_tasks
  where account_id = p_account_id
    and shipping_id = p_shipping_id
    and shipping_package_id = p_shipping_package_id
    and type = 'load_package'
    and status <> 'cancelled';

  if v_task_count = 0 then

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

  else

    select *
    into v_task
    from public.warehouse_shipping_tasks
    where account_id = p_account_id
      and shipping_id = p_shipping_id
      and shipping_package_id = p_shipping_package_id
      and type = 'load_package'
      and status <> 'cancelled'
    order by created_at asc
    limit 1;

  end if;

  -- ==========================================================
  -- PACKAGE STATE PREPARATION
  -- ==========================================================

  if v_package.status = 'pending' then

    update public.warehouse_shipping_packages
    set
      status = 'loading_ready',
      updated_at = v_now
    where account_id = p_account_id
      and shipping_id = p_shipping_id
      and id = p_shipping_package_id
      and status = 'pending';

    get diagnostics v_updated = row_count;

    if v_updated <> 1 then
      raise exception using
        errcode = '40001',
        message =
          'Sevkiyat paketi eşzamanlı olarak değişti.';
    end if;

    v_package.status := 'loading_ready';

  end if;

  -- ==========================================================
  -- RESPONSE
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
      p_shipping_id,
      'shippingPackageId',
      p_shipping_package_id,
      'shippingTaskId',
      v_task.id,
      'dockId',
      v_shipping.dock_id,
      'status',
      v_package.status
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

  get diagnostics v_updated = row_count;

  if v_updated <> 1 then
    raise exception using
      errcode = '40001',
      message =
        'Sevkiyat istek sonucu eşzamanlı olarak değişti.';
  end if;

  return v_result;

end;

$warehouse_shipping_prepare_loading_write$;
revoke all on function
  public.warehouse_shipping_prepare_loading_write(
    uuid,
    uuid,
    uuid,
    uuid
  )
from public, anon, authenticated;
grant execute on function
  public.warehouse_shipping_prepare_loading_write(
    uuid,
    uuid,
    uuid,
    uuid
  )
to authenticated, service_role;
