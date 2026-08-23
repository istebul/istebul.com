begin;

alter table public.warehouse_shipping_write_requests
  drop constraint if exists
    warehouse_shipping_write_requests_action_check;

alter table public.warehouse_shipping_write_requests
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
      'create_asn'
    )
  );

create sequence if not exists
  public.warehouse_shipping_asn_number_seq
  as bigint
  start with 1
  increment by 1
  minvalue 1
  no maxvalue
  cache 1;

revoke all
  on sequence public.warehouse_shipping_asn_number_seq
  from public, anon, authenticated;

create or replace function
  public.warehouse_shipping_create_asn_write(
    p_request_id uuid,
    p_account_id uuid,
    p_shipping_id uuid,
    p_sender_code text,
    p_receiver_code text,
    p_format text,
    p_notes text
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_shipping_create_asn_write$
declare
  v_user_id uuid := auth.uid();

  v_action constant text := 'create_asn';

  v_sender_code text;
  v_receiver_code text;
  v_format text;
  v_notes text;

  v_payload jsonb;

  v_existing
    public.warehouse_shipping_write_requests%rowtype;

  v_claimed_request_id uuid;

  v_shipping
    public.warehouse_shippings%rowtype;

  v_active_asn_id uuid;

  v_now timestamptz;
  v_asn_number text;

  v_asn
    public.warehouse_shipping_asns%rowtype;

  v_response jsonb;
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Oturum doğrulanamadı.';
  end if;

  if p_request_id is null then
    raise exception using
      errcode = '22004',
      message = 'İstek kimliği boş bırakılamaz.';
  end if;

  if p_account_id is null then
    raise exception using
      errcode = '22004',
      message = 'Firma kimliği boş bırakılamaz.';
  end if;

  if p_shipping_id is null then
    raise exception using
      errcode = '22004',
      message = 'Sevkiyat kimliği boş bırakılamaz.';
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
      message = 'Bu sevkiyat işlemi için yetkiniz bulunmuyor.';
  end if;

  v_sender_code :=
    nullif(
      btrim(p_sender_code),
      ''
    );

  v_receiver_code :=
    nullif(
      btrim(p_receiver_code),
      ''
    );

  v_notes :=
    nullif(
      btrim(p_notes),
      ''
    );

  v_format :=
    coalesce(
      p_format,
      'json'
    );

  if v_format not in (
    'json',
    'xml',
    'edi',
    'edifact',
    'custom'
  ) then
    raise exception using
      errcode = '22023',
      message = 'ASN biçimi geçersiz.';
  end if;

  v_payload :=
    jsonb_build_object(
      'shippingId',
      p_shipping_id,
      'senderCode',
      v_sender_code,
      'receiverCode',
      v_receiver_code,
      'format',
      v_format,
      'notes',
      v_notes
    );

  select request_row.*
  into v_existing
  from public.warehouse_shipping_write_requests
    as request_row
  where
    request_row.account_id =
      p_account_id
    and request_row.request_id =
      p_request_id
  for update;

  if found then
    if v_existing.user_id <> v_user_id then
      raise exception using
        errcode = '42501',
        message =
          'Aynı sevkiyat isteği farklı kullanıcı tarafından tekrar kullanılamaz.';
    end if;

    if
      v_existing.action <> v_action
      or
      v_existing.request_payload
        is distinct from v_payload
    then
      raise exception using
        errcode = '23505',
        message =
          'Aynı istek kimliği farklı bir sevkiyat işlemi için kullanılamaz.';
    end if;

    if
      v_existing.completed_at is not null
      and
      v_existing.response_payload is not null
    then
      return v_existing.response_payload;
    end if;

    raise exception using
      errcode = '40001',
      message =
        'Aynı sevkiyat isteği halen işleniyor. Tekrar deneyin.';
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
  do nothing
  returning request_id
  into v_claimed_request_id;

  if v_claimed_request_id is null then
    select request_row.*
    into v_existing
    from public.warehouse_shipping_write_requests
      as request_row
    where
      request_row.account_id =
        p_account_id
      and request_row.request_id =
        p_request_id
    for update;

    if not found then
      raise exception using
        errcode = '40001',
        message =
          'Aynı sevkiyat isteği halen işleniyor. Tekrar deneyin.';
    end if;

    if v_existing.user_id <> v_user_id then
      raise exception using
        errcode = '42501',
        message =
          'Aynı sevkiyat isteği farklı kullanıcı tarafından tekrar kullanılamaz.';
    end if;

    if
      v_existing.action <> v_action
      or
      v_existing.request_payload
        is distinct from v_payload
    then
      raise exception using
        errcode = '23505',
        message =
          'Aynı istek kimliği farklı bir sevkiyat işlemi için kullanılamaz.';
    end if;

    if
      v_existing.completed_at is not null
      and
      v_existing.response_payload is not null
    then
      return v_existing.response_payload;
    end if;

    raise exception using
      errcode = '40001',
      message =
        'Aynı sevkiyat isteği halen işleniyor. Tekrar deneyin.';
  end if;

  select shipping.*
  into v_shipping
  from public.warehouse_shippings
    as shipping
  where
    shipping.account_id =
      p_account_id
    and shipping.id =
      p_shipping_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Sevkiyat kaydı bulunamadı: '
        || p_shipping_id::text;
  end if;

  if
    v_shipping.status <> 'loaded'
    and
    v_shipping.status <> 'dispatched'
  then
    raise exception using
      errcode = '22023',
      message =
        'ASN yalnızca yüklenmiş veya sevk edilmiş operasyon için oluşturulabilir.';
  end if;

  perform asn.id
  from public.warehouse_shipping_asns
    as asn
  where
    asn.account_id =
      p_account_id
    and asn.shipping_id =
      p_shipping_id
  order by
    asn.created_at,
    asn.id
  for update;

  select asn.id
  into v_active_asn_id
  from public.warehouse_shipping_asns
    as asn
  where
    asn.account_id =
      p_account_id
    and asn.shipping_id =
      p_shipping_id
    and asn.status not in (
      'cancelled',
      'rejected'
    )
  order by
    asn.created_at,
    asn.id
  limit 1;

  if v_active_asn_id is not null then
    raise exception using
      errcode = '23505',
      message =
        'Bu sevkiyat için aktif bir ASN zaten bulunmaktadır.';
  end if;

  v_now :=
    clock_timestamp();

  v_asn_number :=
    'ASN-'
    || to_char(
      v_now at time zone 'UTC',
      'YYYYMMDD'
    )
    || '-'
    || lpad(
      nextval(
        'public.warehouse_shipping_asn_number_seq'
      )::text,
      6,
      '0'
    );

  insert into public.warehouse_shipping_asns (
    account_id,
    shipping_id,
    asn_number,
    status,
    sender_code,
    receiver_code,
    planned_dispatch_at,
    expected_delivery_at,
    package_count,
    lines,
    format,
    notes,
    created_by,
    created_at,
    updated_at
  )
  values (
    p_account_id,
    p_shipping_id,
    v_asn_number,
    'draft',
    v_sender_code,
    v_receiver_code,
    v_shipping.planned_at,
    v_shipping.expected_delivery_at,
    0,
    '[]'::jsonb,
    v_format,
    v_notes,
    v_user_id,
    v_now,
    v_now
  )
  returning *
  into v_asn;

  v_response :=
    jsonb_build_object(
      'ok',
      true,
      'action',
      v_action,
      'requestId',
      p_request_id,
      'shippingId',
      v_asn.shipping_id,
      'asnId',
      v_asn.id,
      'asnNumber',
      v_asn.asn_number,
      'status',
      v_asn.status,
      'senderCode',
      v_asn.sender_code,
      'receiverCode',
      v_asn.receiver_code,
      'plannedDispatchAt',
      v_asn.planned_dispatch_at,
      'expectedDeliveryAt',
      v_asn.expected_delivery_at,
      'packageCount',
      v_asn.package_count,
      'lines',
      v_asn.lines,
      'format',
      v_asn.format,
      'notes',
      v_asn.notes,
      'createdBy',
      v_asn.created_by,
      'createdAt',
      v_asn.created_at,
      'updatedAt',
      v_asn.updated_at
    );

  update public.warehouse_shipping_write_requests
  set
    response_payload =
      v_response,
    completed_at =
      v_now
  where
    account_id =
      p_account_id
    and request_id =
      p_request_id;

  return v_response;
end;
$warehouse_shipping_create_asn_write$;

revoke all
  on function
    public.warehouse_shipping_create_asn_write(
      uuid,
      uuid,
      uuid,
      text,
      text,
      text,
      text
    )
  from public, anon, authenticated;

grant execute
  on function
    public.warehouse_shipping_create_asn_write(
      uuid,
      uuid,
      uuid,
      text,
      text,
      text,
      text
    )
  to authenticated;

commit;
