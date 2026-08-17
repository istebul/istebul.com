-- ============================================================
-- WarehouseIQ — A8.2.6
-- Atomic Packing Complete
--
-- Domain contract:
-- - parent status: in_progress | partially_packed
-- - tüm Packing item remaining_quantity = 0
-- - unresolved exception yok
-- - en az bir fiziksel package var
-- - tüm package statusları:
--     sealed | labelled | shipping_ready
--
-- Başarı:
-- - yalnız parent Packing status = packed
-- - packed_at = server timestamp
-- - updated_at = server timestamp
--
-- Bu RPC:
-- - package lifecycle değiştirmez
-- - shipping_ready yapmaz
-- - label lifecycle değiştirmez
-- - item/task/exception değiştirmez
-- - Picking değiştirmez
-- - inventory balance/movement değiştirmez
-- ============================================================

create or replace function
  public.warehouse_packing_complete_write(
    p_request_id uuid,
    p_account_id uuid,
    p_packing_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_packing_complete_write$
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

  v_packing public.warehouse_packings%rowtype;

  v_has_remaining boolean;
  v_has_unresolved boolean;
  v_package_count integer;
  v_has_invalid_package boolean;

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
        'Bu firma için paketleme tamamlama yetkiniz bulunmuyor.';
  end if;

  -- ==========================================================
  -- IDEMPOTENCY
  -- ==========================================================

  v_payload :=
    jsonb_build_object(
      'packingId',
      p_packing_id
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
  -- PARENT LOCK
  -- ==========================================================

  select *
  into v_packing
  from public.warehouse_packings
  where account_id = p_account_id
    and id = p_packing_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Paketleme kaydı bulunamadı.';
  end if;

  if v_packing.status not in (
    'in_progress',
    'partially_packed'
  ) then
    raise exception using
      errcode = '22023',
      message =
        'Yalnızca devam eden paketleme operasyonu tamamlanabilir.';
  end if;

  -- ==========================================================
  -- CHILD ROW LOCKS
  --
  -- Tüm production Packing mutationları parent scope üzerinden
  -- ilerler. Parent FOR UPDATE kilidiyle birlikte child setleri
  -- de atomik readiness değerlendirmesi için kilitlenir.
  -- ==========================================================

  perform 1
  from public.warehouse_packing_items
  where account_id = p_account_id
    and packing_id = v_packing.id
  for update;

  perform 1
  from public.warehouse_packing_exceptions
  where account_id = p_account_id
    and packing_id = v_packing.id
  for update;

  perform 1
  from public.warehouse_packing_packages
  where account_id = p_account_id
    and packing_id = v_packing.id
  for update;

  -- ==========================================================
  -- ITEM READINESS
  -- ==========================================================

  select exists (
    select 1
    from public.warehouse_packing_items
    where account_id = p_account_id
      and packing_id = v_packing.id
      and remaining_quantity > 0
  )
  into v_has_remaining;

  if v_has_remaining then
    raise exception using
      errcode = '22023',
      message =
        'Tüm paketleme satırları işlenmeden operasyon tamamlanamaz.';
  end if;

  -- ==========================================================
  -- EXCEPTION READINESS
  -- ==========================================================

  select exists (
    select 1
    from public.warehouse_packing_exceptions
    where account_id = p_account_id
      and packing_id = v_packing.id
      and resolved = false
  )
  into v_has_unresolved;

  if v_has_unresolved then
    raise exception using
      errcode = '22023',
      message =
        'Çözülmemiş paketleme istisnaları varken operasyon tamamlanamaz.';
  end if;

  -- ==========================================================
  -- PACKAGE READINESS
  -- ==========================================================

  select count(*)
  into v_package_count
  from public.warehouse_packing_packages
  where account_id = p_account_id
    and packing_id = v_packing.id;

  if v_package_count = 0 then
    raise exception using
      errcode = '22023',
      message =
        'Paket oluşturulmadan paketleme operasyonu tamamlanamaz.';
  end if;

  select exists (
    select 1
    from public.warehouse_packing_packages
    where account_id = p_account_id
      and packing_id = v_packing.id
      and status not in (
        'sealed',
        'labelled',
        'shipping_ready'
      )
  )
  into v_has_invalid_package;

  if v_has_invalid_package then
    raise exception using
      errcode = '22023',
      message =
        'Tüm paketler mühürlenmeden operasyon tamamlanamaz.';
  end if;

  -- ==========================================================
  -- ATOMIC PARENT LIFECYCLE
  -- ==========================================================

  update public.warehouse_packings
  set
    status =
      'packed',
    packed_at =
      v_now,
    updated_at =
      v_now
  where account_id = p_account_id
    and id = v_packing.id
  returning *
  into v_packing;

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
        'packingNumber',
          v_packing.packing_number,
        'warehouseId',
          v_packing.warehouse_id,
        'status',
          v_packing.status,
        'packedAt',
          v_packing.packed_at,
        'packageCount',
          v_package_count
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
$warehouse_packing_complete_write$;


revoke all on function
  public.warehouse_packing_complete_write(
    uuid,
    uuid,
    uuid
  )
from public;

revoke all on function
  public.warehouse_packing_complete_write(
    uuid,
    uuid,
    uuid
  )
from anon;

revoke all on function
  public.warehouse_packing_complete_write(
    uuid,
    uuid,
    uuid
  )
from authenticated;

grant execute on function
  public.warehouse_packing_complete_write(
    uuid,
    uuid,
    uuid
  )
to authenticated;
