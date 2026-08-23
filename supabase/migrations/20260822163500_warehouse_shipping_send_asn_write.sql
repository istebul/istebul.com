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
      'create_asn',
      'generate_asn',
      'send_asn'
    )
  );

create or replace function
  public.warehouse_shipping_send_asn_write(
    p_request_id uuid,
    p_account_id uuid,
    p_shipping_id uuid,
    p_asn_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_shipping_send_asn_write$
declare
  v_user_id uuid := auth.uid();

  v_action constant text :=
    'send_asn';

  v_payload jsonb;

  v_existing
    public.warehouse_shipping_write_requests%rowtype;

  v_inserted integer := 0;

  v_shipping
    public.warehouse_shippings%rowtype;

  v_asn
    public.warehouse_shipping_asns%rowtype;

  v_carrier record;

  v_item_count integer := 0;
  v_package_count integer := 0;
  v_invalid_package_count integer := 0;

  v_lines jsonb := '[]'::jsonb;

  v_content text;
  v_xml_lines text := '';
  v_edi_lines text := '';
  v_edifact_lines text := '';

  v_line jsonb;
  v_separator text := '';

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

  if p_asn_id is null then
    raise exception
      'ASN kimliği zorunludur.'
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
      'Bu firma için ASN gönderme yetkiniz bulunmuyor.'
      using errcode = '42501';
  end if;


  v_payload :=
    jsonb_build_object(
      'shippingId',
      p_shipping_id,
      'asnId',
      p_asn_id
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
    v_inserted = row_count;

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

  select
    shipping.*
  into
    v_shipping
  from
    public.warehouse_shippings
      as shipping
  where
    shipping.account_id =
      p_account_id
    and shipping.id =
      p_shipping_id
  for update;

  if not found then
    raise exception
      'Sevkiyat kaydı bulunamadı: %',
      p_shipping_id
      using errcode = '22023';
  end if;

  select
    asn.*
  into
    v_asn
  from
    public.warehouse_shipping_asns
      as asn
  where
    asn.account_id =
      p_account_id
    and asn.shipping_id =
      p_shipping_id
    and asn.id =
      p_asn_id
  for update;

  if not found then
    raise exception
      'ASN bulunamadı: %',
      p_asn_id
      using errcode = '22023';
  end if;

  if v_asn.status <> 'generated' then
    raise exception
      'Yalnızca oluşturulmuş ASN gönderilebilir.'
      using errcode = '22023';
  end if;

  if v_shipping.carrier_id is null then
    raise exception
      'ASN gönderimi için taşıyıcı atanmalıdır.'
      using errcode = '22023';
  end if;

  select
    carrier.id,
    carrier.active,
    carrier.asn_supported
  into
    v_carrier
  from
    public.warehouse_shipping_carriers
      as carrier
  where
    carrier.account_id =
      p_account_id
    and carrier.id =
      v_shipping.carrier_id;

  if not found then
    raise exception
      'ASN taşıyıcısı bulunamadı.'
      using errcode = '22023';
  end if;

  if not v_carrier.active then
    raise exception
      'Pasif taşıyıcıya ASN gönderilemez.'
      using errcode = '22023';
  end if;

  if not v_carrier.asn_supported then
    raise exception
      'Seçilen taşıyıcı ASN gönderimini desteklemiyor.'
      using errcode = '22023';
  end if;

  v_now :=
    clock_timestamp();

  update
    public.warehouse_shipping_asns
  set
    status =
      'sent',
    sent_at =
      v_now,
    updated_at =
      v_now
  where
    account_id =
      p_account_id
    and shipping_id =
      p_shipping_id
    and id =
      p_asn_id
    and status =
      'generated'
  returning
    *
  into
    v_asn;

  if not found then
    raise exception
      'ASN gönderim sırasında güncellenemedi.'
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
      'content',
      v_asn.content,
      'generatedAt',
      v_asn.generated_at,
      'sentAt',
      v_asn.sent_at,
      'acknowledgedAt',
      v_asn.acknowledged_at,
      'rejectionReason',
      v_asn.rejection_reason,
      'notes',
      v_asn.notes,
      'createdBy',
      v_asn.created_by,
      'createdAt',
      v_asn.created_at,
      'updatedAt',
      v_asn.updated_at
    );

  update
    public.warehouse_shipping_write_requests
  set
    response_payload = v_result,
    completed_at = v_now
  where account_id =
      p_account_id
    and request_id =
      p_request_id;

  return v_result;
end;
$warehouse_shipping_send_asn_write$;

revoke all
on function
  public.warehouse_shipping_send_asn_write(
    uuid,
    uuid,
    uuid,
    uuid
  )
from public;

revoke all
on function
  public.warehouse_shipping_send_asn_write(
    uuid,
    uuid,
    uuid,
    uuid
  )
from anon;

revoke all
on function
  public.warehouse_shipping_send_asn_write(
    uuid,
    uuid,
    uuid,
    uuid
  )
from authenticated;

grant execute
on function
  public.warehouse_shipping_send_asn_write(
    uuid,
    uuid,
    uuid,
    uuid
  )
to authenticated;

commit;
