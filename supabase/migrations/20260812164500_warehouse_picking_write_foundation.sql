-- =========================================================
-- WarehouseIQ — Picking Write Foundation
-- EPIC-010F / A4
--
-- Bu RPC yalnız stok hareketi üretmeyen Picking işlemlerini
-- kapsar:
--
-- create
-- add_item
-- release
-- create_task
-- start
--
-- Bu fonksiyon:
-- - inventory balance değiştirmez,
-- - inventory movement oluşturmaz,
-- - reservation tüketmez,
-- - short-pick işlemez,
-- - Picking tamamlamaz,
-- - Picking iptal etmez.
--
-- Tüm çağrılar:
-- caller JWT + auth.uid()
-- account role kontrolü
-- account + request_id idempotency
-- tenant/depo/lokasyon bütünlüğü
-- üzerinden gerçekleştirilir.
-- =========================================================

create or replace function public.warehouse_picking_write(
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

  v_picking public.warehouse_pickings%rowtype;
  v_item public.warehouse_picking_items%rowtype;
  v_task public.warehouse_picking_tasks%rowtype;

  v_picking_id uuid;
  v_picking_item_id uuid;

  v_warehouse_id uuid;
  v_destination_location_id uuid;
  v_source_location_id uuid;

  v_product_id uuid;
  v_sku_id uuid;

  v_wave_id uuid;
  v_batch_id uuid;

  v_assigned_user_id uuid;
  v_assigned_equipment_id uuid;

  v_suggestion_id uuid;
  v_reservation_id uuid;

  v_strategy text;
  v_stock_status text;
  v_unit text;

  v_priority integer;
  v_sequence integer;
  v_line_number integer;

  v_requested_quantity numeric(18,6);

  v_lot_number text;
  v_serial_number text;
  v_production_date date;
  v_expiry_date date;

  v_tracking jsonb;

  v_planned_at timestamptz;

  v_reference_type text;
  v_reference_id text;
  v_reference_number text;

  v_order_id text;
  v_order_number text;

  v_notes text;

  v_picking_number text;

  v_item_count integer;
  v_task_count integer;
  v_duplicate_count integer;

  v_result jsonb;
begin

  -- =======================================================
  -- AUTH
  -- =======================================================

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
        'create_task',
        'start'
      ]::text[]
    )
  ) then
    raise exception using
      errcode = '22023',
      message = 'Desteklenmeyen toplama işlemi.';
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
      message = 'Bu firma için toplama yazma yetkiniz bulunmuyor.';
  end if;


  -- =======================================================
  -- IDEMPOTENCY
  -- =======================================================

  select
    action,
    request_payload,
    response_payload
  into
    v_existing_action,
    v_existing_payload,
    v_existing_response
  from public.warehouse_picking_write_requests
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

  insert into public.warehouse_picking_write_requests (
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
    from public.warehouse_picking_write_requests
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


  -- =======================================================
  -- CREATE
  -- =======================================================

  if v_action = 'create' then

    v_warehouse_id :=
      nullif(
        btrim(v_payload ->> 'warehouseId'),
        ''
      )::uuid;

    v_destination_location_id :=
      nullif(
        btrim(v_payload ->> 'destinationLocationId'),
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

    v_wave_id :=
      nullif(
        btrim(v_payload ->> 'waveId'),
        ''
      )::uuid;

    v_batch_id :=
      nullif(
        btrim(v_payload ->> 'batchId'),
        ''
      )::uuid;

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
        else (v_payload ->> 'plannedAt')::timestamptz
      end;

    if v_warehouse_id is null then
      raise exception using
        errcode = '22023',
        message = 'Depo kimliği zorunludur.';
    end if;

    if v_destination_location_id is null then
      raise exception using
        errcode = '22023',
        message =
          'Toplama hedef lokasyonu zorunludur.';
    end if;

    if not (
      v_strategy = any (
        array[
          'single_order',
          'batch',
          'wave',
          'zone',
          'cluster',
          'multi_order',
          'fifo',
          'fefo',
          'nearest_location',
          'route_optimized'
        ]::text[]
      )
    ) then
      raise exception using
        errcode = '22023',
        message = 'Toplama stratejisi geçersizdir.';
    end if;

    if v_priority < 1
      or v_priority > 100 then

      raise exception using
        errcode = '22023',
        message =
          'Toplama önceliği 1 ile 100 arasında olmalıdır.';
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
          'Toplama deposu bulunamadı veya bu firmaya ait değil.';
    end if;

    perform 1
    from public.warehouse_locations
    where account_id = p_account_id
      and warehouse_id = v_warehouse_id
      and id = v_destination_location_id;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Toplama hedef lokasyonu bulunamadı veya depo ile eşleşmiyor.';
    end if;

    if v_wave_id is not null then
      perform 1
      from public.warehouse_picking_waves
      where account_id = p_account_id
        and warehouse_id = v_warehouse_id
        and id = v_wave_id
        and status not in (
          'completed',
          'cancelled'
        );

      if not found then
        raise exception using
          errcode = 'P0002',
          message =
            'Toplama dalgası bulunamadı, depo ile eşleşmiyor veya kapalı.';
      end if;
    end if;

    if v_batch_id is not null then
      perform 1
      from public.warehouse_picking_batches
      where account_id = p_account_id
        and warehouse_id = v_warehouse_id
        and id = v_batch_id
        and status not in (
          'completed',
          'cancelled'
        );

      if not found then
        raise exception using
          errcode = 'P0002',
          message =
            'Toplama batch kaydı bulunamadı, depo ile eşleşmiyor veya kapalı.';
      end if;
    end if;

    v_picking_number :=
      'PK-' ||
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

    insert into public.warehouse_pickings (
      account_id,
      picking_number,
      warehouse_id,
      destination_location_id,
      strategy,
      status,
      order_id,
      order_number,
      wave_id,
      batch_id,
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
      v_picking_number,
      v_warehouse_id,
      v_destination_location_id,
      v_strategy,
      'draft',
      v_order_id,
      v_order_number,
      v_wave_id,
      v_batch_id,
      v_reference_type,
      v_reference_id,
      v_reference_number,
      v_priority,
      v_planned_at,
      v_notes,
      v_user_id
    )
    returning *
    into v_picking;

    v_result :=
      jsonb_build_object(
        'ok', true,
        'action', v_action,
        'pickingId', v_picking.id,
        'pickingNumber', v_picking.picking_number,
        'status', v_picking.status
      );


  -- =======================================================
  -- ADD ITEM
  -- =======================================================

  elsif v_action = 'add_item' then

    v_picking_id :=
      nullif(
        btrim(v_payload ->> 'pickingId'),
        ''
      )::uuid;

    v_warehouse_id :=
      nullif(
        btrim(v_payload ->> 'warehouseId'),
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

    v_source_location_id :=
      nullif(
        btrim(v_payload ->> 'sourceLocationId'),
        ''
      )::uuid;

    v_destination_location_id :=
      nullif(
        btrim(v_payload ->> 'destinationLocationId'),
        ''
      )::uuid;

    v_suggestion_id :=
      nullif(
        btrim(v_payload ->> 'suggestionId'),
        ''
      )::uuid;

    v_reservation_id :=
      nullif(
        btrim(v_payload ->> 'reservationId'),
        ''
      )::uuid;

    v_requested_quantity :=
      nullif(
        btrim(v_payload ->> 'requestedQuantity'),
        ''
      )::numeric(18,6);

    v_unit :=
      lower(
        btrim(
          coalesce(
            v_payload ->> 'unit',
            ''
          )
        )
      );

    v_stock_status :=
      lower(
        btrim(
          coalesce(
            v_payload ->> 'stockStatus',
            'available'
          )
        )
      );

    v_strategy :=
      lower(
        btrim(
          coalesce(
            v_payload ->> 'strategy',
            ''
          )
        )
      );

    v_tracking :=
      coalesce(
        v_payload -> 'tracking',
        '{}'::jsonb
      );

    if jsonb_typeof(v_tracking) <> 'object' then
      raise exception using
        errcode = '22023',
        message =
          'Ürün takip bilgisi JSON nesnesi olmalıdır.';
    end if;

    v_lot_number :=
      nullif(
        btrim(
          coalesce(
            v_tracking ->> 'lotNumber',
            ''
          )
        ),
        ''
      );

    v_serial_number :=
      nullif(
        btrim(
          coalesce(
            v_tracking ->> 'serialNumber',
            ''
          )
        ),
        ''
      );

    v_production_date :=
      case
        when nullif(
          btrim(
            coalesce(
              v_tracking ->> 'productionDate',
              ''
            )
          ),
          ''
        ) is null then null
        else
          (v_tracking ->> 'productionDate')::date
      end;

    v_expiry_date :=
      case
        when nullif(
          btrim(
            coalesce(
              v_tracking ->> 'expiryDate',
              ''
            )
          ),
          ''
        ) is null then null
        else
          (v_tracking ->> 'expiryDate')::date
      end;

    v_notes :=
      nullif(
        btrim(v_payload ->> 'notes'),
        ''
      );

    if v_picking_id is null then
      raise exception using
        errcode = '22023',
        message = 'Toplama kimliği zorunludur.';
    end if;

    if v_warehouse_id is null then
      raise exception using
        errcode = '22023',
        message = 'Depo kimliği zorunludur.';
    end if;

    if v_product_id is null then
      raise exception using
        errcode = '22023',
        message = 'Ürün kimliği zorunludur.';
    end if;

    if v_requested_quantity is null
      or v_requested_quantity <= 0 then

      raise exception using
        errcode = '22023',
        message =
          'İstenen toplama miktarı sıfırdan büyük olmalıdır.';
    end if;

    if v_unit = '' then
      raise exception using
        errcode = '22023',
        message =
          'Ölçü birimi zorunludur.';
    end if;

    if not (
      v_strategy = any (
        array[
          'single_order',
          'batch',
          'wave',
          'zone',
          'cluster',
          'multi_order',
          'fifo',
          'fefo',
          'nearest_location',
          'route_optimized'
        ]::text[]
      )
    ) then
      raise exception using
        errcode = '22023',
        message =
          'Toplama stratejisi geçersizdir.';
    end if;

    select *
    into v_picking
    from public.warehouse_pickings
    where account_id = p_account_id
      and id = v_picking_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'Toplama kaydı bulunamadı.';
    end if;

    if v_picking.status not in (
      'draft',
      'planned'
    ) then
      raise exception using
        errcode = '22023',
        message =
          'Toplama satırı yalnızca taslak veya planlanmış kayda eklenebilir.';
    end if;

    if v_warehouse_id <> v_picking.warehouse_id then
      raise exception using
        errcode = '22023',
        message =
          'Toplama satırındaki depo ana toplama kaydıyla aynı olmalıdır.';
    end if;

    v_destination_location_id :=
      coalesce(
        v_destination_location_id,
        v_picking.destination_location_id
      );

    if v_source_location_id is not null
      and v_source_location_id =
        v_destination_location_id then

      raise exception using
        errcode = '22023',
        message =
          'Kaynak ve hedef lokasyon aynı olamaz.';
    end if;

    perform 1
    from public.warehouse_products
    where account_id = p_account_id
      and id = v_product_id;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Toplama ürünü bulunamadı veya bu firmaya ait değil.';
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
            'Toplama SKU kaydı ürünle eşleşmiyor.';
      end if;
    end if;

    if v_source_location_id is not null then

      perform 1
      from public.warehouse_locations
      where account_id = p_account_id
        and warehouse_id = v_warehouse_id
        and id = v_source_location_id;

      if not found then
        raise exception using
          errcode = 'P0002',
          message =
            'Toplama kaynak lokasyonu depo ile eşleşmiyor.';
      end if;
    end if;

    perform 1
    from public.warehouse_locations
    where account_id = p_account_id
      and warehouse_id = v_warehouse_id
      and id = v_destination_location_id;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Toplama hedef lokasyonu depo ile eşleşmiyor.';
    end if;

    -- suggestion_id item↔suggestion döngüsel FK nedeniyle
    -- ilk satır oluşturma aşamasında desteklenmez.
    if v_suggestion_id is not null then
      raise exception using
        errcode = '22023',
        message =
          'Toplama önerisi bağlantısı ilk satır oluşturma işleminde kullanılamaz.';
    end if;

    select count(*)
    into v_duplicate_count
    from public.warehouse_picking_items
    where account_id = p_account_id
      and picking_id = v_picking.id
      and product_id = v_product_id
      and sku_id is not distinct from v_sku_id
      and unit = v_unit
      and source_location_id
        is not distinct from v_source_location_id
      and lot_number
        is not distinct from v_lot_number
      and serial_number
        is not distinct from v_serial_number;

    if v_duplicate_count > 0 then
      raise exception using
        errcode = '23505',
        message =
          'Aynı ürün, SKU, lokasyon ve takip bilgileriyle toplama satırı zaten bulunmaktadır.';
    end if;

    select coalesce(max(line_number), 0) + 1
    into v_line_number
    from public.warehouse_picking_items
    where account_id = p_account_id
      and picking_id = v_picking.id;

    insert into public.warehouse_picking_items (
      account_id,
      picking_id,
      line_number,
      warehouse_id,
      product_id,
      sku_id,
      requested_quantity,
      picked_quantity,
      short_quantity,
      remaining_quantity,
      unit,
      stock_status,
      strategy,
      lot_number,
      serial_number,
      production_date,
      expiry_date,
      tracking,
      source_location_id,
      destination_location_id,
      reservation_id,
      inventory_movement_ids,
      transaction_group_ids,
      notes,
      created_by
    )
    values (
      p_account_id,
      v_picking.id,
      v_line_number,
      v_warehouse_id,
      v_product_id,
      v_sku_id,
      v_requested_quantity,
      0,
      0,
      v_requested_quantity,
      v_unit,
      v_stock_status,
      v_strategy,
      v_lot_number,
      v_serial_number,
      v_production_date,
      v_expiry_date,
      v_tracking,
      v_source_location_id,
      v_destination_location_id,
      v_reservation_id,
      array[]::uuid[],
      array[]::text[],
      v_notes,
      v_user_id
    )
    returning *
    into v_item;

    v_result :=
      jsonb_build_object(
        'ok', true,
        'action', v_action,
        'pickingId', v_picking.id,
        'pickingItemId', v_item.id,
        'lineNumber', v_item.line_number,
        'remainingQuantity',
          v_item.remaining_quantity
      );


  -- =======================================================
  -- RELEASE
  -- =======================================================

  elsif v_action = 'release' then

    v_picking_id :=
      nullif(
        btrim(v_payload ->> 'pickingId'),
        ''
      )::uuid;

    if v_picking_id is null then
      raise exception using
        errcode = '22023',
        message =
          'Toplama kimliği zorunludur.';
    end if;

    select *
    into v_picking
    from public.warehouse_pickings
    where account_id = p_account_id
      and id = v_picking_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Toplama kaydı bulunamadı.';
    end if;

    if v_picking.status not in (
      'draft',
      'planned'
    ) then
      raise exception using
        errcode = '22023',
        message =
          'Yalnızca taslak veya planlanmış toplama kaydı operasyona açılabilir.';
    end if;

    select count(*)
    into v_item_count
    from public.warehouse_picking_items
    where account_id = p_account_id
      and picking_id = v_picking.id;

    if v_item_count = 0 then
      raise exception using
        errcode = '22023',
        message =
          'Toplama operasyona açılmadan önce en az bir ürün satırı eklenmelidir.';
    end if;

    perform 1
    from public.warehouse_picking_items
    where account_id = p_account_id
      and picking_id = v_picking.id
      and (
        requested_quantity <= 0
        or remaining_quantity <= 0
      )
    limit 1;

    if found then
      raise exception using
        errcode = '22023',
        message =
          'Geçersiz miktar içeren toplama satırı operasyona açılamaz.';
    end if;

    update public.warehouse_pickings
    set
      status = 'released',
      released_at = now()
    where account_id = p_account_id
      and id = v_picking.id
    returning *
    into v_picking;

    v_result :=
      jsonb_build_object(
        'ok', true,
        'action', v_action,
        'pickingId', v_picking.id,
        'status', v_picking.status,
        'releasedAt', v_picking.released_at
      );


  -- =======================================================
  -- CREATE TASK
  -- =======================================================

  elsif v_action = 'create_task' then

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

    v_source_location_id :=
      nullif(
        btrim(v_payload ->> 'sourceLocationId'),
        ''
      )::uuid;

    v_destination_location_id :=
      nullif(
        btrim(v_payload ->> 'destinationLocationId'),
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
      )::uuid;

    v_priority :=
      nullif(
        btrim(v_payload ->> 'priority'),
        ''
      )::integer;

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

    if v_picking_id is null then
      raise exception using
        errcode = '22023',
        message =
          'Toplama kimliği zorunludur.';
    end if;

    if v_warehouse_id is null then
      raise exception using
        errcode = '22023',
        message =
          'Görev depo kimliği zorunludur.';
    end if;

    if v_source_location_id is null then
      raise exception using
        errcode = '22023',
        message =
          'Görev kaynak lokasyonu zorunludur.';
    end if;

    select *
    into v_picking
    from public.warehouse_pickings
    where account_id = p_account_id
      and id = v_picking_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Toplama kaydı bulunamadı.';
    end if;

    if v_picking.status in (
      'completed',
      'cancelled'
    ) then
      raise exception using
        errcode = '22023',
        message =
          'Tamamlanmış veya iptal edilmiş toplama için görev oluşturulamaz.';
    end if;

    if v_warehouse_id <> v_picking.warehouse_id then
      raise exception using
        errcode = '22023',
        message =
          'Görev deposu toplama kaydıyla aynı olmalıdır.';
    end if;

    v_priority :=
      coalesce(
        v_priority,
        v_picking.priority
      );

    if v_priority < 1
      or v_priority > 100 then

      raise exception using
        errcode = '22023',
        message =
          'Görev önceliği 1 ile 100 arasında olmalıdır.';
    end if;

    perform 1
    from public.warehouse_locations
    where account_id = p_account_id
      and warehouse_id = v_warehouse_id
      and id = v_source_location_id;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Görev kaynak lokasyonu depo ile eşleşmiyor.';
    end if;

    if v_destination_location_id is not null then

      if v_destination_location_id =
        v_source_location_id then

        raise exception using
          errcode = '22023',
          message =
            'Görev kaynak ve hedef lokasyonu aynı olamaz.';
      end if;

      perform 1
      from public.warehouse_locations
      where account_id = p_account_id
        and warehouse_id = v_warehouse_id
        and id = v_destination_location_id;

      if not found then
        raise exception using
          errcode = 'P0002',
          message =
            'Görev hedef lokasyonu depo ile eşleşmiyor.';
      end if;
    end if;

    if v_picking_item_id is not null then

      select *
      into v_item
      from public.warehouse_picking_items
      where account_id = p_account_id
        and picking_id = v_picking.id
        and id = v_picking_item_id;

      if not found then
        raise exception using
          errcode = 'P0002',
          message =
            'Görevin bağlı olduğu toplama satırı bulunamadı.';
      end if;

      if v_item.source_location_id is not null
        and v_item.source_location_id <>
          v_source_location_id then

        raise exception using
          errcode = '22023',
          message =
            'Görev kaynak lokasyonu toplama satırıyla aynı olmalıdır.';
      end if;
    end if;

    if v_sequence is null then

      select
        coalesce(max(sequence), 0) + 1
      into v_sequence
      from public.warehouse_picking_tasks
      where account_id = p_account_id
        and picking_id = v_picking.id;
    end if;

    if v_sequence <= 0 then
      raise exception using
        errcode = '22023',
        message =
          'Görev sırası sıfırdan büyük olmalıdır.';
    end if;

    insert into public.warehouse_picking_tasks (
      account_id,
      picking_id,
      picking_item_id,
      warehouse_id,
      source_location_id,
      destination_location_id,
      assigned_user_id,
      assigned_equipment_id,
      status,
      priority,
      sequence,
      planned_at,
      notes,
      created_by
    )
    values (
      p_account_id,
      v_picking.id,
      v_picking_item_id,
      v_warehouse_id,
      v_source_location_id,
      v_destination_location_id,
      v_assigned_user_id,
      v_assigned_equipment_id,
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
        'pickingId', v_picking.id,
        'pickingTaskId', v_task.id,
        'status', v_task.status,
        'sequence', v_task.sequence
      );


  -- =======================================================
  -- START
  -- =======================================================

  elsif v_action = 'start' then

    v_picking_id :=
      nullif(
        btrim(v_payload ->> 'pickingId'),
        ''
      )::uuid;

    if v_picking_id is null then
      raise exception using
        errcode = '22023',
        message =
          'Toplama kimliği zorunludur.';
    end if;

    select *
    into v_picking
    from public.warehouse_pickings
    where account_id = p_account_id
      and id = v_picking_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Toplama kaydı bulunamadı.';
    end if;

    if v_picking.status <> 'released' then
      raise exception using
        errcode = '22023',
        message =
          'Yalnızca toplamaya açılmış kayıt başlatılabilir.';
    end if;

    select count(*)
    into v_task_count
    from public.warehouse_picking_tasks
    where account_id = p_account_id
      and picking_id = v_picking.id;

    if v_task_count = 0 then
      raise exception using
        errcode = '22023',
        message =
          'Toplama başlatılmadan önce en az bir toplama görevi oluşturulmalıdır.';
    end if;

    update public.warehouse_pickings
    set
      status = 'in_progress',
      started_at = now()
    where account_id = p_account_id
      and id = v_picking.id
    returning *
    into v_picking;

    v_result :=
      jsonb_build_object(
        'ok', true,
        'action', v_action,
        'pickingId', v_picking.id,
        'status', v_picking.status,
        'startedAt', v_picking.started_at
      );

  end if;


  -- =======================================================
  -- RESPONSE + IDEMPOTENCY COMPLETE
  -- =======================================================

  update public.warehouse_picking_write_requests
  set
    response_payload = v_result,
    completed_at = now()
  where account_id = p_account_id
    and request_id = p_request_id;

  return v_result;
end;
$$;


revoke all on function public.warehouse_picking_write(
  text,
  uuid,
  uuid,
  jsonb
)
from public;

revoke all on function public.warehouse_picking_write(
  text,
  uuid,
  uuid,
  jsonb
)
from anon;

revoke all on function public.warehouse_picking_write(
  text,
  uuid,
  uuid,
  jsonb
)
from authenticated;

grant execute on function public.warehouse_picking_write(
  text,
  uuid,
  uuid,
  jsonb
)
to authenticated;
