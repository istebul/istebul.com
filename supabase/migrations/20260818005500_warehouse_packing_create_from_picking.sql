-- ============================================================
-- WarehouseIQ — A8.2.1
-- Atomic Packing Create From Completed Picking
--
-- Contract:
-- - caller JWT / auth.uid()
-- - account role authorization
-- - account + request_id idempotency
-- - Picking parent FOR UPDATE
-- - yalnız status = completed
-- - yalnız picked_quantity > 0 satırlar aktarılır
-- - Packing requested_quantity = Picking picked_quantity
-- - SKU + InventoryTracking korunur
-- - parent + tüm item'lar tek transaction
-- - aynı Picking ikinci kez Packing'e aktarılamaz
-- - inventory balance / movement mutation YOK
-- - service role YOK
-- ============================================================

create or replace function public.warehouse_packing_create_from_picking(
  p_request_id uuid,
  p_account_id uuid,
  p_picking_id uuid,
  p_packing_location_id uuid,
  p_shipping_location_id uuid default null,
  p_strategy text default 'cartonization',
  p_priority integer default null,
  p_planned_at timestamptz default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_packing_create_from_picking$
declare
  v_user_id uuid :=
    auth.uid();

  v_action constant text :=
    'create_from_picking';

  v_strategy text :=
    lower(
      btrim(
        coalesce(
          p_strategy,
          'cartonization'
        )
      )
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

  v_picking public.warehouse_pickings%rowtype;
  v_packing public.warehouse_packings%rowtype;

  v_effective_priority integer;

  v_transferable_count integer;
  v_inserted_count integer;

  v_total_picked numeric(18,6);

  v_packing_number text;

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
        'İstek kimliği zorunludur.';
  end if;

  if p_account_id is null then
    raise exception using
      errcode = '22023',
      message =
        'Firma kimliği zorunludur.';
  end if;

  if p_picking_id is null then
    raise exception using
      errcode = '22023',
      message =
        'Toplama kimliği zorunludur.';
  end if;

  if p_packing_location_id is null then
    raise exception using
      errcode = '22023',
      message =
        'Paketleme lokasyonu zorunludur.';
  end if;

  if p_shipping_location_id is not null
    and p_shipping_location_id =
      p_packing_location_id then

    raise exception using
      errcode = '22023',
      message =
        'Paketleme ve sevkiyat lokasyonu aynı olamaz.';
  end if;

  if not (
    v_strategy = any (
      array[
        'single_package',
        'multi_package',
        'cartonization',
        'palletization',
        'mixed_sku',
        'single_sku',
        'weight_based',
        'volume_based',
        'temperature_controlled',
        'hazardous_material',
        'carrier_optimized'
      ]::text[]
    )
  ) then
    raise exception using
      errcode = '22023',
      message =
        'Paketleme stratejisi geçersizdir.';
  end if;

  if p_priority is not null
    and (
      p_priority < 1
      or p_priority > 100
    ) then

    raise exception using
      errcode = '22023',
      message =
        'Paketleme önceliği 1 ile 100 arasında olmalıdır.';
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
  -- CANONICAL IDEMPOTENCY PAYLOAD
  -- ==========================================================

  v_payload :=
    jsonb_strip_nulls(
      jsonb_build_object(
        'pickingId',
          p_picking_id,
        'packingLocationId',
          p_packing_location_id,
        'shippingLocationId',
          p_shipping_location_id,
        'strategy',
          v_strategy,
        'priority',
          p_priority,
        'plannedAt',
          p_planned_at,
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
  -- LOCK PICKING
  -- Aynı Picking için paralel Packing creation serialize edilir.
  -- ==========================================================

  select *
  into v_picking
  from public.warehouse_pickings
  where account_id = p_account_id
    and id = p_picking_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Toplama kaydı bulunamadı.';
  end if;

  if v_picking.status <> 'completed' then
    raise exception using
      errcode = '22023',
      message =
        'Yalnızca tamamlanmış toplama kaydı paketlemeye aktarılabilir.';
  end if;

  -- ==========================================================
  -- LOCATION VALIDATION
  -- ==========================================================

  perform 1
  from public.warehouse_locations
  where account_id = p_account_id
    and warehouse_id =
      v_picking.warehouse_id
    and id =
      p_packing_location_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Paketleme lokasyonu toplama deposunda bulunamadı.';
  end if;

  if p_shipping_location_id is not null then
    perform 1
    from public.warehouse_locations
    where account_id = p_account_id
      and warehouse_id =
        v_picking.warehouse_id
      and id =
        p_shipping_location_id;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Sevkiyat lokasyonu toplama deposunda bulunamadı.';
    end if;
  end if;

  -- ==========================================================
  -- DOMAIN DUPLICATE CONTRACT
  -- ==========================================================

  perform 1
  from public.warehouse_packings
  where account_id = p_account_id
    and picking_id = v_picking.id;

  if found then
    raise exception using
      errcode = '23505',
      message =
        'Bu toplama kaydı için daha önce paketleme emri oluşturulmuş.';
  end if;

  if v_picking.order_id is not null then
    perform 1
    from public.warehouse_packings
    where account_id = p_account_id
      and order_id =
        v_picking.order_id;

    if found then
      raise exception using
        errcode = '23505',
        message =
          'Bu sipariş için daha önce paketleme emri oluşturulmuş.';
    end if;
  end if;

  perform 1
  from public.warehouse_packings
  where account_id = p_account_id
    and reference_type = 'picking'
    and reference_id =
      v_picking.id::text;

  if found then
    raise exception using
      errcode = '23505',
      message =
        'Bu toplama referansı için daha önce paketleme emri oluşturulmuş.';
  end if;

  -- ==========================================================
  -- TRANSFERABLE ITEMS
  -- ==========================================================

  select
    count(*),
    coalesce(
      sum(picked_quantity),
      0
    )
  into
    v_transferable_count,
    v_total_picked
  from public.warehouse_picking_items
  where account_id = p_account_id
    and picking_id =
      v_picking.id
    and picked_quantity > 0;

  if v_transferable_count = 0 then
    raise exception using
      errcode = '22023',
      message =
        'Toplama kaydında paketlemeye aktarılabilecek ürün bulunamadı.';
  end if;

  -- PackingService.addItem aynı warehouse contractını zorlar.
  -- Bozuk historical Picking item verisini sessizce taşımayız.
  perform 1
  from public.warehouse_picking_items
  where account_id = p_account_id
    and picking_id =
      v_picking.id
    and picked_quantity > 0
    and warehouse_id <>
      v_picking.warehouse_id
  limit 1;

  if found then
    raise exception using
      errcode = '22023',
      message =
        'Toplama satırı deposu ana toplama deposuyla eşleşmiyor.';
  end if;

  v_effective_priority :=
    coalesce(
      p_priority,
      v_picking.priority
    );

  if v_effective_priority < 1
    or v_effective_priority > 100 then

    raise exception using
      errcode = '22023',
      message =
        'Paketleme önceliği 1 ile 100 arasında olmalıdır.';
  end if;

  -- ==========================================================
  -- CREATE PACKING PARENT
  -- ==========================================================

  v_packing_number :=
    'PAK-' ||
    to_char(
      clock_timestamp(),
      'YYYYMMDDHH24MISSMS'
    ) ||
    '-' ||
    upper(
      substr(
        replace(
          gen_random_uuid()::text,
          '-',
          ''
        ),
        1,
        6
      )
    );

  insert into public.warehouse_packings (
    account_id,
    packing_number,
    warehouse_id,
    packing_location_id,
    shipping_location_id,
    strategy,
    status,
    picking_id,
    order_id,
    order_number,
    reference_type,
    reference_id,
    reference_number,
    priority,
    planned_at,
    notes,
    created_by
  )
  values (
    p_account_id,
    v_packing_number,
    v_picking.warehouse_id,
    p_packing_location_id,
    p_shipping_location_id,
    v_strategy,
    case
      when p_planned_at is null
        then 'draft'
      else 'planned'
    end,
    v_picking.id,
    v_picking.order_id,
    v_picking.order_number,
    'picking',
    v_picking.id::text,
    v_picking.picking_number,
    v_effective_priority,
    p_planned_at,
    v_notes,
    v_user_id
  )
  returning *
  into v_packing;

  -- ==========================================================
  -- ATOMIC ITEM TRANSFER
  --
  -- Picking repository domain mapping:
  -- tracking JSON + lot/serial/production/expiry kolonlarını
  -- tek InventoryTracking nesnesine birleştirir.
  --
  -- Packing createFromPicking aynı domain tracking nesnesini
  -- addItem'e verdiği için burada aynı birleşim yapılır.
  -- ==========================================================

  insert into public.warehouse_packing_items (
    account_id,
    packing_id,
    line_number,
    picking_id,
    picking_item_id,
    warehouse_id,
    packing_location_id,
    product_id,
    sku_id,
    requested_quantity,
    packed_quantity,
    damaged_quantity,
    missing_quantity,
    remaining_quantity,
    unit,
    tracking,
    barcode,
    unit_weight,
    unit_volume,
    weight_unit,
    volume_unit,
    temperature_controlled,
    hazardous_material,
    notes,
    created_by
  )
  select
    p_account_id,
    v_packing.id,

    row_number() over (
      order by
        pi.line_number,
        pi.id
    )::integer,

    v_picking.id,
    pi.id,

    pi.warehouse_id,
    p_packing_location_id,

    pi.product_id,
    pi.sku_id,

    pi.picked_quantity,
    0,
    0,
    0,
    pi.picked_quantity,

    pi.unit,

    nullif(
      jsonb_strip_nulls(
        coalesce(
          pi.tracking,
          '{}'::jsonb
        )
        ||
        jsonb_build_object(
          'lotNumber',
            pi.lot_number,
          'serialNumber',
            pi.serial_number,
          'productionDate',
            pi.production_date,
          'expiryDate',
            pi.expiry_date
        )
      ),
      '{}'::jsonb
    ),

    null,
    null,
    null,
    null,
    null,

    false,
    false,

    null,

    v_user_id

  from public.warehouse_picking_items pi
  where pi.account_id =
      p_account_id
    and pi.picking_id =
      v_picking.id
    and pi.picked_quantity > 0
  order by
    pi.line_number,
    pi.id;

  get diagnostics
    v_inserted_count = row_count;

  if v_inserted_count <>
    v_transferable_count then

    raise exception using
      errcode = '40001',
      message =
        'Toplama satırlarının tamamı atomik olarak paketlemeye aktarılamadı.';
  end if;

  -- ==========================================================
  -- RESPONSE / IDEMPOTENCY COMPLETE
  -- ==========================================================

  v_result :=
    jsonb_build_object(
      'ok', true,
      'action',
        v_action,
      'packingId',
        v_packing.id,
      'packingNumber',
        v_packing.packing_number,
      'status',
        v_packing.status,
      'pickingId',
        v_picking.id,
      'itemCount',
        v_inserted_count,
      'requestedQuantity',
        v_total_picked
    );

  update public.warehouse_packing_write_requests
  set
    response_payload =
      v_result,
    completed_at =
      now()
  where account_id =
      p_account_id
    and request_id =
      p_request_id
    and user_id =
      v_user_id;

  return v_result;

exception
  when unique_violation then
    raise exception using
      errcode = '23505',
      message =
        'Bu toplama, sipariş veya paketleme referansı için daha önce paketleme emri oluşturulmuş.';
end;
$warehouse_packing_create_from_picking$;


revoke all on function
  public.warehouse_packing_create_from_picking(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    integer,
    timestamptz,
    text
  )
from public;

revoke all on function
  public.warehouse_packing_create_from_picking(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    integer,
    timestamptz,
    text
  )
from anon;

revoke all on function
  public.warehouse_packing_create_from_picking(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    integer,
    timestamptz,
    text
  )
from authenticated;

grant execute on function
  public.warehouse_packing_create_from_picking(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    integer,
    timestamptz,
    text
  )
to authenticated;
