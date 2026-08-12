-- =========================================================
-- WarehouseIQ · Putaway Write Foundation
-- EPIC-010E / A4.1
--
-- Bu RPC yalnız stok hareketi üretmeyen Putaway işlemlerini kapsar:
-- create / add_item / start
--
-- execute_item ve complete bu fonksiyonda YOKTUR.
-- Stok lokasyon transferi ayrı atomik SECURITY DEFINER kapısında kurulacaktır.
-- =========================================================

create or replace function public.warehouse_putaway_write(
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
  v_action text := lower(btrim(coalesce(p_action, '')));
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_user_id uuid := auth.uid();

  v_existing_action text;
  v_existing_payload jsonb;
  v_existing_response jsonb;
  v_inserted integer := 0;

  v_putaway public.warehouse_putaways%rowtype;
  v_item public.warehouse_putaway_items%rowtype;
  v_receiving public.warehouse_receivings%rowtype;

  v_putaway_id uuid;
  v_putaway_item_id uuid;
  v_warehouse_id uuid;
  v_source_location_id uuid;
  v_target_location_id uuid;
  v_product_id uuid;
  v_sku_id uuid;
  v_receiving_id uuid;

  v_strategy text;
  v_unit text;
  v_stock_status text;

  v_requested_quantity numeric(18,6);
  v_line_number integer;
  v_item_count integer;

  v_planned_at timestamptz;
  v_production_date date;
  v_expiry_date date;

  v_result jsonb;
begin
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
        'start'
      ]::text[]
    )
  ) then
    raise exception using
      errcode = '22023',
      message = 'Desteklenmeyen yerleştirme işlemi.';
  end if;

  if not public.warehouse_has_account_role(
    p_account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager',
      'supervisor',
      'inventory_controller',
      'forklift_operator',
      'operator'
    ]::text[]
  ) then
    raise exception using
      errcode = '42501',
      message = 'Bu firma için yerleştirme yazma yetkiniz bulunmuyor.';
  end if;

  -- Aynı Idempotency-Key + aynı action + aynı payload aynı yanıtı döndürür.
  select
    action,
    request_payload,
    response_payload
  into
    v_existing_action,
    v_existing_payload,
    v_existing_response
  from public.warehouse_putaway_write_requests
  where account_id = p_account_id
    and request_id = p_request_id;

  if found then
    if v_existing_action <> v_action
      or v_existing_payload <> v_payload then
      raise exception using
        errcode = '23505',
        message = 'Aynı istek kimliği farklı bir işlem için kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception using
      errcode = '40001',
      message = 'Aynı istek halen işleniyor. Tekrar deneyin.';
  end if;

  insert into public.warehouse_putaway_write_requests (
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
  on conflict (account_id, request_id) do nothing;

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
    from public.warehouse_putaway_write_requests
    where account_id = p_account_id
      and request_id = p_request_id;

    if v_existing_action <> v_action
      or v_existing_payload <> v_payload then
      raise exception using
        errcode = '23505',
        message = 'Aynı istek kimliği farklı bir işlem için kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception using
      errcode = '40001',
      message = 'Aynı istek halen işleniyor. Tekrar deneyin.';
  end if;

  -- =======================================================
  -- CREATE
  -- =======================================================

  if v_action = 'create' then
    v_warehouse_id :=
      nullif(btrim(v_payload ->> 'warehouseId'), '')::uuid;

    v_source_location_id :=
      nullif(btrim(v_payload ->> 'sourceLocationId'), '')::uuid;

    v_strategy :=
      lower(btrim(coalesce(v_payload ->> 'strategy', '')));

    if v_warehouse_id is null then
      raise exception using
        errcode = '22023',
        message = 'Depo kimliği zorunludur.';
    end if;

    if v_source_location_id is null then
      raise exception using
        errcode = '22023',
        message = 'Kaynak lokasyon kimliği zorunludur.';
    end if;

    if not (
      v_strategy = any (
        array[
          'fixed_location',
          'dynamic_location',
          'nearest_location',
          'fifo',
          'fefo',
          'zone_based',
          'capacity_based',
          'temperature_based',
          'hazardous_material_based',
          'abc_class_based'
        ]::text[]
      )
    ) then
      raise exception using
        errcode = '22023',
        message = 'Yerleştirme stratejisi geçersizdir.';
    end if;

    perform 1
    from public.warehouses
    where account_id = p_account_id
      and id = v_warehouse_id;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'Depo kaydı bulunamadı.';
    end if;

    perform 1
    from public.warehouse_locations
    where account_id = p_account_id
      and warehouse_id = v_warehouse_id
      and id = v_source_location_id
      and active = true
      and status <> 'inactive';

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'Aktif kaynak lokasyon bulunamadı.';
    end if;

    if nullif(btrim(v_payload ->> 'receivingId'), '') is not null then
      v_receiving_id := (v_payload ->> 'receivingId')::uuid;

      select *
      into v_receiving
      from public.warehouse_receivings
      where account_id = p_account_id
        and id = v_receiving_id;

      if not found then
        raise exception using
          errcode = 'P0002',
          message = 'Bağlı mal kabul kaydı bulunamadı.';
      end if;

      if v_receiving.warehouse_id <> v_warehouse_id
        or v_receiving.receiving_location_id <> v_source_location_id then
        raise exception using
          errcode = '22023',
          message = 'Mal kabul depo ve kaynak lokasyonu yerleştirme kaydıyla aynı olmalıdır.';
      end if;
    else
      v_receiving_id := null;
    end if;

    if nullif(btrim(v_payload ->> 'qualityInspectionId'), '') is not null then
      raise exception using
        errcode = '22023',
        message = 'Kalite kontrol kaynaklı yerleştirme write sözleşmesi ayrıca etkinleştirilecektir.';
    end if;

    if nullif(btrim(v_payload ->> 'plannedAt'), '') is not null then
      v_planned_at := (v_payload ->> 'plannedAt')::timestamptz;
    else
      v_planned_at := null;
    end if;

    v_putaway_id := gen_random_uuid();

    insert into public.warehouse_putaways (
      id,
      account_id,
      putaway_number,
      warehouse_id,
      source_location_id,
      strategy,
      status,
      receiving_id,
      reference_type,
      reference_id,
      reference_number,
      planned_at,
      notes,
      created_by
    )
    values (
      v_putaway_id,
      p_account_id,
      'PUT-'
        || to_char(clock_timestamp(), 'YYYYMMDD-HH24MISSMS')
        || '-'
        || upper(substr(replace(v_putaway_id::text, '-', ''), 1, 6)),
      v_warehouse_id,
      v_source_location_id,
      v_strategy,
      'draft',
      v_receiving_id,
      nullif(btrim(v_payload ->> 'referenceType'), ''),
      nullif(btrim(v_payload ->> 'referenceId'), ''),
      nullif(btrim(v_payload ->> 'referenceNumber'), ''),
      v_planned_at,
      nullif(btrim(v_payload ->> 'notes'), ''),
      v_user_id
    )
    returning * into v_putaway;

    v_result := jsonb_build_object(
      'action', v_action,
      'putawayId', v_putaway.id,
      'putawayNumber', v_putaway.putaway_number,
      'status', v_putaway.status
    );

  -- =======================================================
  -- ADD ITEM
  -- =======================================================

  elsif v_action = 'add_item' then
    v_putaway_id :=
      nullif(btrim(v_payload ->> 'putawayId'), '')::uuid;

    v_product_id :=
      nullif(btrim(v_payload ->> 'productId'), '')::uuid;

    if nullif(btrim(v_payload ->> 'skuId'), '') is not null then
      v_sku_id := (v_payload ->> 'skuId')::uuid;
    else
      v_sku_id := null;
    end if;

    if nullif(btrim(v_payload ->> 'targetLocationId'), '') is not null then
      v_target_location_id :=
        (v_payload ->> 'targetLocationId')::uuid;
    else
      v_target_location_id := null;
    end if;

    v_requested_quantity :=
      nullif(btrim(v_payload ->> 'requestedQuantity'), '')::numeric;

    v_unit :=
      lower(btrim(coalesce(v_payload ->> 'unit', '')));

    v_stock_status :=
      lower(
        btrim(
          coalesce(v_payload ->> 'stockStatus', 'available')
        )
      );

    if v_putaway_id is null then
      raise exception using
        errcode = '22023',
        message = 'Yerleştirme kimliği zorunludur.';
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
        message = 'İstenen miktar sıfırdan büyük olmalıdır.';
    end if;

    if not (
      v_unit = any (
        array[
          'piece',
          'box',
          'case',
          'package',
          'pallet',
          'kilogram',
          'gram',
          'liter',
          'milliliter',
          'meter',
          'square_meter',
          'cubic_meter'
        ]::text[]
      )
    ) then
      raise exception using
        errcode = '22023',
        message = 'Ölçü birimi geçersizdir.';
    end if;

    if not (
      v_stock_status = any (
        array[
          'available',
          'reserved',
          'blocked',
          'quality_control',
          'damaged',
          'scrap',
          'disposal',
          'in_transit'
        ]::text[]
      )
    ) then
      raise exception using
        errcode = '22023',
        message = 'Stok durumu geçersizdir.';
    end if;

    -- Ana kayıt kilidi line_number yarışını da seri hale getirir.
    select *
    into v_putaway
    from public.warehouse_putaways
    where account_id = p_account_id
      and id = v_putaway_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'Yerleştirme kaydı bulunamadı.';
    end if;

    if v_putaway.status not in ('draft', 'planned') then
      raise exception using
        errcode = '22023',
        message = 'Yerleştirme satırı yalnızca taslak veya planlanmış kayda eklenebilir.';
    end if;

    perform 1
    from public.warehouse_products
    where account_id = p_account_id
      and id = v_product_id;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'Ürün kaydı bulunamadı.';
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
          message = 'SKU kaydı bulunamadı.';
      end if;
    end if;

    if v_target_location_id is not null then
      if v_target_location_id = v_putaway.source_location_id then
        raise exception using
          errcode = '22023',
          message = 'Kaynak ve hedef lokasyon aynı olamaz.';
      end if;

      perform 1
      from public.warehouse_locations
      where account_id = p_account_id
        and warehouse_id = v_putaway.warehouse_id
        and id = v_target_location_id
        and active = true
        and status not in ('blocked', 'maintenance', 'inactive');

      if not found then
        raise exception using
          errcode = 'P0002',
          message = 'Kullanılabilir hedef lokasyon bulunamadı.';
      end if;
    end if;

    if nullif(btrim(v_payload ->> 'suggestionId'), '') is not null then
      raise exception using
        errcode = '22023',
        message = 'Öneri seçimi ürün satırı oluşturulduktan sonra yapılmalıdır.';
    end if;

    if nullif(
      btrim(v_payload #>> '{tracking,productionDate}'),
      ''
    ) is not null then
      v_production_date :=
        (v_payload #>> '{tracking,productionDate}')::date;
    else
      v_production_date := null;
    end if;

    if nullif(
      btrim(v_payload #>> '{tracking,expiryDate}'),
      ''
    ) is not null then
      v_expiry_date :=
        (v_payload #>> '{tracking,expiryDate}')::date;
    else
      v_expiry_date := null;
    end if;

    if v_production_date is not null
      and v_expiry_date is not null
      and v_production_date > v_expiry_date then
      raise exception using
        errcode = '22023',
        message = 'Üretim tarihi son kullanma tarihinden sonra olamaz.';
    end if;

    select coalesce(max(line_number), 0) + 1
    into v_line_number
    from public.warehouse_putaway_items
    where account_id = p_account_id
      and putaway_id = v_putaway_id;

    v_putaway_item_id := gen_random_uuid();

    insert into public.warehouse_putaway_items (
      id,
      account_id,
      putaway_id,
      line_number,
      warehouse_id,
      source_location_id,
      target_location_id,
      product_id,
      sku_id,
      requested_quantity,
      placed_quantity,
      remaining_quantity,
      unit,
      stock_status,
      strategy,
      lot_number,
      serial_number,
      production_date,
      expiry_date,
      notes,
      created_by
    )
    values (
      v_putaway_item_id,
      p_account_id,
      v_putaway_id,
      v_line_number,
      v_putaway.warehouse_id,
      v_putaway.source_location_id,
      v_target_location_id,
      v_product_id,
      v_sku_id,
      v_requested_quantity,
      0,
      v_requested_quantity,
      v_unit,
      v_stock_status,
      v_putaway.strategy,
      nullif(btrim(v_payload #>> '{tracking,lotNumber}'), ''),
      nullif(btrim(v_payload #>> '{tracking,serialNumber}'), ''),
      v_production_date,
      v_expiry_date,
      nullif(btrim(v_payload ->> 'notes'), ''),
      v_user_id
    )
    returning * into v_item;

    v_result := jsonb_build_object(
      'action', v_action,
      'putawayId', v_item.putaway_id,
      'putawayItemId', v_item.id,
      'lineNumber', v_item.line_number,
      'status', v_putaway.status,
      'requestedQuantity', v_item.requested_quantity,
      'remainingQuantity', v_item.remaining_quantity
    );

  -- =======================================================
  -- START
  -- =======================================================

  elsif v_action = 'start' then
    v_putaway_id :=
      nullif(btrim(v_payload ->> 'putawayId'), '')::uuid;

    if v_putaway_id is null then
      raise exception using
        errcode = '22023',
        message = 'Yerleştirme kimliği zorunludur.';
    end if;

    select *
    into v_putaway
    from public.warehouse_putaways
    where account_id = p_account_id
      and id = v_putaway_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'Yerleştirme kaydı bulunamadı.';
    end if;

    if v_putaway.status not in ('draft', 'planned') then
      raise exception using
        errcode = '22023',
        message = 'Yalnızca taslak veya planlanmış yerleştirme başlatılabilir.';
    end if;

    select count(*)
    into v_item_count
    from public.warehouse_putaway_items
    where account_id = p_account_id
      and putaway_id = v_putaway_id;

    if v_item_count = 0 then
      raise exception using
        errcode = '22023',
        message = 'Yerleştirme başlatılmadan önce en az bir ürün satırı eklenmelidir.';
    end if;

    update public.warehouse_putaways
    set
      status = 'in_progress',
      started_at = now(),
      updated_at = now()
    where account_id = p_account_id
      and id = v_putaway_id
    returning * into v_putaway;

    v_result := jsonb_build_object(
      'action', v_action,
      'putawayId', v_putaway.id,
      'status', v_putaway.status,
      'startedAt', v_putaway.started_at
    );
  end if;

  update public.warehouse_putaway_write_requests
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
      message = case
        when v_action = 'create'
          then 'Bu mal kabul veya yerleştirme referansı daha önce kullanılmış.'
        else 'Aynı yerleştirme kaydı daha önce oluşturulmuş.'
      end;
end;
$$;

revoke all on function public.warehouse_putaway_write(
  text,
  uuid,
  uuid,
  jsonb
) from public;

grant execute on function public.warehouse_putaway_write(
  text,
  uuid,
  uuid,
  jsonb
) to authenticated;
