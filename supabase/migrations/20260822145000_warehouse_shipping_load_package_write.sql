-- ============================================================
-- WarehouseIQ — A9.3.3
-- Atomic Shipping Load Package Write
--
-- Source parity:
-- - Shipping.status = loading
-- - package belongs to same account + Shipping
-- - package.status = loading_ready OR loading
-- - loadedBy is required and normalized
-- - package.status -> loaded
-- - loaded_by / loaded_at / updated_at written atomically
--
-- Security:
-- - caller JWT / auth.uid()
-- - account role fail closed
-- - account + request_id idempotency
-- - SECURITY DEFINER + explicit search_path
-- - authenticated EXECUTE only
--
-- Mutation surface:
-- - warehouse_shipping_write_requests
-- - warehouse_shipping_packages
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
    'start_loading',
    'confirm_item_load',
    'load_package'
  )
);

create or replace function
  public.warehouse_shipping_load_package_write(
    p_request_id uuid,
    p_account_id uuid,
    p_shipping_id uuid,
    p_shipping_package_id uuid,
    p_loaded_by text
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_shipping_load_package_write$
declare
  v_user_id uuid :=
    auth.uid();

  v_action constant text :=
    'load_package';

  v_loaded_by text :=
    nullif(
      btrim(p_loaded_by),
      ''
    );

  v_payload jsonb;

  v_existing_user_id uuid;
  v_existing_action text;
  v_existing_payload jsonb;
  v_existing_response jsonb;

  v_inserted integer := 0;
  v_updated integer := 0;

  v_shipping
    public.warehouse_shippings%rowtype;

  v_package
    public.warehouse_shipping_packages%rowtype;

  v_updated_package
    public.warehouse_shipping_packages%rowtype;

  v_now timestamptz :=
    now();

  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message =
        'Sevkiyat paketi yükleme işlemi için oturum açılmalıdır.';
  end if;

  if p_request_id is null then
    raise exception using
      errcode = '22023',
      message =
        'İstek kimliği zorunludur.';
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

  if p_shipping_package_id is null then
    raise exception using
      errcode = '22023',
      message =
        'Sevkiyat paketi kimliği zorunludur.';
  end if;

  if v_loaded_by is null then
    raise exception using
      errcode = '22023',
      message =
        'Yüklemeyi yapan kullanıcı zorunludur.';
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
        'Bu firma için sevkiyat paketi yükleme işlemi yapma yetkiniz bulunmuyor.';
  end if;

  v_payload :=
    jsonb_build_object(
      'shippingId',
        p_shipping_id,
      'shippingPackageId',
        p_shipping_package_id,
      'loadedBy',
        v_loaded_by
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

    if not found then
      raise exception using
        errcode = '40001',
        message =
          'Sevkiyat istek kaydı eşzamanlı olarak değişti. Tekrar deneyin.';
    end if;

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

  if v_shipping.status <>
    'loading' then

    raise exception using
      errcode = '22023',
      message =
        'Paket yalnızca yükleme devam ederken araca yüklenebilir.';
  end if;

  select *
  into v_package
  from public.warehouse_shipping_packages
  where account_id =
      p_account_id
    and shipping_id =
      p_shipping_id
    and id =
      p_shipping_package_id
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
    'loading_ready',
    'loading'
  ) then
    raise exception using
      errcode = '22023',
      message =
        'Paket yüklemeye hazır durumda değil.';
  end if;

  update
    public.warehouse_shipping_packages
  set
    status =
      'loaded',
    loaded_by =
      v_loaded_by,
    loaded_at =
      v_now,
    updated_at =
      v_now
  where account_id =
      p_account_id
    and shipping_id =
      p_shipping_id
    and id =
      p_shipping_package_id
  returning *
  into v_updated_package;

  get diagnostics
    v_updated =
      row_count;

  if v_updated <> 1 then
    raise exception using
      errcode = '40001',
      message =
        'Sevkiyat paketi yükleme işlemi eşzamanlı olarak değişti. Tekrar deneyin.';
  end if;

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
        v_updated_package.status,
      'loadedBy',
        v_updated_package.loaded_by,
      'loadedAt',
        v_updated_package.loaded_at,
      'updatedAt',
        v_updated_package.updated_at
    );

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
      p_request_id
    and user_id =
      v_user_id
    and action =
      v_action
    and response_payload is null;

  get diagnostics
    v_updated =
      row_count;

  if v_updated <> 1 then
    raise exception using
      errcode = '40001',
      message =
        'Sevkiyat istek sonucu eşzamanlı olarak değişti. Tekrar deneyin.';
  end if;

  return v_result;
end;
$warehouse_shipping_load_package_write$;

revoke all on function
  public.warehouse_shipping_load_package_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text
  )
from public;

revoke all on function
  public.warehouse_shipping_load_package_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text
  )
from anon;

revoke all on function
  public.warehouse_shipping_load_package_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text
  )
from authenticated;

grant execute on function
  public.warehouse_shipping_load_package_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text
  )
to authenticated;
