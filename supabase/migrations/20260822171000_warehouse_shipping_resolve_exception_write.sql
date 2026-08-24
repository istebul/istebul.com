-- ============================================================
-- WAREHOUSEIQ — A9.7 Shipping resolve exception write RPC
-- Action 19: resolve_exception
--
-- Mutation surface:
-- - warehouse_shipping_write_requests
-- - warehouse_shipping_exceptions
-- ============================================================

alter table
  public.warehouse_shipping_write_requests
drop constraint if exists
  warehouse_shipping_write_requests_action_check;

alter table
  public.warehouse_shipping_write_requests
add constraint
  warehouse_shipping_write_requests_action_check
check (
  action in (
    'create_from_packing',
    'start_loading',
    'confirm_item_load',
    'load_package',
    'complete_loading',
    'create_manifest',
    'generate_manifest',
    'approve_manifest',
    'submit_manifest',
    'create_asn',
    'generate_asn',
    'send_asn',
    'acknowledge_asn',
    'reject_asn',
    'cancel_asn',
    'dispatch',
    'record_proof_of_delivery',
    'create_exception',
    'resolve_exception'
  )
);

create or replace function
  public.warehouse_shipping_resolve_exception_write(
    p_request_id uuid,
    p_account_id uuid,
    p_shipping_id uuid,
    p_exception_id uuid,
    p_resolved_by text,
    p_resolution_notes text
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_shipping_resolve_exception_write$
declare
  v_user_id uuid :=
    auth.uid();

  v_action constant text :=
    'resolve_exception';

  v_payload jsonb;

  v_resolved_by text;
  v_resolution_notes text;

  v_existing
    public.warehouse_shipping_write_requests%rowtype;

  v_inserted integer := 0;
  v_ledger_updated integer := 0;

  v_shipping
    public.warehouse_shippings%rowtype;

  v_exception
    public.warehouse_shipping_exceptions%rowtype;

  v_now timestamptz;

  v_result jsonb;
begin
  if p_request_id is null then
    raise exception
      'İstek kimliği zorunludur.'
      using errcode = '22023';
  end if;

  if p_account_id is null then
    raise exception
      'Firma kimliği zorunludur.'
      using errcode = '22023';
  end if;

  if p_shipping_id is null then
    raise exception
      'Sevkiyat kimliği zorunludur.'
      using errcode = '22023';
  end if;

  if p_exception_id is null then
    raise exception
      'Sevkiyat istisnası kimliği zorunludur.'
      using errcode = '22023';
  end if;

  v_resolved_by :=
    nullif(
      btrim(p_resolved_by),
      ''
    );

  if v_resolved_by is null then
    raise exception
      'İstisnayı çözen kullanıcı boş bırakılamaz.'
      using errcode = '22023';
  end if;

  v_resolution_notes :=
    nullif(
      btrim(p_resolution_notes),
      ''
    );

  if v_resolution_notes is null then
    raise exception
      'Çözüm açıklaması boş bırakılamaz.'
      using errcode = '22023';
  end if;

  if v_user_id is null then
    raise exception
      'Kimliği doğrulanmış kullanıcı zorunludur.'
      using errcode = '42501';
  end if;

  if not coalesce(
    public.warehouse_has_account_role(
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
    ),
    false
  ) then
    raise exception
      'Bu firma için sevkiyat istisnası çözme yetkiniz bulunmuyor.'
      using errcode = '42501';
  end if;

  v_payload :=
    jsonb_build_object(
      'shippingId',
      p_shipping_id,
      'exceptionId',
      p_exception_id,
      'resolvedBy',
      v_resolved_by,
      'resolutionNotes',
      v_resolution_notes
    );

  select request.*
  into v_existing
  from public.warehouse_shipping_write_requests
    as request
  where request.account_id =
      p_account_id
    and request.request_id =
      p_request_id
  for update;

  if found then
    if v_existing.user_id <>
      v_user_id then
      raise exception
        'Aynı istek kimliği farklı bir kullanıcı tarafından kullanılamaz.'
        using errcode = '42501';
    end if;

    if v_existing.action <>
        v_action
      or v_existing.request_payload
        is distinct from v_payload then
      raise exception
        'Aynı istek kimliği farklı bir sevkiyat işlemi için kullanılamaz.'
        using errcode = '23505';
    end if;

    if v_existing.completed_at
        is not null
      and v_existing.response_payload
        is not null then
      return
        v_existing.response_payload;
    end if;

    raise exception
      'Aynı sevkiyat isteği halen işleniyor. Tekrar deneyin.'
      using errcode = '40001';
  end if;

  insert into
    public.warehouse_shipping_write_requests (
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
    v_inserted =
      row_count;

  if v_inserted = 0 then
    select request.*
    into v_existing
    from public.warehouse_shipping_write_requests
      as request
    where request.account_id =
        p_account_id
      and request.request_id =
        p_request_id
    for update;

    if not found then
      raise exception
        'Aynı sevkiyat isteği eşzamanlı olarak değişti. Tekrar deneyin.'
        using errcode = '40001';
    end if;

    if v_existing.user_id <>
      v_user_id then
      raise exception
        'Aynı istek kimliği farklı bir kullanıcı tarafından kullanılamaz.'
        using errcode = '42501';
    end if;

    if v_existing.action <>
        v_action
      or v_existing.request_payload
        is distinct from v_payload then
      raise exception
        'Aynı istek kimliği farklı bir sevkiyat işlemi için kullanılamaz.'
        using errcode = '23505';
    end if;

    if v_existing.completed_at
        is not null
      and v_existing.response_payload
        is not null then
      return
        v_existing.response_payload;
    end if;

    raise exception
      'Aynı sevkiyat isteği halen işleniyor. Tekrar deneyin.'
      using errcode = '40001';
  end if;

  select shipping.*
  into v_shipping
  from public.warehouse_shippings
    as shipping
  where shipping.account_id =
      p_account_id
    and shipping.id =
      p_shipping_id
  for update;

  if not found then
    raise exception
      'Sevkiyat kaydı bulunamadı: %',
      p_shipping_id
      using errcode = 'P0002';
  end if;

  select shipping_exception.*
  into v_exception
  from public.warehouse_shipping_exceptions
    as shipping_exception
  where shipping_exception.account_id =
      p_account_id
    and shipping_exception.shipping_id =
      p_shipping_id
    and shipping_exception.id =
      p_exception_id
  for update;

  if not found then
    raise exception
      'Sevkiyat istisnası bulunamadı: %',
      p_exception_id
      using errcode = 'P0002';
  end if;

  if v_exception.resolved then
    raise exception
      'Sevkiyat istisnası daha önce çözülmüş.'
      using errcode = '22023';
  end if;

  v_now :=
    now();

  update
    public.warehouse_shipping_exceptions
  set
    resolved =
      true,
    resolved_by =
      v_resolved_by,
    resolved_at =
      v_now,
    resolution_notes =
      v_resolution_notes
  where account_id =
      p_account_id
    and shipping_id =
      p_shipping_id
    and id =
      p_exception_id
    and resolved =
      false
  returning *
  into v_exception;

  if not found then
    raise exception
      'Sevkiyat istisnası eşzamanlı olarak değişti. Tekrar deneyin.'
      using errcode = '40001';
  end if;

  v_result :=
    jsonb_build_object(
      'ok',
      true,
      'action',
      v_action,
      'requestId',
      p_request_id,
      'shippingExceptionId',
      v_exception.id,
      'shippingId',
      v_exception.shipping_id,
      'shippingItemId',
      v_exception.shipping_item_id,
      'shippingPackageId',
      v_exception.shipping_package_id,
      'taskId',
      v_exception.task_id,
      'manifestId',
      v_exception.manifest_id,
      'type',
      v_exception.type,
      'message',
      v_exception.message,
      'warehouseId',
      v_exception.warehouse_id,
      'dockId',
      v_exception.dock_id,
      'vehicleId',
      v_exception.vehicle_id,
      'carrierId',
      v_exception.carrier_id,
      'resolved',
      v_exception.resolved,
      'resolvedBy',
      v_exception.resolved_by,
      'resolvedAt',
      v_exception.resolved_at,
      'resolutionNotes',
      v_exception.resolution_notes,
      'createdAt',
      v_exception.created_at
    );

  update
    public.warehouse_shipping_write_requests
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
      v_user_id
    and action =
      v_action
    and request_payload
      is not distinct from v_payload
    and completed_at
      is null
    and response_payload
      is null;

  get diagnostics
    v_ledger_updated =
      row_count;

  if v_ledger_updated <> 1 then
    raise exception
      'Sevkiyat istek sonucu eşzamanlı olarak değişti. Tekrar deneyin.'
      using errcode = '40001';
  end if;

  return
    v_result;
end;
$warehouse_shipping_resolve_exception_write$;

revoke all on function
  public.warehouse_shipping_resolve_exception_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    text
  )
from public;

revoke all on function
  public.warehouse_shipping_resolve_exception_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    text
  )
from anon;

revoke all on function
  public.warehouse_shipping_resolve_exception_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    text
  )
from authenticated;

grant execute on function
  public.warehouse_shipping_resolve_exception_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    text
  )
to authenticated;
