-- ============================================================
-- WarehouseIQ — Packing Secure Write Foundation
-- A8.2
--
-- Bu RPC yalnız stok hareketi üretmeyen temel Packing
-- yönetim aksiyonlarını kapsar:
--
-- create
-- add_item
-- release
-- start
-- create_container
-- set_container_active
-- create_package
-- create_task
-- create_exception
--
-- YÜKSEK ETKİLİ / ÇOK SATIRLI operasyonlar burada YOKTUR:
-- create_from_picking
-- generate_suggestions
-- confirm_item
-- add_package_item
-- seal_package
-- generate_package_label
-- label lifecycle
-- resolve_exception
-- complete
-- mark_shipping_ready
-- cancel
--
-- Güvenlik:
-- caller JWT + auth.uid()
-- account role authorization
-- account + request_id idempotency
-- row locking
-- tenant / warehouse / location / product bütünlüğü
-- no inventory mutation
-- no service role
-- ============================================================

create or replace function public.warehouse_packing_write(
  p_action text,
  p_request_id uuid,
  p_account_id uuid,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_action text :=
    lower(btrim(coalesce(p_action, '')));

  v_payload jsonb :=
    coalesce(p_payload, '{}'::jsonb);

  v_user_id uuid :=
    auth.uid();

  v_existing_action text;
  v_existing_payload jsonb;
  v_existing_response jsonb;
  v_inserted integer := 0;

  v_packing public.warehouse_packings%rowtype;
  v_item public.warehouse_packing_items%rowtype;
  v_container public.warehouse_packing_containers%rowtype;
  v_package public.warehouse_packing_packages%rowtype;
  v_task public.warehouse_packing_tasks%rowtype;
  v_exception public.warehouse_packing_exceptions%rowtype;

  v_packing_id uuid;
  v_packing_item_id uuid;
  v_container_id uuid;
  v_package_id uuid;
  v_parent_package_id uuid;
  v_task_id uuid;

  v_picking_id uuid;
  v_picking_item_id uuid;

  v_warehouse_id uuid;
  v_packing_location_id uuid;
  v_shipping_location_id uuid;

  v_product_id uuid;
  v_sku_id uuid;

  v_assigned_user_id uuid;
  v_assigned_equipment_id text;
  v_station_id text;

  v_strategy text;
  v_unit text;
  v_status text;

  v_priority integer;
  v_sequence integer;
  v_line_number integer;

  v_requested_quantity numeric(18,6);

  v_tracking jsonb;
  v_barcode text;

  v_unit_weight numeric(18,6);
  v_unit_volume numeric(18,6);

  v_weight_unit text;
  v_volume_unit text;

  v_temperature_controlled boolean;
  v_hazardous_material boolean;

  v_planned_at timestamptz;

  v_order_id text;
  v_order_number text;

  v_reference_type text;
  v_reference_id text;
  v_reference_number text;

  v_notes text;

  v_packing_number text;
  v_package_number text;

  v_code text;
  v_name text;
  v_type text;
  v_description text;

  v_dimensions jsonb;

  v_empty_weight numeric(18,6);
  v_maximum_weight numeric(18,6);
  v_maximum_volume numeric(18,6);

  v_hazardous_material_allowed boolean;
  v_reusable boolean;
  v_active boolean;

  v_exception_type text;
  v_message text;
  v_location_id uuid;

  v_item_count integer;
  v_task_count integer;
  v_duplicate_count integer;

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

  if p_request_id is null then
    raise exception using
      errcode = '22023',
      message = 'İstek kimliği zorunludur.';
  end if;

  if p_account_id is null then
    raise exception using
      errcode = '22023',
      message = 'Firma kimliği zorunludur.';
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'İstek verisi JSON nesnesi olmalıdır.';
  end if;

  if not (
    v_action = any (
      array[
        'create',
        'add_item',
        'release',
        'start',
        'create_container',
        'set_container_active',
        'create_package',
        'create_task',
        'create_exception'
      ]::text[]
    )
  ) then
    raise exception using
      errcode = '22023',
      message = 'Desteklenmeyen paketleme işlemi.';
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
          'Aynı istek kimliği farklı bir işlem için kullanılamaz.';
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
  on conflict (account_id, request_id)
  do nothing;

  get diagnostics v_inserted = row_count;

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
          'Aynı istek kimliği farklı bir işlem için kullanılamaz.';
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
  -- CREATE
  -- ==========================================================

  if v_action = 'create' then
    v_warehouse_id :=
      nullif(
        btrim(v_payload ->> 'warehouseId'),
        ''
      )::uuid;

    v_packing_location_id :=
      nullif(
        btrim(v_payload ->> 'packingLocationId'),
        ''
      )::uuid;

    v_shipping_location_id :=
      nullif(
        btrim(v_payload ->> 'shippingLocationId'),
        ''
      )::uuid;

    v_picking_id :=
      nullif(
        btrim(v_payload ->> 'pickingId'),
        ''
      )::uuid;

    v_strategy :=
      lower(
        btrim(
          coalesce(
            v_payload ->> 'strategy',
            ''
          )
        )
      );

    v_priority :=
      coalesce(
        nullif(
          btrim(v_payload ->> 'priority'),
          ''
        )::integer,
        50
      );

    v_order_id :=
      nullif(
        btrim(v_payload ->> 'orderId'),
        ''
      );

    v_order_number :=
      nullif(
        btrim(v_payload ->> 'orderNumber'),
        ''
      );

    v_reference_type :=
      nullif(
        btrim(v_payload ->> 'referenceType'),
        ''
      );

    v_reference_id :=
      nullif(
        btrim(v_payload ->> 'referenceId'),
        ''
      );

    v_reference_number :=
      nullif(
        btrim(v_payload ->> 'referenceNumber'),
        ''
      );

    v_notes :=
      nullif(
        btrim(v_payload ->> 'notes'),
        ''
      );

    v_planned_at :=
      case
        when nullif(
          btrim(v_payload ->> 'plannedAt'),
          ''
        ) is null then null
        else
          (v_payload ->> 'plannedAt')::timestamptz
      end;

    if v_warehouse_id is null then
      raise exception using
        errcode = '22023',
        message = 'Depo kimliği zorunludur.';
    end if;

    if v_packing_location_id is null then
      raise exception using
        errcode = '22023',
        message =
          'Paketleme lokasyonu zorunludur.';
    end if;

    if v_shipping_location_id is not null
      and v_shipping_location_id =
        v_packing_location_id then

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

    if v_priority < 1
      or v_priority > 100 then

      raise exception using
        errcode = '22023',
        message =
          'Paketleme önceliği 1 ile 100 arasında olmalıdır.';
    end if;

    if (
      (v_reference_type is null)
      <>
      (v_reference_id is null)
    ) then
      raise exception using
        errcode = '22023',
        message =
          'Referans türü ve referans kimliği birlikte verilmelidir.';
    end if;

    perform 1
    from public.warehouses
    where account_id = p_account_id
      and id = v_warehouse_id;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Paketleme deposu bulunamadı veya bu firmaya ait değil.';
    end if;

    perform 1
    from public.warehouse_locations
    where account_id = p_account_id
      and warehouse_id = v_warehouse_id
      and id = v_packing_location_id;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Paketleme lokasyonu bulunamadı veya depo ile eşleşmiyor.';
    end if;

    if v_shipping_location_id is not null then
      perform 1
      from public.warehouse_locations
      where account_id = p_account_id
        and warehouse_id = v_warehouse_id
        and id = v_shipping_location_id;

      if not found then
        raise exception using
          errcode = 'P0002',
          message =
            'Sevkiyat lokasyonu bulunamadı veya depo ile eşleşmiyor.';
      end if;
    end if;

    if v_picking_id is not null then
      perform 1
      from public.warehouse_pickings
      where account_id = p_account_id
        and id = v_picking_id;

      if not found then
        raise exception using
          errcode = 'P0002',
          message =
            'Bağlı toplama kaydı bulunamadı.';
      end if;
    end if;

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
      v_warehouse_id,
      v_packing_location_id,
      v_shipping_location_id,
      v_strategy,
      case
        when v_planned_at is null
          then 'draft'
        else 'planned'
      end,
      v_picking_id,
      v_order_id,
      v_order_number,
      v_reference_type,
      v_reference_id,
      v_reference_number,
      v_priority,
      v_planned_at,
      v_notes,
      v_user_id
    )
    returning *
    into v_packing;

    v_result :=
      jsonb_build_object(
        'ok', true,
        'action', v_action,
        'packingId', v_packing.id,
        'packingNumber',
          v_packing.packing_number,
        'status', v_packing.status
      );

  -- ==========================================================
  -- ADD ITEM
  -- ==========================================================

  elsif v_action = 'add_item' then
    v_packing_id :=
      nullif(
        btrim(v_payload ->> 'packingId'),
        ''
      )::uuid;

    v_picking_id :=
      nullif(
        btrim(v_payload ->> 'pickingId'),
        ''
      )::uuid;

    v_picking_item_id :=
      nullif(
        btrim(v_payload ->> 'pickingItemId'),
        ''
      )::uuid;

    v_warehouse_id :=
      nullif(
        btrim(v_payload ->> 'warehouseId'),
        ''
      )::uuid;

    v_packing_location_id :=
      nullif(
        btrim(v_payload ->> 'packingLocationId'),
        ''
      )::uuid;

    v_product_id :=
      nullif(
        btrim(v_payload ->> 'productId'),
        ''
      )::uuid;

    v_sku_id :=
      nullif(
        btrim(v_payload ->> 'skuId'),
        ''
      )::uuid;

    v_requested_quantity :=
      nullif(
        btrim(v_payload ->> 'requestedQuantity'),
        ''
      )::numeric(18,6);

    v_unit :=
      btrim(
        coalesce(
          v_payload ->> 'unit',
          ''
        )
      );

    v_tracking :=
      coalesce(
        v_payload -> 'tracking',
        '{}'::jsonb
      );

    v_barcode :=
      nullif(
        btrim(v_payload ->> 'barcode'),
        ''
      );

    v_unit_weight :=
      nullif(
        btrim(v_payload ->> 'unitWeight'),
        ''
      )::numeric(18,6);

    v_unit_volume :=
      nullif(
        btrim(v_payload ->> 'unitVolume'),
        ''
      )::numeric(18,6);

    v_weight_unit :=
      nullif(
        lower(
          btrim(v_payload ->> 'weightUnit')
        ),
        ''
      );

    v_volume_unit :=
      nullif(
        lower(
          btrim(v_payload ->> 'volumeUnit')
        ),
        ''
      );

    v_temperature_controlled :=
      coalesce(
        nullif(
          btrim(
            v_payload ->> 'temperatureControlled'
          ),
          ''
        )::boolean,
        false
      );

    v_hazardous_material :=
      coalesce(
        nullif(
          btrim(
            v_payload ->> 'hazardousMaterial'
          ),
          ''
        )::boolean,
        false
      );

    v_notes :=
      nullif(
        btrim(v_payload ->> 'notes'),
        ''
      );

    if v_packing_id is null then
      raise exception using
        errcode = '22023',
        message =
          'Paketleme kimliği zorunludur.';
    end if;

    if v_warehouse_id is null
      or v_packing_location_id is null then

      raise exception using
        errcode = '22023',
        message =
          'Depo ve paketleme lokasyonu zorunludur.';
    end if;

    if v_product_id is null then
      raise exception using
        errcode = '22023',
        message =
          'Ürün kimliği zorunludur.';
    end if;

    if v_requested_quantity is null
      or v_requested_quantity <= 0 then

      raise exception using
        errcode = '22023',
        message =
          'İstenen paketleme miktarı sıfırdan büyük olmalıdır.';
    end if;

    if v_unit = '' then
      raise exception using
        errcode = '22023',
        message =
          'Ölçü birimi zorunludur.';
    end if;

    if jsonb_typeof(v_tracking) <> 'object' then
      raise exception using
        errcode = '22023',
        message =
          'Ürün takip bilgisi JSON nesnesi olmalıdır.';
    end if;

    if v_weight_unit is not null
      and v_weight_unit not in ('g', 'kg') then

      raise exception using
        errcode = '22023',
        message =
          'Ağırlık birimi g veya kg olmalıdır.';
    end if;

    if v_volume_unit is not null
      and v_volume_unit not in ('cm3', 'm3') then

      raise exception using
        errcode = '22023',
        message =
          'Hacim birimi cm3 veya m3 olmalıdır.';
    end if;

    select *
    into v_packing
    from public.warehouse_packings
    where account_id = p_account_id
      and id = v_packing_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Paketleme kaydı bulunamadı.';
    end if;

    if v_packing.status not in (
      'draft',
      'planned'
    ) then
      raise exception using
        errcode = '22023',
        message =
          'Paketleme satırı yalnız taslak veya planlanmış kayda eklenebilir.';
    end if;

    if v_warehouse_id <>
      v_packing.warehouse_id
      or v_packing_location_id <>
        v_packing.packing_location_id then

      raise exception using
        errcode = '22023',
        message =
          'Paketleme satırı depo ve lokasyonu ana paketleme kaydıyla aynı olmalıdır.';
    end if;

    perform 1
    from public.warehouse_products
    where account_id = p_account_id
      and id = v_product_id;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Paketleme ürünü bulunamadı veya bu firmaya ait değil.';
    end if;

    if v_sku_id is not null then
      perform 1
      from public.warehouse_product_skus
      where account_id = p_account_id
        and product_id = v_product_id
        and id = v_sku_id;

      if not found then
        raise exception using
          errcode = 'P0002',
          message =
            'Paketleme SKU kaydı ürünle eşleşmiyor.';
      end if;
    end if;

    if v_picking_item_id is not null
      and v_picking_id is null then

      raise exception using
        errcode = '22023',
        message =
          'Toplama satırı verildiğinde toplama kimliği de zorunludur.';
    end if;

    if v_picking_id is not null then
      if v_packing.picking_id is not null
        and v_packing.picking_id <>
          v_picking_id then

        raise exception using
          errcode = '22023',
          message =
            'Paketleme satırı başka bir toplama kaydına bağlanamaz.';
      end if;

      perform 1
      from public.warehouse_pickings
      where account_id = p_account_id
        and id = v_picking_id;

      if not found then
        raise exception using
          errcode = 'P0002',
          message =
            'Bağlı toplama kaydı bulunamadı.';
      end if;
    end if;

    if v_picking_item_id is not null then
      perform 1
      from public.warehouse_picking_items
      where account_id = p_account_id
        and picking_id = v_picking_id
        and id = v_picking_item_id
        and product_id = v_product_id
        and sku_id is not distinct from v_sku_id
        and unit = v_unit;

      if not found then
        raise exception using
          errcode = 'P0002',
          message =
            'Toplama satırı paketleme ürün bilgileriyle eşleşmiyor.';
      end if;
    end if;

    select count(*)
    into v_duplicate_count
    from public.warehouse_packing_items
    where account_id = p_account_id
      and packing_id = v_packing.id
      and product_id = v_product_id
      and sku_id is not distinct from v_sku_id
      and unit = v_unit
      and picking_item_id
        is not distinct from v_picking_item_id
      and tracking = v_tracking;

    if v_duplicate_count > 0 then
      raise exception using
        errcode = '23505',
        message =
          'Aynı ürün, SKU, toplama satırı ve takip bilgileriyle paketleme satırı zaten bulunmaktadır.';
    end if;

    select coalesce(max(line_number), 0) + 1
    into v_line_number
    from public.warehouse_packing_items
    where account_id = p_account_id
      and packing_id = v_packing.id;

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
    values (
      p_account_id,
      v_packing.id,
      v_line_number,
      v_picking_id,
      v_picking_item_id,
      v_warehouse_id,
      v_packing_location_id,
      v_product_id,
      v_sku_id,
      v_requested_quantity,
      0,
      0,
      0,
      v_requested_quantity,
      v_unit,
      nullif(v_tracking, '{}'::jsonb),
      v_barcode,
      v_unit_weight,
      v_unit_volume,
      v_weight_unit,
      v_volume_unit,
      v_temperature_controlled,
      v_hazardous_material,
      v_notes,
      v_user_id
    )
    returning *
    into v_item;

    v_result :=
      jsonb_build_object(
        'ok', true,
        'action', v_action,
        'packingId', v_packing.id,
        'packingItemId', v_item.id,
        'lineNumber', v_item.line_number,
        'remainingQuantity',
          v_item.remaining_quantity
      );

  -- ==========================================================
  -- RELEASE
  -- ==========================================================

  elsif v_action = 'release' then
    v_packing_id :=
      nullif(
        btrim(v_payload ->> 'packingId'),
        ''
      )::uuid;

    if v_packing_id is null then
      raise exception using
        errcode = '22023',
        message =
          'Paketleme kimliği zorunludur.';
    end if;

    select *
    into v_packing
    from public.warehouse_packings
    where account_id = p_account_id
      and id = v_packing_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Paketleme kaydı bulunamadı.';
    end if;

    if v_packing.status not in (
      'draft',
      'planned'
    ) then
      raise exception using
        errcode = '22023',
        message =
          'Yalnızca taslak veya planlanmış paketleme operasyona açılabilir.';
    end if;

    select count(*)
    into v_item_count
    from public.warehouse_packing_items
    where account_id = p_account_id
      and packing_id = v_packing.id;

    if v_item_count = 0 then
      raise exception using
        errcode = '22023',
        message =
          'Paketleme operasyona açılmadan önce en az bir ürün satırı eklenmelidir.';
    end if;

    perform 1
    from public.warehouse_packing_items
    where account_id = p_account_id
      and packing_id = v_packing.id
      and (
        requested_quantity <= 0
        or remaining_quantity <= 0
      )
    limit 1;

    if found then
      raise exception using
        errcode = '22023',
        message =
          'Geçersiz miktar içeren paketleme satırı operasyona açılamaz.';
    end if;

    update public.warehouse_packings
    set
      status = 'released',
      released_at = now(),
      updated_at = now()
    where account_id = p_account_id
      and id = v_packing.id
    returning *
    into v_packing;

    v_result :=
      jsonb_build_object(
        'ok', true,
        'action', v_action,
        'packingId', v_packing.id,
        'status', v_packing.status,
        'releasedAt',
          v_packing.released_at
      );

  -- ==========================================================
  -- START
  -- ==========================================================

  elsif v_action = 'start' then
    v_packing_id :=
      nullif(
        btrim(v_payload ->> 'packingId'),
        ''
      )::uuid;

    if v_packing_id is null then
      raise exception using
        errcode = '22023',
        message =
          'Paketleme kimliği zorunludur.';
    end if;

    select *
    into v_packing
    from public.warehouse_packings
    where account_id = p_account_id
      and id = v_packing_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Paketleme kaydı bulunamadı.';
    end if;

    if v_packing.status <> 'released' then
      raise exception using
        errcode = '22023',
        message =
          'Yalnızca operasyona açılmış paketleme başlatılabilir.';
    end if;

    select count(*)
    into v_task_count
    from public.warehouse_packing_tasks
    where account_id = p_account_id
      and packing_id = v_packing.id;

    if v_task_count = 0 then
      raise exception using
        errcode = '22023',
        message =
          'Paketleme başlamadan önce en az bir paketleme görevi oluşturulmalıdır.';
    end if;

    update public.warehouse_packings
    set
      status = 'in_progress',
      started_at = now(),
      updated_at = now()
    where account_id = p_account_id
      and id = v_packing.id
    returning *
    into v_packing;

    v_result :=
      jsonb_build_object(
        'ok', true,
        'action', v_action,
        'packingId', v_packing.id,
        'status', v_packing.status,
        'startedAt',
          v_packing.started_at
      );

  -- ==========================================================
  -- CREATE CONTAINER
  -- ==========================================================

  elsif v_action = 'create_container' then
    v_code :=
      btrim(
        coalesce(
          v_payload ->> 'code',
          ''
        )
      );

    v_name :=
      btrim(
        coalesce(
          v_payload ->> 'name',
          ''
        )
      );

    v_type :=
      lower(
        btrim(
          coalesce(
            v_payload ->> 'type',
            ''
          )
        )
      );

    v_description :=
      nullif(
        btrim(v_payload ->> 'description'),
        ''
      );

    v_dimensions :=
      v_payload -> 'dimensions';

    v_empty_weight :=
      nullif(
        btrim(v_payload ->> 'emptyWeight'),
        ''
      )::numeric(18,6);

    v_maximum_weight :=
      nullif(
        btrim(v_payload ->> 'maximumWeight'),
        ''
      )::numeric(18,6);

    v_maximum_volume :=
      nullif(
        btrim(v_payload ->> 'maximumVolume'),
        ''
      )::numeric(18,6);

    v_weight_unit :=
      nullif(
        lower(
          btrim(v_payload ->> 'weightUnit')
        ),
        ''
      );

    v_volume_unit :=
      nullif(
        lower(
          btrim(v_payload ->> 'volumeUnit')
        ),
        ''
      );

    v_temperature_controlled :=
      coalesce(
        nullif(
          btrim(
            v_payload ->> 'temperatureControlled'
          ),
          ''
        )::boolean,
        false
      );

    v_hazardous_material_allowed :=
      coalesce(
        nullif(
          btrim(
            v_payload ->> 'hazardousMaterialAllowed'
          ),
          ''
        )::boolean,
        false
      );

    v_reusable :=
      coalesce(
        nullif(
          btrim(v_payload ->> 'reusable'),
          ''
        )::boolean,
        false
      );

    if v_code = ''
      or v_name = '' then

      raise exception using
        errcode = '22023',
        message =
          'Ambalaj kodu ve adı zorunludur.';
    end if;

    if not (
      v_type = any (
        array[
          'box',
          'carton',
          'crate',
          'pallet',
          'envelope',
          'bag',
          'thermal_box',
          'hazardous_container',
          'custom'
        ]::text[]
      )
    ) then
      raise exception using
        errcode = '22023',
        message =
          'Ambalaj türü geçersizdir.';
    end if;

    if v_dimensions is not null
      and jsonb_typeof(v_dimensions) <>
        'object' then

      raise exception using
        errcode = '22023',
        message =
          'Ambalaj ölçüleri JSON nesnesi olmalıdır.';
    end if;

    insert into public.warehouse_packing_containers (
      account_id,
      code,
      name,
      type,
      description,
      dimensions,
      empty_weight,
      maximum_weight,
      maximum_volume,
      weight_unit,
      volume_unit,
      temperature_controlled,
      hazardous_material_allowed,
      reusable,
      active,
      created_by
    )
    values (
      p_account_id,
      v_code,
      v_name,
      v_type,
      v_description,
      v_dimensions,
      v_empty_weight,
      v_maximum_weight,
      v_maximum_volume,
      v_weight_unit,
      v_volume_unit,
      v_temperature_controlled,
      v_hazardous_material_allowed,
      v_reusable,
      true,
      v_user_id
    )
    returning *
    into v_container;

    v_result :=
      jsonb_build_object(
        'ok', true,
        'action', v_action,
        'containerId', v_container.id,
        'code', v_container.code,
        'active', v_container.active
      );

  -- ==========================================================
  -- SET CONTAINER ACTIVE
  -- ==========================================================

  elsif v_action = 'set_container_active' then
    v_container_id :=
      nullif(
        btrim(v_payload ->> 'containerId'),
        ''
      )::uuid;

    v_active :=
      nullif(
        btrim(v_payload ->> 'active'),
        ''
      )::boolean;

    if v_container_id is null
      or v_active is null then

      raise exception using
        errcode = '22023',
        message =
          'Ambalaj kimliği ve aktiflik değeri zorunludur.';
    end if;

    select *
    into v_container
    from public.warehouse_packing_containers
    where account_id = p_account_id
      and id = v_container_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Ambalaj kaydı bulunamadı.';
    end if;

    update public.warehouse_packing_containers
    set
      active = v_active,
      updated_at = now()
    where account_id = p_account_id
      and id = v_container.id
    returning *
    into v_container;

    v_result :=
      jsonb_build_object(
        'ok', true,
        'action', v_action,
        'containerId', v_container.id,
        'active', v_container.active
      );

  -- ==========================================================
  -- CREATE PACKAGE
  -- ==========================================================

  elsif v_action = 'create_package' then
    v_packing_id :=
      nullif(
        btrim(v_payload ->> 'packingId'),
        ''
      )::uuid;

    v_container_id :=
      nullif(
        btrim(v_payload ->> 'containerId'),
        ''
      )::uuid;

    v_parent_package_id :=
      nullif(
        btrim(v_payload ->> 'parentPackageId'),
        ''
      )::uuid;

    v_weight_unit :=
      coalesce(
        nullif(
          lower(
            btrim(v_payload ->> 'weightUnit')
          ),
          ''
        ),
        'kg'
      );

    v_volume_unit :=
      coalesce(
        nullif(
          lower(
            btrim(v_payload ->> 'volumeUnit')
          ),
          ''
        ),
        'cm3'
      );

    if v_packing_id is null
      or v_container_id is null then

      raise exception using
        errcode = '22023',
        message =
          'Paketleme ve ambalaj kimliği zorunludur.';
    end if;

    select *
    into v_packing
    from public.warehouse_packings
    where account_id = p_account_id
      and id = v_packing_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Paketleme kaydı bulunamadı.';
    end if;

    if v_packing.status in (
      'packed',
      'shipping_ready',
      'cancelled'
    ) then
      raise exception using
        errcode = '22023',
        message =
          'Tamamlanmış veya iptal edilmiş paketleme için paket oluşturulamaz.';
    end if;

    select *
    into v_container
    from public.warehouse_packing_containers
    where account_id = p_account_id
      and id = v_container_id
      and active = true;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Aktif ambalaj kaydı bulunamadı.';
    end if;

    if v_parent_package_id is not null then
      perform 1
      from public.warehouse_packing_packages
      where account_id = p_account_id
        and packing_id = v_packing.id
        and id = v_parent_package_id
        and status <> 'cancelled';

      if not found then
        raise exception using
          errcode = 'P0002',
          message =
            'Geçerli üst paket bulunamadı.';
      end if;
    end if;

    v_package_number :=
      'PKT-' ||
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

    insert into public.warehouse_packing_packages (
      account_id,
      packing_id,
      package_number,
      container_id,
      parent_package_id,
      status,
      weight_unit,
      volume_unit,
      created_by
    )
    values (
      p_account_id,
      v_packing.id,
      v_package_number,
      v_container.id,
      v_parent_package_id,
      'open',
      v_weight_unit,
      v_volume_unit,
      v_user_id
    )
    returning *
    into v_package;

    v_result :=
      jsonb_build_object(
        'ok', true,
        'action', v_action,
        'packingId', v_packing.id,
        'packageId', v_package.id,
        'packageNumber',
          v_package.package_number,
        'status', v_package.status
      );

  -- ==========================================================
  -- CREATE TASK
  -- ==========================================================

  elsif v_action = 'create_task' then
    v_packing_id :=
      nullif(
        btrim(v_payload ->> 'packingId'),
        ''
      )::uuid;

    v_packing_item_id :=
      nullif(
        btrim(v_payload ->> 'packingItemId'),
        ''
      )::uuid;

    v_package_id :=
      nullif(
        btrim(v_payload ->> 'packageId'),
        ''
      )::uuid;

    v_warehouse_id :=
      nullif(
        btrim(v_payload ->> 'warehouseId'),
        ''
      )::uuid;

    v_packing_location_id :=
      nullif(
        btrim(v_payload ->> 'packingLocationId'),
        ''
      )::uuid;

    v_assigned_user_id :=
      nullif(
        btrim(v_payload ->> 'assignedUserId'),
        ''
      )::uuid;

    v_assigned_equipment_id :=
      nullif(
        btrim(v_payload ->> 'assignedEquipmentId'),
        ''
      );

    v_station_id :=
      nullif(
        btrim(v_payload ->> 'stationId'),
        ''
      );

    v_priority :=
      coalesce(
        nullif(
          btrim(v_payload ->> 'priority'),
          ''
        )::integer,
        50
      );

    v_sequence :=
      nullif(
        btrim(v_payload ->> 'sequence'),
        ''
      )::integer;

    v_planned_at :=
      case
        when nullif(
          btrim(v_payload ->> 'plannedAt'),
          ''
        ) is null then null
        else
          (v_payload ->> 'plannedAt')::timestamptz
      end;

    v_notes :=
      nullif(
        btrim(v_payload ->> 'notes'),
        ''
      );

    if v_packing_id is null
      or v_warehouse_id is null
      or v_packing_location_id is null then

      raise exception using
        errcode = '22023',
        message =
          'Paketleme, depo ve lokasyon kimliği zorunludur.';
    end if;

    select *
    into v_packing
    from public.warehouse_packings
    where account_id = p_account_id
      and id = v_packing_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Paketleme kaydı bulunamadı.';
    end if;

    if v_packing.status in (
      'packed',
      'shipping_ready',
      'cancelled'
    ) then
      raise exception using
        errcode = '22023',
        message =
          'Tamamlanmış veya iptal edilmiş paketleme için görev oluşturulamaz.';
    end if;

    if v_warehouse_id <>
        v_packing.warehouse_id
      or v_packing_location_id <>
        v_packing.packing_location_id then

      raise exception using
        errcode = '22023',
        message =
          'Görev depo ve lokasyonu paketleme kaydıyla aynı olmalıdır.';
    end if;

    if v_packing_item_id is not null then
      perform 1
      from public.warehouse_packing_items
      where account_id = p_account_id
        and packing_id = v_packing.id
        and id = v_packing_item_id;

      if not found then
        raise exception using
          errcode = 'P0002',
          message =
            'Görevin bağlı olduğu paketleme satırı bulunamadı.';
      end if;
    end if;

    if v_package_id is not null then
      perform 1
      from public.warehouse_packing_packages
      where account_id = p_account_id
        and packing_id = v_packing.id
        and id = v_package_id
        and status <> 'cancelled';

      if not found then
        raise exception using
          errcode = 'P0002',
          message =
            'Görevin bağlı olduğu paket bulunamadı.';
      end if;
    end if;

    if v_assigned_user_id is not null then
      perform 1
      from public.warehouse_users
      where account_id = p_account_id
        and user_id = v_assigned_user_id
        and status = 'active';

      if not found then
        raise exception using
          errcode = 'P0002',
          message =
            'Atanan kullanıcı aktif depo kullanıcısı değildir.';
      end if;
    end if;

    if v_priority < 1
      or v_priority > 100 then

      raise exception using
        errcode = '22023',
        message =
          'Görev önceliği 1 ile 100 arasında olmalıdır.';
    end if;

    if v_sequence is null then
      select coalesce(max(sequence), 0) + 1
      into v_sequence
      from public.warehouse_packing_tasks
      where account_id = p_account_id
        and packing_id = v_packing.id;
    end if;

    if v_sequence <= 0 then
      raise exception using
        errcode = '22023',
        message =
          'Görev sırası sıfırdan büyük olmalıdır.';
    end if;

    insert into public.warehouse_packing_tasks (
      account_id,
      packing_id,
      packing_item_id,
      package_id,
      warehouse_id,
      packing_location_id,
      assigned_user_id,
      assigned_equipment_id,
      station_id,
      status,
      priority,
      sequence,
      planned_at,
      notes,
      created_by
    )
    values (
      p_account_id,
      v_packing.id,
      v_packing_item_id,
      v_package_id,
      v_warehouse_id,
      v_packing_location_id,
      v_assigned_user_id,
      v_assigned_equipment_id,
      v_station_id,
      case
        when v_assigned_user_id is null
          then 'pending'
        else 'assigned'
      end,
      v_priority,
      v_sequence,
      v_planned_at,
      v_notes,
      v_user_id
    )
    returning *
    into v_task;

    v_result :=
      jsonb_build_object(
        'ok', true,
        'action', v_action,
        'packingId', v_packing.id,
        'packingTaskId', v_task.id,
        'status', v_task.status,
        'sequence', v_task.sequence
      );

  -- ==========================================================
  -- CREATE EXCEPTION
  -- ==========================================================

  elsif v_action = 'create_exception' then
    v_packing_id :=
      nullif(
        btrim(v_payload ->> 'packingId'),
        ''
      )::uuid;

    v_packing_item_id :=
      nullif(
        btrim(v_payload ->> 'packingItemId'),
        ''
      )::uuid;

    v_package_id :=
      nullif(
        btrim(v_payload ->> 'packageId'),
        ''
      )::uuid;

    v_container_id :=
      nullif(
        btrim(v_payload ->> 'containerId'),
        ''
      )::uuid;

    v_task_id :=
      nullif(
        btrim(v_payload ->> 'taskId'),
        ''
      )::uuid;

    v_exception_type :=
      lower(
        btrim(
          coalesce(
            v_payload ->> 'type',
            ''
          )
        )
      );

    v_message :=
      btrim(
        coalesce(
          v_payload ->> 'message',
          ''
        )
      );

    v_warehouse_id :=
      nullif(
        btrim(v_payload ->> 'warehouseId'),
        ''
      )::uuid;

    v_location_id :=
      nullif(
        btrim(v_payload ->> 'locationId'),
        ''
      )::uuid;

    v_product_id :=
      nullif(
        btrim(v_payload ->> 'productId'),
        ''
      )::uuid;

    if v_packing_id is null then
      raise exception using
        errcode = '22023',
        message =
          'Paketleme kimliği zorunludur.';
    end if;

    if v_message = '' then
      raise exception using
        errcode = '22023',
        message =
          'Paketleme istisnası mesajı zorunludur.';
    end if;

    if not (
      v_exception_type = any (
        array[
          'item_missing',
          'item_excess',
          'wrong_product',
          'wrong_barcode',
          'wrong_lot',
          'wrong_serial_number',
          'damaged_product',
          'weight_mismatch',
          'volume_exceeded',
          'container_capacity_exceeded',
          'container_not_compatible',
          'temperature_mismatch',
          'hazardous_material_mismatch',
          'label_generation_failed',
          'label_print_failed',
          'seal_required',
          'seal_mismatch'
        ]::text[]
      )
    ) then
      raise exception using
        errcode = '22023',
        message =
          'Paketleme istisna türü geçersizdir.';
    end if;

    select *
    into v_packing
    from public.warehouse_packings
    where account_id = p_account_id
      and id = v_packing_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Paketleme kaydı bulunamadı.';
    end if;

    if v_packing.status in (
      'packed',
      'shipping_ready',
      'cancelled'
    ) then
      raise exception using
        errcode = '22023',
        message =
          'Tamamlanmış veya iptal edilmiş paketleme için istisna oluşturulamaz.';
    end if;

    if v_packing_item_id is not null then
      perform 1
      from public.warehouse_packing_items
      where account_id = p_account_id
        and packing_id = v_packing.id
        and id = v_packing_item_id;

      if not found then
        raise exception using
          errcode = 'P0002',
          message =
            'İstisnanın paketleme satırı bulunamadı.';
      end if;
    end if;

    if v_package_id is not null then
      perform 1
      from public.warehouse_packing_packages
      where account_id = p_account_id
        and packing_id = v_packing.id
        and id = v_package_id;

      if not found then
        raise exception using
          errcode = 'P0002',
          message =
            'İstisnanın paket kaydı bulunamadı.';
      end if;
    end if;

    if v_container_id is not null then
      perform 1
      from public.warehouse_packing_containers
      where account_id = p_account_id
        and id = v_container_id;

      if not found then
        raise exception using
          errcode = 'P0002',
          message =
            'İstisnanın ambalaj kaydı bulunamadı.';
      end if;
    end if;

    if v_task_id is not null then
      perform 1
      from public.warehouse_packing_tasks
      where account_id = p_account_id
        and packing_id = v_packing.id
        and id = v_task_id;

      if not found then
        raise exception using
          errcode = 'P0002',
          message =
            'İstisnanın paketleme görevi bulunamadı.';
      end if;
    end if;

    if v_location_id is not null
      and v_warehouse_id is null then

      raise exception using
        errcode = '22023',
        message =
          'Lokasyon verildiğinde depo kimliği de zorunludur.';
    end if;

    if v_warehouse_id is not null then
      if v_warehouse_id <>
        v_packing.warehouse_id then

        raise exception using
          errcode = '22023',
          message =
            'İstisna deposu paketleme deposuyla aynı olmalıdır.';
      end if;

      if v_location_id is not null then
        perform 1
        from public.warehouse_locations
        where account_id = p_account_id
          and warehouse_id = v_warehouse_id
          and id = v_location_id;

        if not found then
          raise exception using
            errcode = 'P0002',
            message =
              'İstisna lokasyonu depo ile eşleşmiyor.';
        end if;
      end if;
    end if;

    if v_product_id is not null then
      perform 1
      from public.warehouse_products
      where account_id = p_account_id
        and id = v_product_id;

      if not found then
        raise exception using
          errcode = 'P0002',
          message =
            'İstisna ürünü bulunamadı.';
      end if;
    end if;

    insert into public.warehouse_packing_exceptions (
      account_id,
      packing_id,
      packing_item_id,
      package_id,
      container_id,
      task_id,
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
      v_packing_item_id,
      v_package_id,
      v_container_id,
      v_task_id,
      v_exception_type,
      v_message,
      v_warehouse_id,
      v_location_id,
      v_product_id,
      false,
      now(),
      now()
    )
    returning *
    into v_exception;

    v_result :=
      jsonb_build_object(
        'ok', true,
        'action', v_action,
        'packingId', v_packing.id,
        'packingExceptionId',
          v_exception.id,
        'type', v_exception.type,
        'resolved', v_exception.resolved
      );
  end if;

  -- ==========================================================
  -- COMPLETE IDEMPOTENCY ENTRY
  -- ==========================================================

  update public.warehouse_packing_write_requests
  set
    response_payload = v_result,
    completed_at = now()
  where account_id = p_account_id
    and request_id = p_request_id
    and user_id = v_user_id;

  return v_result;

exception
  when unique_violation then
    raise exception using
      errcode = '23505',
      message =
        'Aynı paketleme kaydı veya benzersiz referans daha önce oluşturulmuş.';
end;
$$;

revoke all on function public.warehouse_packing_write(
  text,
  uuid,
  uuid,
  jsonb
)
from public;

revoke all on function public.warehouse_packing_write(
  text,
  uuid,
  uuid,
  jsonb
)
from anon;

revoke all on function public.warehouse_packing_write(
  text,
  uuid,
  uuid,
  jsonb
)
from authenticated;

grant execute on function public.warehouse_packing_write(
  text,
  uuid,
  uuid,
  jsonb
)
to authenticated;
