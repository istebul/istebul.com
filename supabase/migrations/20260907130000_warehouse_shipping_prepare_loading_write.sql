-- ============================================================
-- WarehouseIQ — Shipping Prepare Loading
-- Atomic pending -> loading_ready package preparation.
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
  v_task_count integer := 0;
  v_now timestamptz := now();
  v_result jsonb;
begin
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

  get diagnostics
    v_inserted = row_count;

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

  select count(*)
  into v_task_count
  from public.warehouse_shipping_tasks
  where account_id = p_account_id
    and shipping_id = p_shipping_id
    and shipping_package_id = p_shipping_package_id
    and type = 'load_package'
    and status <> 'cancelled';

  if v_task_count = 0 then
    raise exception using
      errcode = '22023',
      message = 'Sevkiyat paketi için yükleme görevi bulunamadı.';
  end if;

  if v_package.status = 'pending' then
    update public.warehouse_shipping_packages
    set
      status = 'loading_ready',
      updated_at = v_now
    where account_id = p_account_id
      and shipping_id = p_shipping_id
      and id = p_shipping_package_id
      and status = 'pending';

    get diagnostics
      v_updated = row_count;

    if v_updated <> 1 then
      raise exception using
        errcode = '40001',
        message =
          'Sevkiyat paketi eşzamanlı olarak değişti.';
    end if;
  elsif v_package.status not in (
    'loading_ready',
    'loading'
  ) then
    raise exception using
      errcode = '22023',
      message =
        'Sevkiyat paketi yükleme hazırlığı için uygun durumda değil.';
  end if;

  select status
  into v_package.status
  from public.warehouse_shipping_packages
  where account_id = p_account_id
    and shipping_id = p_shipping_id
    and id = p_shipping_package_id;

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

  get diagnostics
    v_updated = row_count;

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
from public;
revoke all on function
  public.warehouse_shipping_prepare_loading_write(
    uuid,
    uuid,
    uuid,
    uuid
  )
from anon;
grant execute on function
  public.warehouse_shipping_prepare_loading_write(
    uuid,
    uuid,
    uuid,
    uuid
  )
to authenticated;
