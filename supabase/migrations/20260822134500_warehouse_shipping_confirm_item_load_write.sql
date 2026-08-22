-- ============================================================
-- WarehouseIQ — A9.3.2
-- Atomic Shipping Confirm Item Load
--
-- Source parity:
-- - Shipping.status = loading
-- - Shipping item same account + Shipping
-- - processed total <= current remaining_quantity
-- - optional Shipping package same account + Shipping
-- - loaded / damaged / missing quantities are additive
-- - remaining quantity recomputed from requested quantity
-- - notes change only when normalized notes are provided
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
-- - warehouse_shipping_items
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
    'confirm_item_load'
  )
);

create or replace function
  public.warehouse_shipping_confirm_item_load_write(
    p_request_id uuid,
    p_account_id uuid,
    p_shipping_id uuid,
    p_shipping_item_id uuid,
    p_shipping_package_id uuid,
    p_quantity numeric,
    p_damaged_quantity numeric,
    p_missing_quantity numeric,
    p_loaded_by text,
    p_notes text
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_shipping_confirm_item_load_write$
declare
  v_user_id uuid :=
    auth.uid();

  v_action constant text :=
    'confirm_item_load';

  v_loaded_by text :=
    nullif(
      btrim(p_loaded_by),
      ''
    );

  v_notes text :=
    nullif(
      btrim(p_notes),
      ''
    );

  v_damaged_quantity numeric :=
    coalesce(
      p_damaged_quantity,
      0
    );

  v_missing_quantity numeric :=
    coalesce(
      p_missing_quantity,
      0
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

  v_item
    public.warehouse_shipping_items%rowtype;

  v_package
    public.warehouse_shipping_packages%rowtype;

  v_updated_item
    public.warehouse_shipping_items%rowtype;

  v_processed_quantity numeric;
  v_loaded_quantity numeric;
  v_new_damaged_quantity numeric;
  v_new_missing_quantity numeric;
  v_remaining_quantity numeric;

  v_now timestamptz :=
    now();

  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message =
        'Sevkiyat satırı yükleme onayı için oturum açılmalıdır.';
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

  if p_shipping_item_id is null then
    raise exception using
      errcode = '22023',
      message =
        'Sevkiyat satırı kimliği zorunludur.';
  end if;

  if p_quantity is null then
    raise exception using
      errcode = '22023',
      message =
        'Yüklenen miktar zorunludur.';
  end if;

  if p_quantity = 'NaN'::numeric
    or v_damaged_quantity = 'NaN'::numeric
    or v_missing_quantity = 'NaN'::numeric then

    raise exception using
      errcode = '22023',
      message =
        'Yükleme miktarları geçerli sayı olmalıdır.';
  end if;

  if p_quantity < 0 then
    raise exception using
      errcode = '22023',
      message =
        'Yüklenen miktar negatif olamaz.';
  end if;

  if v_damaged_quantity < 0 then
    raise exception using
      errcode = '22023',
      message =
        'Hasarlı miktar negatif olamaz.';
  end if;

  if v_missing_quantity < 0 then
    raise exception using
      errcode = '22023',
      message =
        'Eksik miktar negatif olamaz.';
  end if;

  if p_quantity = 0
    and v_damaged_quantity = 0
    and v_missing_quantity = 0 then

    raise exception using
      errcode = '22023',
      message =
        'Yüklenen, hasarlı veya eksik miktarlardan en az biri sıfırdan büyük olmalıdır.';
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
        'Bu firma için sevkiyat yükleme işlemi yapma yetkiniz bulunmuyor.';
  end if;

  v_payload :=
    jsonb_strip_nulls(
      jsonb_build_object(
        'shippingId',
          p_shipping_id,
        'shippingItemId',
          p_shipping_item_id,
        'shippingPackageId',
          p_shipping_package_id,
        'quantity',
          p_quantity,
        'damagedQuantity',
          v_damaged_quantity,
        'missingQuantity',
          v_missing_quantity,
        'loadedBy',
          v_loaded_by,
        'notes',
          v_notes
      )
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
        'Sevkiyat satırı yalnızca yükleme devam ederken onaylanabilir.';
  end if;

  select *
  into v_item
  from public.warehouse_shipping_items
  where account_id =
      p_account_id
    and shipping_id =
      p_shipping_id
    and id =
      p_shipping_item_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Sevkiyat satırı bulunamadı.';
  end if;

  v_processed_quantity :=
    p_quantity
    + v_damaged_quantity
    + v_missing_quantity;

  if v_processed_quantity >
    v_item.remaining_quantity then

    raise exception using
      errcode = '22023',
      message =
        format(
          'Yüklenen, hasarlı ve eksik toplam miktar kalan miktarı aşamaz. Kalan miktar: %s',
          v_item.remaining_quantity
        );
  end if;

  if p_shipping_package_id is not null then
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
          'Yükleme paket kaydı sevkiyata ait değil.';
    end if;
  end if;

  v_loaded_quantity :=
    v_item.loaded_quantity
    + p_quantity;

  v_new_damaged_quantity :=
    v_item.damaged_quantity
    + v_damaged_quantity;

  v_new_missing_quantity :=
    v_item.missing_quantity
    + v_missing_quantity;

  v_remaining_quantity :=
    greatest(
      0,
      v_item.requested_quantity
        - v_loaded_quantity
        - v_new_damaged_quantity
        - v_new_missing_quantity
    );

  update
    public.warehouse_shipping_items
  set
    loaded_quantity =
      v_loaded_quantity,
    damaged_quantity =
      v_new_damaged_quantity,
    missing_quantity =
      v_new_missing_quantity,
    remaining_quantity =
      v_remaining_quantity,
    updated_at =
      v_now,
    notes =
      case
        when v_notes is not null
          then v_notes
        else notes
      end
  where account_id =
      p_account_id
    and shipping_id =
      p_shipping_id
    and id =
      p_shipping_item_id
  returning *
  into v_updated_item;

  get diagnostics
    v_updated =
      row_count;

  if v_updated <> 1 then
    raise exception using
      errcode = '40001',
      message =
        'Sevkiyat satırı yükleme onayı eşzamanlı olarak değişti. Tekrar deneyin.';
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
      'shippingItemId',
        p_shipping_item_id,
      'shippingPackageId',
        p_shipping_package_id,
      'loadedQuantity',
        v_updated_item.loaded_quantity,
      'damagedQuantity',
        v_updated_item.damaged_quantity,
      'missingQuantity',
        v_updated_item.missing_quantity,
      'remainingQuantity',
        v_updated_item.remaining_quantity,
      'notes',
        v_updated_item.notes,
      'updatedAt',
        v_updated_item.updated_at
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
$warehouse_shipping_confirm_item_load_write$;

revoke all on function
  public.warehouse_shipping_confirm_item_load_write(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    numeric,
    numeric,
    numeric,
    text,
    text
  )
from public;

revoke all on function
  public.warehouse_shipping_confirm_item_load_write(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    numeric,
    numeric,
    numeric,
    text,
    text
  )
from anon;

revoke all on function
  public.warehouse_shipping_confirm_item_load_write(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    numeric,
    numeric,
    numeric,
    text,
    text
  )
from authenticated;

grant execute on function
  public.warehouse_shipping_confirm_item_load_write(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    numeric,
    numeric,
    numeric,
    text,
    text
  )
to authenticated;
