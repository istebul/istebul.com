-- =========================================================
-- WarehouseIQ — Atomik Picking Execute
-- EPIC-010F / A5.2
--
-- Tek PostgreSQL transaction içinde:
--
-- 1. Caller JWT / rol / idempotency doğrulanır.
-- 2. Picking parent + item kilitlenir.
-- 3. Kaynak/hedef lokasyon doğrulanır.
-- 4. Barkod / lot / seri doğrulanır.
-- 5. Bağlı stok rezervasyonu varsa kilitlenir.
-- 6. quantity > 0 ise kaynak stok azaltılır.
-- 7. quantity > 0 ise hedef stok artırılır.
-- 8. OUT + IN ledger hareketi oluşturulur.
-- 9. Bağlı rezervasyon aynı transaction içinde tüketilir.
-- 10. short-pick varsa istisna oluşturulur.
-- 11. Picking item/task/parent güncellenir.
--
-- execute_item hiçbir zaman Picking kaydını completed yapmaz.
-- Complete ayrı açık kullanıcı işlemi olarak kalır.
-- =========================================================

-- =========================================================
-- Write request action sözleşmesi
--
-- A4 persistence başlangıçta yalnız yönetim aksiyonlarını
-- kabul ediyordu. Atomik execute artık aynı idempotency
-- tablosunu kullandığı için execute_item açıkça constraint
-- kapsamına alınır.
-- =========================================================

alter table public.warehouse_picking_write_requests
  drop constraint if exists
    warehouse_picking_write_requests_action_check;

alter table public.warehouse_picking_write_requests
  add constraint warehouse_picking_write_requests_action_check
  check (
    action in (
      'create',
      'add_item',
      'release',
      'create_task',
      'start',
      'execute_item'
    )
  );


