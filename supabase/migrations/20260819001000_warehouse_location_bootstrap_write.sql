-- WarehouseIQ
-- Tenant-safe, create-only warehouse location bootstrap write path.
-- No inventory or operational workflow side effects.

create table if not exists public.warehouse_location_write_requests (
  request_id uuid primary key,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  account_id uuid not null
    references public.warehouse_accounts(id) on delete cascade,
  warehouse_id uuid not null,
  action text not null,
  request_payload jsonb not null,
  response_payload jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,

  constraint warehouse_location_write_requests_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete cascade,

  constraint warehouse_location_write_requests_action_check
    check (action = 'bootstrap_create'),

  constraint warehouse_location_write_requests_payload_object_check
    check (jsonb_typeof(request_payload) = 'object'),

  constraint warehouse_location_write_requests_response_object_check
    check (
      response_payload is null
      or jsonb_typeof(response_payload) = 'object'
    )
);

create index if not exists
  warehouse_location_write_requests_account_warehouse_idx
on public.warehouse_location_write_requests (
  account_id,
  warehouse_id,
  created_at desc
);

create index if not exists
  warehouse_location_write_requests_user_idx
on public.warehouse_location_write_requests (
  user_id,
  created_at desc
);

alter table public.warehouse_location_write_requests
  enable row level security;

revoke all
  on table public.warehouse_location_write_requests
  from public;

revoke all
  on table public.warehouse_location_write_requests
  from anon;

revoke all
  on table public.warehouse_location_write_requests
  from authenticated;

