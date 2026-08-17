-- ============================================================
-- WarehouseIQ — A8.2.5
-- Atomic Packing Exception Resolution
--
-- Değiştirebildiği alanlar:
-- - warehouse_packing_exceptions.resolved
-- - warehouse_packing_exceptions.resolved_by
-- - warehouse_packing_exceptions.resolved_at
-- - warehouse_packing_exceptions.resolution_notes
-- - idempotency response kaydı
--
-- Değiştirmediği alanlar:
-- - Packing parent lifecycle
-- - Packing item
-- - Packing package
-- - Packing task
-- - Packing label
-- - Packing container
-- - Picking
-- - inventory balance / movement
--
-- complete işlemini otomatik başlatmaz.
-- ============================================================

create or replace function
  public.warehouse_packing_resolve_exception_write(
    p_request_id uuid,
    p_account_id uuid,
    p_packing_id uuid,
    p_exception_id uuid,
    p_resolution_notes text default null
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_packing_resolve_exception_write$
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

  v_packing public.warehouse_packings%rowtype;
  v_exception public.warehouse_packing_exceptions%rowtype;

  v_now timestamptz :=
    now();

  v_result jsonb;
begin
  -- ==========================================================
  -- AUTH / REQUIRED IDS
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
        'Idempotency-Key kimliği zorunludur.';
  end if;

  if p_account_id is null then
    raise exception using
      errcode = '22023',
      message =
        'Firma kimliği zorunludur.';
  end if;

  if p_packing_id is null then
    raise exception using
      errcode = '22023',
      message =
        'Paketleme kimliği zorunludur.';
  end if;

  if p_exception_id is null then
    raise exception using
      errcode = '22023',
      message =
        'Paketleme istisnası kimliği zorunludur.';
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
        'Bu firma için paketleme istisnası çözme yetkiniz bulunmuyor.';
  end if;

  -- ==========================================================
  -- CANONICAL IDEMPOTENCY
  -- ==========================================================

  v_payload :=
    jsonb_strip_nulls(
      jsonb_build_object(
        'packingId',
          p_packing_id,
        'exceptionId',
          p_exception_id,
        'resolutionNotes',
          v_resolution_notes
      )
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
  from public.warehouse_packing_write_requests
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
      user_id,
      action,
      request_payload,
      response_payload
    into
      v_existing_user_id,
      v_existing_action,
      v_existing_payload,
      v_existing_response
    from public.warehouse_packing_write_requests
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
  -- PACKING SCOPE
  --
  -- Domain parity:
  -- resolveException parent status üzerinden engel koymaz.
  -- Yalnız parentın account içinde gerçekten varlığı doğrulanır.
  -- ==========================================================

  select *
  into v_packing
  from public.warehouse_packings
  where account_id = p_account_id
    and id = p_packing_id
  for share;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Paketleme kaydı bulunamadı.';
  end if;

  -- ==========================================================
  -- EXCEPTION LOCK
  -- ==========================================================

  select *
  into v_exception
  from public.warehouse_packing_exceptions
  where account_id = p_account_id
    and packing_id = v_packing.id
    and id = p_exception_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Paketleme istisnası bulunamadı.';
  end if;

  if v_exception.resolved then
    raise exception using
      errcode = '22023',
      message =
        'Paketleme istisnası daha önce çözülmüş.';
  end if;

  -- ==========================================================
  -- ATOMIC RESOLUTION
  --
  -- resolvedBy istemciden alınmaz.
  -- Gerçek çözen kullanıcı auth.uid() değeridir.
  -- ==========================================================

  update public.warehouse_packing_exceptions
  set
    resolved =
      true,
    resolved_by =
      v_user_id,
    resolved_at =
      v_now,
    resolution_notes =
      v_resolution_notes
  where account_id = p_account_id
    and packing_id = v_packing.id
    and id = v_exception.id
  returning *
  into v_exception;

  -- ==========================================================
  -- RESPONSE
  -- ==========================================================

  v_result :=
    jsonb_strip_nulls(
      jsonb_build_object(
        'ok',
          true,
        'action',
          v_action,
        'packingId',
          v_packing.id,
        'exceptionId',
          v_exception.id,
        'type',
          v_exception.type,
        'message',
          v_exception.message,
        'resolved',
          v_exception.resolved,
        'resolvedBy',
          v_exception.resolved_by,
        'resolvedAt',
          v_exception.resolved_at,
        'resolutionNotes',
          v_exception.resolution_notes,
        'packingItemId',
          v_exception.packing_item_id,
        'packageId',
          v_exception.package_id,
        'containerId',
          v_exception.container_id,
        'taskId',
          v_exception.task_id,
        'warehouseId',
          v_exception.warehouse_id,
        'locationId',
          v_exception.location_id,
        'productId',
          v_exception.product_id
      )
    );

  update public.warehouse_packing_write_requests
  set
    response_payload =
      v_result,
    completed_at =
      v_now
  where account_id = p_account_id
    and request_id = p_request_id
    and user_id = v_user_id;

  return v_result;
end;
$warehouse_packing_resolve_exception_write$;


revoke all on function
  public.warehouse_packing_resolve_exception_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text
  )
from public;

revoke all on function
  public.warehouse_packing_resolve_exception_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text
  )
from anon;

revoke all on function
  public.warehouse_packing_resolve_exception_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text
  )
from authenticated;

grant execute on function
  public.warehouse_packing_resolve_exception_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text
  )
to authenticated;
