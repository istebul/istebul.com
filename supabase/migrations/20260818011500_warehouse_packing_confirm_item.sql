-- ============================================================
-- WarehouseIQ — A8.2.2
-- Atomic Packing Item Confirmation
--
-- Tek transaction:
-- 1. Packing parent lock
-- 2. Packing item lock
-- 3. Package lock
-- 4. barcode / lot / serial / quantity validation
-- 5. gerekiyorsa package-item oluşturma
-- 6. package calculated weight/volume + status
-- 7. damaged / missing exception üretimi
-- 8. Packing item quantity update
-- 9. bağlı task lifecycle update
-- 10. Packing parent status update
-- 11. idempotent response
--
-- Inventory balance / movement mutation YOK.
-- ============================================================

create or replace function public.warehouse_packing_confirm_item_write(
  p_request_id uuid,
  p_account_id uuid,
  p_packing_id uuid,
  p_packing_item_id uuid,
  p_package_id uuid,
  p_quantity numeric,
  p_damaged_quantity numeric default 0,
  p_missing_quantity numeric default 0,
  p_barcode text default null,
  p_lot_number text default null,
  p_serial_number text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_packing_confirm_item_write$
declare
  v_user_id uuid :=
    auth.uid();

  v_action constant text :=
    'confirm_item';

  v_quantity numeric(18,6) :=
    coalesce(p_quantity, 0);

  v_damaged_quantity numeric(18,6) :=
    coalesce(p_damaged_quantity, 0);

  v_missing_quantity numeric(18,6) :=
    coalesce(p_missing_quantity, 0);

  v_processed_quantity numeric(18,6);

  v_barcode text :=
    nullif(
      btrim(
        coalesce(
          p_barcode,
          ''
        )
      ),
      ''
    );

  v_lot_number text :=
    nullif(
      btrim(
        coalesce(
          p_lot_number,
          ''
        )
      ),
      ''
    );

  v_serial_number text :=
    nullif(
      btrim(
        coalesce(
          p_serial_number,
          ''
        )
      ),
      ''
    );

  v_notes text :=
    nullif(
      btrim(
        coalesce(
          p_notes,
          ''
        )
      ),
      ''
    );

  v_payload jsonb;

  v_existing_action text;
  v_existing_payload jsonb;
  v_existing_response jsonb;
  v_inserted integer := 0;

  v_packing public.warehouse_packings%rowtype;
  v_item public.warehouse_packing_items%rowtype;
  v_package public.warehouse_packing_packages%rowtype;
  v_container public.warehouse_packing_containers%rowtype;

  v_expected_lot text;
  v_expected_serial text;

  v_new_packed numeric(18,6);
  v_new_damaged numeric(18,6);
  v_new_missing numeric(18,6);
  v_new_remaining numeric(18,6);

  v_package_item_id uuid;

  v_item_weight numeric(18,6);
  v_item_volume numeric(18,6);

  v_calculated_weight numeric(18,6);
  v_calculated_volume numeric(18,6);

  v_maximum_weight_kg numeric;
  v_empty_weight_kg numeric;
  v_usable_weight_kg numeric;

  v_usable_volume_cm3 numeric;
  v_dimension_multiplier numeric;

  v_damaged_exception_id uuid;
  v_missing_exception_id uuid;

  v_parent_status text;

  v_result jsonb;
begin
  -- ==========================================================
  -- AUTH / BASIC INPUT
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
    or p_packing_item_id is null
    or p_package_id is null then

    raise exception using
      errcode = '22023',
      message =
        'İstek, firma, paketleme, satır ve paket kimlikleri zorunludur.';
  end if;

  if v_quantity < 0
    or v_damaged_quantity < 0
    or v_missing_quantity < 0 then

    raise exception using
      errcode = '22023',
      message =
        'Paketlenen, hasarlı ve eksik miktarlar negatif olamaz.';
  end if;

  if v_quantity = 0
    and v_damaged_quantity = 0
    and v_missing_quantity = 0 then

    raise exception using
      errcode = '22023',
      message =
        'Paketlenen, hasarlı veya eksik miktardan en az biri sıfırdan büyük olmalıdır.';
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
        'Bu firma için paketleme yazma yetkiniz bulunmuyor.';
  end if;

  -- ==========================================================
  -- IDEMPOTENCY
  -- ==========================================================

  v_payload :=
    jsonb_strip_nulls(
      jsonb_build_object(
        'packingId',
          p_packing_id,
        'packingItemId',
          p_packing_item_id,
        'packageId',
          p_package_id,
        'quantity',
          v_quantity,
        'damagedQuantity',
          v_damaged_quantity,
        'missingQuantity',
          v_missing_quantity,
        'barcode',
          v_barcode,
        'lotNumber',
          v_lot_number,
        'serialNumber',
          v_serial_number,
        'notes',
          v_notes
      )
    );

  select
    action,
    request_payload,
    response_payload
  into
    v_existing_action,
    v_existing_payload,
    v_existing_response
  from public.warehouse_packing_write_requests
  where account_id = p_account_id
    and request_id = p_request_id;

  if found then
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
      action,
      request_payload,
      response_payload
    into
      v_existing_action,
      v_existing_payload,
      v_existing_response
    from public.warehouse_packing_write_requests
    where account_id = p_account_id
      and request_id = p_request_id;

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
  -- LOCK PARENT
  -- ==========================================================

  select *
  into v_packing
  from public.warehouse_packings
  where account_id = p_account_id
    and id = p_packing_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Paketleme kaydı bulunamadı.';
  end if;

  if v_packing.status not in (
    'in_progress',
    'partially_packed'
  ) then
    raise exception using
      errcode = '22023',
      message =
        'Paketleme onayı yalnızca devam eden operasyonda verilebilir.';
  end if;

  -- ==========================================================
  -- LOCK ITEM
  -- ==========================================================

  select *
  into v_item
  from public.warehouse_packing_items
  where account_id = p_account_id
    and packing_id = v_packing.id
    and id = p_packing_item_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Paketleme satırı bulunamadı.';
  end if;

  -- ==========================================================
  -- LOCK PACKAGE
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
        'Paket bulunamadı.';
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
        'Kapalı, etiketlenmiş, sevkiyata hazır veya iptal edilmiş pakete ürün eklenemez.';
  end if;

  -- ==========================================================
  -- QUANTITY
  -- ==========================================================

  v_processed_quantity :=
    v_quantity
    + v_damaged_quantity
    + v_missing_quantity;

  if v_processed_quantity >
    v_item.remaining_quantity then

    raise exception using
      errcode = '22023',
      message =
        'Paketlenen, hasarlı ve eksik toplam miktar kalan miktarı aşamaz.';
  end if;

  -- ==========================================================
  -- BARCODE / LOT / SERIAL
  -- ==========================================================

  if v_item.barcode is not null
    and v_barcode is distinct from
      v_item.barcode then

    raise exception using
      errcode = '22023',
      message =
        'Okutulan barkod paketleme satırıyla uyuşmamaktadır.';
  end if;

  v_expected_lot :=
    nullif(
      btrim(
        coalesce(
          v_item.tracking ->> 'lotNumber',
          ''
        )
      ),
      ''
    );

  if v_expected_lot is not null
    and v_lot_number is null then

    raise exception using
      errcode = '22023',
      message =
        'Lot takipli ürün için lot numarası okutulmalıdır.';
  end if;

  if v_expected_lot is not null
    and v_lot_number <>
      v_expected_lot then

    raise exception using
      errcode = '22023',
      message =
        'Okutulan lot numarası paketleme satırıyla uyuşmamaktadır.';
  end if;

  v_expected_serial :=
    nullif(
      btrim(
        coalesce(
          v_item.tracking ->> 'serialNumber',
          ''
        )
      ),
      ''
    );

  if v_expected_serial is not null
    and v_serial_number is null then

    raise exception using
      errcode = '22023',
      message =
        'Seri numarası takipli ürün için seri numarası okutulmalıdır.';
  end if;

  if v_expected_serial is not null
    and v_serial_number <>
      v_expected_serial then

    raise exception using
      errcode = '22023',
      message =
        'Okutulan seri numarası paketleme satırıyla uyuşmamaktadır.';
  end if;

  -- ==========================================================
  -- PACKAGE ITEM + CAPACITY
  -- Domain addPackageItem davranışı:
  -- calculatedWeight / Volume mevcut package item toplamıdır.
  -- ==========================================================

  if v_quantity > 0 then
    v_item_weight :=
      case
        when v_item.unit_weight is null
          then null
        else
          v_item.unit_weight * v_quantity
      end;

    v_item_volume :=
      case
        when v_item.unit_volume is null
          then null
        else
          v_item.unit_volume * v_quantity
      end;

    select
      coalesce(
        sum(weight),
        0
      ) + coalesce(
        v_item_weight,
        0
      ),
      coalesce(
        sum(volume),
        0
      ) + coalesce(
        v_item_volume,
        0
      )
    into
      v_calculated_weight,
      v_calculated_volume
    from public.warehouse_packing_package_items
    where account_id = p_account_id
      and packing_id = v_packing.id
      and package_id = v_package.id;

    select *
    into v_container
    from public.warehouse_packing_containers
    where account_id = p_account_id
      and id = v_package.container_id;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Paket ambalaj kaydı bulunamadı.';
    end if;

    -- ContainerService.calculateCapacity:
    -- maximum weight -> kg
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

    -- maximum volume -> cm3; yoksa dimensions üzerinden.
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
      v_item.product_id,
      v_item.sku_id,
      v_quantity,
      v_item.unit,
      v_item.tracking,
      v_item_weight,
      v_item_volume
    )
    returning id
    into v_package_item_id;

    update public.warehouse_packing_packages
    set
      status = 'in_progress',
      calculated_weight =
        v_calculated_weight,
      calculated_volume =
        v_calculated_volume,
      updated_at =
        now()
    where account_id = p_account_id
      and packing_id = v_packing.id
      and id = v_package.id
    returning *
    into v_package;
  end if;

  -- ==========================================================
  -- DAMAGED / MISSING EXCEPTIONS
  -- ==========================================================

  if v_damaged_quantity > 0 then
    insert into public.warehouse_packing_exceptions (
      account_id,
      packing_id,
      packing_item_id,
      package_id,
      type,
      message,
      warehouse_id,
      location_id,
      product_id,
      resolved,
      created_at,
      updated_at
    )
    values (
      p_account_id,
      v_packing.id,
      v_item.id,
      v_package.id,
      'damaged_product',
      'Hasarlı ürün kaydedildi. Hasarlı miktar: ' ||
        v_damaged_quantity::text,
      v_item.warehouse_id,
      v_item.packing_location_id,
      v_item.product_id,
      false,
      now(),
      now()
    )
    returning id
    into v_damaged_exception_id;
  end if;

  if v_missing_quantity > 0 then
    insert into public.warehouse_packing_exceptions (
      account_id,
      packing_id,
      packing_item_id,
      package_id,
      type,
      message,
      warehouse_id,
      location_id,
      product_id,
      resolved,
      created_at,
      updated_at
    )
    values (
      p_account_id,
      v_packing.id,
      v_item.id,
      v_package.id,
      'item_missing',
      'Eksik paketleme kaydedildi. Eksik miktar: ' ||
        v_missing_quantity::text,
      v_item.warehouse_id,
      v_item.packing_location_id,
      v_item.product_id,
      false,
      now(),
      now()
    )
    returning id
    into v_missing_exception_id;
  end if;

  -- ==========================================================
  -- ITEM QUANTITIES
  -- ==========================================================

  v_new_packed :=
    v_item.packed_quantity +
      v_quantity;

  v_new_damaged :=
    v_item.damaged_quantity +
      v_damaged_quantity;

  v_new_missing :=
    v_item.missing_quantity +
      v_missing_quantity;

  v_new_remaining :=
    greatest(
      0,
      v_item.requested_quantity
      - v_new_packed
      - v_new_damaged
      - v_new_missing
    );

  update public.warehouse_packing_items
  set
    packed_quantity =
      v_new_packed,
    damaged_quantity =
      v_new_damaged,
    missing_quantity =
      v_new_missing,
    remaining_quantity =
      v_new_remaining,
    notes =
      case
        when v_notes is null
          then notes
        else v_notes
      end,
    updated_at =
      now()
  where account_id = p_account_id
    and packing_id = v_packing.id
    and id = v_item.id
  returning *
  into v_item;

  -- ==========================================================
  -- RELATED TASKS
  -- Domain: item'e bağlı bütün görevler ilerletilir.
  -- ==========================================================

  update public.warehouse_packing_tasks
  set
    status =
      case
        when v_new_remaining = 0
          then 'completed'
        else 'partially_completed'
      end,
    started_at =
      coalesce(
        started_at,
        now()
      ),
    completed_at =
      case
        when v_new_remaining = 0
          then coalesce(
            completed_at,
            now()
          )
        else completed_at
      end,
    updated_at =
      now()
  where account_id = p_account_id
    and packing_id = v_packing.id
    and packing_item_id = v_item.id;

  -- ==========================================================
  -- PARENT STATUS
  -- Domain parity:
  -- tüm item işlendiğinde bile complete() çağrılana kadar
  -- parent "in_progress" kalır.
  -- ==========================================================

  if exists (
    select 1
    from public.warehouse_packing_items
    where account_id = p_account_id
      and packing_id = v_packing.id
      and remaining_quantity > 0
  ) then
    v_parent_status :=
      'partially_packed';
  else
    v_parent_status :=
      'in_progress';
  end if;

  update public.warehouse_packings
  set
    status =
      v_parent_status,
    updated_at =
      now()
  where account_id = p_account_id
    and id = v_packing.id
  returning *
  into v_packing;

  -- ==========================================================
  -- RESPONSE
  -- ==========================================================

  v_result :=
    jsonb_strip_nulls(
      jsonb_build_object(
        'ok', true,
        'action',
          v_action,
        'packingId',
          v_packing.id,
        'packingItemId',
          v_item.id,
        'packageId',
          v_package.id,
        'packageItemId',
          v_package_item_id,
        'packedQuantity',
          v_item.packed_quantity,
        'damagedQuantity',
          v_item.damaged_quantity,
        'missingQuantity',
          v_item.missing_quantity,
        'remainingQuantity',
          v_item.remaining_quantity,
        'packingStatus',
          v_packing.status,
        'packageStatus',
          v_package.status,
        'damagedExceptionId',
          v_damaged_exception_id,
        'missingExceptionId',
          v_missing_exception_id,
        'packedBy',
          v_user_id
      )
    );

  update public.warehouse_packing_write_requests
  set
    response_payload =
      v_result,
    completed_at =
      now()
  where account_id = p_account_id
    and request_id = p_request_id
    and user_id = v_user_id;

  return v_result;
end;
$warehouse_packing_confirm_item_write$;


revoke all on function
  public.warehouse_packing_confirm_item_write(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    numeric,
    numeric,
    numeric,
    text,
    text,
    text,
    text
  )
from public;

revoke all on function
  public.warehouse_packing_confirm_item_write(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    numeric,
    numeric,
    numeric,
    text,
    text,
    text,
    text
  )
from anon;

revoke all on function
  public.warehouse_packing_confirm_item_write(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    numeric,
    numeric,
    numeric,
    text,
    text,
    text,
    text
  )
from authenticated;

grant execute on function
  public.warehouse_packing_confirm_item_write(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    numeric,
    numeric,
    numeric,
    text,
    text,
    text,
    text
  )
to authenticated;
