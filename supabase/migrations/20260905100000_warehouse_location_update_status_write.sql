-- WarehouseIQ
-- Tenant-safe warehouse location update + status write path.
-- Extends the existing location write request idempotency ledger.
-- Does not modify warehouse_location_bootstrap_write behavior.

alter table public.warehouse_location_write_requests
  drop constraint if exists warehouse_location_write_requests_action_check;
alter table public.warehouse_location_write_requests
  add constraint warehouse_location_write_requests_action_check
  check (
    action in (
      'bootstrap_create',
      'update',
      'change_status'
    )
  );
create or replace function public.warehouse_location_update_write(
  p_request_id uuid,
  p_account_id uuid,
  p_warehouse_id uuid,
  p_location_id uuid,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_warehouse_status text;
  v_location public.warehouse_locations%rowtype;

  v_patch jsonb;
  v_request_payload jsonb;
  v_response_payload jsonb;

  v_existing_user_id uuid;
  v_existing_account_id uuid;
  v_existing_warehouse_id uuid;
  v_existing_action text;
  v_existing_request_payload jsonb;
  v_existing_response_payload jsonb;

  v_inserted integer;

  v_name text;
  v_description text;
  v_location_type text;

  v_maximum_weight_kilograms numeric;
  v_maximum_volume_cubic_meters numeric;
  v_maximum_pallet_count integer;
  v_maximum_unit_count numeric;

  v_width_centimeters numeric;
  v_depth_centimeters numeric;
  v_height_centimeters numeric;

  v_coordinate_x numeric;
  v_coordinate_y numeric;
  v_coordinate_z numeric;

  v_temperature_minimum_celsius numeric;
  v_temperature_maximum_celsius numeric;

  v_hazardous_material_allowed boolean;
  v_mixed_sku_allowed boolean;

  v_key text;
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

  if p_warehouse_id is null or p_location_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_NOT_FOUND';
  end if;

  if p_patch is null
     or jsonb_typeof(p_patch) <> 'object'
     or p_patch = '{}'::jsonb
  then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_INVALID_PATCH';
  end if;

  /*
   * Only mutable location fields are accepted.
   * Identity, hierarchy, barcode and lifecycle fields remain immutable
   * through this RPC.
   */
  for v_key in
    select key
    from jsonb_object_keys(p_patch) as key
  loop
    if v_key not in (
      'name',
      'description',
      'type',
      'maximumWeightKilograms',
      'maximumVolumeCubicMeters',
      'maximumPalletCount',
      'maximumUnitCount',
      'widthCentimeters',
      'depthCentimeters',
      'heightCentimeters',
      'coordinateX',
      'coordinateY',
      'coordinateZ',
      'temperatureMinimumCelsius',
      'temperatureMaximumCelsius',
      'hazardousMaterialAllowed',
      'mixedSkuAllowed'
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'WAREHOUSE_LOCATION_INVALID_PATCH';
    end if;
  end loop;

  /*
   * jsonb is the canonical idempotency payload.
   * We deliberately do not rebuild it from the current location row.
   */
  v_patch := p_patch;
  v_request_payload := jsonb_build_object(
    'locationId', p_location_id,
    'patch', v_patch
  );

  select
    wu.role
  into
    v_role
  from public.warehouse_users wu
  where wu.account_id = p_account_id
    and wu.user_id = v_user_id
    and wu.status = 'active'
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
  where w.account_id = p_account_id
    and w.id = p_warehouse_id
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

  /*
   * Existing request is checked before mutation.
   * The stored request payload is compared with the original patch.
   */
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
  where wr.request_id = p_request_id
  for update;

  if found then
    if v_existing_user_id <> v_user_id
      or v_existing_account_id <> p_account_id
      or v_existing_warehouse_id <> p_warehouse_id
      or v_existing_action <> 'update'
      or v_existing_request_payload is distinct from v_request_payload
    then
      raise exception using
        errcode = '23505',
        message = 'WAREHOUSE_LOCATION_REQUEST_CONFLICT';
    end if;

    if v_existing_response_payload is not null then
      return v_existing_response_payload;
    end if;

    raise exception using
      errcode = '40001',
      message = 'WAREHOUSE_LOCATION_REQUEST_IN_PROGRESS';
  end if;

  /*
   * Lock the target location so validation and mutation see one stable row.
   */
  select
    wl.*
  into
    v_location
  from public.warehouse_locations wl
  where wl.id = p_location_id
    and wl.account_id = p_account_id
    and wl.warehouse_id = p_warehouse_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_NOT_FOUND';
  end if;

  /*
   * Start from current values and apply only keys present in the patch.
   * This gives JSON null its intended meaning: clear the nullable value.
   */
  v_name := v_location.name;
  v_description := v_location.description;
  v_location_type := v_location.location_type;

  v_maximum_weight_kilograms := v_location.maximum_weight_kilograms;
  v_maximum_volume_cubic_meters := v_location.maximum_volume_cubic_meters;
  v_maximum_pallet_count := v_location.maximum_pallet_count;
  v_maximum_unit_count := v_location.maximum_unit_count;

  v_width_centimeters := v_location.width_centimeters;
  v_depth_centimeters := v_location.depth_centimeters;
  v_height_centimeters := v_location.height_centimeters;

  v_coordinate_x := v_location.coordinate_x;
  v_coordinate_y := v_location.coordinate_y;
  v_coordinate_z := v_location.coordinate_z;

  v_temperature_minimum_celsius := v_location.temperature_minimum_celsius;
  v_temperature_maximum_celsius := v_location.temperature_maximum_celsius;

  v_hazardous_material_allowed := v_location.hazardous_material_allowed;
  v_mixed_sku_allowed := v_location.mixed_sku_allowed;

  if p_patch ? 'name' then
    if p_patch->'name' = 'null'::jsonb
       or jsonb_typeof(p_patch->'name') <> 'string'
    then
      raise exception using
        errcode = 'P0001',
        message = 'WAREHOUSE_LOCATION_INVALID_NAME';
    end if;

    v_name := btrim(p_patch->>'name');

    if v_name = '' then
      raise exception using
        errcode = 'P0001',
        message = 'WAREHOUSE_LOCATION_INVALID_NAME';
    end if;
  end if;

  if p_patch ? 'description' then
    if p_patch->'description' = 'null'::jsonb then
      v_description := null;
    elsif jsonb_typeof(p_patch->'description') = 'string' then
      v_description := nullif(btrim(p_patch->>'description'), '');
    else
      raise exception using
        errcode = 'P0001',
        message = 'WAREHOUSE_LOCATION_INVALID_PATCH';
    end if;
  end if;

  if p_patch ? 'type' then
    if p_patch->'type' = 'null'::jsonb
       or jsonb_typeof(p_patch->'type') <> 'string'
    then
      raise exception using
        errcode = 'P0001',
        message = 'WAREHOUSE_LOCATION_INVALID_TYPE';
    end if;

    v_location_type := btrim(p_patch->>'type');
  end if;

  if p_patch ? 'maximumWeightKilograms' then
    if p_patch->'maximumWeightKilograms' = 'null'::jsonb then
      v_maximum_weight_kilograms := null;
    elsif jsonb_typeof(p_patch->'maximumWeightKilograms') = 'number' then
      v_maximum_weight_kilograms :=
        (p_patch->>'maximumWeightKilograms')::numeric;
    else
      raise exception using
        errcode = 'P0001',
        message = 'WAREHOUSE_LOCATION_INVALID_CAPACITY';
    end if;
  end if;

  if p_patch ? 'maximumVolumeCubicMeters' then
    if p_patch->'maximumVolumeCubicMeters' = 'null'::jsonb then
      v_maximum_volume_cubic_meters := null;
    elsif jsonb_typeof(p_patch->'maximumVolumeCubicMeters') = 'number' then
      v_maximum_volume_cubic_meters :=
        (p_patch->>'maximumVolumeCubicMeters')::numeric;
    else
      raise exception using
        errcode = 'P0001',
        message = 'WAREHOUSE_LOCATION_INVALID_CAPACITY';
    end if;
  end if;

  if p_patch ? 'maximumPalletCount' then
    if p_patch->'maximumPalletCount' = 'null'::jsonb then
      v_maximum_pallet_count := null;
    elsif jsonb_typeof(p_patch->'maximumPalletCount') = 'number' then
      v_maximum_pallet_count :=
        (p_patch->>'maximumPalletCount')::integer;
    else
      raise exception using
        errcode = 'P0001',
        message = 'WAREHOUSE_LOCATION_INVALID_CAPACITY';
    end if;
  end if;

  if p_patch ? 'maximumUnitCount' then
    if p_patch->'maximumUnitCount' = 'null'::jsonb then
      v_maximum_unit_count := null;
    elsif jsonb_typeof(p_patch->'maximumUnitCount') = 'number' then
      v_maximum_unit_count :=
        (p_patch->>'maximumUnitCount')::numeric;
    else
      raise exception using
        errcode = 'P0001',
        message = 'WAREHOUSE_LOCATION_INVALID_CAPACITY';
    end if;
  end if;

  if p_patch ? 'widthCentimeters' then
    if p_patch->'widthCentimeters' = 'null'::jsonb then
      v_width_centimeters := null;
    elsif jsonb_typeof(p_patch->'widthCentimeters') = 'number' then
      v_width_centimeters :=
        (p_patch->>'widthCentimeters')::numeric;
    else
      raise exception using
        errcode = 'P0001',
        message = 'WAREHOUSE_LOCATION_INVALID_DIMENSIONS';
    end if;
  end if;

  if p_patch ? 'depthCentimeters' then
    if p_patch->'depthCentimeters' = 'null'::jsonb then
      v_depth_centimeters := null;
    elsif jsonb_typeof(p_patch->'depthCentimeters') = 'number' then
      v_depth_centimeters :=
        (p_patch->>'depthCentimeters')::numeric;
    else
      raise exception using
        errcode = 'P0001',
        message = 'WAREHOUSE_LOCATION_INVALID_DIMENSIONS';
    end if;
  end if;

  if p_patch ? 'heightCentimeters' then
    if p_patch->'heightCentimeters' = 'null'::jsonb then
      v_height_centimeters := null;
    elsif jsonb_typeof(p_patch->'heightCentimeters') = 'number' then
      v_height_centimeters :=
        (p_patch->>'heightCentimeters')::numeric;
    else
      raise exception using
        errcode = 'P0001',
        message = 'WAREHOUSE_LOCATION_INVALID_DIMENSIONS';
    end if;
  end if;

  if p_patch ? 'coordinateX' then
    if p_patch->'coordinateX' = 'null'::jsonb then
      v_coordinate_x := null;
    elsif jsonb_typeof(p_patch->'coordinateX') = 'number' then
      v_coordinate_x := (p_patch->>'coordinateX')::numeric;
    else
      raise exception using
        errcode = 'P0001',
        message = 'WAREHOUSE_LOCATION_INVALID_DIMENSIONS';
    end if;
  end if;

  if p_patch ? 'coordinateY' then
    if p_patch->'coordinateY' = 'null'::jsonb then
      v_coordinate_y := null;
    elsif jsonb_typeof(p_patch->'coordinateY') = 'number' then
      v_coordinate_y := (p_patch->>'coordinateY')::numeric;
    else
      raise exception using
        errcode = 'P0001',
        message = 'WAREHOUSE_LOCATION_INVALID_DIMENSIONS';
    end if;
  end if;

  if p_patch ? 'coordinateZ' then
    if p_patch->'coordinateZ' = 'null'::jsonb then
      v_coordinate_z := null;
    elsif jsonb_typeof(p_patch->'coordinateZ') = 'number' then
      v_coordinate_z := (p_patch->>'coordinateZ')::numeric;
    else
      raise exception using
        errcode = 'P0001',
        message = 'WAREHOUSE_LOCATION_INVALID_DIMENSIONS';
    end if;
  end if;

  if p_patch ? 'temperatureMinimumCelsius' then
    if p_patch->'temperatureMinimumCelsius' = 'null'::jsonb then
      v_temperature_minimum_celsius := null;
    elsif jsonb_typeof(p_patch->'temperatureMinimumCelsius') = 'number' then
      v_temperature_minimum_celsius :=
        (p_patch->>'temperatureMinimumCelsius')::numeric;
    else
      raise exception using
        errcode = 'P0001',
        message = 'WAREHOUSE_LOCATION_INVALID_TEMPERATURE';
    end if;
  end if;

  if p_patch ? 'temperatureMaximumCelsius' then
    if p_patch->'temperatureMaximumCelsius' = 'null'::jsonb then
      v_temperature_maximum_celsius := null;
    elsif jsonb_typeof(p_patch->'temperatureMaximumCelsius') = 'number' then
      v_temperature_maximum_celsius :=
        (p_patch->>'temperatureMaximumCelsius')::numeric;
    else
      raise exception using
        errcode = 'P0001',
        message = 'WAREHOUSE_LOCATION_INVALID_TEMPERATURE';
    end if;
  end if;

  if p_patch ? 'hazardousMaterialAllowed' then
    if p_patch->'hazardousMaterialAllowed' = 'null'::jsonb then
      v_hazardous_material_allowed := null;
    elsif jsonb_typeof(p_patch->'hazardousMaterialAllowed') = 'boolean' then
      v_hazardous_material_allowed :=
        (p_patch->>'hazardousMaterialAllowed')::boolean;
    else
      raise exception using
        errcode = 'P0001',
        message = 'WAREHOUSE_LOCATION_INVALID_PATCH';
    end if;
  end if;

  if p_patch ? 'mixedSkuAllowed' then
    if p_patch->'mixedSkuAllowed' = 'null'::jsonb then
      v_mixed_sku_allowed := null;
    elsif jsonb_typeof(p_patch->'mixedSkuAllowed') = 'boolean' then
      v_mixed_sku_allowed :=
        (p_patch->>'mixedSkuAllowed')::boolean;
    else
      raise exception using
        errcode = 'P0001',
        message = 'WAREHOUSE_LOCATION_INVALID_PATCH';
    end if;
  end if;

  /*
   * NOT NULL database fields cannot be explicitly cleared.
   */
  if v_hazardous_material_allowed is null
     or v_mixed_sku_allowed is null
  then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_INVALID_PATCH';
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
        v_maximum_weight_kilograms,
        v_maximum_volume_cubic_meters,
        v_maximum_pallet_count::numeric,
        v_maximum_unit_count
      ]::numeric[]
    ) as values_to_check(value)
    where value is not null
      and (
        value < 0
        or value::text in ('NaN', 'Infinity', '-Infinity')
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
        v_width_centimeters,
        v_depth_centimeters,
        v_height_centimeters
      ]::numeric[]
    ) as values_to_check(value)
    where value is not null
      and (
        value < 0
        or value::text in ('NaN', 'Infinity', '-Infinity')
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
        v_coordinate_x,
        v_coordinate_y,
        v_coordinate_z
      ]::numeric[]
    ) as values_to_check(value)
    where value is not null
      and value::text in ('NaN', 'Infinity', '-Infinity')
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_INVALID_DIMENSIONS';
  end if;

  if (
    v_temperature_minimum_celsius is not null
    and (
      v_temperature_minimum_celsius::text in (
        'NaN',
        'Infinity',
        '-Infinity'
      )
      or v_temperature_minimum_celsius < -100
      or v_temperature_minimum_celsius > 100
    )
  )
  or (
    v_temperature_maximum_celsius is not null
    and (
      v_temperature_maximum_celsius::text in (
        'NaN',
        'Infinity',
        '-Infinity'
      )
      or v_temperature_maximum_celsius < -100
      or v_temperature_maximum_celsius > 100
    )
  )
  or (
    v_temperature_minimum_celsius is not null
    and v_temperature_maximum_celsius is not null
    and v_temperature_minimum_celsius >
      v_temperature_maximum_celsius
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_INVALID_TEMPERATURE';
  end if;

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
    'update',
    v_request_payload
  )
  on conflict (request_id)
  do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
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
    where wr.request_id = p_request_id
    for update;

    if not found then
      raise exception using
        errcode = '40001',
        message = 'WAREHOUSE_LOCATION_REQUEST_CONFLICT';
    end if;

    if v_existing_user_id <> v_user_id
      or v_existing_account_id <> p_account_id
      or v_existing_warehouse_id <> p_warehouse_id
      or v_existing_action <> 'update'
      or v_existing_request_payload is distinct from v_request_payload
    then
      raise exception using
        errcode = '23505',
        message = 'WAREHOUSE_LOCATION_REQUEST_CONFLICT';
    end if;

    if v_existing_response_payload is not null then
      return v_existing_response_payload;
    end if;

    raise exception using
      errcode = '40001',
      message = 'WAREHOUSE_LOCATION_REQUEST_IN_PROGRESS';
  end if;

  update public.warehouse_locations
  set
    name = v_name,
    description = v_description,
    location_type = v_location_type,
    maximum_weight_kilograms = v_maximum_weight_kilograms,
    maximum_volume_cubic_meters = v_maximum_volume_cubic_meters,
    maximum_pallet_count = v_maximum_pallet_count,
    maximum_unit_count = v_maximum_unit_count,
    width_centimeters = v_width_centimeters,
    depth_centimeters = v_depth_centimeters,
    height_centimeters = v_height_centimeters,
    coordinate_x = v_coordinate_x,
    coordinate_y = v_coordinate_y,
    coordinate_z = v_coordinate_z,
    temperature_minimum_celsius = v_temperature_minimum_celsius,
    temperature_maximum_celsius = v_temperature_maximum_celsius,
    hazardous_material_allowed = v_hazardous_material_allowed,
    mixed_sku_allowed = v_mixed_sku_allowed,
    updated_by = v_user_id,
    updated_at = now()
  where id = v_location.id
    and account_id = p_account_id
    and warehouse_id = p_warehouse_id;

  if not found then
    raise exception using
      errcode = '40001',
      message = 'WAREHOUSE_LOCATION_WRITE_CONFLICT';
  end if;

  select
    jsonb_build_object(
      'id', wl.id,
      'accountId', wl.account_id,
      'warehouseId', wl.warehouse_id,
      'parentLocationId', wl.parent_location_id,
      'code', wl.code,
      'fullCode', wl.full_code,
      'barcode', wl.barcode,
      'name', wl.name,
      'description', wl.description,
      'type', wl.location_type,
      'status', wl.status,
      'zoneCode', wl.zone_code,
      'aisleCode', wl.aisle_code,
      'rackCode', wl.rack_code,
      'levelCode', wl.level_code,
      'binCode', wl.bin_code,
      'maximumWeightKilograms', wl.maximum_weight_kilograms,
      'maximumVolumeCubicMeters', wl.maximum_volume_cubic_meters,
      'maximumPalletCount', wl.maximum_pallet_count,
      'maximumUnitCount', wl.maximum_unit_count,
      'widthCentimeters', wl.width_centimeters,
      'depthCentimeters', wl.depth_centimeters,
      'heightCentimeters', wl.height_centimeters,
      'coordinateX', wl.coordinate_x,
      'coordinateY', wl.coordinate_y,
      'coordinateZ', wl.coordinate_z,
      'temperatureMinimumCelsius', wl.temperature_minimum_celsius,
      'temperatureMaximumCelsius', wl.temperature_maximum_celsius,
      'hazardousMaterialAllowed', wl.hazardous_material_allowed,
      'mixedSkuAllowed', wl.mixed_sku_allowed,
      'active', wl.active,
      'createdAt', wl.created_at,
      'updatedAt', wl.updated_at,
      'updatedBy', wl.updated_by
    )
  into
    v_response_payload
  from public.warehouse_locations wl
  where wl.id = v_location.id
    and wl.account_id = p_account_id
    and wl.warehouse_id = p_warehouse_id;

  update public.warehouse_location_write_requests
  set
    response_payload = v_response_payload,
    completed_at = now()
  where request_id = p_request_id;

  return v_response_payload;
