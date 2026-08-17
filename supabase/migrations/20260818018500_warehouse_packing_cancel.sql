-- ============================================================
-- WarehouseIQ — A8.2.8
-- Atomic Packing Cancel
--
-- Domain contract:
-- - cancellation reason boş olamaz
-- - packed / shipping_ready / cancelled parent iptal edilemez
-- - sealed / labelled / shipping_ready package varsa iptal edilemez
--
-- Başarı:
-- - yalnız parent Packing -> cancelled
-- - cancellation_reason = normalized reason
-- - cancelled_at = server timestamp
-- - updated_at = server timestamp
--
-- Child package statüleri değiştirilmez.
-- Inventory / Picking mutation YOK.
-- ============================================================

create or replace function
  public.warehouse_packing_cancel_write(
    p_request_id uuid,
    p_account_id uuid,
    p_packing_id uuid,
    p_reason text
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_packing_cancel_write$
declare
  v_user_id uuid :=
    auth.uid();

  v_action constant text :=
    'cancel';

  v_reason text :=
    nullif(
      btrim(
        coalesce(
          p_reason,
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

  v_has_closed_package boolean;

  v_now timestamptz :=
    now();

  v_result jsonb;
begin
  -- ==========================================================
  -- AUTH / INPUT
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

  if v_reason is null then
    raise exception using
      errcode = '22023',
      message =
        'İptal nedeni boş bırakılamaz.';
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
        'Bu firma için paketleme iptal yetkiniz bulunmuyor.';
  end if;

  -- ==========================================================
  -- IDEMPOTENCY
  -- ==========================================================

  v_payload :=
    jsonb_build_object(
      'packingId',
        p_packing_id,
      'reason',
        v_reason
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

  if v_packing.status in (
    'packed',
    'shipping_ready',
    'cancelled'
  ) then
    raise exception using
      errcode = '22023',
      message =
        'Tamamlanmış veya iptal edilmiş paketleme doğrudan iptal edilemez.';
  end if;

  -- ==========================================================
  -- PACKAGE LOCK / CANCEL SAFETY
  -- ==========================================================

  perform 1
  from public.warehouse_packing_packages
  where account_id = p_account_id
    and packing_id = v_packing.id
  for update;

  select exists (
    select 1
    from public.warehouse_packing_packages
    where account_id = p_account_id
      and packing_id = v_packing.id
      and status in (
        'sealed',
        'labelled',
        'shipping_ready'
      )
  )
  into v_has_closed_package;

  if v_has_closed_package then
    raise exception using
      errcode = '22023',
      message =
        'Mühürlenmiş veya etiketlenmiş paket bulunan operasyon doğrudan iptal edilemez.';
  end if;

  -- ==========================================================
  -- ATOMIC PARENT CANCEL
  -- ==========================================================

  update public.warehouse_packings
  set
    status =
      'cancelled',
    cancellation_reason =
      v_reason,
    cancelled_at =
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
    jsonb_build_object(
      'ok',
        true,
      'action',
        v_action,
      'packingId',
        v_packing.id,
      'packingNumber',
        v_packing.packing_number,
      'status',
        v_packing.status,
      'cancellationReason',
        v_packing.cancellation_reason,
      'cancelledAt',
        v_packing.cancelled_at
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
$warehouse_packing_cancel_write$;


revoke all on function
  public.warehouse_packing_cancel_write(
    uuid,
    uuid,
    uuid,
    text
  )
from public;

revoke all on function
  public.warehouse_packing_cancel_write(
    uuid,
    uuid,
    uuid,
    text
  )
from anon;

revoke all on function
  public.warehouse_packing_cancel_write(
    uuid,
    uuid,
    uuid,
    text
  )
from authenticated;

grant execute on function
  public.warehouse_packing_cancel_write(
    uuid,
    uuid,
    uuid,
    text
  )
to authenticated;
