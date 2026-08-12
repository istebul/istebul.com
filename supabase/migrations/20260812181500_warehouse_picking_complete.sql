-- =========================================================
-- WarehouseIQ — Explicit Picking Complete
-- EPIC-010F / A5.3
--
-- Complete yalnız lifecycle işlemi yapar.
--
-- Önkoşullar:
-- - caller JWT / yetkili Warehouse rolü
-- - stable idempotency
-- - parent in_progress / partially_completed
-- - en az bir Picking item
-- - tüm remaining_quantity = 0
-- - picked_quantity > 0 ise movement kanıtı
-- - çözülmemiş exception olmaması
--
-- Bu RPC:
-- - inventory balance değiştirmez,
-- - inventory movement oluşturmaz,
-- - reservation tüketmez,
-- - Picking item değiştirmez,
-- - Picking task değiştirmez.
-- =========================================================


-- =========================================================
-- Write request action sözleşmesi
--
-- A5.2 execute_item sonrası explicit complete aksiyonu açılır.
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
      'execute_item',
      'complete'
    )
  );


create or replace function public.warehouse_picking_complete_write(
  p_request_id uuid,
  p_account_id uuid,
  p_picking_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_picking_complete$
declare
  v_user_id uuid :=
    auth.uid();

  v_action constant text :=
    'complete';

  v_payload jsonb;

  v_existing_user_id uuid;
  v_existing_action text;
  v_existing_payload jsonb;
  v_existing_response jsonb;

  v_inserted integer := 0;

  v_picking public.warehouse_pickings%rowtype;

  v_item_count integer;
  v_open_item_count integer;
  v_missing_movement_count integer;
  v_unresolved_exception_count integer;

  v_now timestamptz :=
    now();

  v_result jsonb;
begin

  -- =======================================================
  -- AUTH / PARAMETRE
  -- =======================================================

  if v_user_id is null then
    raise exception using
      errcode = '28000',
      message =
        'Toplama tamamlama işlemi için oturum açmanız gerekir.';
  end if;

  if p_request_id is null then
    raise exception using
      errcode = '22023',
      message =
        'Idempotency-Key kimliği zorunludur.';
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
        'Bu firma için toplama tamamlama yetkiniz bulunmuyor.';
  end if;


  -- =======================================================
  -- CANONICAL IDEMPOTENCY
  -- =======================================================

  v_payload :=
    jsonb_build_object(
      'pickingId',
      p_picking_id
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
  where account_id =
      p_account_id
    and request_id =
      p_request_id
  for update;

  if found then

    if v_existing_user_id <>
      v_user_id then

      raise exception using
        errcode = '42501',
        message =
          'Bu istek kimliği başka bir kullanıcıya aittir.';
    end if;

    if v_existing_action <>
        v_action
      or v_existing_payload <>
        v_payload then

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
        'Aynı toplama tamamlama isteği halen işleniyor. Tekrar deneyin.';
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
    where account_id =
        p_account_id
      and request_id =
        p_request_id
    for update;

    if v_existing_user_id <>
      v_user_id then

      raise exception using
        errcode = '42501',
        message =
          'Bu istek kimliği başka bir kullanıcıya aittir.';
    end if;

    if v_existing_action <>
        v_action
      or v_existing_payload <>
        v_payload then

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
        'Aynı toplama tamamlama isteği halen işleniyor. Tekrar deneyin.';
  end if;


  -- =======================================================
  -- PARENT LOCK
  -- =======================================================

  select *
  into v_picking
  from public.warehouse_pickings
  where account_id =
      p_account_id
    and id =
      p_picking_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Toplama kaydı bulunamadı.';
  end if;

  if v_picking.status not in (
    'in_progress',
    'partially_completed'
  ) then

    raise exception using
      errcode = '22023',
      message =
        'Yalnızca devam eden toplama operasyonu tamamlanabilir.';
  end if;


  -- =======================================================
  -- ITEM PRECONDITIONS
  -- =======================================================

  select count(*)
  into v_item_count
  from public.warehouse_picking_items
  where account_id =
      p_account_id
    and picking_id =
      p_picking_id;

  if v_item_count = 0 then
    raise exception using
      errcode = '22023',
      message =
        'Ürün satırı bulunmayan toplama tamamlanamaz.';
  end if;


  select count(*)
  into v_open_item_count
  from public.warehouse_picking_items
  where account_id =
      p_account_id
    and picking_id =
      p_picking_id
    and remaining_quantity >
      0;

  if v_open_item_count > 0 then
    raise exception using
      errcode = '22023',
      message =
        'Kalan miktarı bulunan toplama satırları tamamlanmadan operasyon kapatılamaz.';
  end if;


  -- Toplanan miktarı bulunan her satırın gerçek stok
  -- hareketi kanıtı bulunmalıdır.
  select count(*)
  into v_missing_movement_count
  from public.warehouse_picking_items
  where account_id =
      p_account_id
    and picking_id =
      p_picking_id
    and picked_quantity >
      0
    and cardinality(
      coalesce(
        inventory_movement_ids,
        array[]::uuid[]
      )
    ) = 0;

  if v_missing_movement_count > 0 then
    raise exception using
      errcode = '22023',
      message =
        'Toplanan miktarı bulunan satırlarda stok hareketi kanıtı eksiktir.';
  end if;


  -- =======================================================
  -- UNRESOLVED EXCEPTIONS
  -- =======================================================

  select count(*)
  into v_unresolved_exception_count
  from public.warehouse_picking_exceptions
  where account_id =
      p_account_id
    and picking_id =
      p_picking_id
    and resolved =
      false;

  if v_unresolved_exception_count > 0 then
    raise exception using
      errcode = '22023',
      message =
        'Çözülmemiş toplama istisnaları varken operasyon tamamlanamaz.';
  end if;


  -- =======================================================
  -- LIFECYCLE ONLY
  -- =======================================================

  update public.warehouse_pickings
  set
    status =
      'completed',

    completed_at =
      v_now,

    updated_at =
      v_now

  where account_id =
      p_account_id
    and id =
      p_picking_id

  returning *
  into v_picking;

  if not found then
    raise exception using
      errcode = 'P0001',
      message =
        'Toplama tamamlanamadı.';
  end if;


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
      'pickingNumber',
        v_picking.picking_number,
      'status',
        v_picking.status,
      'completedAt',
        v_picking.completed_at
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
$warehouse_picking_complete$;


revoke all on function public.warehouse_picking_complete_write(
  uuid,
  uuid,
  uuid
)
from public;

revoke all on function public.warehouse_picking_complete_write(
  uuid,
  uuid,
  uuid
)
from anon;

revoke all on function public.warehouse_picking_complete_write(
  uuid,
  uuid,
  uuid
)
from authenticated;

grant execute on function public.warehouse_picking_complete_write(
  uuid,
  uuid,
  uuid
)
to authenticated;
