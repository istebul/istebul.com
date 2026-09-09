-- WarehouseIQ
-- Controlled warehouse management status write path.
-- No changes to auth/session/RLS/live snapshot behavior.

create or replace function public.warehouse_change_status_write(
  p_request_id uuid,
  p_account_id uuid,
  p_warehouse_id uuid,
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
  v_current_status text;
  v_new_status text;
  v_request_payload jsonb;
  v_response_payload jsonb;
  v_existing_user_id uuid;
  v_existing_account_id uuid;
  v_existing_warehouse_id uuid;
  v_existing_action text;
  v_existing_request_payload jsonb;
  v_existing_response_payload jsonb;
  v_inserted integer;
  v_updated integer;
begin
  if v_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_AUTH_REQUIRED';
  end if;

  if p_request_id is null
    or p_account_id is null
    or p_warehouse_id is null
  then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_STATUS_REQUEST_CONFLICT';
  end if;

  v_new_status := btrim(coalesce(p_status, ''));

  if v_new_status not in (
    'draft',
    'active',
    'temporarily_closed',
    'inactive',
    'archived'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'WAREHOUSE_INVALID_STATUS';
  end if;

  /*
   * The request payload represents the actual client intent.
   * It must remain independent from the warehouse's current state.
   */
  v_request_payload := jsonb_build_object(
    'warehouse_id', p_warehouse_id,
    'status', v_new_status
  );

  /*
   * Authorize the caller before accessing the warehouse.
   */
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
   * Idempotency check intentionally happens before
   * state-dependent transition validation.
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
  from public.warehouse_write_requests wr
  where wr.request_id = p_request_id
  for update;

  if found then
    if v_existing_user_id <> v_user_id
      or v_existing_account_id <> p_account_id
      or v_existing_warehouse_id is distinct from p_warehouse_id
      or v_existing_action <> 'change_status'
      or v_existing_request_payload is distinct from v_request_payload
    then
      raise exception using
        errcode = '23505',
        message = 'WAREHOUSE_STATUS_REQUEST_CONFLICT';
    end if;

    if v_existing_response_payload is not null then
      return v_existing_response_payload;
    end if;

    raise exception using
      errcode = '40001',
      message = 'WAREHOUSE_STATUS_REQUEST_IN_PROGRESS';
  end if;

  /*
   * Lock the target warehouse after idempotency resolution.
   */
  select
    w.status
  into
    v_current_status
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
   * Same-status is an intentional no-op.
   */
  if v_current_status <> v_new_status then
    if not (
      (
        v_current_status = 'draft'
        and v_new_status in ('active', 'archived')
      )
      or
      (
        v_current_status = 'active'
        and v_new_status in (
          'temporarily_closed',
          'inactive',
          'archived'
        )
      )
      or
      (
        v_current_status = 'temporarily_closed'
        and v_new_status in (
          'active',
          'inactive',
          'archived'
        )
      )
      or
      (
        v_current_status = 'inactive'
        and v_new_status in ('active', 'archived')
      )
      or
      (
        v_current_status = 'archived'
        and false
      )
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'WAREHOUSE_INVALID_STATUS_TRANSITION';
    end if;
  end if;

  /*
   * Create the idempotency ledger entry before mutation.
   */
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
    from public.warehouse_write_requests wr
    where wr.request_id = p_request_id
    for update;

    if not found then
      raise exception using
        errcode = '40001',
        message = 'WAREHOUSE_STATUS_REQUEST_CONFLICT';
    end if;

    if v_existing_user_id <> v_user_id
      or v_existing_account_id <> p_account_id
      or v_existing_warehouse_id is distinct from p_warehouse_id
      or v_existing_action <> 'change_status'
      or v_existing_request_payload is distinct from v_request_payload
    then
      raise exception using
        errcode = '23505',
        message = 'WAREHOUSE_STATUS_REQUEST_CONFLICT';
    end if;

    if v_existing_response_payload is not null then
      return v_existing_response_payload;
    end if;

    raise exception using
      errcode = '40001',
      message = 'WAREHOUSE_STATUS_REQUEST_IN_PROGRESS';
  end if;

  /*
   * Apply the status mutation.
   */
  if v_current_status <> v_new_status then
    update public.warehouses
    set
      status = v_new_status,
      updated_by = v_user_id,
      updated_at = now()
    where id = p_warehouse_id
      and account_id = p_account_id;

    get diagnostics v_updated = row_count;

    if v_updated <> 1 then
      raise exception using
        errcode = '40001',
        message = 'WAREHOUSE_CONCURRENT_CHANGE';
    end if;
  end if;

  /*
   * Read back the final persisted state.
   */
  select
    jsonb_build_object(
      'id', w.id,
      'account_id', w.account_id,
      'code', w.code,
      'name', w.name,
      'description', w.description,
      'status', w.status,
      'timezone', w.timezone,
      'address_line', w.address_line,
      'district', w.district,
      'city', w.city,
      'postal_code', w.postal_code,
      'country_code', w.country_code,
      'total_area_square_meters', w.total_area_square_meters,
      'usable_area_square_meters', w.usable_area_square_meters,
      'maximum_pallet_capacity', w.maximum_pallet_capacity,
      'maximum_bin_capacity', w.maximum_bin_capacity,
      'created_by', w.created_by,
      'updated_by', w.updated_by,
      'created_at', w.created_at,
      'updated_at', w.updated_at
    )
  into v_response_payload
  from public.warehouses w
  where w.id = p_warehouse_id
    and w.account_id = p_account_id;

  if v_response_payload is null then
    raise exception using
      errcode = '40001',
      message = 'WAREHOUSE_CONCURRENT_CHANGE';
  end if;

  update public.warehouse_write_requests
  set
    response_payload = v_response_payload,
    completed_at = now()
  where request_id = p_request_id;

  return v_response_payload;
end;
$function$;

revoke all
on function public.warehouse_change_status_write(
  uuid,
  uuid,
  uuid,
  text
)
from public, anon;

grant execute
on function public.warehouse_change_status_write(
  uuid,
  uuid,
  uuid,
  text
)
to authenticated;
