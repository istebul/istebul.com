-- WarehouseIQ — Putaway explicit complete
-- EPIC-010E / A5.3.1
--
-- Güvenlik:
-- - Caller JWT kimliği auth.uid() üzerinden alınır.
-- - Service role kullanılmaz.
-- - PUBLIC / anon doğrudan çağrı yapamaz.
-- - authenticated yalnız dar complete RPC üzerinden mutation yapabilir.
-- - Aynı Idempotency-Key + aynı payload aynı sonucu döndürür.
--
-- Domain:
-- - Yalnız in_progress / partially_completed kayıtlar tamamlanabilir.
-- - En az bir ürün satırı bulunmalıdır.
-- - Tüm satırların remaining_quantity değeri sıfır olmalıdır.
-- - Her satırda en az bir inventory_movement_ids kaydı bulunmalıdır.
-- - Bu RPC stok transferi oluşturmaz; yalnız Putaway yaşam döngüsünü completed yapar.

create or replace function public.warehouse_putaway_complete_write(
  p_request_id uuid,
  p_account_id uuid,
  p_putaway_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_putaway_complete$
declare
  v_user_id uuid := auth.uid();
  v_action constant text := 'complete';

  v_payload jsonb;
  v_result jsonb;

  v_inserted integer := 0;
  v_existing_user_id uuid;
  v_existing_action text;
  v_existing_payload jsonb;
  v_existing_response jsonb;

  v_putaway public.warehouse_putaways%rowtype;
  v_item_count integer := 0;
  v_incomplete_count integer := 0;
  v_missing_movement_count integer := 0;
  v_now timestamptz := now();
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

  if p_putaway_id is null then
    raise exception using
      errcode = '22023',
      message = 'Yerleştirme kimliği zorunludur.';
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
      message = 'Bu firma için yerleştirme tamamlama yetkiniz bulunmuyor.';
  end if;

  v_payload := jsonb_build_object(
    'putawayId',
    p_putaway_id
  );

  -- Aynı account + request id için tek idempotency kaydı.
  -- ON CONFLICT eşzamanlı isteğin transaction sonucunu bekler.
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
        errcode = '40001',
        message = 'Aynı istek halen işleniyor. Tekrar deneyin.';
    end if;

    if v_existing_user_id <> v_user_id
      or v_existing_action <> v_action
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
      message = 'Yalnızca devam eden yerleştirme tamamlanabilir.';
  end if;

  -- Tüm satırlar deterministik sırada transaction boyunca kilitlenir.
  perform id
  from public.warehouse_putaway_items
  where account_id = p_account_id
    and putaway_id = p_putaway_id
  order by line_number, id
  for update;

  select count(*)
  into v_item_count
  from public.warehouse_putaway_items
  where account_id = p_account_id
    and putaway_id = p_putaway_id;

  if v_item_count = 0 then
    raise exception using
      errcode = '22023',
      message = 'Ürün satırı bulunmayan yerleştirme tamamlanamaz.';
  end if;

  select count(*)
  into v_incomplete_count
  from public.warehouse_putaway_items
  where account_id = p_account_id
    and putaway_id = p_putaway_id
    and remaining_quantity > 0;

  if v_incomplete_count > 0 then
    raise exception using
      errcode = '22023',
      message = 'Tüm ürünler yerleştirilmeden işlem tamamlanamaz.';
  end if;

  select count(*)
  into v_missing_movement_count
  from public.warehouse_putaway_items
  where account_id = p_account_id
    and putaway_id = p_putaway_id
    and coalesce(cardinality(inventory_movement_ids), 0) = 0;

  if v_missing_movement_count > 0 then
    raise exception using
      errcode = '22023',
      message = 'Stok hareketi bulunmayan yerleştirme satırı tamamlanamaz.';
  end if;

  update public.warehouse_putaways
  set
    status = 'completed',
    completed_at = v_now,
    updated_at = v_now
  where account_id = p_account_id
    and id = p_putaway_id
  returning * into v_putaway;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'Yerleştirme kaydı tamamlanamadı.';
  end if;

  v_result := jsonb_build_object(
    'action', v_action,
    'putawayId', v_putaway.id,
    'status', v_putaway.status,
    'completedAt', v_putaway.completed_at
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
$warehouse_putaway_complete$;

revoke all on function public.warehouse_putaway_complete_write(
  uuid,
  uuid,
  uuid
)
from public;

revoke all on function public.warehouse_putaway_complete_write(
  uuid,
  uuid,
  uuid
)
from anon;

grant execute on function public.warehouse_putaway_complete_write(
  uuid,
  uuid,
  uuid
)
to authenticated;
