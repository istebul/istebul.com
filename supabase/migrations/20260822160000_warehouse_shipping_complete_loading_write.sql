-- ============================================================
-- WarehouseIQ — A9.3.4
-- Atomic Shipping Complete Loading Write
--
-- Source parity:
-- - Shipping.status = loading
-- - every Shipping item remaining_quantity = 0
-- - every Shipping package status = loaded
-- - Shipping.status -> loaded
-- - loaded_at / updated_at use the same server timestamp
--
-- Concurrency:
-- - parent Shipping FOR UPDATE
-- - Shipping item set FOR UPDATE
-- - Shipping package set FOR UPDATE
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
-- - warehouse_shippings
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
    'load_package',
    'complete_loading'
  )
);

create or replace function
  public.warehouse_shipping_complete_loading_write(
    p_request_id uuid,
    p_account_id uuid,
    p_shipping_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_shipping_complete_loading_write$
declare
  v_user_id uuid :=
    auth.uid();

  v_action constant text :=
    'complete_loading';

  v_payload jsonb;

  v_existing_user_id uuid;
  v_existing_action text;
  v_existing_payload jsonb;
  v_existing_response jsonb;

  v_inserted integer := 0;
  v_updated integer := 0;

  v_shipping
    public.warehouse_shippings%rowtype;

  v_updated_shipping
    public.warehouse_shippings%rowtype;

  v_now timestamptz;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message =
        'Sevkiyat yüklemesini tamamlama işlemi için oturum açılmalıdır.';
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
        'Bu firma için sevkiyat yüklemesini tamamlama yetkiniz bulunmuyor.';
  end if;

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
        'Yalnızca yükleme devam eden sevkiyatın yüklemesi tamamlanabilir.';
  end if;

  perform
    1
  from public.warehouse_shipping_items
  where account_id =
      p_account_id
    and shipping_id =
      p_shipping_id
  for update;

  if exists (
    select
      1
    from public.warehouse_shipping_items
    where account_id =
        p_account_id
      and shipping_id =
        p_shipping_id
      and remaining_quantity > 0
  ) then
    raise exception using
      errcode = '22023',
      message =
        'Tüm sevkiyat satırları sonuçlandırılmadan yükleme tamamlanamaz.';
  end if;

  perform
    1
  from public.warehouse_shipping_packages
  where account_id =
      p_account_id
    and shipping_id =
      p_shipping_id
  for update;

  if exists (
    select
      1
    from public.warehouse_shipping_packages
    where account_id =
        p_account_id
      and shipping_id =
        p_shipping_id
      and status <> 'loaded'
  ) then
    raise exception using
      errcode = '22023',
      message =
        'Tüm sevkiyat paketleri yüklenmeden araç yüklemesi tamamlanamaz.';
  end if;

  v_now :=
    now();

  update
    public.warehouse_shippings
  set
    status =
      'loaded',
    loaded_at =
      v_now,
    updated_at =
      v_now
  where account_id =
      p_account_id
    and id =
      p_shipping_id
  returning *
  into v_updated_shipping;

  get diagnostics
    v_updated =
      row_count;

  if v_updated <> 1 then
    raise exception using
      errcode = '40001',
      message =
        'Sevkiyat yüklemesini tamamlama işlemi eşzamanlı olarak değişti. Tekrar deneyin.';
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
      'status',
        v_updated_shipping.status,
      'loadedAt',
        v_updated_shipping.loaded_at,
      'updatedAt',
        v_updated_shipping.updated_at
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
$warehouse_shipping_complete_loading_write$;

revoke all on function
  public.warehouse_shipping_complete_loading_write(
    uuid,
    uuid,
    uuid
  )
from public;

revoke all on function
  public.warehouse_shipping_complete_loading_write(
    uuid,
    uuid,
    uuid
  )
from anon;

revoke all on function
  public.warehouse_shipping_complete_loading_write(
    uuid,
    uuid,
    uuid
  )
from authenticated;

grant execute on function
  public.warehouse_shipping_complete_loading_write(
    uuid,
    uuid,
    uuid
  )
to authenticated;
