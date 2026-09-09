-- WarehouseIQ
--
-- Controlled warehouse management update write path.
-- Uses the shared warehouse_write_requests idempotency ledger.
-- Does not modify auth/session/RLS/live snapshot behavior.

create or replace function public.warehouse_update_write(
  p_request_id uuid,
  p_account_id uuid,
  p_warehouse_id uuid,
  p_name text default null,
  p_description text default null,
  p_timezone text default null,
  p_address_line text default null,
  p_district text default null,
  p_city text default null,
  p_postal_code text default null,
  p_country_code text default null,
  p_total_area_square_meters numeric default null,
  p_usable_area_square_meters numeric default null,
  p_maximum_pallet_capacity integer default null,
  p_maximum_bin_capacity integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_warehouse public.warehouses%rowtype;
  v_request_payload jsonb;
  v_response_payload jsonb;
  v_existing_user_id uuid;
  v_existing_account_id uuid;
  v_existing_warehouse_id uuid;
  v_existing_action text;
  v_existing_request_payload jsonb;
  v_existing_response_payload jsonb;
  v_name text;
  v_description text;
  v_timezone text;
  v_address_line text;
  v_district text;
  v_city text;
  v_postal_code text;
  v_country_code text;
  v_total_area_square_meters numeric;
  v_usable_area_square_meters numeric;
  v_maximum_pallet_capacity integer;
  v_maximum_bin_capacity integer;
begin
  if v_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_AUTH_REQUIRED';
  end if;

  if p_request_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_REQUEST_CONFLICT';
  end if;

  if p_account_id is null or p_warehouse_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_NOT_FOUND';
  end if;

  select wu.role
  into v_role
  from public.warehouse_users wu
  where wu.account_id = p_account_id
    and wu.user_id = v_user_id
    and wu.status = 'active'
  order by wu.created_at
  limit 1;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_FORBIDDEN';
  end if;

  if v_role <> all (
    array[
      'owner',
      'admin',
      'warehouse_manager'
    ]::text[]
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_FORBIDDEN';
  end if;

  /*
   * Lock the target warehouse before reading and mutating it.
   */
  select *
  into v_warehouse
  from public.warehouses w
  where w.account_id = p_account_id
    and w.id = p_warehouse_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_NOT_FOUND';
  end if;

  /*
   * Start from current values.
   * NULL parameters are interpreted as "no change" for scalar
   * fields, except description/address/capacity fields where the
   * explicit request contract below determines the resulting value.
   */

  v_name := v_warehouse.name;
  v_description := v_warehouse.description;
  v_timezone := v_warehouse.timezone;
  v_address_line := v_warehouse.address_line;
  v_district := v_warehouse.district;
  v_city := v_warehouse.city;
  v_postal_code := v_warehouse.postal_code;
  v_country_code := v_warehouse.country_code;

  if p_name is not null then
    v_name := btrim(p_name);

    if v_name = '' then
      raise exception using
        errcode = 'P0001',
        message = 'WAREHOUSE_NAME_INVALID';
    end if;
  end if;

  if p_description is not null then
    v_description := nullif(btrim(p_description), '');
  end if;

  if p_timezone is not null then
    v_timezone := btrim(p_timezone);

    if v_timezone = '' then
      raise exception using
        errcode = 'P0001',
        message = 'WAREHOUSE_TIMEZONE_INVALID';
    end if;
  end if;

  if p_address_line is not null then
    v_address_line := nullif(btrim(p_address_line), '');
  end if;

  if p_district is not null then
    v_district := nullif(btrim(p_district), '');
  end if;

  if p_city is not null then
    v_city := nullif(btrim(p_city), '');
  end if;

  if p_postal_code is not null then
    v_postal_code := nullif(btrim(p_postal_code), '');
  end if;

  if p_country_code is not null then
    v_country_code := upper(btrim(p_country_code));

    if v_country_code !~ '^[A-Z]{2}$' then
      raise exception using
        errcode = 'P0001',
        message = 'WAREHOUSE_COUNTRY_CODE_INVALID';
    end if;
  end if;

  if v_name = '' then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_NAME_INVALID';
  end if;

  if v_country_code !~ '^[A-Z]{2}$' then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_COUNTRY_CODE_INVALID';
  end if;

  v_total_area_square_meters := coalesce(
    p_total_area_square_meters,
    v_warehouse.total_area_square_meters
  );

  v_usable_area_square_meters := coalesce(
    p_usable_area_square_meters,
    v_warehouse.usable_area_square_meters
  );

  v_maximum_pallet_capacity := coalesce(
    p_maximum_pallet_capacity,
    v_warehouse.maximum_pallet_capacity
  );

  v_maximum_bin_capacity := coalesce(
    p_maximum_bin_capacity,
    v_warehouse.maximum_bin_capacity
  );

  if v_total_area_square_meters is not null
    and v_total_area_square_meters < 0
  then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_TOTAL_AREA_INVALID';
  end if;

  if v_usable_area_square_meters is not null
    and v_usable_area_square_meters < 0
  then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_USABLE_AREA_INVALID';
  end if;

  if v_maximum_pallet_capacity is not null
    and v_maximum_pallet_capacity < 0
  then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_PALLET_CAPACITY_INVALID';
  end if;

  if v_maximum_bin_capacity is not null
    and v_maximum_bin_capacity < 0
  then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_BIN_CAPACITY_INVALID';
  end if;

  if v_total_area_square_meters is not null
    and v_usable_area_square_meters is not null
    and v_usable_area_square_meters > v_total_area_square_meters
  then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_AREA_RELATIONSHIP_INVALID';
  end if;

  /*
   * Request payload represents the actual update patch.
   * This keeps request_id idempotency independent from current state.
   */
  v_request_payload := jsonb_build_object(
    'warehouse_id', p_warehouse_id,
    'name', p_name,
    'description', p_description,
    'timezone', p_timezone,
    'address_line', p_address_line,
    'district', p_district,
    'city', p_city,
    'postal_code', p_postal_code,
    'country_code', p_country_code,
    'total_area_square_meters', p_total_area_square_meters,
    'usable_area_square_meters', p_usable_area_square_meters,
    'maximum_pallet_capacity', p_maximum_pallet_capacity,
    'maximum_bin_capacity', p_maximum_bin_capacity
  );

  insert into public.warehouse_write_requests (
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
  from public.warehouse_write_requests wr
  where wr.request_id = p_request_id
  for update;

  if not found then
    raise exception using
      errcode = '40001',
      message = 'WAREHOUSE_REQUEST_CONFLICT';
  end if;

  if v_existing_user_id <> v_user_id
    or v_existing_account_id <> p_account_id
    or v_existing_warehouse_id <> p_warehouse_id
    or v_existing_action <> 'update'
    or v_existing_request_payload is distinct from v_request_payload
  then
    raise exception using
      errcode = '23505',
      message = 'WAREHOUSE_REQUEST_CONFLICT';
  end if;

  if v_existing_response_payload is not null then
    return v_existing_response_payload;
  end if;

  /*
   * Update only mutable warehouse fields.
   * Code, status, account_id and identity fields remain immutable here.
   */
  update public.warehouses
  set
    name = v_name,
    description = v_description,
    timezone = v_timezone,
    address_line = v_address_line,
    district = v_district,
    city = v_city,
    postal_code = v_postal_code,
    country_code = v_country_code,
    total_area_square_meters = v_total_area_square_meters,
    usable_area_square_meters = v_usable_area_square_meters,
    maximum_pallet_capacity = v_maximum_pallet_capacity,
    maximum_bin_capacity = v_maximum_bin_capacity,
    updated_by = v_user_id
  where id = p_warehouse_id
    and account_id = p_account_id;

  if not found then
    raise exception using
      errcode = '40001',
      message = 'WAREHOUSE_WRITE_CONFLICT';
  end if;

  select *
  into v_warehouse
  from public.warehouses w
  where w.account_id = p_account_id
    and w.id = p_warehouse_id;

  v_response_payload := jsonb_build_object(
    'ok', true,
    'warehouse', jsonb_build_object(
      'id', v_warehouse.id,
      'account_id', v_warehouse.account_id,
      'code', v_warehouse.code,
      'name', v_warehouse.name,
      'description', v_warehouse.description,
      'status', v_warehouse.status,
      'timezone', v_warehouse.timezone,
      'address_line', v_warehouse.address_line,
      'district', v_warehouse.district,
      'city', v_warehouse.city,
      'postal_code', v_warehouse.postal_code,
      'country_code', v_warehouse.country_code,
      'total_area_square_meters', v_warehouse.total_area_square_meters,
      'usable_area_square_meters', v_warehouse.usable_area_square_meters,
      'maximum_pallet_capacity', v_warehouse.maximum_pallet_capacity,
      'maximum_bin_capacity', v_warehouse.maximum_bin_capacity,
      'created_by', v_warehouse.created_by,
      'updated_by', v_warehouse.updated_by,
      'created_at', v_warehouse.created_at,
      'updated_at', v_warehouse.updated_at
    )
  );

  update public.warehouse_write_requests
  set
    response_payload = v_response_payload,
    completed_at = now()
  where request_id = p_request_id;

  return v_response_payload;
end;
$function$;

revoke all
  on function public.warehouse_update_write(
    uuid,
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    numeric,
    numeric,
    integer,
    integer
  )
  from public;

revoke all
  on function public.warehouse_update_write(
    uuid,
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    numeric,
    numeric,
    integer,
    integer
  )
  from anon;

grant execute
  on function public.warehouse_update_write(
    uuid,
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    numeric,
    numeric,
    integer,
    integer
  )
  to authenticated;
