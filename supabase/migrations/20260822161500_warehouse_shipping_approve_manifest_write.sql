alter table public.warehouse_shipping_write_requests
  drop constraint if exists warehouse_shipping_write_requests_action_check;

alter table public.warehouse_shipping_write_requests
  add constraint warehouse_shipping_write_requests_action_check
  check (
    action in (
      'create_from_packing',
      'start_loading',
      'confirm_item_load',
      'load_package',
      'complete_loading',
      'create_manifest',
      'generate_manifest',
      'approve_manifest'
    )
  );

create or replace function
  public.warehouse_shipping_approve_manifest_write(
    p_request_id uuid,
    p_account_id uuid,
    p_shipping_id uuid,
    p_manifest_id uuid,
    p_approved_by text
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_shipping_approve_manifest_write$
declare
  v_action constant text := 'approve_manifest';

  v_user_id uuid := auth.uid();

  v_approved_by text;

  v_payload jsonb;
  v_result jsonb;

  v_existing public.warehouse_shipping_write_requests%rowtype;
  v_manifest public.warehouse_shipping_manifests%rowtype;

  v_inserted integer := 0;
  v_now timestamptz;
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Oturum açmış kullanıcı gerekli.';
  end if;

  if p_request_id is null then
    raise exception using
      errcode = '22023',
      message = 'İstek kimliği zorunludur.';
  end if;

  if p_account_id is null then
    raise exception using
      errcode = '22023',
      message = 'Firma kimliği zorunludur.';
  end if;

  if p_shipping_id is null then
    raise exception using
      errcode = '22023',
      message = 'Sevkiyat kimliği zorunludur.';
  end if;

  if p_manifest_id is null then
    raise exception using
      errcode = '22023',
      message = 'Manifest kimliği zorunludur.';
  end if;

  v_approved_by :=
    nullif(
      btrim(
        coalesce(
          p_approved_by,
          ''
        )
      ),
      ''
    );

  if v_approved_by is null then
    raise exception using
      errcode = '22023',
      message = 'Manifesti onaylayan kullanıcı boş bırakılamaz.';
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
      message = 'Bu sevkiyat işlemi için yetkiniz bulunmuyor.';
  end if;

  v_payload :=
    jsonb_build_object(
      'shippingId',
      p_shipping_id,
      'manifestId',
      p_manifest_id,
      'approvedBy',
      v_approved_by
    );

  select
    request_row.*
  into
    v_existing
  from
    public.warehouse_shipping_write_requests
      as request_row
  where
    request_row.account_id =
      p_account_id
    and request_row.request_id =
      p_request_id
  for update;

  if found then
    if v_existing.user_id <> v_user_id then
      raise exception using
        errcode = '42501',
        message =
          'Aynı istek kimliği başka bir kullanıcıya aittir.';
    end if;

    if
      v_existing.action <> v_action
      or v_existing.request_payload <> v_payload
    then
      raise exception using
        errcode = '23505',
        message =
          'Aynı istek kimliği farklı bir sevkiyat işlemi için kullanılamaz.';
    end if;

    if
      v_existing.completed_at is not null
      and v_existing.response_payload is not null
    then
      return v_existing.response_payload;
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
    v_inserted = row_count;

  if v_inserted = 0 then
    select
      request_row.*
    into
      v_existing
    from
      public.warehouse_shipping_write_requests
        as request_row
    where
      request_row.account_id =
        p_account_id
      and request_row.request_id =
        p_request_id
    for update;

    if not found then
      raise exception using
        errcode = '40001',
        message =
          'Aynı sevkiyat isteği halen işleniyor. Tekrar deneyin.';
    end if;

    if v_existing.user_id <> v_user_id then
      raise exception using
        errcode = '42501',
        message =
          'Aynı istek kimliği başka bir kullanıcıya aittir.';
    end if;

    if
      v_existing.action <> v_action
      or v_existing.request_payload <> v_payload
    then
      raise exception using
        errcode = '23505',
        message =
          'Aynı istek kimliği farklı bir sevkiyat işlemi için kullanılamaz.';
    end if;

    if
      v_existing.completed_at is not null
      and v_existing.response_payload is not null
    then
      return v_existing.response_payload;
    end if;

    raise exception using
      errcode = '40001',
      message =
        'Aynı sevkiyat isteği halen işleniyor. Tekrar deneyin.';
  end if;

  perform
    1
  from
    public.warehouse_shippings
      as shipping
  where
    shipping.account_id =
      p_account_id
    and shipping.id =
      p_shipping_id;

  if not found then
    raise exception using
      errcode = '22023',
      message =
        format(
          'Sevkiyat kaydı bulunamadı: %s',
          p_shipping_id
        );
  end if;

  select
    manifest.*
  into
    v_manifest
  from
    public.warehouse_shipping_manifests
      as manifest
  where
    manifest.account_id =
      p_account_id
    and manifest.shipping_id =
      p_shipping_id
    and manifest.id =
      p_manifest_id
  for update;

  if not found then
    raise exception using
      errcode = '22023',
      message =
        format(
          'Manifest bulunamadı: %s',
          p_manifest_id
        );
  end if;

  if v_manifest.status <> 'generated' then
    raise exception using
      errcode = '22023',
      message =
        'Yalnızca oluşturulmuş manifest onaylanabilir.';
  end if;

  if v_manifest.package_count = 0 then
    raise exception using
      errcode = '22023',
      message =
        'Paket içermeyen manifest onaylanamaz.';
  end if;

  if
    jsonb_array_length(
      v_manifest.packages
    ) <> v_manifest.package_count
  then
    raise exception using
      errcode = '22023',
      message =
        'Manifest paket sayısı ile paket kayıtları uyuşmamaktadır.';
  end if;

  v_now := clock_timestamp();

  update
    public.warehouse_shipping_manifests
  set
    status = 'approved',
    approved_by = v_approved_by,
    approved_at = v_now,
    updated_at = v_now
  where
    account_id =
      p_account_id
    and shipping_id =
      p_shipping_id
    and id =
      p_manifest_id
  returning
    *
  into
    v_manifest;

  v_result :=
    jsonb_build_object(
      'ok',
      true,
      'action',
      v_action,
      'requestId',
      p_request_id,
      'shippingId',
      v_manifest.shipping_id,
      'manifestId',
      v_manifest.id,
      'manifestNumber',
      v_manifest.manifest_number,
      'status',
      v_manifest.status,
      'packageCount',
      v_manifest.package_count,
      'packages',
      v_manifest.packages,
      'approvedBy',
      v_manifest.approved_by,
      'approvedAt',
      v_manifest.approved_at,
      'updatedAt',
      v_manifest.updated_at
    );

  update
    public.warehouse_shipping_write_requests
  set
    response_payload =
      v_result,
    completed_at =
      v_now
  where
    account_id =
      p_account_id
    and request_id =
      p_request_id;

  return v_result;
end;
$warehouse_shipping_approve_manifest_write$;

revoke all
  on function
    public.warehouse_shipping_approve_manifest_write(
      uuid,
      uuid,
      uuid,
      uuid,
      text
    )
  from public;

revoke all
  on function
    public.warehouse_shipping_approve_manifest_write(
      uuid,
      uuid,
      uuid,
      uuid,
      text
    )
  from anon;

revoke all
  on function
    public.warehouse_shipping_approve_manifest_write(
      uuid,
      uuid,
      uuid,
      uuid,
      text
    )
  from authenticated;

grant execute
  on function
    public.warehouse_shipping_approve_manifest_write(
      uuid,
      uuid,
      uuid,
      uuid,
      text
    )
  to authenticated;