create or replace function public.warehouse_location_bootstrap_write(
  p_request_id uuid,
  p_account_id uuid,
  p_warehouse_id uuid,
  p_code text,
  p_name text,
  p_location_type text,
  p_zone_code text,
  p_parent_location_id uuid default null,
  p_aisle_code text default null,
  p_rack_code text default null,
  p_level_code text default null,
  p_bin_code text default null,
  p_description text default null,
  p_maximum_weight_kilograms numeric default null,
  p_maximum_volume_cubic_meters numeric default null,
  p_maximum_pallet_count integer default null,
  p_maximum_unit_count numeric default null,
  p_width_centimeters numeric default null,
  p_depth_centimeters numeric default null,
  p_height_centimeters numeric default null,
  p_coordinate_x numeric default null,
  p_coordinate_y numeric default null,
  p_coordinate_z numeric default null,
  p_temperature_minimum_celsius numeric default null,
  p_temperature_maximum_celsius numeric default null,
  p_hazardous_material_allowed boolean default false,
  p_mixed_sku_allowed boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid :=
    auth.uid();

  v_role text;
  v_warehouse_status text;

  v_code text;
  v_name text;
  v_location_type text;
  v_zone_code text;
  v_aisle_code text;
  v_rack_code text;
  v_level_code text;
  v_bin_code text;
  v_description text;

  v_full_code text;
  v_barcode text;

  v_parent_location_id uuid;

  v_request_payload jsonb;
  v_response_payload jsonb;

  v_existing_user_id uuid;
  v_existing_account_id uuid;
  v_existing_warehouse_id uuid;
  v_existing_action text;
  v_existing_request_payload jsonb;
  v_existing_response_payload jsonb;

  v_location public.warehouse_locations%rowtype;

  v_constraint_name text;
begin
  if v_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_AUTH_REQUIRED';
  end if;

  if p_request_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_REQUEST_CONFLICT';
  end if;

  if p_account_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_FORBIDDEN';
  end if;

  if p_warehouse_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_WAREHOUSE_NOT_FOUND';
  end if;

  select
    wu.role
  into
    v_role
  from public.warehouse_users wu
  where wu.account_id =
      p_account_id
    and wu.user_id =
      v_user_id
    and wu.status =
      'active'
  order by wu.created_at
  limit 1;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_FORBIDDEN';
  end if;

  if v_role <> all (
    array[
      'owner',
      'admin',
      'warehouse_manager',
      'supervisor',
      'inventory_controller'
    ]::text[]
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_FORBIDDEN';
  end if;

  select
    w.status
  into
    v_warehouse_status
  from public.warehouses w
  where w.account_id =
      p_account_id
    and w.id =
      p_warehouse_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_WAREHOUSE_NOT_FOUND';
  end if;

  if v_warehouse_status <> 'active' then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_WAREHOUSE_NOT_ACTIVE';
  end if;

  v_code :=
    upper(
      btrim(
        coalesce(
          p_code,
          ''
        )
      )
    );

  v_name :=
    btrim(
      coalesce(
        p_name,
        ''
      )
    );

  v_location_type :=
    lower(
      btrim(
        coalesce(
          p_location_type,
          ''
        )
      )
    );

  v_zone_code :=
    upper(
      btrim(
        coalesce(
          p_zone_code,
          ''
        )
      )
    );

  v_aisle_code :=
    case
      when p_aisle_code is null
        or btrim(p_aisle_code) = ''
      then null
      else upper(btrim(p_aisle_code))
    end;

  v_rack_code :=
    case
      when p_rack_code is null
        or btrim(p_rack_code) = ''
      then null
      else upper(btrim(p_rack_code))
    end;

  v_level_code :=
    case
      when p_level_code is null
        or btrim(p_level_code) = ''
      then null
      else upper(btrim(p_level_code))
    end;

  v_bin_code :=
    case
      when p_bin_code is null
        or btrim(p_bin_code) = ''
      then null
      else upper(btrim(p_bin_code))
    end;

  v_description :=
    case
      when p_description is null
        or btrim(p_description) = ''
      then null
      else btrim(p_description)
    end;

  if v_code !~
      '^[A-Z0-9][A-Z0-9_-]{0,31}$'
  then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_INVALID_CODE';
  end if;

  if v_zone_code !~
      '^[A-Z0-9][A-Z0-9_-]{0,31}$'
  then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_INVALID_CODE';
  end if;

  if v_aisle_code is not null
    and v_aisle_code !~
      '^[A-Z0-9][A-Z0-9_-]{0,31}$'
  then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_INVALID_CODE';
  end if;

  if v_rack_code is not null
    and v_rack_code !~
      '^[A-Z0-9][A-Z0-9_-]{0,31}$'
  then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_INVALID_CODE';
  end if;

  if v_level_code is not null
    and v_level_code !~
      '^[A-Z0-9][A-Z0-9_-]{0,31}$'
  then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_INVALID_CODE';
  end if;

  if v_bin_code is not null
    and v_bin_code !~
      '^[A-Z0-9][A-Z0-9_-]{0,31}$'
  then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_INVALID_CODE';
  end if;

  if v_name = '' then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_INVALID_NAME';
  end if;

  if v_location_type <> all (
    array[
      'receiving',
      'quality_control',
      'reserve',
      'picking',
      'bulk',
      'cold_storage',
      'hazardous',
      'returns',
      'damaged',
      'packing',
      'shipping',
      'cross_dock'
    ]::text[]
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_INVALID_TYPE';
  end if;

  if exists (
    select 1
    from unnest(
      array[
        p_maximum_weight_kilograms,
        p_maximum_volume_cubic_meters,
        p_maximum_pallet_count::numeric,
        p_maximum_unit_count
      ]::numeric[]
    ) as values_to_check(value)
    where value is not null
      and (
        value < 0
        or value::text in (
          'NaN',
          'Infinity',
          '-Infinity'
        )
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_INVALID_CAPACITY';
  end if;

  if exists (
    select 1
    from unnest(
      array[
        p_width_centimeters,
        p_depth_centimeters,
        p_height_centimeters
      ]::numeric[]
    ) as values_to_check(value)
    where value is not null
      and (
        value < 0
        or value::text in (
          'NaN',
          'Infinity',
          '-Infinity'
        )
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_INVALID_DIMENSIONS';
  end if;

  if exists (
    select 1
    from unnest(
      array[
        p_coordinate_x,
        p_coordinate_y,
        p_coordinate_z
      ]::numeric[]
    ) as values_to_check(value)
    where value is not null
      and value::text in (
        'NaN',
        'Infinity',
        '-Infinity'
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_INVALID_DIMENSIONS';
  end if;

  if (
    p_temperature_minimum_celsius is not null
    and (
      p_temperature_minimum_celsius::text in (
        'NaN',
        'Infinity',
        '-Infinity'
      )
      or p_temperature_minimum_celsius < -100
      or p_temperature_minimum_celsius > 100
    )
  )
  or (
    p_temperature_maximum_celsius is not null
    and (
      p_temperature_maximum_celsius::text in (
        'NaN',
        'Infinity',
        '-Infinity'
      )
      or p_temperature_maximum_celsius < -100
      or p_temperature_maximum_celsius > 100
    )
  )
  or (
    p_temperature_minimum_celsius is not null
    and p_temperature_maximum_celsius is not null
    and p_temperature_minimum_celsius >
      p_temperature_maximum_celsius
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_INVALID_TEMPERATURE';
  end if;

  v_full_code :=
    concat_ws(
      '-',
      v_zone_code,
      v_aisle_code,
      v_rack_code,
      v_level_code,
      v_bin_code
    );

  v_barcode :=
    format(
      'LOC:%s:%s',
      p_warehouse_id,
      v_full_code
    );

  if p_parent_location_id is not null then
    select
      wl.id
    into
      v_parent_location_id
    from public.warehouse_locations wl
    where wl.id =
        p_parent_location_id
      and wl.account_id =
        p_account_id
      and wl.warehouse_id =
        p_warehouse_id
    for share;

    if not found then
      raise exception using
        errcode = 'P0001',
        message = 'WAREHOUSE_LOCATION_PARENT_NOT_FOUND';
    end if;
  else
    v_parent_location_id :=
      null;
  end if;

  v_request_payload :=
    jsonb_strip_nulls(
      jsonb_build_object(
        'parentLocationId',
        v_parent_location_id,
        'code',
        v_code,
        'name',
        v_name,
        'type',
        v_location_type,
        'zoneCode',
        v_zone_code,
        'aisleCode',
        v_aisle_code,
        'rackCode',
        v_rack_code,
        'levelCode',
        v_level_code,
        'binCode',
        v_bin_code,
        'description',
        v_description,
        'maximumWeightKilograms',
        p_maximum_weight_kilograms,
        'maximumVolumeCubicMeters',
        p_maximum_volume_cubic_meters,
        'maximumPalletCount',
        p_maximum_pallet_count,
        'maximumUnitCount',
        p_maximum_unit_count,
        'widthCentimeters',
        p_width_centimeters,
        'depthCentimeters',
        p_depth_centimeters,
        'heightCentimeters',
        p_height_centimeters,
        'coordinateX',
        p_coordinate_x,
        'coordinateY',
        p_coordinate_y,
        'coordinateZ',
        p_coordinate_z,
        'temperatureMinimumCelsius',
        p_temperature_minimum_celsius,
        'temperatureMaximumCelsius',
        p_temperature_maximum_celsius,
        'hazardousMaterialAllowed',
        coalesce(
          p_hazardous_material_allowed,
          false
        ),
        'mixedSkuAllowed',
        coalesce(
          p_mixed_sku_allowed,
          false
        )
      )
    );

  insert into public.warehouse_location_write_requests (
    request_id,
    user_id,
    account_id,
    warehouse_id,
    action,
    request_payload
  )
  values (
    p_request_id,
    v_user_id,
    p_account_id,
    p_warehouse_id,
    'bootstrap_create',
    v_request_payload
  )
  on conflict (request_id)
  do nothing;

  select
    wr.user_id,
    wr.account_id,
    wr.warehouse_id,
    wr.action,
    wr.request_payload,
    wr.response_payload
  into
    v_existing_user_id,
    v_existing_account_id,
    v_existing_warehouse_id,
    v_existing_action,
    v_existing_request_payload,
    v_existing_response_payload
  from public.warehouse_location_write_requests wr
  where wr.request_id =
      p_request_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_REQUEST_CONFLICT';
  end if;

  if v_existing_user_id <>
      v_user_id
    or v_existing_account_id <>
      p_account_id
    or v_existing_warehouse_id <>
      p_warehouse_id
    or v_existing_action <>
      'bootstrap_create'
    or v_existing_request_payload <>
      v_request_payload
  then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_REQUEST_CONFLICT';
  end if;

  if v_existing_response_payload is not null then
    return
      v_existing_response_payload;
  end if;

  if exists (
    select 1
    from public.warehouse_locations wl
    where wl.warehouse_id =
        p_warehouse_id
      and wl.full_code =
        v_full_code
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_FULL_CODE_CONFLICT';
  end if;

  if exists (
    select 1
    from public.warehouse_locations wl
    where wl.warehouse_id =
        p_warehouse_id
      and wl.barcode =
        v_barcode
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_BARCODE_CONFLICT';
  end if;

  begin
    insert into public.warehouse_locations (
      account_id,
      warehouse_id,
      parent_location_id,
      code,
      full_code,
      barcode,
      name,
      description,
      location_type,
      status,
      zone_code,
      aisle_code,
      rack_code,
      level_code,
      bin_code,
      maximum_weight_kilograms,
      maximum_volume_cubic_meters,
      maximum_pallet_count,
      maximum_unit_count,
      width_centimeters,
      depth_centimeters,
      height_centimeters,
      coordinate_x,
      coordinate_y,
      coordinate_z,
      temperature_minimum_celsius,
      temperature_maximum_celsius,
      hazardous_material_allowed,
      mixed_sku_allowed,
      active,
      created_by,
      updated_by
    )
    values (
      p_account_id,
      p_warehouse_id,
      v_parent_location_id,
      v_code,
      v_full_code,
      v_barcode,
      v_name,
      v_description,
      v_location_type,
      'empty',
      v_zone_code,
      v_aisle_code,
      v_rack_code,
      v_level_code,
      v_bin_code,
      p_maximum_weight_kilograms,
      p_maximum_volume_cubic_meters,
      p_maximum_pallet_count,
      p_maximum_unit_count,
      p_width_centimeters,
      p_depth_centimeters,
      p_height_centimeters,
      p_coordinate_x,
      p_coordinate_y,
      p_coordinate_z,
      p_temperature_minimum_celsius,
      p_temperature_maximum_celsius,
      coalesce(
        p_hazardous_material_allowed,
        false
      ),
      coalesce(
        p_mixed_sku_allowed,
        false
      ),
      true,
      v_user_id,
      v_user_id
    )
    returning *
    into v_location;

  exception
    when unique_violation then
      get stacked diagnostics
        v_constraint_name =
          constraint_name;

      if v_constraint_name =
          'warehouse_locations_warehouse_full_code_unique'
      then
        raise exception using
          errcode = 'P0001',
          message = 'WAREHOUSE_LOCATION_FULL_CODE_CONFLICT';
      end if;

      if v_constraint_name =
          'warehouse_locations_warehouse_barcode_unique'
      then
        raise exception using
          errcode = 'P0001',
          message = 'WAREHOUSE_LOCATION_BARCODE_CONFLICT';
      end if;

      raise;
  end;

  v_response_payload :=
    jsonb_strip_nulls(
      jsonb_build_object(
        'id',
        v_location.id,
        'accountId',
        v_location.account_id,
        'warehouseId',
        v_location.warehouse_id,
        'parentLocationId',
        v_location.parent_location_id,
        'code',
        v_location.code,
        'fullCode',
        v_location.full_code,
        'barcode',
        v_location.barcode,
        'name',
        v_location.name,
        'type',
        v_location.location_type,
        'status',
        v_location.status,
        'zoneCode',
        v_location.zone_code,
        'aisleCode',
        v_location.aisle_code,
        'rackCode',
        v_location.rack_code,
        'levelCode',
        v_location.level_code,
        'binCode',
        v_location.bin_code,
        'active',
        v_location.active,
        'createdAt',
        v_location.created_at
      )
    );

  update public.warehouse_location_write_requests
  set
    response_payload =
      v_response_payload,
    completed_at =
      now()
  where request_id =
      p_request_id;

  return
    v_response_payload;
end;
$function$;

revoke all
on function public.warehouse_location_bootstrap_write(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  integer,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  boolean,
  boolean
)
from public;

revoke all
on function public.warehouse_location_bootstrap_write(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  integer,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  boolean,
  boolean
)
from anon;

revoke all
on function public.warehouse_location_bootstrap_write(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  integer,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  boolean,
  boolean
)
from authenticated;

grant execute
on function public.warehouse_location_bootstrap_write(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  integer,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  boolean,
  boolean
)
to authenticated;
