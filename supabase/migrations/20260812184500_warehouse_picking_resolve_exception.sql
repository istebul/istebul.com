-- =========================================================
-- WarehouseIQ — Picking Exception Resolution
-- EPIC-010F / A5.4
--
-- Bu RPC yalnız Picking operasyon istisnasını çözer.
--
-- Değiştirebildiği alanlar:
-- - warehouse_picking_exceptions.resolved
-- - warehouse_picking_exceptions.resolved_by
-- - warehouse_picking_exceptions.resolved_at
-- - warehouse_picking_exceptions.resolution_notes
-- - warehouse_picking_exceptions.updated_at
-- - idempotency response kaydı
--
-- Bu RPC:
-- - inventory balance değiştirmez,
-- - inventory movement oluşturmaz,
-- - reservation değiştirmez,
-- - Picking parent lifecycle değiştirmez,
-- - Picking item/task değiştirmez,
-- - complete işlemini otomatik çağırmaz.
-- =========================================================


-- =========================================================
-- Write request action sözleşmesi
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
      'complete',
      'resolve_exception'
    )
  );


create or replace function public.warehouse_picking_resolve_exception_write(
  p_request_id uuid,
  p_account_id uuid,
  p_picking_id uuid,
  p_exception_id uuid,
  p_resolution_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_picking_resolve_exception$
declare
  v_user_id uuid :=
    auth.uid();

  v_action constant text :=
    'resolve_exception';

  v_resolution_notes text :=
    nullif(
      btrim(
        coalesce(
          p_resolution_notes,
          ''
        )
      ),
      ''
    );

  v_payload jsonb;

  v_existing_user_id uuid;
  v_existing_action text;
  v_existing_payload jsonb;
  v_existing_response jsonb;

  v_inserted integer := 0;

  v_picking public.warehouse_pickings%rowtype;
  v_exception public.warehouse_picking_exceptions%rowtype;

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
        'Toplama istisnasını çözmek için oturum açmanız gerekir.';
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

  if p_exception_id is null then
    raise exception using
      errcode = '22023',
      message =
        'Toplama istisnası kimliği zorunludur.';
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
        'Bu firma için toplama istisnası çözme yetkiniz bulunmuyor.';
  end if;


  -- =======================================================
  -- CANONICAL IDEMPOTENCY
  -- =======================================================

  v_payload :=
    jsonb_build_object(
      'pickingId',
        p_picking_id,
      'exceptionId',
        p_exception_id,
      'resolutionNotes',
        v_resolution_notes
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
        'Aynı istisna çözüm isteği halen işleniyor. Tekrar deneyin.';
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
        'Aynı istisna çözüm isteği halen işleniyor. Tekrar deneyin.';
  end if;


  -- =======================================================
  -- PICKING ACCOUNT / SCOPE
  --
  -- Domain resolveException parent status kısıtı getirmiyor.
  -- Burada da yalnız tenant/picking varlığı doğrulanır.
  -- =======================================================

  select *
  into v_picking
  from public.warehouse_pickings
  where account_id =
      p_account_id
    and id =
      p_picking_id
  for share;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Toplama kaydı bulunamadı.';
  end if;


  -- =======================================================
  -- EXCEPTION LOCK
  -- =======================================================

  select *
  into v_exception
  from public.warehouse_picking_exceptions
  where account_id =
      p_account_id
    and picking_id =
      p_picking_id
    and id =
      p_exception_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Toplama istisnası bulunamadı.';
  end if;

  if v_exception.resolved then
    raise exception using
      errcode = '22023',
      message =
        'Toplama istisnası daha önce çözülmüş.';
  end if;


  -- =======================================================
  -- RESOLUTION ONLY
  -- =======================================================

  update public.warehouse_picking_exceptions
  set
    resolved =
      true,

    resolved_by =
      v_user_id,

    resolved_at =
      v_now,

    resolution_notes =
      v_resolution_notes,

    updated_at =
      v_now

  where account_id =
      p_account_id
    and picking_id =
      p_picking_id
    and id =
      p_exception_id

  returning *
  into v_exception;

  if not found then
    raise exception using
      errcode = 'P0001',
      message =
        'Toplama istisnası çözülemedi.';
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
      'exceptionId',
        v_exception.id,
      'exceptionType',
        v_exception.type,
      'resolved',
        v_exception.resolved,
      'resolvedBy',
        v_exception.resolved_by,
      'resolvedAt',
        v_exception.resolved_at,
      'resolutionNotes',
        v_exception.resolution_notes
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
$warehouse_picking_resolve_exception$;


revoke all on function public.warehouse_picking_resolve_exception_write(
  uuid,
  uuid,
  uuid,
  uuid,
  text
)
from public;

revoke all on function public.warehouse_picking_resolve_exception_write(
  uuid,
  uuid,
  uuid,
  uuid,
  text
)
from anon;

revoke all on function public.warehouse_picking_resolve_exception_write(
  uuid,
  uuid,
  uuid,
  uuid,
  text
)
from authenticated;

grant execute on function public.warehouse_picking_resolve_exception_write(
  uuid,
  uuid,
  uuid,
  uuid,
  text
)
to authenticated;
