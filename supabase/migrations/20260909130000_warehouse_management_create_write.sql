-- WarehouseIQ
-- Controlled warehouse management create write path.
-- No changes to auth/session/RLS/live snapshot behavior.

create table if not exists public.warehouse_write_requests (
  request_id uuid primary key,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  account_id uuid not null
    references public.warehouse_accounts(id) on delete cascade,
  warehouse_id uuid,
  action text not null,
  request_payload jsonb not null,
  response_payload jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,

  constraint warehouse_write_requests_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete cascade,

  constraint warehouse_write_requests_action_check
    check (
      action in (
        'create',
        'update',
        'change_status'
      )
    ),

  constraint warehouse_write_requests_payload_object_check
    check (jsonb_typeof(request_payload) = 'object'),

  constraint warehouse_write_requests_response_object_check
    check (
      response_payload is null
      or jsonb_typeof(response_payload) = 'object'
    )
);

create index if not exists
  warehouse_write_requests_account_warehouse_idx
on public.warehouse_write_requests (
  account_id,
  warehouse_id,
  created_at desc
);

create index if not exists
  warehouse_write_requests_user_idx
on public.warehouse_write_requests (
  user_id,
  created_at desc
);

alter table public.warehouse_write_requests
  enable row level security;

revoke all
  on table public.warehouse_write_requests
  from public;

revoke all
  on table public.warehouse_write_requests
  from anon;

revoke all
  on table public.warehouse_write_requests
  from authenticated;


create or replace function public.warehouse_create_write(
  p_request_id uuid,
  p_account_id uuid,
  p_code text,
  p_name text,
  p_description text default null,
  p_timezone text default 'Europe/Istanbul',
  p_address_line text default null,
  p_district text default null,
  p_city text default null,
  p_postal_code text default null,
  p_country_code text default 'TR',
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

  v_code text;
  v_name text;
  v_description text;
  v_timezone text;
  v_address_line text;
  v_district text;
  v_city text;
  v_postal_code text;
  v_country_code text;

  v_warehouse public.warehouses%rowtype;

  v_request_payload jsonb;
  v_response_payload jsonb;

  v_existing_user_id uuid;
  v_existing_account_id uuid;
  v_existing_warehouse_id uuid;
  v_existing_action text;
  v_existing_request_payload jsonb;
  v_existing_response_payload jsonb;

  v_constraint_name text;

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

  if p_account_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_FORBIDDEN';
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

  v_code :=
    upper(
      btrim(
        coalesce(p_code, '')
      )
    );

  v_name :=
    btrim(
      coalesce(p_name, '')
    );

  v_description :=
    case
      when p_description is null
        or btrim(p_description) = ''
      then null
      else btrim(p_description)
    end;

  v_timezone :=
    case
      when p_timezone is null
        or btrim(p_timezone) = ''
      then 'Europe/Istanbul'
      else btrim(p_timezone)
    end;

  v_address_line :=
    case
      when p_address_line is null
        or btrim(p_address_line) = ''
      then null
      else btrim(p_address_line)
    end;

  v_district :=
    case
      when p_district is null
        or btrim(p_district) = ''
      then null
      else btrim(p_district)
    end;

  v_city :=
    case
      when p_city is null
        or btrim(p_city) = ''
      then null
      else btrim(p_city)
    end;

  v_postal_code :=
    case
      when p_postal_code is null
        or btrim(p_postal_code) = ''
      then null
      else btrim(p_postal_code)
    end;

  v_country_code :=
    upper(
      btrim(
        coalesce(p_country_code, 'TR')
      )
    );

  if v_code = ''
    or v_code !~ '^[A-Z0-9][A-Z0-9_-]{1,31}$'
  then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_CODE_INVALID';
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

  if p_total_area_square_meters is not null
    and p_total_area_square_meters < 0
  then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_TOTAL_AREA_INVALID';
  end if;

  if p_usable_area_square_meters is not null
    and p_usable_area_square_meters < 0
  then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_USABLE_AREA_INVALID';
  end if;

  if p_total_area_square_meters is not null
    and p_usable_area_square_meters is not null
    and p_usable_area_square_meters > p_total_area_square_meters
  then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_AREA_RELATIONSHIP_INVALID';
  end if;

  if p_maximum_pallet_capacity is not null
    and p_maximum_pallet_capacity < 0
  then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_PALLET_CAPACITY_INVALID';
  end if;

  if p_maximum_bin_capacity is not null
    and p_maximum_bin_capacity < 0
  then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_BIN_CAPACITY_INVALID';
  end if;

  v_request_payload :=
    jsonb_build_object(
      'account_id', p_account_id,
      'code', v_code,
      'name', v_name,
      'description', v_description,
      'timezone', v_timezone,
      'address_line', v_address_line,
      'district', v_district,
      'city', v_city,
      'postal_code', v_postal_code,
      'country_code', v_country_code,
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
    null,
    'create',
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
      errcode = 'P0001',
      message = 'WAREHOUSE_REQUEST_CONFLICT';
  end if;

  if v_existing_user_id <> v_user_id
    or v_existing_account_id <> p_account_id
    or v_existing_action <> 'create'
    or v_existing_request_payload <> v_request_payload
  then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_REQUEST_CONFLICT';
  end if;

  if v_existing_response_payload is not null then
    return v_existing_response_payload;
  end if;

  begin
    insert into public.warehouses (
      account_id,
      code,
      name,
      description,
      status,
      timezone,
      address_line,
      district,
      city,
      postal_code,
      country_code,
      total_area_square_meters,
      usable_area_square_meters,
      maximum_pallet_capacity,
      maximum_bin_capacity,
      created_by,
      updated_by
    )
    values (
      p_account_id,
      v_code,
      v_name,
      v_description,
      'draft',
      v_timezone,
      v_address_line,
      v_district,
      v_city,
      v_postal_code,
      v_country_code,
      p_total_area_square_meters,
      p_usable_area_square_meters,
      p_maximum_pallet_capacity,
      p_maximum_bin_capacity,
      v_user_id,
      v_user_id
    )
    returning *
    into v_warehouse;

  exception
    when unique_violation then
      get stacked diagnostics
        v_constraint_name = constraint_name;

      if v_constraint_name = 'warehouses_account_code_unique' then
        raise exception using
          errcode = 'P0001',
          message = 'WAREHOUSE_CODE_CONFLICT';
      end if;

      raise;
  end;

  v_response_payload :=
    jsonb_build_object(
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
    warehouse_id = v_warehouse.id,
    response_payload = v_response_payload,
    completed_at = now()
  where request_id = p_request_id;

  return v_response_payload;
end;
$function$;

revoke all
  on function public.warehouse_create_write(
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
    text,
    numeric,
    numeric,
    integer,
    integer
  )
  from public;

revoke all
  on function public.warehouse_create_write(
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
    text,
    numeric,
    numeric,
    integer,
    integer
  )
  from anon;

grant execute
  on function public.warehouse_create_write(
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
    text,
    numeric,
    numeric,
    integer,
    integer
  )
  to authenticated;