end;
$function$;
create or replace function public.warehouse_location_change_status_write(
  p_request_id uuid,
  p_account_id uuid,
  p_warehouse_id uuid,
  p_location_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_warehouse_status text;
  v_new_status text;

  v_location public.warehouse_locations%rowtype;

  v_request_payload jsonb;
  v_response_payload jsonb;

  v_existing_user_id uuid;
  v_existing_account_id uuid;
  v_existing_warehouse_id uuid;
  v_existing_action text;
  v_existing_request_payload jsonb;
  v_existing_response_payload jsonb;

  v_inserted integer;
begin
  if v_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_AUTH_REQUIRED';
  end if;

  if p_request_id is null
    or p_account_id is null
    or p_warehouse_id is null
    or p_location_id is null
  then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_REQUEST_CONFLICT';
  end if;

  select
    wu.role
  into
    v_role
  from public.warehouse_users wu
  where wu.account_id = p_account_id
    and wu.user_id = v_user_id
    and wu.status = 'active'
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
  where w.account_id = p_account_id
    and w.id = p_warehouse_id
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

  v_new_status := btrim(coalesce(p_status, ''));

  if v_new_status not in (
    'empty',
    'available',
    'reserved',
    'occupied',
    'blocked',
    'maintenance',
    'inactive'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_INVALID_STATUS';
  end if;

  select *
  into v_location
  from public.warehouse_locations
  where id = p_location_id
    and account_id = p_account_id
    and warehouse_id = p_warehouse_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_LOCATION_NOT_FOUND';
  end if;

  if v_location.status <> v_new_status then
    if not (
      (v_location.status = 'empty'
        and v_new_status in ('available', 'blocked', 'maintenance', 'inactive'))
      or
      (v_location.status = 'available'
        and v_new_status in ('reserved', 'occupied', 'blocked', 'maintenance', 'inactive'))
      or
      (v_location.status = 'reserved'
        and v_new_status in ('available', 'occupied', 'blocked', 'inactive'))
      or
      (v_location.status = 'occupied'
        and v_new_status in ('available', 'blocked', 'maintenance', 'inactive'))
      or
      (v_location.status = 'blocked'
        and v_new_status in ('empty', 'available', 'maintenance', 'inactive'))
      or
      (v_location.status = 'maintenance'
        and v_new_status in ('empty', 'available', 'blocked', 'inactive'))
      or
      (v_location.status = 'inactive'
        and v_new_status in ('empty', 'available'))
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'WAREHOUSE_LOCATION_INVALID_STATUS_TRANSITION';
    end if;
  end if;

  v_request_payload :=
    jsonb_build_object(
      'locationId', p_location_id,
      'status', v_new_status
    );

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
  where wr.request_id = p_request_id
  for update;

  if found then
    if v_existing_user_id <> v_user_id
      or v_existing_account_id <> p_account_id
      or v_existing_warehouse_id <> p_warehouse_id
      or v_existing_action <> 'change_status'
      or v_existing_request_payload is distinct from v_request_payload
    then
      raise exception using
        errcode = '23505',
        message = 'WAREHOUSE_LOCATION_REQUEST_CONFLICT';
    end if;

    if v_existing_response_payload is not null then
      return v_existing_response_payload;
    end if;

    raise exception using
      errcode = '40001',
      message = 'WAREHOUSE_LOCATION_REQUEST_IN_PROGRESS';
  end if;

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
    'change_status',
    v_request_payload
  )
  on conflict (request_id)
  do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
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
    where wr.request_id = p_request_id
    for update;

    if not found then
      raise exception using
        errcode = '40001',
        message = 'WAREHOUSE_LOCATION_REQUEST_CONFLICT';
    end if;

    if v_existing_user_id <> v_user_id
      or v_existing_account_id <> p_account_id
      or v_existing_warehouse_id <> p_warehouse_id
      or v_existing_action <> 'change_status'
      or v_existing_request_payload is distinct from v_request_payload
    then
      raise exception using
        errcode = '23505',
        message = 'WAREHOUSE_LOCATION_REQUEST_CONFLICT';
    end if;

    if v_existing_response_payload is not null then
      return v_existing_response_payload;
    end if;

    raise exception using
      errcode = '40001',
      message = 'WAREHOUSE_LOCATION_REQUEST_IN_PROGRESS';
  end if;

  /*
   * Same-status is intentionally a no-op.
   * It is still recorded and becomes idempotent.
   */
  if v_location.status <> v_new_status then
    update public.warehouse_locations
    set
      status = v_new_status,
      active = (v_new_status <> 'inactive'),
      updated_by = v_user_id,
      updated_at = now()
    where id = v_location.id
      and account_id = p_account_id
      and warehouse_id = p_warehouse_id;

    if not found then
      raise exception using
        errcode = '40001',
        message = 'WAREHOUSE_LOCATION_CONCURRENT_CHANGE';
    end if;
  end if;

  select *
  into v_location
  from public.warehouse_locations
  where id = p_location_id;

  v_response_payload :=
    jsonb_build_object(
      'id', v_location.id,
      'accountId', v_location.account_id,
      'warehouseId', v_location.warehouse_id,
      'parentLocationId', v_location.parent_location_id,
      'code', v_location.code,
      'fullCode', v_location.full_code,
      'barcode', v_location.barcode,
      'name', v_location.name,
      'description', v_location.description,
      'type', v_location.location_type,
      'status', v_location.status,
      'zoneCode', v_location.zone_code,
      'aisleCode', v_location.aisle_code,
      'rackCode', v_location.rack_code,
      'levelCode', v_location.level_code,
      'binCode', v_location.bin_code,
      'active', v_location.active,
      'createdAt', v_location.created_at,
      'updatedAt', v_location.updated_at,
      'updatedBy', v_location.updated_by
    );

  update public.warehouse_location_write_requests
  set
    response_payload = v_response_payload,
    completed_at = now()
  where request_id = p_request_id;

  return v_response_payload;
end;
$function$;
revoke all

on function public.warehouse_location_update_write(
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb
)

from public;
revoke all

on function public.warehouse_location_update_write(
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb
)

from anon;
grant execute

on function public.warehouse_location_update_write(
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb
)

to authenticated;
revoke all
on function public.warehouse_location_change_status_write(
  uuid,
  uuid,
  uuid,
  uuid,
  text
)
from public;
revoke all
on function public.warehouse_location_change_status_write(
  uuid,
  uuid,
  uuid,
  uuid,
  text
)
from anon;
grant execute
on function public.warehouse_location_change_status_write(
  uuid,
  uuid,
  uuid,
  uuid,
  text
)
to authenticated;
