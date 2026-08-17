-- ============================================================
-- WarehouseIQ — A8.2.3
-- Atomic Packing Package Seal
--
-- Güvenlik / lifecycle:
-- - caller JWT / auth.uid()
-- - account role authorization
-- - account + request_id idempotency
-- - parent + package row locking
-- - sealed / labelled / shipping_ready tekrar kapatılamaz
-- - cancelled paket mühürlenemez
-- - package item olmadan seal yapılamaz
-- - actual weight / volume verilirse > 0 olmalıdır
-- - sealed_by her zaman auth.uid()
-- - label lifecycle YOK
-- - parent Packing lifecycle YOK
-- - inventory mutation YOK
-- ============================================================

create or replace function public.warehouse_packing_seal_package_write(
  p_request_id uuid,
  p_account_id uuid,
  p_packing_id uuid,
  p_package_id uuid,
  p_seal_number text default null,
  p_actual_weight numeric default null,
  p_actual_volume numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_packing_seal_package_write$
declare
  v_user_id uuid :=
    auth.uid();

  v_action constant text :=
    'seal_package';

  v_seal_number text :=
    nullif(
      btrim(
        coalesce(
          p_seal_number,
          ''
        )
      ),
      ''
    );

  v_actual_weight numeric(18,6) :=
    p_actual_weight;

  v_actual_volume numeric(18,6) :=
    p_actual_volume;

  v_payload jsonb;

  v_existing_action text;
  v_existing_payload jsonb;
  v_existing_response jsonb;
  v_inserted integer := 0;

  v_packing public.warehouse_packings%rowtype;
  v_package public.warehouse_packing_packages%rowtype;

  v_package_item_count integer;

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

  if p_request_id is null
    or p_account_id is null
    or p_packing_id is null
    or p_package_id is null then

    raise exception using
      errcode = '22023',
      message =
        'İstek, firma, paketleme ve paket kimlikleri zorunludur.';
  end if;

  if v_actual_weight is not null
    and v_actual_weight <= 0 then

    raise exception using
      errcode = '22023',
      message =
        'Gerçek paket ağırlığı sıfırdan büyük olmalıdır.';
  end if;

  if v_actual_volume is not null
    and v_actual_volume <= 0 then

    raise exception using
      errcode = '22023',
      message =
        'Gerçek paket hacmi sıfırdan büyük olmalıdır.';
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
        'Bu firma için paketleme yazma yetkiniz bulunmuyor.';
  end if;

  -- ==========================================================
  -- IDEMPOTENCY
  -- ==========================================================

  v_payload :=
    jsonb_strip_nulls(
      jsonb_build_object(
        'packingId',
          p_packing_id,
        'packageId',
          p_package_id,
        'sealNumber',
          v_seal_number,
        'actualWeight',
          v_actual_weight,
        'actualVolume',
          v_actual_volume
      )
    );

  select
    action,
    request_payload,
    response_payload
  into
    v_existing_action,
    v_existing_payload,
    v_existing_response
  from public.warehouse_packing_write_requests
  where account_id = p_account_id
    and request_id = p_request_id;

  if found then
    if v_existing_action <> v_action
      or v_existing_payload <> v_payload then

      raise exception using
        errcode = '23505',
        message =
          'Aynı istek kimliği farklı bir paketleme işlemi için kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception using
      errcode = '40001',
      message =
        'Aynı istek halen işleniyor. Tekrar deneyin.';
  end if;

  insert into public.warehouse_packing_write_requests (
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
      action,
      request_payload,
      response_payload
    into
      v_existing_action,
      v_existing_payload,
      v_existing_response
    from public.warehouse_packing_write_requests
    where account_id = p_account_id
      and request_id = p_request_id;

    if v_existing_action <> v_action
      or v_existing_payload <> v_payload then

      raise exception using
        errcode = '23505',
        message =
          'Aynı istek kimliği farklı bir paketleme işlemi için kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception using
      errcode = '40001',
      message =
        'Aynı istek halen işleniyor. Tekrar deneyin.';
  end if;

  -- ==========================================================
  -- PARENT LOCK
  -- ==========================================================

  select *
  into v_packing
  from public.warehouse_packings
  where account_id = p_account_id
    and id = p_packing_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Paketleme kaydı bulunamadı.';
  end if;

  -- ==========================================================
  -- PACKAGE LOCK
  -- ==========================================================

  select *
  into v_package
  from public.warehouse_packing_packages
  where account_id = p_account_id
    and packing_id = v_packing.id
    and id = p_package_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Mühürlenecek paket bulunamadı.';
  end if;

  if v_package.status in (
    'sealed',
    'labelled',
    'shipping_ready'
  ) then
    raise exception using
      errcode = '22023',
      message =
        'Paket daha önce kapatılmış.';
  end if;

  if v_package.status = 'cancelled' then
    raise exception using
      errcode = '22023',
      message =
        'İptal edilmiş paket mühürlenemez.';
  end if;

  -- ==========================================================
  -- PHYSICAL CONTENT
  -- ==========================================================

  select count(*)
  into v_package_item_count
  from public.warehouse_packing_package_items
  where account_id = p_account_id
    and packing_id = v_packing.id
    and package_id = v_package.id;

  if v_package_item_count = 0 then
    raise exception using
      errcode = '22023',
      message =
        'Ürün bulunmayan paket mühürlenemez.';
  end if;

  -- ==========================================================
  -- ATOMIC SEAL
  -- sealedBy = authenticated caller.
  -- ==========================================================

  update public.warehouse_packing_packages
  set
    status =
      'sealed',

    sealed_by =
      v_user_id,

    sealed_at =
      now(),

    seal_number =
      case
        when v_seal_number is null
          then seal_number
        else v_seal_number
      end,

    actual_weight =
      case
        when v_actual_weight is null
          then actual_weight
        else v_actual_weight
      end,

    actual_volume =
      case
        when v_actual_volume is null
          then actual_volume
        else v_actual_volume
      end,

    updated_at =
      now()

  where account_id = p_account_id
    and packing_id = v_packing.id
    and id = v_package.id

  returning *
  into v_package;

  -- ==========================================================
  -- IDEMPOTENT RESPONSE
  -- ==========================================================

  v_result :=
    jsonb_strip_nulls(
      jsonb_build_object(
        'ok',
          true,

        'action',
          v_action,

        'packingId',
          v_packing.id,

        'packageId',
          v_package.id,

        'packageNumber',
          v_package.package_number,

        'status',
          v_package.status,

        'sealedBy',
          v_package.sealed_by,

        'sealedAt',
          v_package.sealed_at,

        'sealNumber',
          v_package.seal_number,

        'actualWeight',
          v_package.actual_weight,

        'actualVolume',
          v_package.actual_volume,

        'weightUnit',
          v_package.weight_unit,

        'volumeUnit',
          v_package.volume_unit
      )
    );

  update public.warehouse_packing_write_requests
  set
    response_payload =
      v_result,
    completed_at =
      now()
  where account_id =
      p_account_id
    and request_id =
      p_request_id
    and user_id =
      v_user_id;

  return v_result;
end;
$warehouse_packing_seal_package_write$;


revoke all on function
  public.warehouse_packing_seal_package_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    numeric,
    numeric
  )
from public;

revoke all on function
  public.warehouse_packing_seal_package_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    numeric,
    numeric
  )
from anon;

revoke all on function
  public.warehouse_packing_seal_package_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    numeric,
    numeric
  )
from authenticated;

grant execute on function
  public.warehouse_packing_seal_package_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    numeric,
    numeric
  )
to authenticated;
