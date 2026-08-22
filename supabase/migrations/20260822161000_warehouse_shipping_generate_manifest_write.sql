alter table public.warehouse_shipping_write_requests
  drop constraint if exists
    warehouse_shipping_write_requests_action_check;

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
      'generate_manifest'
    )
  );

create or replace function
  public.warehouse_shipping_generate_manifest_write(
    p_request_id uuid,
    p_account_id uuid,
    p_shipping_id uuid,
    p_manifest_id uuid,
    p_generated_by text
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_shipping_generate_manifest_write$
declare
  v_user_id uuid := auth.uid();

  v_action constant text :=
    'generate_manifest';

  v_generated_by text;

  v_payload jsonb;

  v_existing
    public.warehouse_shipping_write_requests%rowtype;

  v_manifest
    public.warehouse_shipping_manifests%rowtype;

  v_now timestamptz;

  v_package_count integer := 0;
  v_packages jsonb := '[]'::jsonb;

  v_total_weight_kg numeric := 0;
  v_total_volume_cm3 numeric := 0;

  v_result jsonb;

  v_inserted integer := 0;
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

  if p_manifest_id is null then
    raise exception
      'Manifest kimliği zorunludur.'
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
      'Bu firma için sevkiyat manifesti oluşturma yetkiniz bulunmuyor.'
      using errcode = '42501';
  end if;

  v_generated_by :=
    nullif(
      btrim(
        coalesce(
          p_generated_by,
          ''
        )
      ),
      ''
    );

  if v_generated_by is null then
    raise exception
      'Manifesti oluşturan kullanıcı zorunludur.'
      using errcode = '22023';
  end if;

  v_payload :=
    jsonb_build_object(
      'shippingId',
      p_shipping_id,
      'manifestId',
      p_manifest_id,
      'generatedBy',
      v_generated_by
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
      or v_existing.request_payload <>
        v_payload then

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
      or v_existing.request_payload <>
        v_payload then

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

  perform 1
  from public.warehouse_shippings
    as shipping
  where shipping.account_id =
      p_account_id
    and shipping.id =
      p_shipping_id;

  if not found then
    raise exception
      'Sevkiyat kaydı bulunamadı: %',
      p_shipping_id
      using errcode = '22023';
  end if;

  select manifest.*
  into v_manifest
  from public.warehouse_shipping_manifests
    as manifest
  where manifest.account_id =
      p_account_id
    and manifest.shipping_id =
      p_shipping_id
    and manifest.id =
      p_manifest_id
  for update;

  if not found then
    raise exception
      'Manifest bulunamadı: %',
      p_manifest_id
      using errcode = '22023';
  end if;

  if v_manifest.status not in (
    'draft',
    'rejected'
  ) then
    raise exception
      'Yalnızca taslak veya reddedilmiş manifest yeniden oluşturulabilir.'
      using errcode = '22023';
  end if;

  perform 1
  from public.warehouse_shipping_packages
    as shipping_package
  where shipping_package.account_id =
      p_account_id
    and shipping_package.shipping_id =
      p_shipping_id
  order by
    shipping_package.loading_sequence
  for update;

  if not found then
    raise exception
      'Sevkiyat paketi bulunmadan manifest oluşturulamaz.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.warehouse_shipping_packages
      as shipping_package
    where shipping_package.account_id =
        p_account_id
      and shipping_package.shipping_id =
        p_shipping_id
      and shipping_package.status in (
        'pending',
        'cancelled'
      )
  ) then
    raise exception
      'Bekleyen veya iptal edilmiş paketler manifeste eklenemez.'
      using errcode = '22023';
  end if;

  select
    count(*)::integer,
    coalesce(
      jsonb_agg(
        jsonb_strip_nulls(
          jsonb_build_object(
            'shippingPackageId',
            shipping_package.id,
            'packageNumber',
            shipping_package.package_number,
            'sscc',
            shipping_package.sscc,
            'trackingNumber',
            shipping_package.tracking_number,
            'weight',
            shipping_package.weight,
            'volume',
            shipping_package.volume
          )
        )
        order by
          shipping_package.loading_sequence
      ),
      '[]'::jsonb
    ),
    coalesce(
      sum(
        case
          when shipping_package.weight
              is null then
            0
          when shipping_package.weight_unit =
              'g' then
            shipping_package.weight /
              1000
          else
            shipping_package.weight
        end
      ),
      0
    ),
    coalesce(
      sum(
        case
          when shipping_package.volume
              is null then
            0
          when shipping_package.volume_unit =
              'm3' then
            shipping_package.volume *
              1000000
          else
            shipping_package.volume
        end
      ),
      0
    )
  into
    v_package_count,
    v_packages,
    v_total_weight_kg,
    v_total_volume_cm3
  from public.warehouse_shipping_packages
    as shipping_package
  where shipping_package.account_id =
      p_account_id
    and shipping_package.shipping_id =
      p_shipping_id;

  if v_package_count = 0 then
    raise exception
      'Sevkiyat paketi bulunmadan manifest oluşturulamaz.'
      using errcode = '22023';
  end if;

  v_now := now();

  update public.warehouse_shipping_manifests
  set
    status = 'generated',
    package_count =
      v_package_count,
    packages =
      v_packages,
    generated_by =
      v_generated_by,
    generated_at =
      v_now,
    updated_at =
      v_now,
    total_weight =
      case
        when v_total_weight_kg > 0
          then v_total_weight_kg
        else total_weight
      end,
    weight_unit =
      case
        when v_total_weight_kg > 0
          then 'kg'
        else weight_unit
      end,
    total_volume =
      case
        when v_total_volume_cm3 > 0
          then v_total_volume_cm3
        else total_volume
      end,
    volume_unit =
      case
        when v_total_volume_cm3 > 0
          then 'cm3'
        else volume_unit
      end
  where account_id =
      p_account_id
    and shipping_id =
      p_shipping_id
    and id =
      p_manifest_id
  returning *
  into v_manifest;

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
      'totalWeight',
      v_manifest.total_weight,
      'totalVolume',
      v_manifest.total_volume,
      'weightUnit',
      v_manifest.weight_unit,
      'volumeUnit',
      v_manifest.volume_unit,
      'generatedBy',
      v_manifest.generated_by,
      'generatedAt',
      v_manifest.generated_at,
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
  where account_id =
      p_account_id
    and request_id =
      p_request_id;

  return v_result;
end;
$warehouse_shipping_generate_manifest_write$;

revoke all
on function
  public.warehouse_shipping_generate_manifest_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text
  )
from public;

revoke all
on function
  public.warehouse_shipping_generate_manifest_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text
  )
from anon;

revoke all
on function
  public.warehouse_shipping_generate_manifest_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text
  )
from authenticated;

grant execute
on function
  public.warehouse_shipping_generate_manifest_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text
  )
to authenticated;
