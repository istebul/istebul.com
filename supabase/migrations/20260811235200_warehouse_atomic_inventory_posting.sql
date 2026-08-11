-- WarehouseIQ — atomik inventory posting ve Receiving complete güvenliği
--
-- Amaç:
-- - Receiving complete stok posting akışını tek PostgreSQL transaction'ında yürütmek.
-- - Kullanıcı JWT kimliğini auth.uid() üzerinden korumak.
-- - Service role kullanmadan dar kapsamlı RPC yazma kapısı sağlamak.
-- - warehouse_inventory_balances tablosuna doğrudan authenticated INSERT/UPDATE erişimini kapatmak.
-- - Mevcut warehouse_receiving_write SECURITY INVOKER akışını değiştirmemek.

-- =========================================================
-- Receiving idempotency action sözleşmesi
-- =========================================================

alter table public.warehouse_receiving_write_requests
  drop constraint if exists warehouse_receiving_write_requests_action_check;

alter table public.warehouse_receiving_write_requests
  add constraint warehouse_receiving_write_requests_action_check
  check (
    action in (
      'create',
      'add_item',
      'start',
      'receive_quantity',
      'complete'
    )
  );

-- =========================================================
-- DB tabanlı benzersiz stok hareket numarası
-- =========================================================

create sequence if not exists public.warehouse_inventory_movement_number_seq;

-- Mevcut hareketlerden sequence güvenli başlangıcı.
-- Sequence bu migration transaction'ı commit edilmeden uygulama tarafından
-- kullanılamayacağı için mevcut ledger ile çakışmayacak noktaya taşınır.
do $warehouse_sequence_seed$
declare
  v_existing_max bigint := 0;
  v_sequence_last bigint := 1;
  v_sequence_called boolean := false;
  v_target bigint := 1;
begin
  select coalesce(
    max(
      (
        regexp_match(
          movement_number,
          '^HRK-[0-9]{8}-([0-9]+)$'
        )
      )[1]::bigint
    ),
    0
  )
  into v_existing_max
  from public.warehouse_inventory_movements
  where movement_number ~ '^HRK-[0-9]{8}-[0-9]+$';

  select last_value, is_called
  into v_sequence_last, v_sequence_called
  from public.warehouse_inventory_movement_number_seq;

  v_target := greatest(v_existing_max, v_sequence_last);

  if v_existing_max = 0 and not v_sequence_called then
    perform setval(
      'public.warehouse_inventory_movement_number_seq'::regclass,
      v_sequence_last,
      false
    );
  else
    perform setval(
      'public.warehouse_inventory_movement_number_seq'::regclass,
      v_target,
      true
    );
  end if;
end;
$warehouse_sequence_seed$;

-- Sequence numarası istemci tarafından tüketilemez.
revoke all
  on sequence public.warehouse_inventory_movement_number_seq
  from public;

revoke all
  on sequence public.warehouse_inventory_movement_number_seq
  from anon;

revoke all
  on sequence public.warehouse_inventory_movement_number_seq
  from authenticated;


-- =========================================================
-- Stok hareket defteri doğrudan istemci yazımına kapalı.
-- Movement + balance aynı atomik yazma kapısında birlikte değişmelidir.
drop policy if exists warehouse_inventory_movements_operator_insert
  on public.warehouse_inventory_movements;

revoke insert
  on public.warehouse_inventory_movements
  from authenticated;

grant select
  on public.warehouse_inventory_movements
  to authenticated;


-- Stok bakiyesi doğrudan yazma yüzeyini kapat
-- =========================================================

drop policy if exists warehouse_inventory_balances_operator_insert
  on public.warehouse_inventory_balances;

drop policy if exists warehouse_inventory_balances_operator_update
  on public.warehouse_inventory_balances;

revoke insert, update
  on public.warehouse_inventory_balances
  from authenticated;

grant select
  on public.warehouse_inventory_balances
  to authenticated;

-- =========================================================
-- Atomik Receiving complete + inventory posting
--
-- SECURITY DEFINER yalnız bu dar mutation kapısında kullanılır.
-- Kullanıcı kimliği auth.uid() ile alınır ve account rolü açıkça
-- doğrulanır. Fonksiyon PUBLIC'e kapalıdır.
-- =========================================================

