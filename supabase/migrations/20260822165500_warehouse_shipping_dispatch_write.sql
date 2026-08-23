-- ============================================================
-- WAREHOUSEIQ — A9.4 Shipping dispatch write RPC
-- Action 16: dispatch
--
-- Mutation surface:
-- - warehouse_shipping_write_requests
-- - warehouse_shipping_packages
-- - warehouse_shipping_tracking_events
-- - warehouse_shippings
-- - warehouse_shipping_docks (only when assigned row exists)
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
    'dispatch'
  )
);

create or replace function
  public.warehouse_shipping_dispatch_write(
    p_request_id uuid,
    p_account_id uuid,
    p_shipping_id uuid,
    p_dispatched_by text,
    p_tracking_number text
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_shipping_dispatch_write$
declare
  v_user_id uuid :=
    auth.uid();

  v_action constant text :=
    'dispatch';

  v_payload jsonb;

  v_dispatched_by text;
  v_tracking_number text;

  v_existing
    public.warehouse_shipping_write_requests%rowtype;

  v_inserted integer := 0;

  v_shipping
    public.warehouse_shippings%rowtype;

  v_package
    public.warehouse_shipping_packages%rowtype;

  v_carrier
    public.warehouse_shipping_carriers%rowtype;

  v_dock
    public.warehouse_shipping_docks%rowtype;

  v_updated_shipping
    public.warehouse_shippings%rowtype;

  v_package_count integer := 0;
  v_updated_package_count integer := 0;

  v_tracking_event_id uuid :=
    gen_random_uuid();

  v_tracking_duplicate boolean := false;
  v_ledger_updated integer := 0;

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

  v_dispatched_by :=
    nullif(
      btrim(
        coalesce(
          p_dispatched_by,
          ''
        )
      ),
      ''
    );

  if v_dispatched_by is null then
    raise exception
      'Araç çıkışını yapan kullanıcı zorunludur.'
      using errcode = '22023';
  end if;

  v_tracking_number :=
    nullif(
      btrim(
        coalesce(
          p_tracking_number,
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
      'Bu firma için sevkiyat araç çıkışı yapma yetkiniz bulunmuyor.'
      using errcode = '42501';
  end if;

  v_payload :=
    jsonb_build_object(
      'shippingId',
      p_shipping_id,
      'dispatchedBy',
      v_dispatched_by,
      'trackingNumber',
      v_tracking_number
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
      'Sevkiyat kaydı bulunamadı: ' ||
      p_shipping_id::text
      using errcode = 'P0001';
  end if;

  if v_shipping.status <>
    'loaded' then
    raise exception
      'Yalnızca yüklemesi tamamlanmış sevkiyatın araç çıkışı yapılabilir.'
      using errcode = 'P0001';
  end if;

  if v_shipping.vehicle_id
      is null
    and v_shipping.strategy <>
      'parcel' then
    raise exception
      'Araçlı sevkiyat için çıkıştan önce araç atanmalıdır.'
      using errcode = 'P0001';
  end if;

  perform 1
  from public.warehouse_shipping_manifests
  where account_id =
      p_account_id
    and shipping_id =
      p_shipping_id
    and status in (
      'accepted',
      'approved'
    )
  limit 1;

  if not found then
    raise exception
      'Araç çıkışı için onaylanmış veya kabul edilmiş manifest gereklidir.'
      using errcode = 'P0001';
  end if;

  if v_shipping.carrier_id
      is not null then
    select carrier.*
    into v_carrier
    from public.warehouse_shipping_carriers
      as carrier
    where carrier.account_id =
        p_account_id
      and carrier.id =
        v_shipping.carrier_id;

    if not found then
      raise exception
        'Taşıyıcı bulunamadı: ' ||
        v_shipping.carrier_id::text
        using errcode = 'P0001';
    end if;

    if v_carrier.asn_supported then
      perform 1
      from public.warehouse_shipping_asns
      where account_id =
          p_account_id
        and shipping_id =
          p_shipping_id
        and status in (
          'sent',
          'acknowledged'
        )
      limit 1;

      if not found then
        raise exception
          'ASN destekli taşıyıcı için araç çıkışından önce ASN gönderilmelidir.'
          using errcode = 'P0001';
      end if;
    end if;
  end if;

  v_now :=
    now();

  for v_package in
    select package.*
    from public.warehouse_shipping_packages
      as package
    where package.account_id =
        p_account_id
      and package.shipping_id =
        p_shipping_id
    order by
      package.id
    for update
  loop
    v_package_count :=
      v_package_count + 1;

    if v_package.status <>
      'loaded' then
      raise exception
        'Yüklenmemiş paket bulunduğu için araç çıkışı yapılamaz.'
        using errcode = 'P0001';
    end if;
  end loop;

  select exists (
    select 1
    from public.warehouse_shipping_tracking_events
      as event
    where event.account_id =
        p_account_id
      and event.shipping_id =
        p_shipping_id
      and event.type =
        'dispatched'
      and event.shipping_package_id
        is null
      and event.external_event_code
        is null
      and event.occurred_at =
        v_now
  )
  into v_tracking_duplicate;

  if v_tracking_duplicate then
    raise exception
      'Aynı sevkiyat takip olayı daha önce kaydedilmiş.'
      using errcode = 'P0001';
  end if;

  if v_shipping.dock_id
      is not null then
    select dock.*
    into v_dock
    from public.warehouse_shipping_docks
      as dock
    where dock.account_id =
        p_account_id
      and dock.warehouse_id =
        v_shipping.warehouse_id
      and dock.id =
        v_shipping.dock_id
    for update;
  end if;

  update
    public.warehouse_shipping_packages
  set
    status =
      'dispatched',
    dispatched_at =
      v_now,
    updated_at =
      v_now,
    tracking_number =
      coalesce(
        v_tracking_number,
        tracking_number
      )
  where account_id =
      p_account_id
    and shipping_id =
      p_shipping_id
    and status =
      'loaded';

  get diagnostics
    v_updated_package_count =
      row_count;

  if v_updated_package_count <>
    v_package_count then
    raise exception
      'Sevkiyat paketleri eşzamanlı olarak değişti. Tekrar deneyin.'
      using errcode = '40001';
  end if;

  insert into
    public.warehouse_shipping_tracking_events (
      id,
      account_id,
      shipping_id,
      shipping_package_id,
      tracking_number,
      type,
      message,
      source,
      occurred_at,
      location_name,
      city,
      country_code,
      latitude,
      longitude,
      external_event_code,
      created_at
    )
  values (
    v_tracking_event_id,
    p_account_id,
    p_shipping_id,
    null,
    v_tracking_number,
    'dispatched',
    'Araç çıkışı yapıldı.',
    'warehouse',
    v_now,
    null,
    null,
    null,
    null,
    null,
    null,
    v_now
  );

  update
    public.warehouse_shippings
  set
    status =
      'dispatched',
    dispatched_at =
      coalesce(
        dispatched_at,
        v_now
      ),
    updated_at =
      v_now,
    tracking_number =
      coalesce(
        v_tracking_number,
        tracking_number
      )
  where account_id =
      p_account_id
    and id =
      p_shipping_id
    and status =
      'loaded'
  returning *
  into v_updated_shipping;

  if not found then
    raise exception
      'Sevkiyat araç çıkışı işlemi eşzamanlı olarak değişti. Tekrar deneyin.'
      using errcode = '40001';
  end if;

  if v_shipping.dock_id
      is not null
    and v_dock.id
      is not null then
    update
      public.warehouse_shipping_docks
    set
      status =
        'available',
      updated_at =
        v_now
    where account_id =
        p_account_id
      and warehouse_id =
        v_shipping.warehouse_id
      and id =
        v_shipping.dock_id;
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
      p_shipping_id,
      'status',
      v_updated_shipping.status,
      'dispatchedAt',
      v_updated_shipping.dispatched_at,
      'trackingNumber',
      v_updated_shipping.tracking_number,
      'updatedAt',
      v_updated_shipping.updated_at
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
$warehouse_shipping_dispatch_write$;

revoke all on function
  public.warehouse_shipping_dispatch_write(
    uuid,
    uuid,
    uuid,
    text,
    text
  )
from public;

revoke all on function
  public.warehouse_shipping_dispatch_write(
    uuid,
    uuid,
    uuid,
    text,
    text
  )
from anon;

revoke all on function
  public.warehouse_shipping_dispatch_write(
    uuid,
    uuid,
    uuid,
    text,
    text
  )
from authenticated;

grant execute on function
  public.warehouse_shipping_dispatch_write(
    uuid,
    uuid,
    uuid,
    text,
    text
  )
to authenticated;
