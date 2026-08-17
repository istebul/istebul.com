-- ============================================================
-- WarehouseIQ — A8.2.9
-- Atomic Add Packing Package Item
--
-- Domain parity:
-- - package var olmalı
-- - sealed / labelled / shipping_ready / cancelled package kapalı
-- - Packing item var olmalı
-- - productId / skuId / unit Packing item ile eşleşmeli
-- - quantity > 0
-- - opsiyonel weight / volume >= 0
-- - package calculated weight/volume yeniden hesaplanır
-- - container capacity doğrulanır
-- - package -> in_progress
--
-- ÖNEMLİ:
-- Bu operasyon Packing item quantity accounting yapmaz.
-- confirm_item ile aynı operasyon değildir.
--
-- Inventory / Picking mutation YOK.
-- ============================================================

create or replace function
  public.warehouse_packing_add_package_item_write(
    p_request_id uuid,
    p_account_id uuid,
    p_packing_id uuid,
    p_package_id uuid,
    p_packing_item_id uuid,
    p_product_id uuid,
    p_quantity numeric,
    p_unit text,
    p_sku_id uuid default null,
    p_tracking jsonb default null,
    p_weight numeric default null,
    p_volume numeric default null
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_packing_add_package_item_write$
declare
  v_user_id uuid :=
    auth.uid();

  v_action constant text :=
    'add_package_item';

  v_quantity numeric(18,6) :=
    p_quantity;

  v_unit text :=
    nullif(
      btrim(
        coalesce(
          p_unit,
          ''
        )
      ),
      ''
    );

  v_tracking jsonb :=
    p_tracking;

  v_weight numeric(18,6) :=
    p_weight;

  v_volume numeric(18,6) :=
    p_volume;

  v_payload jsonb;

  v_existing_user_id uuid;
  v_existing_action text;
  v_existing_payload jsonb;
  v_existing_response jsonb;

  v_inserted integer := 0;

  v_packing public.warehouse_packings%rowtype;
  v_package public.warehouse_packing_packages%rowtype;
  v_item public.warehouse_packing_items%rowtype;
  v_container public.warehouse_packing_containers%rowtype;

  v_package_item
    public.warehouse_packing_package_items%rowtype;

  v_calculated_weight numeric(18,6);
  v_calculated_volume numeric(18,6);

  v_maximum_weight_kg numeric;
  v_empty_weight_kg numeric;
  v_usable_weight_kg numeric;

  v_usable_volume_cm3 numeric;
  v_dimension_multiplier numeric;

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

  if p_request_id is null
    or p_account_id is null
    or p_packing_id is null
    or p_package_id is null
    or p_packing_item_id is null
    or p_product_id is null then

    raise exception using
      errcode = '22023',
      message =
        'İstek, firma, paketleme, paket, satır ve ürün kimlikleri zorunludur.';
  end if;

  if v_quantity is null
    or v_quantity <= 0 then

    raise exception using
      errcode = '22023',
      message =
        'Paket miktarı sıfırdan büyük olmalıdır.';
  end if;

  if v_unit is null then
    raise exception using
      errcode = '22023',
      message =
        'Ölçü birimi boş bırakılamaz.';
  end if;

  if v_tracking is not null
    and jsonb_typeof(v_tracking) <> 'object' then

    raise exception using
      errcode = '22023',
      message =
        'Paket ürün takip bilgisi JSON nesnesi olmalıdır.';
  end if;

  if v_weight is not null
    and v_weight < 0 then

    raise exception using
      errcode = '22023',
      message =
        'Paket satırı ağırlığı negatif olamaz.';
  end if;

  if v_volume is not null
    and v_volume < 0 then

    raise exception using
      errcode = '22023',
      message =
        'Paket satırı hacmi negatif olamaz.';
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
        'Bu firma için paket içeriği yazma yetkiniz bulunmuyor.';
  end if;

  -- ==========================================================
  -- IDEMPOTENCY
  -- ==========================================================

  v_payload :=
    jsonb_strip_nulls(
      jsonb_build_object(
        'packingId',
          p_packing_id,
        'packageId',
          p_package_id,
        'packingItemId',
          p_packing_item_id,
        'productId',
          p_product_id,
        'skuId',
          p_sku_id,
        'quantity',
          v_quantity,
        'unit',
          v_unit,
        'tracking',
          v_tracking,
        'weight',
          v_weight,
        'volume',
          v_volume
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
  from public.warehouse_packing_write_requests
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
          'Aynı istek kimliği farklı bir paketleme işlemi için kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception using
      errcode = '40001',
      message =
        'Aynı istek halen işleniyor. Tekrar deneyin.';
  end if;

  insert into public.warehouse_packing_write_requests (
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
    from public.warehouse_packing_write_requests
    where account_id = p_account_id
      and request_id = p_request_id
    for update;

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
          'Aynı istek kimliği farklı bir paketleme işlemi için kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception using
      errcode = '40001',
      message =
        'Aynı istek halen işleniyor. Tekrar deneyin.';
  end if;

  -- ==========================================================
  -- PARENT SCOPE
  --
  -- Domain addPackageItem parent status için ek gate koymaz.
  -- ==========================================================

  select *
  into v_packing
  from public.warehouse_packings
  where account_id = p_account_id
    and id = p_packing_id
  for share;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Paketleme kaydı bulunamadı.';
  end if;

  -- ==========================================================
  -- PACKAGE LOCK
  -- ==========================================================

  select *
  into v_package
  from public.warehouse_packing_packages
  where account_id = p_account_id
    and packing_id = v_packing.id
    and id = p_package_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Ürün eklenecek paket bulunamadı.';
  end if;

  if v_package.status in (
    'sealed',
    'labelled',
    'shipping_ready',
    'cancelled'
  ) then
    raise exception using
      errcode = '22023',
      message =
        'Kapalı veya iptal edilmiş pakete ürün eklenemez.';
  end if;

  -- ==========================================================
  -- PACKING ITEM LOCK / DOMAIN MATCH
  -- ==========================================================

  select *
  into v_item
  from public.warehouse_packing_items
  where account_id = p_account_id
    and packing_id = v_packing.id
    and id = p_packing_item_id
  for share;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Paketleme satırı bulunamadı.';
  end if;

  if v_item.product_id <> p_product_id
    or v_item.sku_id is distinct from p_sku_id
    or v_item.unit <> v_unit then

    raise exception using
      errcode = '22023',
      message =
        'Paket ürün bilgileri paketleme satırıyla uyuşmamaktadır.';
  end if;

  -- ==========================================================
  -- CONTAINER
  -- ==========================================================

  select *
  into v_container
  from public.warehouse_packing_containers
  where account_id = p_account_id
    and id = v_package.container_id
  for share;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Paket ambalaj kaydı bulunamadı.';
  end if;

  -- ==========================================================
  -- CALCULATED PACKAGE TOTALS
  --
  -- AddPackingPackageItemInput.weight / volume satır toplamıdır.
  -- Domain mevcut package-item toplamlarına doğrudan ekler.
  -- ==========================================================

  select
    coalesce(
      sum(weight),
      0
    ) + coalesce(
      v_weight,
      0
    ),
    coalesce(
      sum(volume),
      0
    ) + coalesce(
      v_volume,
      0
    )
  into
    v_calculated_weight,
    v_calculated_volume
  from public.warehouse_packing_package_items
  where account_id = p_account_id
    and packing_id = v_packing.id
    and package_id = v_package.id;

  -- ==========================================================
  -- CONTAINER CAPACITY PARITY
  -- ==========================================================

  if v_container.maximum_weight is not null
    and v_container.weight_unit is not null then

    v_maximum_weight_kg :=
      case
        when v_container.weight_unit = 'g'
          then v_container.maximum_weight / 1000
        else v_container.maximum_weight
      end;

    v_empty_weight_kg :=
      case
        when v_container.empty_weight is null
          then 0
        when v_container.weight_unit = 'g'
          then v_container.empty_weight / 1000
        else v_container.empty_weight
      end;

    v_usable_weight_kg :=
      greatest(
        0,
        v_maximum_weight_kg -
          v_empty_weight_kg
      );
  end if;

  if v_container.maximum_volume is not null
    and v_container.volume_unit is not null then

    v_usable_volume_cm3 :=
      case
        when v_container.volume_unit = 'm3'
          then v_container.maximum_volume *
            1000000
        else v_container.maximum_volume
      end;

  elsif v_container.dimensions is not null then
    v_dimension_multiplier :=
      case
        when coalesce(
          v_container.dimensions ->> 'unit',
          'cm'
        ) = 'mm'
          then 0.1

        when coalesce(
          v_container.dimensions ->> 'unit',
          'cm'
        ) = 'm'
          then 100

        else 1
      end;

    v_usable_volume_cm3 :=
      (
        v_container.dimensions ->> 'length'
      )::numeric
      * v_dimension_multiplier
      * (
        v_container.dimensions ->> 'width'
      )::numeric
      * v_dimension_multiplier
      * (
        v_container.dimensions ->> 'height'
      )::numeric
      * v_dimension_multiplier;
  end if;

  if v_usable_weight_kg is not null
    and v_package.weight_unit = 'kg'
    and v_calculated_weight >
      v_usable_weight_kg then

    raise exception using
      errcode = '22023',
      message =
        'Paket ağırlığı ambalaj kapasitesini aşmaktadır.';
  end if;

  if v_usable_volume_cm3 is not null
    and v_package.volume_unit = 'cm3'
    and v_calculated_volume >
      v_usable_volume_cm3 then

    raise exception using
      errcode = '22023',
      message =
        'Paket hacmi ambalaj kapasitesini aşmaktadır.';
  end if;

  -- ==========================================================
  -- ATOMIC PACKAGE ITEM INSERT
  -- ==========================================================

  insert into public.warehouse_packing_package_items (
    account_id,
    packing_id,
    package_id,
    packing_item_id,
    product_id,
    sku_id,
    quantity,
    unit,
    tracking,
    weight,
    volume
  )
  values (
    p_account_id,
    v_packing.id,
    v_package.id,
    v_item.id,
    p_product_id,
    p_sku_id,
    v_quantity,
    v_unit,
    v_tracking,
    v_weight,
    v_volume
  )
  returning *
  into v_package_item;

  -- ==========================================================
  -- PACKAGE TOTALS / STATUS
  -- ==========================================================

  update public.warehouse_packing_packages
  set
    status =
      'in_progress',
    calculated_weight =
      v_calculated_weight,
    calculated_volume =
      v_calculated_volume,
    updated_at =
      v_now
  where account_id = p_account_id
    and packing_id = v_packing.id
    and id = v_package.id
  returning *
  into v_package;

  -- ==========================================================
  -- RESPONSE
  -- ==========================================================

  v_result :=
    jsonb_strip_nulls(
      jsonb_build_object(
        'ok',
          true,
        'action',
          v_action,
        'packingId',
          v_packing.id,
        'packageId',
          v_package.id,
        'packageStatus',
          v_package.status,
        'packageItemId',
          v_package_item.id,
        'packingItemId',
          v_package_item.packing_item_id,
        'productId',
          v_package_item.product_id,
        'skuId',
          v_package_item.sku_id,
        'quantity',
          v_package_item.quantity,
        'unit',
          v_package_item.unit,
        'tracking',
          v_package_item.tracking,
        'weight',
          v_package_item.weight,
        'volume',
          v_package_item.volume,
        'calculatedWeight',
          v_package.calculated_weight,
        'calculatedVolume',
          v_package.calculated_volume
      )
    );

  update public.warehouse_packing_write_requests
  set
    response_payload =
      v_result,
    completed_at =
      v_now
  where account_id = p_account_id
    and request_id = p_request_id
    and user_id = v_user_id;

  return v_result;
end;
$warehouse_packing_add_package_item_write$;


revoke all on function
  public.warehouse_packing_add_package_item_write(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    numeric,
    text,
    uuid,
    jsonb,
    numeric,
    numeric
  )
from public;

revoke all on function
  public.warehouse_packing_add_package_item_write(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    numeric,
    text,
    uuid,
    jsonb,
    numeric,
    numeric
  )
from anon;

revoke all on function
  public.warehouse_packing_add_package_item_write(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    numeric,
    text,
    uuid,
    jsonb,
    numeric,
    numeric
  )
from authenticated;

grant execute on function
  public.warehouse_packing_add_package_item_write(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    numeric,
    text,
    uuid,
    jsonb,
    numeric,
    numeric
  )
to authenticated;