create or replace function public.warehouse_picking_execute_write(
  p_request_id uuid,
  p_account_id uuid,
  p_picking_id uuid,
  p_picking_item_id uuid,
  p_source_location_id uuid,
  p_destination_location_id uuid,
  p_quantity numeric,
  p_short_quantity numeric default 0,
  p_barcode text default null,
  p_lot_number text default null,
  p_serial_number text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_picking_execute$
declare
  v_user_id uuid := auth.uid();
  v_action constant text := 'execute_item';

  v_quantity numeric(18,6) :=
    coalesce(p_quantity, 0);

  v_short_quantity numeric(18,6) :=
    coalesce(p_short_quantity, 0);

  v_processed_quantity numeric(18,6);

  v_barcode text :=
    nullif(btrim(coalesce(p_barcode, '')), '');

  v_input_lot_number text :=
    nullif(btrim(coalesce(p_lot_number, '')), '');

  v_input_serial_number text :=
    nullif(btrim(coalesce(p_serial_number, '')), '');

  v_lot_number text;
  v_serial_number text;

  v_notes text :=
    nullif(btrim(coalesce(p_notes, '')), '');

  v_payload jsonb;

  v_existing_user_id uuid;
  v_existing_action text;
  v_existing_payload jsonb;
  v_existing_response jsonb;
  v_inserted integer := 0;

  v_picking public.warehouse_pickings%rowtype;
  v_item public.warehouse_picking_items%rowtype;

  v_source_location public.warehouse_locations%rowtype;
  v_destination_location public.warehouse_locations%rowtype;

  v_source_balance public.warehouse_inventory_balances%rowtype;

  v_reservation public.warehouse_inventory_reservations%rowtype;
  v_has_reservation boolean := false;

  v_reservation_remaining numeric(18,6);
  v_reservation_consumed numeric(18,6);
  v_reservation_status text;

  v_expected_destination_id uuid;

  v_now timestamptz := now();

  v_outbound_movement_id uuid;
  v_inbound_movement_id uuid;

  v_outbound_movement_number text;
  v_inbound_movement_number text;

  v_transaction_group_id text;
  v_target_balance_id uuid;

  v_movement_ids uuid[] := array[]::uuid[];
  v_transaction_group_ids text[] := array[]::text[];

  v_short_exception_id uuid;

  v_parent_status text;
  v_result jsonb;
begin

  -- =======================================================
  -- AUTH / PARAMETRE
  -- =======================================================

  if v_user_id is null then
    raise exception using
      errcode = '28000',
      message = 'Toplama işlemi için oturum açmanız gerekir.';
  end if;

  if p_request_id is null then
    raise exception using
      errcode = '22023',
      message = 'Idempotency-Key kimliği zorunludur.';
  end if;

  if p_account_id is null
    or p_picking_id is null
    or p_picking_item_id is null
    or p_source_location_id is null
    or p_destination_location_id is null then

    raise exception using
      errcode = '22023',
      message =
        'Firma, toplama, satır, kaynak ve hedef lokasyon kimlikleri zorunludur.';
  end if;

  if v_quantity < 0
    or v_short_quantity < 0 then

    raise exception using
      errcode = '22023',
      message =
        'Toplanan ve eksik bildirilen miktarlar negatif olamaz.';
  end if;

  v_processed_quantity :=
    v_quantity + v_short_quantity;

  if v_processed_quantity <= 0 then
    raise exception using
      errcode = '22023',
      message =
        'Toplanan veya eksik bildirilen miktarlardan en az biri sıfırdan büyük olmalıdır.';
  end if;

  if p_source_location_id =
    p_destination_location_id then

    raise exception using
      errcode = '22023',
      message =
        'Kaynak ve hedef lokasyon aynı olamaz.';
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
        'Bu firma için toplama uygulama yetkiniz bulunmuyor.';
  end if;


  -- =======================================================
  -- CANONICAL IDEMPOTENCY PAYLOAD
  -- =======================================================

  v_payload :=
    jsonb_build_object(
      'pickingId',
        p_picking_id,
      'pickingItemId',
        p_picking_item_id,
      'sourceLocationId',
        p_source_location_id,
      'destinationLocationId',
        p_destination_location_id,
      'quantity',
        v_quantity,
      'shortQuantity',
        v_short_quantity,
      'barcode',
        v_barcode,
      'lotNumber',
        v_input_lot_number,
      'serialNumber',
        v_input_serial_number,
      'notes',
        v_notes
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
  from public.warehouse_picking_write_requests
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
          'Aynı istek kimliği farklı bir toplama işlemi için kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception using
      errcode = '40001',
      message =
        'Aynı toplama isteği halen işleniyor. Tekrar deneyin.';
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
    from public.warehouse_picking_write_requests
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
          'Aynı istek kimliği farklı bir toplama işlemi için kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception using
      errcode = '40001',
      message =
        'Aynı toplama isteği halen işleniyor. Tekrar deneyin.';
  end if;


  -- =======================================================
  -- PICKING PARENT LOCK
  -- =======================================================

  select *
  into v_picking
  from public.warehouse_pickings
  where account_id = p_account_id
    and id = p_picking_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Toplama kaydı bulunamadı.';
  end if;

  if v_picking.status not in (
    'in_progress',
    'partially_completed'
  ) then

    raise exception using
      errcode = '22023',
      message =
        'Toplama onayı yalnızca devam eden operasyon üzerinde verilebilir.';
  end if;


  -- =======================================================
  -- PICKING ITEM LOCK
  -- =======================================================

  select *
  into v_item
  from public.warehouse_picking_items
  where account_id = p_account_id
    and picking_id = p_picking_id
    and id = p_picking_item_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Toplama satırı bulunamadı.';
  end if;

  if v_item.warehouse_id <>
    v_picking.warehouse_id then

    raise exception using
      errcode = '22023',
      message =
        'Toplama satırı ana kayıt deposuyla uyuşmamaktadır.';
  end if;

  if v_processed_quantity >
    v_item.remaining_quantity then

    raise exception using
      errcode = '22023',
      message =
        'Toplanan ve eksik bildirilen toplam miktar kalan miktarı aşamaz.';
  end if;

  if v_item.source_location_id is not null
    and v_item.source_location_id <>
      p_source_location_id then

    raise exception using
      errcode = '22023',
      message =
        'Okutulan kaynak lokasyon toplama satırındaki lokasyonla uyuşmamaktadır.';
  end if;

  v_expected_destination_id :=
    coalesce(
      v_item.destination_location_id,
      v_picking.destination_location_id
    );

  if p_destination_location_id <>
    v_expected_destination_id then

    raise exception using
      errcode = '22023',
      message =
        'Toplama hedef lokasyonu operasyonun hedef lokasyonuyla uyuşmamaktadır.';
  end if;


  -- =======================================================
  -- LOT / SERİ
  -- =======================================================

  if v_item.lot_number is not null
    and v_input_lot_number is null then

    raise exception using
      errcode = '22023',
      message =
        'Lot takipli ürün için lot numarası okutulmalıdır.';
  end if;

  if v_item.lot_number is not null
    and v_input_lot_number <>
      v_item.lot_number then

    raise exception using
      errcode = '22023',
      message =
        'Okutulan lot numarası toplama satırıyla uyuşmamaktadır.';
  end if;

  if v_item.serial_number is not null
    and v_input_serial_number is null then

    raise exception using
      errcode = '22023',
      message =
        'Seri numarası takipli ürün için seri numarası okutulmalıdır.';
  end if;

  if v_item.serial_number is not null
    and v_input_serial_number <>
      v_item.serial_number then

    raise exception using
      errcode = '22023',
      message =
        'Okutulan seri numarası toplama satırıyla uyuşmamaktadır.';
  end if;

  v_lot_number :=
    coalesce(
      v_input_lot_number,
      v_item.lot_number
    );

  v_serial_number :=
    coalesce(
      v_input_serial_number,
      v_item.serial_number
    );


  -- =======================================================
  -- ÜRÜN BARKODU — YALNIZ DOĞRULAMA
  -- =======================================================

  if v_barcode is not null then

    perform 1
    from public.warehouse_product_barcodes
    where account_id = p_account_id
      and value = v_barcode
      and active = true
      and product_id = v_item.product_id
      and (
        sku_id is null
        or sku_id is not distinct from
          v_item.sku_id
      );

    if not found then
      raise exception using
        errcode = '22023',
        message =
          'Okutulan ürün barkodu toplama satırıyla uyuşmamaktadır.';
    end if;
  end if;


  -- =======================================================
  -- SOURCE / DESTINATION LOCATION
  -- =======================================================

  select *
  into v_source_location
  from public.warehouse_locations
  where account_id = p_account_id
    and warehouse_id = v_item.warehouse_id
    and id = p_source_location_id
  for share;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Toplama kaynak lokasyonu bulunamadı.';
  end if;

  if not v_source_location.active
    or v_source_location.status in (
      'blocked',
      'maintenance',
      'inactive'
    ) then

    raise exception using
      errcode = '22023',
      message =
        'Toplama kaynak lokasyonu aktif ve kullanılabilir olmalıdır.';
  end if;

  select *
  into v_destination_location
  from public.warehouse_locations
  where account_id = p_account_id
    and warehouse_id = v_item.warehouse_id
    and id = p_destination_location_id
  for share;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Toplama hedef lokasyonu bulunamadı.';
  end if;

  if not v_destination_location.active
    or v_destination_location.status in (
      'blocked',
      'maintenance',
      'inactive'
    ) then

    raise exception using
      errcode = '22023',
      message =
        'Toplama hedef lokasyonu aktif ve kullanılabilir olmalıdır.';
  end if;


  -- =======================================================
  -- RESERVATION LOCK + VALIDATION
  -- =======================================================

  if v_item.reservation_id is not null then

    select *
    into v_reservation
    from public.warehouse_inventory_reservations
    where account_id = p_account_id
      and id = v_item.reservation_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Toplama satırına bağlı stok rezervasyonu bulunamadı.';
    end if;

    v_has_reservation := true;

    if v_reservation.status not in (
      'active',
      'partially_consumed'
    ) then

      raise exception using
        errcode = '22023',
        message =
          'Yalnızca aktif stok rezervasyonları tüketilebilir.';
    end if;

    if v_reservation.warehouse_id <>
        v_item.warehouse_id
      or v_reservation.location_id <>
        p_source_location_id
      or v_reservation.product_id <>
        v_item.product_id
      or v_reservation.sku_id
        is distinct from v_item.sku_id
      or v_reservation.unit <>
        v_item.unit then

      raise exception using
        errcode = '22023',
        message =
          'Rezervasyon bilgileri toplama satırıyla uyuşmamaktadır.';
    end if;

    if v_reservation.lot_number is not null
      and v_reservation.lot_number
        is distinct from v_lot_number then

      raise exception using
        errcode = '22023',
        message =
          'Rezervasyon lot numarası okutulan lot numarasıyla uyuşmamaktadır.';
    end if;

    if v_reservation.serial_number is not null
      and v_reservation.serial_number
        is distinct from v_serial_number then

      raise exception using
        errcode = '22023',
        message =
          'Rezervasyon seri numarası okutulan seri numarasıyla uyuşmamaktadır.';
    end if;

    v_reservation_remaining :=
      v_reservation.quantity -
      v_reservation.consumed_quantity;

    if v_quantity >
      v_reservation_remaining then

      raise exception using
        errcode = '22023',
        message =
          'Toplama miktarı kalan rezervasyon miktarını aşamaz.';
    end if;
  end if;


  -- =======================================================
  -- INVENTORY TRANSFER
  -- quantity = 0 olan tam short-pick burada stok yazmaz.
  -- =======================================================

  if v_quantity > 0 then

    -- Kaynak ve varsa hedef balance satırlarını deterministik
    -- sırada kilitle.
    perform 1
    from public.warehouse_inventory_balances
    where account_id = p_account_id
      and warehouse_id =
        v_item.warehouse_id
      and location_id in (
        p_source_location_id,
        p_destination_location_id
      )
      and product_id =
        v_item.product_id
      and sku_id
        is not distinct from
          v_item.sku_id
      and lot_number
        is not distinct from
          v_lot_number
      and serial_number
        is not distinct from
          v_serial_number
      and stock_status =
        v_item.stock_status
    order by location_id, id
    for update;

    select *
    into v_source_balance
    from public.warehouse_inventory_balances
    where account_id = p_account_id
      and warehouse_id =
        v_item.warehouse_id
      and location_id =
        p_source_location_id
      and product_id =
        v_item.product_id
      and sku_id
        is not distinct from
          v_item.sku_id
      and lot_number
        is not distinct from
          v_lot_number
      and serial_number
        is not distinct from
          v_serial_number
      and stock_status =
        v_item.stock_status;

    if not found then
      raise exception using
        errcode = '22023',
        message =
          'Kaynak lokasyonda toplanacak stok bakiyesi bulunamadı.';
    end if;

    if v_source_balance.unit <>
      v_item.unit then

      raise exception using
        errcode = '22023',
        message =
          'Kaynak stok bakiyesi ölçü birimi toplama satırıyla uyuşmuyor.';
    end if;

    if v_source_balance.quantity <
      v_quantity then

      raise exception using
        errcode = '22023',
        message =
          'Kaynak lokasyonda yeterli stok bulunmuyor.';
    end if;


    -- =====================================================
    -- MOVEMENT IDENTITIES
    -- =====================================================

    v_outbound_movement_id :=
      gen_random_uuid();

    v_inbound_movement_id :=
      gen_random_uuid();

    v_transaction_group_id :=
      'ISL-'
      || to_char(
        v_now,
        'YYYYMMDDHH24MISSMS'
      )
      || '-'
      || substr(
        replace(
          p_request_id::text,
          '-',
          ''
        ),
        1,
        8
      );

    v_outbound_movement_number :=
      'HRK-'
      || to_char(
        v_now,
        'YYYYMMDD'
      )
      || '-'
      || lpad(
        nextval(
          'public.warehouse_inventory_movement_number_seq'
        )::text,
        6,
        '0'
      );

    v_inbound_movement_number :=
      'HRK-'
      || to_char(
        v_now,
        'YYYYMMDD'
      )
      || '-'
      || lpad(
        nextval(
          'public.warehouse_inventory_movement_number_seq'
        )::text,
        6,
        '0'
      );


    -- =====================================================
    -- OUTBOUND LEDGER
    -- =====================================================

    insert into public.warehouse_inventory_movements (
      id,
      account_id,
      movement_number,
      movement_type,
      direction,
      warehouse_id,
      location_id,
      product_id,
      sku_id,
      source_warehouse_id,
      source_location_id,
      destination_warehouse_id,
      destination_location_id,
      stock_status,
      quantity,
      unit,
      lot_number,
      serial_number,
      production_date,
      expiry_date,
      reference_type,
      reference_id,
      reference_number,
      reason,
      notes,
      transaction_group_id,
      occurred_at,
      created_by
    )
    values (
      v_outbound_movement_id,
      p_account_id,
      v_outbound_movement_number,
      'manual_adjustment_out',
      'adjustment',
      v_item.warehouse_id,
      p_source_location_id,
      v_item.product_id,
      v_item.sku_id,
      v_item.warehouse_id,
      p_source_location_id,
      v_item.warehouse_id,
      p_destination_location_id,
      v_item.stock_status,
      v_quantity,
      v_item.unit,
      v_lot_number,
      v_serial_number,
      v_item.production_date,
      v_item.expiry_date,
      'picking',
      v_picking.id::text,
      v_picking.picking_number,
      'Sipariş toplama işlemi',
      v_notes,
      v_transaction_group_id,
      v_now,
      v_user_id
    );


    -- =====================================================
    -- INBOUND LEDGER
    -- =====================================================

    insert into public.warehouse_inventory_movements (
      id,
      account_id,
      movement_number,
      movement_type,
      direction,
      warehouse_id,
      location_id,
      product_id,
      sku_id,
      source_warehouse_id,
      source_location_id,
      destination_warehouse_id,
      destination_location_id,
      stock_status,
      quantity,
      unit,
      lot_number,
      serial_number,
      production_date,
      expiry_date,
      reference_type,
      reference_id,
      reference_number,
      reason,
      notes,
      transaction_group_id,
      occurred_at,
      created_by
    )
    values (
      v_inbound_movement_id,
      p_account_id,
      v_inbound_movement_number,
      'manual_adjustment_in',
      'adjustment',
      v_item.warehouse_id,
      p_destination_location_id,
      v_item.product_id,
      v_item.sku_id,
      v_item.warehouse_id,
      p_source_location_id,
      v_item.warehouse_id,
      p_destination_location_id,
      v_item.stock_status,
      v_quantity,
      v_item.unit,
      v_lot_number,
      v_serial_number,
      v_item.production_date,
      v_item.expiry_date,
      'picking',
      v_picking.id::text,
      v_picking.picking_number,
      'Sipariş toplama işlemi',
      v_notes,
      v_transaction_group_id,
      v_now,
      v_user_id
    );


    -- =====================================================
    -- SOURCE BALANCE DECREMENT
    -- =====================================================

    update public.warehouse_inventory_balances
    set
      quantity =
        quantity - v_quantity,
      last_movement_id =
        v_outbound_movement_id,
      last_movement_at =
        v_now,
      updated_at =
        v_now
    where id =
        v_source_balance.id
      and account_id =
        p_account_id;

    if not found then
      raise exception using
        errcode = 'P0001',
        message =
          'Kaynak stok bakiyesi güncellenemedi.';
    end if;


    -- =====================================================
    -- DESTINATION BALANCE UPSERT
    -- =====================================================

    v_target_balance_id := null;

    insert into public.warehouse_inventory_balances (
      account_id,
      warehouse_id,
      location_id,
      product_id,
      sku_id,
      lot_number,
      serial_number,
      stock_status,
      quantity,
      unit,
      last_movement_id,
      last_movement_at
    )
    values (
      p_account_id,
      v_item.warehouse_id,
      p_destination_location_id,
      v_item.product_id,
      v_item.sku_id,
      v_lot_number,
      v_serial_number,
      v_item.stock_status,
      v_quantity,
      v_item.unit,
      v_inbound_movement_id,
      v_now
    )
    on conflict (
      account_id,
      warehouse_id,
      location_id,
      product_id,
      sku_id,
      lot_number,
      serial_number,
      stock_status
    )
    do update
    set
      quantity =
        public.warehouse_inventory_balances.quantity
        + excluded.quantity,
      last_movement_id =
        excluded.last_movement_id,
      last_movement_at =
        excluded.last_movement_at
    where
      public.warehouse_inventory_balances.unit =
        excluded.unit
    returning id
    into v_target_balance_id;

    if v_target_balance_id is null then
      raise exception using
        errcode = '22023',
        message =
          'Hedef stok bakiyesi farklı ölçü birimiyle güncellenemez.';
    end if;

    v_movement_ids :=
      array[
        v_outbound_movement_id,
        v_inbound_movement_id
      ]::uuid[];

    v_transaction_group_ids :=
      array[
        v_transaction_group_id
      ]::text[];


    -- =====================================================
    -- RESERVATION CONSUME — AYNI TRANSACTION
    -- =====================================================

    if v_has_reservation then

      v_reservation_consumed :=
        v_reservation.consumed_quantity
        + v_quantity;

      v_reservation_status :=
        case
          when v_reservation_consumed =
            v_reservation.quantity
            then 'consumed'
          else 'partially_consumed'
        end;

      update public.warehouse_inventory_reservations
      set
        consumed_quantity =
          v_reservation_consumed,
        status =
          v_reservation_status,
        updated_at =
          v_now
      where account_id =
          p_account_id
        and id =
          v_reservation.id
      returning *
      into v_reservation;

      if not found then
        raise exception using
          errcode = 'P0001',
          message =
            'Stok rezervasyonu tüketilemedi.';
      end if;
    end if;

  end if;


  -- =======================================================
  -- SHORT PICK
  -- Stok hareketi oluşturmaz.
  -- =======================================================

  if v_short_quantity > 0 then

    v_short_exception_id :=
      gen_random_uuid();

    insert into public.warehouse_picking_exceptions (
      id,
      account_id,
      picking_id,
      picking_item_id,
      type,
      message,
      warehouse_id,
      location_id,
      product_id,
      resolved,
      created_at
    )
    values (
      v_short_exception_id,
      p_account_id,
      v_picking.id,
      v_item.id,
      'short_pick',
      'Eksik toplama kaydedildi. Eksik miktar: '
        || v_short_quantity::text,
      v_item.warehouse_id,
      p_source_location_id,
      v_item.product_id,
      false,
      v_now
    );
  end if;


  -- =======================================================
  -- PICKING ITEM UPDATE
  -- =======================================================

  update public.warehouse_picking_items
  set
    source_location_id =
      p_source_location_id,

    destination_location_id =
      p_destination_location_id,

    picked_quantity =
      picked_quantity + v_quantity,

    short_quantity =
      short_quantity + v_short_quantity,

    remaining_quantity =
      remaining_quantity - v_processed_quantity,

    lot_number =
      v_lot_number,

    serial_number =
      v_serial_number,

    tracking =
      jsonb_strip_nulls(
        coalesce(
          tracking,
          '{}'::jsonb
        )
        ||
        jsonb_build_object(
          'lotNumber',
            v_lot_number,
          'serialNumber',
            v_serial_number
        )
      ),

    inventory_movement_ids =
      coalesce(
        inventory_movement_ids,
        array[]::uuid[]
      )
      || v_movement_ids,

    transaction_group_ids =
      coalesce(
        transaction_group_ids,
        array[]::text[]
      )
      || v_transaction_group_ids,

    notes =
      coalesce(
        v_notes,
        notes
      ),

    updated_at =
      v_now

  where account_id =
      p_account_id
    and picking_id =
      v_picking.id
    and id =
      v_item.id

  returning *
  into v_item;

  if not found then
    raise exception using
      errcode = 'P0001',
      message =
        'Toplama satırı güncellenemedi.';
  end if;


  -- =======================================================
  -- RELATED TASK UPDATE
  -- =======================================================

  update public.warehouse_picking_tasks
  set
    status =
      case
        when v_item.remaining_quantity = 0
          then 'completed'
        else 'partially_completed'
      end,

    started_at =
      coalesce(
        started_at,
        v_now
      ),

    completed_at =
      case
        when v_item.remaining_quantity = 0
          then v_now
        else completed_at
      end,

    updated_at =
      v_now

  where account_id =
      p_account_id
    and picking_id =
      v_picking.id
    and picking_item_id =
      v_item.id
    and source_location_id =
      p_source_location_id;


  -- =======================================================
  -- PARENT STATUS
  --
  -- Açık satır varsa partially_completed.
  -- Tüm satırlar işlense bile in_progress.
  -- completed yalnız ayrı complete RPC ile verilir.
  -- =======================================================

  if exists (
    select 1
    from public.warehouse_picking_items
    where account_id =
        p_account_id
      and picking_id =
        v_picking.id
      and remaining_quantity > 0
  ) then

    v_parent_status :=
      'partially_completed';

  else

    v_parent_status :=
      'in_progress';

  end if;

  update public.warehouse_pickings
  set
    status =
      v_parent_status,
    updated_at =
      v_now
  where account_id =
      p_account_id
    and id =
      v_picking.id
  returning *
  into v_picking;


  -- =======================================================
  -- IDEMPOTENT RESPONSE
  -- =======================================================

  v_result :=
    jsonb_build_object(
      'ok',
        true,
      'action',
        v_action,
      'pickingId',
        v_picking.id,
      'pickingItemId',
        v_item.id,
      'status',
        v_picking.status,
      'sourceLocationId',
        v_item.source_location_id,
      'destinationLocationId',
        v_item.destination_location_id,
      'quantity',
        v_quantity,
      'shortQuantity',
        v_short_quantity,
      'pickedQuantity',
        v_item.picked_quantity,
      'totalShortQuantity',
        v_item.short_quantity,
      'remainingQuantity',
        v_item.remaining_quantity,
      'outboundMovementId',
        v_outbound_movement_id,
      'inboundMovementId',
        v_inbound_movement_id,
      'movementIds',
        to_jsonb(v_movement_ids),
      'transactionGroupId',
        v_transaction_group_id,
      'reservationId',
        v_item.reservation_id,
      'reservationStatus',
        case
          when v_has_reservation
            then v_reservation.status
          else null
        end,
      'reservationConsumedQuantity',
        case
          when v_has_reservation
            then v_reservation.consumed_quantity
          else null
        end,
      'shortPickExceptionId',
        v_short_exception_id
    );

  update public.warehouse_picking_write_requests
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
      v_user_id;

  return v_result;
end;
$warehouse_picking_execute$;


revoke all on function public.warehouse_picking_execute_write(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  numeric,
  numeric,
  text,
  text,
  text,
  text
)
from public;

revoke all on function public.warehouse_picking_execute_write(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  numeric,
  numeric,
  text,
  text,
  text,
  text
)
from anon;

revoke all on function public.warehouse_picking_execute_write(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  numeric,
  numeric,
  text,
  text,
  text,
  text
)
from authenticated;

grant execute on function public.warehouse_picking_execute_write(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  numeric,
  numeric,
  text,
  text,
  text,
  text
)
to authenticated;
