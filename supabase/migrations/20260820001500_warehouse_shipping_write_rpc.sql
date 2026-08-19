-- ============================================================
-- WarehouseIQ — A9.2
-- Atomic Shipping Create From Packing
--
-- Contract:
-- - authenticated caller JWT / auth.uid()
-- - account role authorization
-- - account + request_id idempotency
-- - Packing parent FOR UPDATE
-- - yalnız status = shipping_ready
-- - en az bir shipping_ready package
-- - Shipping parent + item + package handoff tek transaction
-- - aynı Packing ikinci kez Shipping'e aktarılamaz
-- - actor created_by yalnız auth.uid()
-- - direct Shipping table write grant açılmaz
-- - inventory balance / movement mutation yok
-- ============================================================


-- ============================================================
-- Internal idempotency ledger
-- ============================================================

create table if not exists
  public.warehouse_shipping_write_requests (
    account_id uuid not null
      references public.warehouse_accounts(id)
      on delete cascade,

    request_id uuid not null,

    user_id uuid not null
      references auth.users(id)
      on delete cascade,

    action text not null,

    request_payload jsonb not null
      default '{}'::jsonb,

    response_payload jsonb,

    created_at timestamptz not null
      default now(),

    completed_at timestamptz,

    primary key (
      account_id,
      request_id
    ),

    constraint warehouse_shipping_write_requests_action_check
      check (
        action in (
          'create_from_packing'
        )
      ),

    constraint warehouse_shipping_write_requests_payload_object_check
      check (
        jsonb_typeof(request_payload) =
          'object'
      ),

    constraint warehouse_shipping_write_requests_response_object_check
      check (
        response_payload is null
        or jsonb_typeof(response_payload) =
          'object'
      )
  );

alter table
  public.warehouse_shipping_write_requests
enable row level security;

revoke all
on table public.warehouse_shipping_write_requests
from public;

revoke all
on table public.warehouse_shipping_write_requests
from anon;

revoke all
on table public.warehouse_shipping_write_requests
from authenticated;


-- ============================================================
-- Server-side Shipping number sequence
-- ============================================================

create sequence if not exists
  public.warehouse_shipping_number_seq
  as bigint
  start with 1
  increment by 1
  no minvalue
  no maxvalue
  cache 1;

revoke all
on sequence public.warehouse_shipping_number_seq
from public;

revoke all
on sequence public.warehouse_shipping_number_seq
from anon;

revoke all
on sequence public.warehouse_shipping_number_seq
from authenticated;


-- ============================================================
-- Atomic Packing -> Shipping bootstrap
-- ============================================================

