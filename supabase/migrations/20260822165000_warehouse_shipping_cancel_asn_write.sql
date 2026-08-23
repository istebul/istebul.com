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


      'send_asn',


      'acknowledge_asn',


      'reject_asn',


      'cancel_asn'
)
  );

create or replace function
  public.warehouse_shipping_cancel_asn_write(
    p_request_id uuid,
    p_account_id uuid,
    p_shipping_id uuid,
    p_asn_id uuid,
    p_cancellation_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_shipping_cancel_asn_write$
declare
  v_user_id uuid := auth.uid();

  v_action constant text :=
    'cancel_asn';

  v_payload jsonb;



  v_cancellation_reason text;



  v_existing_notes text;



  v_notes text;
  v_existing
    public.warehouse_shipping_write_requests%rowtype;

  v_inserted integer := 0;

  v_asn
    public.warehouse_shipping_asns%rowtype;

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

  v_cancellation_reason :=
    nullif(
      btrim(
        coalesce(
          p_cancellation_reason,
          ''
        )
      ),
      ''
    );

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
      'Bu firma için ASN iptal etme yetkiniz bulunmuyor.'
      using errcode = '42501';
  end if;


  v_payload :=
    jsonb_build_object(
      'shippingId',
      p_shipping_id,
      'asnId',
      p_asn_id,
      'cancellationReason',
      v_cancellation_reason
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

  if (
    v_asn.status = 'acknowledged'
    or v_asn.status = 'cancelled'
  ) then
    raise exception
      'Alındı onayı verilmiş veya iptal edilmiş ASN doğrudan iptal edilemez.'
      using errcode = '22023';
  end if;

  v_existing_notes :=
    nullif(
      btrim(
        coalesce(
          v_asn.notes,
          ''
        )
      ),
      ''
    );

  v_notes :=
    nullif(
      concat_ws(
        E'\n',
        v_existing_notes,
        case
          when v_cancellation_reason is not null then
            'İptal nedeni: ' ||
            v_cancellation_reason
          else
            null
        end
      ),
      ''
    );

  v_now :=
    clock_timestamp();
  update
    public.warehouse_shipping_asns
  set
    status =
      'cancelled',
    notes =
      coalesce(
        v_notes,
        notes
      ),
    updated_at =
      v_now
  where
    account_id =
      p_account_id
    and shipping_id =
      p_shipping_id
    and id =
      p_asn_id
    and status not in (
      'acknowledged',
      'cancelled'
    )
  returning *
  into
    v_asn;

  if not found then
    raise exception
      'ASN durumu değişti. Tekrar deneyin.'
      using errcode = '55000';
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
$warehouse_shipping_cancel_asn_write$;

revoke all
on function
  public.warehouse_shipping_cancel_asn_write(
    uuid,
    uuid,
    uuid,
    uuid, text)
from public;

revoke all
on function
  public.warehouse_shipping_cancel_asn_write(
    uuid,
    uuid,
    uuid,
    uuid, text)
from anon;

revoke all
on function
  public.warehouse_shipping_cancel_asn_write(
    uuid,
    uuid,
    uuid,
    uuid, text)
from authenticated;

grant execute
on function
  public.warehouse_shipping_cancel_asn_write(
    uuid,
    uuid,
    uuid,
    uuid, text)
to authenticated;

commit;