create or replace function public.warehouse_receiving_complete_write(
  p_request_id uuid,
  p_account_id uuid,
  p_receiving_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();

  v_existing_action text;
  v_existing_payload jsonb;
  v_existing_response jsonb;
  v_inserted integer := 0;

  v_payload jsonb;
  v_result jsonb;

  v_receiving public.warehouse_receivings%rowtype;
  v_item public.warehouse_receiving_items%rowtype;

  v_item_count integer := 0;
  v_unprocessed_count integer := 0;
  v_quality_count integer := 0;
  v_posted_count integer := 0;

  v_movement_id uuid;
  v_movement_number text;
  v_movement_type text;
  v_balance_id uuid;

  v_completed_at timestamptz;
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

  if p_receiving_id is null then
    raise exception using
      errcode = '22023',
      message = 'Mal kabul kimliği zorunludur.';
  end if;

  if not public.warehouse_has_account_role(
    p_account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager',
      'supervisor',
      'inventory_controller',
      'receiver',
      'quality_controller',
      'operator'
    ]::text[]
  ) then
    raise exception using
      errcode = '42501',
      message = 'Bu firma için mal kabul tamamlama yetkiniz bulunmuyor.';
  end if;

  v_payload := jsonb_build_object(
    'receivingId',
    p_receiving_id::text
  );

  -- Aynı Idempotency-Key + aynı payload birebir aynı yanıtı döndürür.
  select
    action,
    payload,
    response
  into
    v_existing_action,
    v_existing_payload,
    v_existing_response
  from public.warehouse_receiving_write_requests
  where account_id = p_account_id
    and request_id = p_request_id;

  if found then
    if v_existing_action <> 'complete'
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

  insert into public.warehouse_receiving_write_requests (
    account_id,
    request_id,
    user_id,
    action,
    payload
  )
  values (
    p_account_id,
    p_request_id,
    v_user_id,
    'complete',
    v_payload
  )
  on conflict (account_id, request_id) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    select
      action,
      payload,
      response
    into
      v_existing_action,
      v_existing_payload,
      v_existing_response
    from public.warehouse_receiving_write_requests
    where account_id = p_account_id
      and request_id = p_request_id;

    if v_existing_action <> 'complete'
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

  -- Ana mal kabul satırı transaction boyunca kilitlenir.
  select *
  into v_receiving
  from public.warehouse_receivings
  where account_id = p_account_id
    and id = p_receiving_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Mal kabul kaydı bulunamadı.';
  end if;

  if v_receiving.status not in (
    'in_progress',
    'partially_received'
  ) then
    raise exception using
      errcode = '22023',
      message = 'Yalnızca devam eden mal kabul işlemi tamamlanabilir.';
  end if;

  -- Tüm satırlar aynı transaction içinde kilitlenir.
  perform 1
  from public.warehouse_receiving_items
  where account_id = p_account_id
    and receiving_id = p_receiving_id
  order by line_number
  for update;

  select count(*)
  into v_item_count
  from public.warehouse_receiving_items
  where account_id = p_account_id
    and receiving_id = p_receiving_id;

  if v_item_count = 0 then
    raise exception using
      errcode = '22023',
      message = 'Ürün satırı bulunmayan mal kabul tamamlanamaz.';
  end if;

  select count(*)
  into v_unprocessed_count
  from public.warehouse_receiving_items
  where account_id = p_account_id
    and receiving_id = p_receiving_id
    and received_quantity = 0;

  if v_unprocessed_count > 0 then
    raise exception using
      errcode = '22023',
      message = 'Hiç işlem görmemiş ürün satırları bulunduğu için mal kabul tamamlanamaz.';
  end if;

  -- Mevcut domain davranışı: kalite kontrol gereken accepted satır varsa
  -- bu çağrı stok posting yapmaz, receiving kalite kontrole geçer.
  select count(*)
  into v_quality_count
  from public.warehouse_receiving_items
  where account_id = p_account_id
    and receiving_id = p_receiving_id
    and quality_control_required
    and accepted_quantity > 0
    and inventory_movement_id is null;

  if v_quality_count > 0 then
    update public.warehouse_receivings
    set
      status = 'quality_control',
      updated_at = now()
    where account_id = p_account_id
      and id = p_receiving_id
    returning * into v_receiving;

    v_result := jsonb_build_object(
      'action', 'complete',
      'receivingId', v_receiving.id,
      'status', v_receiving.status,
      'postedMovementCount', 0
    );

    update public.warehouse_receiving_write_requests
    set
      response = v_result,
      completed_at = now()
    where account_id = p_account_id
      and request_id = p_request_id
      and user_id = v_user_id;

    return v_result;
  end if;

  v_completed_at := now();

  for v_item in
    select *
    from public.warehouse_receiving_items
    where account_id = p_account_id
      and receiving_id = p_receiving_id
    order by line_number
    for update
  loop
    if v_item.accepted_quantity <= 0
      or v_item.inventory_movement_id is not null then
      continue;
    end if;

    v_movement_type :=
      case v_receiving.source
        when 'purchase_order' then 'purchase_receipt'
        when 'advance_shipping_notice' then 'purchase_receipt'
        when 'production' then 'production_receipt'
        when 'customer_return' then 'customer_return'
        when 'manual' then 'goods_receipt'
        when 'warehouse_transfer' then null
        else null
      end;

    if v_movement_type is null then
      if v_receiving.source = 'warehouse_transfer' then
        raise exception using
          errcode = '22023',
          message = 'Depolar arası transfer kabulü Transfer Engine tamamlandıktan sonra etkinleştirilecektir.';
      end if;

      raise exception using
        errcode = '22023',
        message = 'Mal kabul kaynağı için stok hareket türü belirlenemedi.';
    end if;

    v_movement_id := gen_random_uuid();
    v_movement_number :=
      'HRK-'
      || to_char(v_completed_at, 'YYYYMMDD')
      || '-'
      || lpad(
        nextval(
          'public.warehouse_inventory_movement_number_seq'
        )::text,
        6,
        '0'
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
      notes,
      occurred_at,
      created_by
    )
    values (
      v_movement_id,
      p_account_id,
      v_movement_number,
      v_movement_type,
      'inbound',
      v_item.warehouse_id,
      v_item.receiving_location_id,
      v_item.product_id,
      v_item.sku_id,
      v_item.stock_status,
      v_item.accepted_quantity,
      v_item.unit,
      v_item.lot_number,
      v_item.serial_number,
      v_item.production_date,
      v_item.expiry_date,
      'receiving',
      v_receiving.id::text,
      v_receiving.receiving_number,
      v_item.notes,
      v_completed_at,
      v_user_id
    );

    v_balance_id := null;

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
      v_item.receiving_location_id,
      v_item.product_id,
      v_item.sku_id,
      v_item.lot_number,
      v_item.serial_number,
      v_item.stock_status,
      v_item.accepted_quantity,
      v_item.unit,
      v_movement_id,
      v_completed_at
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
    returning id into v_balance_id;

    if v_balance_id is null then
      raise exception using
        errcode = '22023',
        message = 'Aynı stok bakiyesi farklı ölçü birimleriyle güncellenemez.';
    end if;

    update public.warehouse_receiving_items
    set
      inventory_movement_id = v_movement_id,
      updated_at = v_completed_at
    where account_id = p_account_id
      and receiving_id = p_receiving_id
      and id = v_item.id;

    v_posted_count := v_posted_count + 1;
  end loop;

  update public.warehouse_receivings
  set
    status = 'completed',
    completed_at = v_completed_at,
    updated_at = v_completed_at
  where account_id = p_account_id
    and id = p_receiving_id
  returning * into v_receiving;

  v_result := jsonb_build_object(
    'action', 'complete',
    'receivingId', v_receiving.id,
    'status', v_receiving.status,
    'completedAt', v_receiving.completed_at,
    'postedMovementCount', v_posted_count
  );

  update public.warehouse_receiving_write_requests
  set
    response = v_result,
    completed_at = v_completed_at
  where account_id = p_account_id
    and request_id = p_request_id
    and user_id = v_user_id;

  return v_result;
end;
$$;

revoke all on function public.warehouse_receiving_complete_write(
  uuid,
  uuid,
  uuid
) from public;

grant execute on function public.warehouse_receiving_complete_write(
  uuid,
  uuid,
  uuid
) to authenticated;