create or replace function
  public.warehouse_shipping_create_from_packing_write(
    p_request_id uuid,
    p_account_id uuid,
    p_packing_id uuid,
    p_shipping_location_id uuid,
    p_strategy text default 'single_shipment',
    p_priority integer default null,
    p_planned_at timestamptz default null,
    p_expected_delivery_at timestamptz default null,
    p_notes text default null
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_shipping_create_from_packing_write$
declare
  v_user_id uuid :=
    auth.uid();

  v_action constant text :=
    'create_from_packing';

  v_strategy text :=
    lower(
      btrim(
        coalesce(
          p_strategy,
          'single_shipment'
        )
      )
    );

  v_notes text :=
    nullif(
      btrim(
        coalesce(
          p_notes,
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

  v_packing
    public.warehouse_packings%rowtype;

  v_shipping_location
    public.warehouse_locations%rowtype;

  v_existing_shipping
    public.warehouse_shippings%rowtype;

  v_shipping
    public.warehouse_shippings%rowtype;

  v_effective_priority integer;

  v_package_count integer := 0;
  v_invalid_package_exists boolean := false;

  v_item_count integer := 0;
  v_inserted_item_count integer := 0;
  v_inserted_package_count integer := 0;

  v_parent_link_count integer := 0;
  v_parent_updated_count integer := 0;

  v_temperature_controlled boolean :=
    false;

  v_hazardous_material boolean :=
    false;

  v_shipping_number text;

  v_ship_from_address jsonb;
  v_ship_to_address jsonb;

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

  if p_shipping_location_id is null then
    raise exception using
      errcode = '22023',
      message =
        'Sevkiyat lokasyonu zorunludur.';
  end if;

  if not (
    v_strategy = any (
      array[
        'single_shipment',
        'multi_order',
        'consolidated',
        'direct_delivery',
        'cross_dock',
        'parcel',
        'less_than_truckload',
        'full_truckload',
        'milk_run',
        'route_optimized',
        'carrier_optimized',
        'cost_optimized',
        'service_level_optimized',
        'temperature_controlled',
        'hazardous_material'
      ]::text[]
    )
  ) then
    raise exception using
      errcode = '22023',
      message =
        'Sevkiyat stratejisi geçersizdir.';
  end if;

  if p_priority is not null
    and (
      p_priority < 1
      or p_priority > 100
    ) then

    raise exception using
      errcode = '22023',
      message =
        'Sevkiyat önceliği 1 ile 100 arasında olmalıdır.';
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
        'Bu firma için sevkiyat oluşturma yetkiniz bulunmuyor.';
  end if;


  -- ==========================================================
  -- IDEMPOTENCY
  -- ==========================================================

  v_payload :=
    jsonb_build_object(
      'packingId',
        p_packing_id,
      'shippingLocationId',
        p_shipping_location_id,
      'strategy',
        v_strategy,
      'priority',
        p_priority,
      'plannedAt',
        p_planned_at,
      'expectedDeliveryAt',
        p_expected_delivery_at,
      'notes',
        v_notes
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
  from public.warehouse_shipping_write_requests
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
          'Aynı istek kimliği farklı bir sevkiyat işlemi için kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
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
  do nothing;

  get diagnostics
    v_inserted =
      row_count;

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
    from public.warehouse_shipping_write_requests
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
          'Aynı istek kimliği farklı bir sevkiyat işlemi için kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception using
      errcode = '40001',
      message =
        'Aynı sevkiyat isteği halen işleniyor. Tekrar deneyin.';
  end if;


  -- ==========================================================
  -- PACKING PARENT LOCK
  -- ==========================================================

  select *
  into v_packing
  from public.warehouse_packings
  where account_id =
      p_account_id
    and id =
      p_packing_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Paketleme kaydı bulunamadı.';
  end if;

  if v_packing.status <>
    'shipping_ready' then

    raise exception using
      errcode = '22023',
      message =
        'Yalnızca sevkiyata hazır paketleme kaydı sevkiyata aktarılabilir.';
  end if;

  v_effective_priority :=
    coalesce(
      p_priority,
      v_packing.priority
    );

  if v_effective_priority < 1
    or v_effective_priority > 100 then

    raise exception using
      errcode = '22023',
      message =
        'Sevkiyat önceliği 1 ile 100 arasında olmalıdır.';
  end if;


  -- ==========================================================
  -- SHIPPING LOCATION
  -- ==========================================================

  select *
  into v_shipping_location
  from public.warehouse_locations
  where account_id =
      p_account_id
    and warehouse_id =
      v_packing.warehouse_id
    and id =
      p_shipping_location_id
    and active =
      true
    and location_type in (
      'shipping',
      'cross_dock'
    )
    and status not in (
      'blocked',
      'maintenance',
      'inactive'
    );

  if not found then
    raise exception using
      errcode = '22023',
      message =
        'Geçerli ve aktif sevkiyat lokasyonu bulunamadı.';
  end if;


  -- ==========================================================
  -- PACKING CHILD SNAPSHOT LOCKS
  -- ==========================================================

  perform 1
  from public.warehouse_packing_items
  where account_id =
      p_account_id
    and packing_id =
      v_packing.id
  for update;

  perform 1
  from public.warehouse_packing_packages
  where account_id =
      p_account_id
    and packing_id =
      v_packing.id
  for update;

  select count(*)
  into v_package_count
  from public.warehouse_packing_packages
  where account_id =
      p_account_id
    and packing_id =
      v_packing.id;

  if v_package_count = 0 then
    raise exception using
      errcode = '22023',
      message =
        'Paket bulunmadan sevkiyat oluşturulamaz.';
  end if;

  select exists (
    select 1
    from public.warehouse_packing_packages
    where account_id =
        p_account_id
      and packing_id =
        v_packing.id
      and status <>
        'shipping_ready'
  )
  into v_invalid_package_exists;

  if v_invalid_package_exists then
    raise exception using
      errcode = '22023',
      message =
        'Sevkiyata aktarılacak tüm paketler sevkiyata hazır olmalıdır.';
  end if;

  select count(*)
  into v_item_count
  from public.warehouse_packing_items
  where account_id =
      p_account_id
    and packing_id =
      v_packing.id
    and packed_quantity >
      0;

  select count(*)
  into v_parent_link_count
  from public.warehouse_packing_packages
  where account_id =
      p_account_id
    and packing_id =
      v_packing.id
    and parent_package_id is not null;


  -- ==========================================================
  -- DUPLICATE PACKING HANDOFF
  -- ==========================================================

  select *
  into v_existing_shipping
  from public.warehouse_shippings
  where account_id =
      p_account_id
    and packing_id =
      v_packing.id
  for update;

  if found then
    raise exception using
      errcode = '23505',
      message =
        'Bu paketleme kaydı için daha önce sevkiyat oluşturulmuş.';
  end if;


  -- ==========================================================
  -- DOMAIN SNAPSHOTS
  -- ==========================================================

  select exists (
    select 1
    from public.warehouse_packing_items
    where account_id =
        p_account_id
      and packing_id =
        v_packing.id
      and temperature_controlled =
        true
  )
  into v_temperature_controlled;

  select exists (
    select 1
    from public.warehouse_packing_items
    where account_id =
        p_account_id
      and packing_id =
        v_packing.id
      and hazardous_material =
        true
  )
  into v_hazardous_material;

  loop
    v_shipping_number :=
      'SVK-' ||
      to_char(
        v_now at time zone 'UTC',
        'YYYYMMDD'
      ) ||
      '-' ||
      lpad(
        nextval(
          'public.warehouse_shipping_number_seq'::regclass
        )::text,
        6,
        '0'
      );

    exit when not exists (
      select 1
      from public.warehouse_shippings
      where account_id =
          p_account_id
        and shipping_number =
          v_shipping_number
    );
  end loop;

  v_ship_from_address :=
    jsonb_build_object(
      'id',
        gen_random_uuid(),
      'tenantId',
        p_account_id,
      'type',
        'ship_from',
      'name',
        'Depo Çıkış Adresi',
      'countryCode',
        'TR',
      'country',
        'Türkiye',
      'city',
        'Belirtilmedi',
      'addressLine1',
        'Depo: ' ||
        v_packing.warehouse_id::text,
      'residential',
        false,
      'validated',
        false,
      'createdAt',
        v_now,
      'updatedAt',
        v_now
    );

  v_ship_to_address :=
    jsonb_build_object(
      'id',
        gen_random_uuid(),
      'tenantId',
        p_account_id,
      'type',
        'ship_to',
      'name',
        'Teslimat Adresi',
      'countryCode',
        'TR',
      'country',
        'Türkiye',
      'city',
        'Belirtilmedi',
      'addressLine1',
        'Sevkiyat lokasyonu: ' ||
        coalesce(
          v_packing.shipping_location_id,
          v_packing.packing_location_id
        )::text,
      'residential',
        false,
      'validated',
        false,
      'createdAt',
        v_now,
      'updatedAt',
        v_now
    );


  -- ==========================================================
  -- SHIPPING PARENT
  -- ==========================================================

  insert into public.warehouse_shippings (
    account_id,
    shipping_number,
    warehouse_id,
    shipping_location_id,
    strategy,
    status,
    packing_id,
    order_id,
    order_number,
    reference_type,
    reference_id,
    reference_number,
    ship_from_address,
    ship_to_address,
    priority,
    planned_at,
    expected_delivery_at,
    notes,
    temperature_controlled,
    hazardous_material,
    created_by,
    created_at,
    updated_at
  )
  values (
    p_account_id,
    v_shipping_number,
    v_packing.warehouse_id,
    p_shipping_location_id,
    v_strategy,
    'draft',
    v_packing.id,
    v_packing.order_id,
    v_packing.order_number,
    'packing',
    v_packing.id::text,
    v_packing.packing_number,
    v_ship_from_address,
    v_ship_to_address,
    v_effective_priority,
    p_planned_at,
    p_expected_delivery_at,
    v_notes,
    v_temperature_controlled,
    v_hazardous_material,
    v_user_id,
    v_now,
    v_now
  )
  returning *
  into v_shipping;


  -- ==========================================================
  -- PACKING ITEM -> SHIPPING ITEM
  -- ==========================================================

  insert into public.warehouse_shipping_items (
    id,
    account_id,
    shipping_id,
    line_number,
    packing_id,
    packing_item_id,
    order_id,
    warehouse_id,
    product_id,
    sku_id,
    requested_quantity,
    loaded_quantity,
    delivered_quantity,
    returned_quantity,
    damaged_quantity,
    missing_quantity,
    remaining_quantity,
    unit,
    tracking,
    unit_weight,
    unit_volume,
    weight_unit,
    volume_unit,
    temperature_controlled,
    hazardous_material,
    created_by,
    created_at,
    updated_at
  )
  select
    gen_random_uuid(),
    p_account_id,
    v_shipping.id,
    row_number() over (
      order by
        item.line_number,
        item.id
    )::integer,
    v_packing.id,
    item.id,
    v_packing.order_id,
    item.warehouse_id,
    item.product_id,
    item.sku_id,
    item.packed_quantity,
    0,
    0,
    0,
    0,
    0,
    item.packed_quantity,
    item.unit,
    item.tracking,
    item.unit_weight,
    item.unit_volume,
    item.weight_unit,
    item.volume_unit,
    item.temperature_controlled,
    item.hazardous_material,
    v_user_id,
    v_now,
    v_now
  from public.warehouse_packing_items as item
  where item.account_id =
      p_account_id
    and item.packing_id =
      v_packing.id
    and item.packed_quantity >
      0
  order by
    item.line_number,
    item.id;

  get diagnostics
    v_inserted_item_count =
      row_count;

  if v_inserted_item_count <>
    v_item_count then

    raise exception using
      errcode = '40001',
      message =
        'Paketleme satırlarının tamamı atomik olarak sevkiyata aktarılamadı.';
  end if;


  -- ==========================================================
  -- PACKING PACKAGE -> SHIPPING PACKAGE
  -- ==========================================================

  insert into public.warehouse_shipping_packages (
    id,
    account_id,
    shipping_id,
    packing_id,
    packing_package_id,
    package_number,
    sscc,
    status,
    weight,
    volume,
    weight_unit,
    volume_unit,
    parent_package_id,
    loading_sequence,
    created_at,
    updated_at
  )
  select
    gen_random_uuid(),
    p_account_id,
    v_shipping.id,
    v_packing.id,
    package.id,
    package.package_number,
    package.sscc,
    'pending',
    coalesce(
      package.actual_weight,
      package.calculated_weight
    ),
    coalesce(
      package.actual_volume,
      package.calculated_volume
    ),
    package.weight_unit,
    package.volume_unit,
    null,
    row_number() over (
      order by
        package.created_at,
        package.package_number,
        package.id
    )::integer,
    v_now,
    v_now
  from public.warehouse_packing_packages as package
  where package.account_id =
      p_account_id
    and package.packing_id =
      v_packing.id
  order by
    package.created_at,
    package.package_number,
    package.id;

  get diagnostics
    v_inserted_package_count =
      row_count;

  if v_inserted_package_count <>
    v_package_count then

    raise exception using
      errcode = '40001',
      message =
        'Paketlerin tamamı atomik olarak sevkiyata aktarılamadı.';
  end if;


  -- ==========================================================
  -- NESTED PACKAGE RELATIONSHIP REMAP
  -- ==========================================================

  update public.warehouse_shipping_packages
    as child_shipping
  set
    parent_package_id =
      parent_shipping.id,
    updated_at =
      v_now
  from public.warehouse_packing_packages
    as source_child
  join public.warehouse_shipping_packages
    as parent_shipping
    on parent_shipping.account_id =
        p_account_id
      and parent_shipping.shipping_id =
        v_shipping.id
      and parent_shipping.packing_id =
        v_packing.id
      and parent_shipping.packing_package_id =
        source_child.parent_package_id
  where child_shipping.account_id =
      p_account_id
    and child_shipping.shipping_id =
      v_shipping.id
    and child_shipping.packing_id =
      v_packing.id
    and child_shipping.packing_package_id =
      source_child.id
    and source_child.account_id =
      p_account_id
    and source_child.packing_id =
      v_packing.id
    and source_child.parent_package_id
      is not null;

  get diagnostics
    v_parent_updated_count =
      row_count;

  if v_parent_updated_count <>
    v_parent_link_count then

    raise exception using
      errcode = '40001',
      message =
        'İç içe paket ilişkilerinin tamamı sevkiyat paketlerine aktarılamadı.';
  end if;


  -- ==========================================================
  -- RESPONSE / IDEMPOTENCY COMMIT
  -- ==========================================================

  v_result :=
    jsonb_build_object(
      'ok',
        true,
      'action',
        v_action,
      'requestId',
        p_request_id,
      'shippingId',
        v_shipping.id,
      'shippingNumber',
        v_shipping.shipping_number,
      'packingId',
        v_packing.id,
      'warehouseId',
        v_shipping.warehouse_id,
      'shippingLocationId',
        v_shipping.shipping_location_id,
      'status',
        v_shipping.status,
      'itemCount',
        v_inserted_item_count,
      'packageCount',
        v_inserted_package_count
    );

  update public.warehouse_shipping_write_requests
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

  if not found then
    raise exception using
      errcode = '40001',
      message =
        'Sevkiyat idempotency sonucu kaydedilemedi.';
  end if;

  return v_result;
end;
$warehouse_shipping_create_from_packing_write$;


-- ============================================================
-- Function ACL
-- ============================================================

revoke all on function
  public.warehouse_shipping_create_from_packing_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    integer,
    timestamptz,
    timestamptz,
    text
  )
from public;

revoke all on function
  public.warehouse_shipping_create_from_packing_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    integer,
    timestamptz,
    timestamptz,
    text
  )
from anon;

revoke all on function
  public.warehouse_shipping_create_from_packing_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    integer,
    timestamptz,
    timestamptz,
    text
  )
from authenticated;

grant execute on function
  public.warehouse_shipping_create_from_packing_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    integer,
    timestamptz,
    timestamptz,
    text
  )
to authenticated;
