-- WarehouseIQ — atomik Putaway execute + lokasyon içi stok transferi
--
-- Güvenlik:
-- - Caller JWT kimliği auth.uid() üzerinden alınır.
-- - Service role kullanılmaz.
-- - PUBLIC ve anon doğrudan çağrı yapamaz.
-- - authenticated yalnız dar RPC üzerinden mutation yapabilir.
-- - Idempotency-Key account bazında aynı payload için aynı sonucu döndürür.
--
-- Domain uyumu:
-- PutawayService.recordTransfer aynı depo içi transferi
-- manual_adjustment_out + manual_adjustment_in hareket çiftine dönüştürür.
-- Her iki hareket aynı transaction_group_id değerini taşır.
-- execute_item hiçbir zaman Putaway kaydını otomatik completed yapmaz.

create or replace function public.warehouse_putaway_execute_write(
  p_request_id uuid,
  p_account_id uuid,
  p_putaway_id uuid,
  p_putaway_item_id uuid,
  p_target_location_id uuid,
  p_quantity numeric,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_putaway_execute$
declare
  v_user_id uuid := auth.uid();
  v_action constant text := 'execute_item';

  v_notes text :=
    nullif(btrim(coalesce(p_notes, '')), '');

  v_payload jsonb;

  v_existing_user_id uuid;
  v_existing_action text;
  v_existing_payload jsonb;
  v_existing_response jsonb;

  v_putaway public.warehouse_putaways%rowtype;
  v_item public.warehouse_putaway_items%rowtype;
  v_target public.warehouse_locations%rowtype;
  v_source_balance public.warehouse_inventory_balances%rowtype;

  v_now timestamptz := now();

  v_transaction_group_id text;

  v_outbound_movement_id uuid := gen_random_uuid();
  v_inbound_movement_id uuid := gen_random_uuid();

  v_outbound_movement_number text;
  v_inbound_movement_number text;

  v_target_balance_id uuid;

  v_parent_status text;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using
      errcode = '28000',
      message = 'Yerleştirme işlemi için oturum açmanız gerekir.';
  end if;

  if p_request_id is null then
    raise exception using
      errcode = '22023',
      message = 'Idempotency-Key kimliği zorunludur.';
  end if;

  if p_account_id is null
    or p_putaway_id is null
    or p_putaway_item_id is null
    or p_target_location_id is null then
    raise exception using
      errcode = '22023',
      message = 'Firma, yerleştirme, satır ve hedef lokasyon kimlikleri zorunludur.';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception using
      errcode = '22023',
      message = 'Yerleştirilen miktar sıfırdan büyük olmalıdır.';
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
      message = 'Bu firma için yerleştirme uygulama yetkiniz bulunmuyor.';
  end if;

  v_payload := jsonb_build_object(
    'putawayId', p_putaway_id,
    'putawayItemId', p_putaway_item_id,
    'targetLocationId', p_target_location_id,
    'quantity', p_quantity,
    'notes', v_notes
  );

  -- Aynı request id için account içinde tek kayıt bulunur.
  -- INSERT yarışında ON CONFLICT bekler; ardından satır FOR UPDATE alınır.
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
  from public.warehouse_putaway_write_requests
  where account_id = p_account_id
    and request_id = p_request_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'Yerleştirme idempotency kaydı oluşturulamadı.';
  end if;

  if v_existing_user_id <> v_user_id then
    raise exception using
      errcode = '42501',
      message = 'Bu Idempotency-Key farklı bir kullanıcıya aittir.';
  end if;

  if v_existing_action <> v_action then
    raise exception using
      errcode = '22023',
      message = 'Aynı Idempotency-Key farklı bir işlem için kullanılamaz.';
  end if;

  if v_existing_payload <> v_payload then
    raise exception using
      errcode = '22023',
      message = 'Aynı Idempotency-Key farklı bir payload ile kullanılamaz.';
  end if;

  if v_existing_response is not null then
    return v_existing_response;
  end if;

  -- Ana Putaway kaydı transaction boyunca kilitlenir.
  select *
  into v_putaway
  from public.warehouse_putaways
  where account_id = p_account_id
    and id = p_putaway_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Yerleştirme kaydı bulunamadı.';
  end if;

  if v_putaway.status not in (
    'in_progress',
    'partially_completed'
  ) then
    raise exception using
      errcode = '22023',
      message = 'Yerleştirme yalnızca devam eden işlem üzerinde gerçekleştirilebilir.';
  end if;

  -- Putaway satırı da aynı transaction içinde kilitlenir.
  select *
  into v_item
  from public.warehouse_putaway_items
  where account_id = p_account_id
    and putaway_id = p_putaway_id
    and id = p_putaway_item_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Yerleştirme satırı bulunamadı.';
  end if;

  if v_item.warehouse_id <> v_putaway.warehouse_id
    or v_item.source_location_id <> v_putaway.source_location_id then
    raise exception using
      errcode = '22023',
      message = 'Yerleştirme satırı ana kayıt depo ve kaynak lokasyonuyla uyuşmuyor.';
  end if;

  if p_target_location_id = v_item.source_location_id then
    raise exception using
      errcode = '22023',
      message = 'Kaynak ve hedef lokasyon aynı olamaz.';
  end if;

  if p_quantity > v_item.remaining_quantity then
    raise exception using
      errcode = '22023',
      message = 'Yerleştirme miktarı kalan miktarı aşamaz.';
  end if;

  -- Hedef lokasyon aynı account + warehouse içinde olmalı,
  -- aktif olmalı ve operasyonu engelleyen durumda olmamalıdır.
  select *
  into v_target
  from public.warehouse_locations
  where account_id = p_account_id
    and warehouse_id = v_item.warehouse_id
    and id = p_target_location_id
  for share;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Hedef lokasyon bulunamadı.';
  end if;

  if not v_target.active
    or v_target.status in (
      'blocked',
      'maintenance',
      'inactive'
    ) then
    raise exception using
      errcode = '22023',
      message = 'Hedef lokasyon yerleştirme için aktif ve kullanılabilir olmalıdır.';
  end if;

  -- Kaynak ve varsa hedef balance satırlarını deterministik sırada kilitle.
  -- Natural key: account + warehouse + location + product + sku + lot +
  -- serial + stock_status. NULL değerleri IS NOT DISTINCT FROM ile eşleştirilir.
  perform 1
  from public.warehouse_inventory_balances
  where account_id = p_account_id
    and warehouse_id = v_item.warehouse_id
    and location_id in (
      v_item.source_location_id,
      p_target_location_id
    )
    and product_id = v_item.product_id
    and sku_id is not distinct from v_item.sku_id
    and lot_number is not distinct from v_item.lot_number
    and serial_number is not distinct from v_item.serial_number
    and stock_status = v_item.stock_status
  order by location_id, id
  for update;

  select *
  into v_source_balance
  from public.warehouse_inventory_balances
  where account_id = p_account_id
    and warehouse_id = v_item.warehouse_id
    and location_id = v_item.source_location_id
    and product_id = v_item.product_id
    and sku_id is not distinct from v_item.sku_id
    and lot_number is not distinct from v_item.lot_number
    and serial_number is not distinct from v_item.serial_number
    and stock_status = v_item.stock_status;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'Kaynak lokasyonda yerleştirilecek stok bakiyesi bulunamadı.';
  end if;

  if v_source_balance.unit <> v_item.unit then
    raise exception using
      errcode = '22023',
      message = 'Kaynak stok bakiyesi ölçü birimi yerleştirme satırıyla uyuşmuyor.';
  end if;

  if v_source_balance.quantity < p_quantity then
    raise exception using
      errcode = '22023',
      message = 'Kaynak lokasyonda yeterli stok bulunmuyor.';
  end if;

  v_transaction_group_id :=
    'ISL-'
    || to_char(v_now, 'YYYYMMDDHH24MISSMS')
    || '-'
    || substr(replace(p_request_id::text, '-', ''), 1, 8);

  v_outbound_movement_number :=
    'HRK-'
    || to_char(v_now, 'YYYYMMDD')
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
    || to_char(v_now, 'YYYYMMDD')
    || '-'
    || lpad(
      nextval(
        'public.warehouse_inventory_movement_number_seq'
      )::text,
      6,
      '0'
    );

  -- InventoryService.recordTransfer domain davranışı:
  -- aynı depo içinde manual_adjustment_out + manual_adjustment_in.
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
    v_item.source_location_id,
    v_item.product_id,
    v_item.sku_id,
    v_item.warehouse_id,
    v_item.source_location_id,
    v_item.warehouse_id,
    p_target_location_id,
    v_item.stock_status,
    p_quantity,
    v_item.unit,
    v_item.lot_number,
    v_item.serial_number,
    v_item.production_date,
    v_item.expiry_date,
    'putaway',
    v_putaway.id::text,
    v_putaway.putaway_number,
    'Depo içi yerleştirme işlemi',
    v_notes,
    v_transaction_group_id,
    v_now,
    v_user_id
  );

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
    p_target_location_id,
    v_item.product_id,
    v_item.sku_id,
    v_item.warehouse_id,
    v_item.source_location_id,
    v_item.warehouse_id,
    p_target_location_id,
    v_item.stock_status,
    p_quantity,
    v_item.unit,
    v_item.lot_number,
    v_item.serial_number,
    v_item.production_date,
    v_item.expiry_date,
    'putaway',
    v_putaway.id::text,
    v_putaway.putaway_number,
    'Depo içi yerleştirme işlemi',
    v_notes,
    v_transaction_group_id,
    v_now,
    v_user_id
  );

  -- Kaynak stok eksiye düşemez; miktar daha önce kilit altında doğrulandı.
  update public.warehouse_inventory_balances
  set
    quantity = quantity - p_quantity,
    last_movement_id = v_outbound_movement_id,
    last_movement_at = v_now,
    updated_at = v_now
  where id = v_source_balance.id
    and account_id = p_account_id;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'Kaynak stok bakiyesi güncellenemedi.';
  end if;

  -- Hedef balance natural key ile atomik artırılır.
  -- Aynı key farklı unit ile mevcutsa WHERE nedeniyle RETURNING üretmez.
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
    p_target_location_id,
    v_item.product_id,
    v_item.sku_id,
    v_item.lot_number,
    v_item.serial_number,
    v_item.stock_status,
    p_quantity,
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
    last_movement_id = excluded.last_movement_id,
    last_movement_at = excluded.last_movement_at
  where public.warehouse_inventory_balances.unit = excluded.unit
  returning id into v_target_balance_id;

  if v_target_balance_id is null then
    raise exception using
      errcode = '22023',
      message = 'Hedef stok bakiyesi farklı ölçü birimiyle güncellenemez.';
  end if;

  update public.warehouse_putaway_items
  set
    target_location_id = p_target_location_id,
    placed_quantity = placed_quantity + p_quantity,
    remaining_quantity = remaining_quantity - p_quantity,
    inventory_movement_ids =
      coalesce(inventory_movement_ids, array[]::uuid[])
      || array[
        v_outbound_movement_id,
        v_inbound_movement_id
      ]::uuid[],
    transaction_group_ids =
      coalesce(transaction_group_ids, array[]::text[])
      || array[v_transaction_group_id]::text[],
    notes = coalesce(v_notes, notes),
    updated_at = v_now
  where account_id = p_account_id
    and putaway_id = p_putaway_id
    and id = p_putaway_item_id
  returning * into v_item;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'Yerleştirme satırı güncellenemedi.';
  end if;

  -- Domain uyumu:
  -- En az bir satırın remaining_quantity değeri > 0 ise partially_completed.
  -- Tüm satırlar yerleştirildiyse execute aşaması in_progress bırakılır.
  -- completed yalnız ayrı açık complete işleminde verilecektir.
  if exists (
    select 1
    from public.warehouse_putaway_items
    where account_id = p_account_id
      and putaway_id = p_putaway_id
      and remaining_quantity > 0
  ) then
    v_parent_status := 'partially_completed';
  else
    v_parent_status := 'in_progress';
  end if;

  update public.warehouse_putaways
  set
    status = v_parent_status,
    updated_at = v_now
  where account_id = p_account_id
    and id = p_putaway_id
  returning * into v_putaway;

  v_result := jsonb_build_object(
    'action', v_action,
    'putawayId', v_putaway.id,
    'putawayItemId', v_item.id,
    'status', v_putaway.status,
    'targetLocationId', v_item.target_location_id,
    'quantity', p_quantity,
    'placedQuantity', v_item.placed_quantity,
    'remainingQuantity', v_item.remaining_quantity,
    'outboundMovementId', v_outbound_movement_id,
    'inboundMovementId', v_inbound_movement_id,
    'movementIds', jsonb_build_array(
      v_outbound_movement_id,
      v_inbound_movement_id
    ),
    'transactionGroupId', v_transaction_group_id
  );

  update public.warehouse_putaway_write_requests
  set
    response_payload = v_result,
    completed_at = v_now
  where account_id = p_account_id
    and request_id = p_request_id
    and user_id = v_user_id;

  return v_result;
end;
$warehouse_putaway_execute$;

revoke all on function public.warehouse_putaway_execute_write(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  numeric,
  text
) from public;

revoke all on function public.warehouse_putaway_execute_write(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  numeric,
  text
) from anon;

grant execute on function public.warehouse_putaway_execute_write(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  numeric,
  text
) to authenticated;
