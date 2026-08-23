-- ============================================================
-- WAREHOUSEIQ — A9.5 Shipping record proof of delivery write RPC
-- Action 17: record_proof_of_delivery
--
-- Mutation surface:
-- - warehouse_shipping_write_requests
-- - warehouse_shipping_proofs_of_delivery
-- - warehouse_shipping_tracking_events
-- - warehouse_shippings
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
    'record_proof_of_delivery'
  )
);

create or replace function
  public.warehouse_shipping_record_proof_of_delivery_write(
    p_request_id uuid,
    p_account_id uuid,
    p_shipping_id uuid,
    p_recipient_name text,
    p_recipient_identity_number text,
    p_recipient_phone text,
    p_signature_url text,
    p_photo_urls text[],
    p_document_urls text[],
    p_latitude numeric,
    p_longitude numeric,
    p_delivery_address text,
    p_delivered_at timestamptz,
    p_captured_by text,
    p_notes text
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_shipping_record_proof_of_delivery_write$
declare
  v_user_id uuid :=
    auth.uid();

  v_action constant text :=
    'record_proof_of_delivery';

  v_payload jsonb;

  v_recipient_name text;
  v_recipient_identity_number text;
  v_recipient_phone text;
  v_signature_url text;
  v_photo_urls text[];
  v_document_urls text[];

  v_invalid_photo_error text;
  v_invalid_document_error text;

  v_delivery_address text;
  v_captured_by text;
  v_notes text;

  v_existing
    public.warehouse_shipping_write_requests%rowtype;

  v_inserted integer := 0;
  v_ledger_updated integer := 0;

  v_shipping
    public.warehouse_shippings%rowtype;

  v_existing_pod
    public.warehouse_shipping_proofs_of_delivery%rowtype;

  v_pod
    public.warehouse_shipping_proofs_of_delivery%rowtype;

  v_updated_shipping
    public.warehouse_shippings%rowtype;

  v_tracking_event_id uuid :=
    gen_random_uuid();

  v_tracking_duplicate boolean := false;

  v_now timestamptz;
  v_delivered_at timestamptz;

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

  v_recipient_name :=
    nullif(
      btrim(
        coalesce(
          p_recipient_name,
          ''
        )
      ),
      ''
    );

  if v_recipient_name is null then
    raise exception
      'Teslim alan kişi boş bırakılamaz.'
      using errcode = '22023';
  end if;

  v_captured_by :=
    nullif(
      btrim(
        coalesce(
          p_captured_by,
          ''
        )
      ),
      ''
    );

  if v_captured_by is null then
    raise exception
      'Teslimat kanıtını kaydeden kullanıcı boş bırakılamaz.'
      using errcode = '22023';
  end if;

  v_recipient_identity_number :=
    nullif(
      btrim(
        coalesce(
          p_recipient_identity_number,
          ''
        )
      ),
      ''
    );

  v_recipient_phone :=
    nullif(
      btrim(
        coalesce(
          p_recipient_phone,
          ''
        )
      ),
      ''
    );

  if v_recipient_phone is not null
      and v_recipient_phone
        !~ '^\+?[0-9()[:space:]-]{7,25}$' then
    raise exception
      'Telefon numarası geçerli biçimde olmalıdır.'
      using errcode = '22023';
  end if;

  v_signature_url :=
    nullif(
      btrim(
        coalesce(
          p_signature_url,
          ''
        )
      ),
      ''
    );

  if v_signature_url is not null
      and v_signature_url
        !~* '^https?://[^[:space:]]+$' then
    raise exception
      'İmza dosyası adresi geçerli bir HTTP veya HTTPS adresi olmalıdır.'
      using errcode = '22023';
  end if;

  select
    coalesce(
      array_agg(
        btrim(item.value)
        order by item.ordinality
      ),
      '{}'::text[]
    )
  into v_photo_urls
  from unnest(
    coalesce(
      p_photo_urls,
      '{}'::text[]
    )
  )
  with ordinality
    as item(value, ordinality);

  if exists (
    select 1
    from unnest(v_photo_urls)
      as photo(url)
    where photo.url is null
       or photo.url = ''
  ) then
    raise exception
      'Teslimat fotoğrafı adresi boş bırakılamaz.'
      using errcode = '22023';
  end if;

  select
    format(
      '%s. teslimat fotoğrafı adresi geçerli bir HTTP veya HTTPS adresi olmalıdır.',
      photo.ordinality
    )
  into v_invalid_photo_error
  from unnest(v_photo_urls)
    with ordinality
      as photo(url, ordinality)
  where photo.url
    !~* '^https?://[^[:space:]]+$'
  order by
    photo.ordinality
  limit 1;

  if v_invalid_photo_error is not null then
    raise exception
      '%',
      v_invalid_photo_error
      using errcode = '22023';
  end if;

  select
    coalesce(
      array_agg(
        btrim(item.value)
        order by item.ordinality
      ),
      '{}'::text[]
    )
  into v_document_urls
  from unnest(
    coalesce(
      p_document_urls,
      '{}'::text[]
    )
  )
  with ordinality
    as item(value, ordinality);

  if exists (
    select 1
    from unnest(v_document_urls)
      as document(url)
    where document.url is null
       or document.url = ''
  ) then
    raise exception
      'Teslimat belgesi adresi boş bırakılamaz.'
      using errcode = '22023';
  end if;

  select
    format(
      '%s. teslimat belgesi adresi geçerli bir HTTP veya HTTPS adresi olmalıdır.',
      document.ordinality
    )
  into v_invalid_document_error
  from unnest(v_document_urls)
    with ordinality
      as document(url, ordinality)
  where document.url
    !~* '^https?://[^[:space:]]+$'
  order by
    document.ordinality
  limit 1;

  if v_invalid_document_error is not null then
    raise exception
      '%',
      v_invalid_document_error
      using errcode = '22023';
  end if;

  if (
    p_latitude is null
  ) <> (
    p_longitude is null
  ) then
    raise exception
      'Teslimat kanıtı için enlem ve boylam birlikte verilmelidir.'
      using errcode = '22023';
  end if;

  if p_latitude is not null
      and (
        p_latitude < -90
        or p_latitude > 90
      ) then
    raise exception
      'Enlem -90 ile 90 arasında olmalıdır.'
      using errcode = '22023';
  end if;

  if p_longitude is not null
      and (
        p_longitude < -180
        or p_longitude > 180
      ) then
    raise exception
      'Boylam -180 ile 180 arasında olmalıdır.'
      using errcode = '22023';
  end if;

  v_delivery_address :=
    nullif(
      btrim(
        coalesce(
          p_delivery_address,
          ''
        )
      ),
      ''
    );

  v_notes :=
    nullif(
      btrim(
        coalesce(
          p_notes,
          ''
        )
      ),
      ''
    );

  if v_signature_url is null
      and cardinality(v_photo_urls) = 0
      and cardinality(v_document_urls) = 0 then
    raise exception
      'Teslimat kanıtı için imza, fotoğraf veya belge bilgilerinden en az biri gereklidir.'
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
      'Bu firma için teslimat kanıtı kaydetme yetkiniz bulunmuyor.'
      using errcode = '42501';
  end if;

  v_payload :=
    jsonb_build_object(
      'shippingId',
      p_shipping_id,
      'recipientName',
      v_recipient_name,
      'recipientIdentityNumber',
      v_recipient_identity_number,
      'recipientPhone',
      v_recipient_phone,
      'signatureUrl',
      v_signature_url,
      'photoUrls',
      to_jsonb(v_photo_urls),
      'documentUrls',
      to_jsonb(v_document_urls),
      'latitude',
      p_latitude,
      'longitude',
      p_longitude,
      'deliveryAddress',
      v_delivery_address,
      'deliveredAt',
      p_delivered_at,
      'capturedBy',
      v_captured_by,
      'notes',
      v_notes
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
      'Sevkiyat bulunamadı.'
      using errcode = 'P0002';
  end if;

  if v_shipping.status not in (
    'dispatched',
    'in_transit',
    'partially_delivered'
  ) then
    raise exception
      'Teslimat kanıtı yalnızca sevk edilmiş veya taşımadaki sevkiyat için kaydedilebilir.'
      using errcode = '22023';
  end if;

  select pod.*
  into v_existing_pod
  from public.warehouse_shipping_proofs_of_delivery
    as pod
  where pod.account_id =
      p_account_id
    and pod.shipping_id =
      p_shipping_id
    and pod.status <>
      'cancelled'
  order by
    pod.created_at desc,
    pod.id
  limit 1
  for update;

  if found then
    raise exception
      'Bu sevkiyat için aktif teslimat kanıtı zaten bulunmaktadır.'
      using errcode = '23505';
  end if;

  v_now :=
    now();

  v_delivered_at :=
    coalesce(
      p_delivered_at,
      v_now
    );

  insert into
    public.warehouse_shipping_proofs_of_delivery (
      id,
      account_id,
      shipping_id,
      status,
      recipient_name,
      recipient_identity_number,
      recipient_phone,
      signature_url,
      photo_urls,
      document_urls,
      latitude,
      longitude,
      delivery_address,
      delivered_at,
      captured_by,
      notes,
      created_at,
      updated_at
    )
  values (
    gen_random_uuid(),
    p_account_id,
    p_shipping_id,
    'captured',
    v_recipient_name,
    v_recipient_identity_number,
    v_recipient_phone,
    v_signature_url,
    v_photo_urls,
    v_document_urls,
    p_latitude,
    p_longitude,
    v_delivery_address,
    v_delivered_at,
    v_captured_by,
    v_notes,
    v_now,
    v_now
  )
  returning *
  into v_pod;

  select exists (
    select 1
    from public.warehouse_shipping_tracking_events
      as event
    where event.account_id =
        p_account_id
      and event.shipping_id =
        p_shipping_id
      and event.type =
        'delivered'
      and event.shipping_package_id
        is null
      and event.external_event_code
        is null
      and event.occurred_at =
        v_pod.delivered_at
  )
  into v_tracking_duplicate;

  if v_tracking_duplicate then
    raise exception
      'Aynı sevkiyat takip olayı daha önce kaydedilmiş.'
      using errcode = '23505';
  end if;

  insert into
    public.warehouse_shipping_tracking_events (
      id,
      account_id,
      shipping_id,
      shipping_package_id,
      type,
      message,
      source,
      occurred_at,
      created_at,
      latitude,
      longitude,
      external_event_code
    )
  values (
    v_tracking_event_id,
    p_account_id,
    p_shipping_id,
    null,
    'delivered',
    format(
      'Teslimat %s tarafından teslim alındı.',
      v_pod.recipient_name
    ),
    'driver',
    v_pod.delivered_at,
    v_now,
    v_pod.latitude,
    v_pod.longitude,
    null
  );

  update
    public.warehouse_shippings
  set
    status =
      'delivered',
    delivered_at =
      v_pod.delivered_at,
    actual_delivery_at =
      v_pod.delivered_at,
    updated_at =
      v_now
  where account_id =
      p_account_id
    and id =
      p_shipping_id
    and status in (
      'dispatched',
      'in_transit',
      'partially_delivered'
    )
  returning *
  into v_updated_shipping;

  if not found then
    raise exception
      'Sevkiyat teslimat kanıtı işlemi eşzamanlı olarak değişti. Tekrar deneyin.'
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
      v_pod.shipping_id,
      'proofOfDeliveryId',
      v_pod.id,
      'status',
      v_pod.status,
      'recipientName',
      v_pod.recipient_name,
      'recipientIdentityNumber',
      v_pod.recipient_identity_number,
      'recipientPhone',
      v_pod.recipient_phone,
      'signatureUrl',
      v_pod.signature_url,
      'photoUrls',
      to_jsonb(v_pod.photo_urls),
      'documentUrls',
      to_jsonb(v_pod.document_urls),
      'latitude',
      v_pod.latitude,
      'longitude',
      v_pod.longitude,
      'deliveryAddress',
      v_pod.delivery_address,
      'deliveredAt',
      v_pod.delivered_at,
      'capturedBy',
      v_pod.captured_by,
      'verifiedBy',
      v_pod.verified_by,
      'verifiedAt',
      v_pod.verified_at,
      'rejectionReason',
      v_pod.rejection_reason,
      'notes',
      v_pod.notes,
      'createdAt',
      v_pod.created_at,
      'updatedAt',
      v_pod.updated_at
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
$warehouse_shipping_record_proof_of_delivery_write$;

revoke all on function
  public.warehouse_shipping_record_proof_of_delivery_write(
    uuid,
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    text[],
    text[],
    numeric,
    numeric,
    text,
    timestamptz,
    text,
    text
  )
from public;

revoke all on function
  public.warehouse_shipping_record_proof_of_delivery_write(
    uuid,
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    text[],
    text[],
    numeric,
    numeric,
    text,
    timestamptz,
    text,
    text
  )
from anon;

revoke all on function
  public.warehouse_shipping_record_proof_of_delivery_write(
    uuid,
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    text[],
    text[],
    numeric,
    numeric,
    text,
    timestamptz,
    text,
    text
  )
from authenticated;

grant execute on function
  public.warehouse_shipping_record_proof_of_delivery_write(
    uuid,
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    text[],
    text[],
    numeric,
    numeric,
    text,
    timestamptz,
    text,
    text
  )
to authenticated;
