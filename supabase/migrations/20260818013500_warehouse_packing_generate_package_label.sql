-- ============================================================
-- WarehouseIQ — A8.2.4
-- Atomic SSCC Package Label Generation
--
-- Tek transaction:
-- 1. caller JWT / account role
-- 2. idempotency
-- 3. Packing parent lock
-- 4. package lock
-- 5. sealed / labelled lifecycle gate
-- 6. SSCC üret
-- 7. generated label oluştur
-- 8. package -> labelled + sscc
-- 9. response ledger
--
-- Bu migration:
-- - label'ı printed yapmaz,
-- - label failure/cancel lifecycle çalıştırmaz,
-- - Packing parent status değiştirmez,
-- - package item değiştirmez,
-- - inventory veya Picking değiştirmez,
-- - service role kullanmaz.
-- ============================================================


-- Label numarası için yalnız SECURITY DEFINER RPC tarafından
-- tüketilecek dahili sequence.
create sequence if not exists
  public.warehouse_packing_label_number_seq
  as bigint
  start with 1
  increment by 1
  no minvalue
  no maxvalue
  cache 1;


-- SSCC serial reference için dahili sequence.
create sequence if not exists
  public.warehouse_packing_sscc_seq
  as bigint
  start with 1
  increment by 1
  no minvalue
  no maxvalue
  cache 1;


revoke all
on sequence public.warehouse_packing_label_number_seq
from public;

revoke all
on sequence public.warehouse_packing_label_number_seq
from anon;

revoke all
on sequence public.warehouse_packing_label_number_seq
from authenticated;


revoke all
on sequence public.warehouse_packing_sscc_seq
from public;

revoke all
on sequence public.warehouse_packing_sscc_seq
from anon;

revoke all
on sequence public.warehouse_packing_sscc_seq
from authenticated;


create or replace function
  public.warehouse_packing_generate_package_label_write(
    p_request_id uuid,
    p_account_id uuid,
    p_packing_id uuid,
    p_package_id uuid,
    p_format text default 'zpl',
    p_printer_id text default null
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_packing_generate_package_label_write$
declare
  v_user_id uuid :=
    auth.uid();

  v_action constant text :=
    'generate_package_label';

  v_format text :=
    lower(
      btrim(
        coalesce(
          p_format,
          'zpl'
        )
      )
    );

  v_printer_id text :=
    nullif(
      btrim(
        coalesce(
          p_printer_id,
          ''
        )
      ),
      ''
    );

  v_payload jsonb;

  v_existing_action text;
  v_existing_payload jsonb;
  v_existing_response jsonb;
  v_inserted integer := 0;

  v_packing public.warehouse_packings%rowtype;
  v_package public.warehouse_packing_packages%rowtype;
  v_label public.warehouse_packing_labels%rowtype;

  v_label_seq bigint;
  v_label_number text;

  v_sscc_seq bigint;
  v_sscc_serial text;
  v_sscc_base text;
  v_sscc_sum integer;
  v_sscc_check_digit integer;
  v_sscc text;

  v_content text;

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

  if v_format not in (
    'zpl',
    'pdf',
    'png',
    'svg',
    'text'
  ) then
    raise exception using
      errcode = '22023',
      message =
        'Etiket formatı geçersizdir.';
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
        'format',
          v_format,
        'printerId',
          v_printer_id
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

  if v_packing.status = 'cancelled' then
    raise exception using
      errcode = '22023',
      message =
        'İptal edilmiş paketleme için etiket oluşturulamaz.';
  end if;

  -- ==========================================================
  -- PACKAGE LOCK / DOMAIN GATE
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
        'Etiket oluşturulacak paket bulunamadı.';
  end if;

  if v_package.status not in (
    'sealed',
    'labelled'
  ) then
    raise exception using
      errcode = '22023',
      message =
        'Paket etiketi yalnızca mühürlenmiş paket için oluşturulabilir.';
  end if;

  -- ==========================================================
  -- LABEL NUMBER
  -- Domain pattern:
  -- ETK-YYYYMMDD-XXXXXX
  -- ==========================================================

  v_label_seq :=
    nextval(
      'public.warehouse_packing_label_number_seq'
    );

  v_label_number :=
    'ETK-' ||
    to_char(
      current_date,
      'YYYYMMDD'
    ) ||
    '-' ||
    lpad(
      mod(
        v_label_seq,
        1000000
      )::text,
      6,
      '0'
    );

  -- ==========================================================
  -- SSCC
  --
  -- Domain defaults:
  -- extension digit = 0
  -- company prefix = 8699999
  -- 9 digit serial reference
  -- GS1 check digit
  -- ==========================================================

  v_sscc_seq :=
    nextval(
      'public.warehouse_packing_sscc_seq'
    );

  v_sscc_serial :=
    lpad(
      mod(
        v_sscc_seq,
        1000000000
      )::text,
      9,
      '0'
    );

  v_sscc_base :=
    '0' ||
    '8699999' ||
    v_sscc_serial;

  select
    sum(
      substr(
        v_sscc_base,
        position,
        1
      )::integer
      *
      case
        when (
          length(v_sscc_base) -
          position
        ) % 2 = 0
          then 3
        else 1
      end
    )
  into v_sscc_sum
  from generate_series(
    1,
    length(v_sscc_base)
  ) as digits(position);

  v_sscc_check_digit :=
    mod(
      10 -
      mod(
        v_sscc_sum,
        10
      ),
      10
    );

  v_sscc :=
    v_sscc_base ||
    v_sscc_check_digit::text;

  if v_sscc !~ '^[0-9]{18}$' then
    raise exception using
      errcode = '22023',
      message =
        'Geçerli 18 haneli SSCC üretilemedi.';
  end if;

  -- ==========================================================
  -- CONTENT
  -- PackingLabelService.generateContent parity
  -- ==========================================================

  if v_format = 'zpl' then
    v_content :=
      '^XA' || E'\n' ||
      '^FO40,40^A0N,35,35' || E'\n' ||
      '^FD' ||
        v_label_number ||
        '^FS' || E'\n' ||
      '^FO40,100^BY2' || E'\n' ||
      '^BCN,100,Y,N,N' || E'\n' ||
      '^FD' ||
        v_sscc ||
        '^FS' || E'\n' ||
      '^XZ';

  elsif v_format = 'text' then
    v_content :=
      'Etiket: ' ||
      v_label_number ||
      E'\n' ||
      'Tür: sscc' ||
      E'\n' ||
      'Barkod: ' ||
      v_sscc ||
      E'\n' ||
      'SSCC: ' ||
      v_sscc;

  else
    v_content :=
      jsonb_build_object(
        'labelNumber',
          v_label_number,
        'type',
          'sscc',
        'barcodeValue',
          v_sscc,
        'sscc',
          v_sscc,
        'format',
          v_format
      )::text;
  end if;

  -- ==========================================================
  -- CREATE GENERATED LABEL
  --
  -- generatePackageLabel domain flow:
  -- create(status=created) + generate(status=generated)
  -- tek DB transaction içinde nihai generated state'e yazılır.
  -- ==========================================================

  insert into public.warehouse_packing_labels (
    account_id,
    packing_id,
    package_id,
    type,
    status,
    label_number,
    barcode_value,
    sscc,
    format,
    content,
    printer_id,
    generated_at,
    created_by,
    created_at,
    updated_at
  )
  values (
    p_account_id,
    v_packing.id,
    v_package.id,
    'sscc',
    'generated',
    v_label_number,
    v_sscc,
    v_sscc,
    v_format,
    v_content,
    v_printer_id,
    now(),
    v_user_id,
    now(),
    now()
  )
  returning *
  into v_label;

  -- ==========================================================
  -- PACKAGE -> LABELLED
  -- ==========================================================

  update public.warehouse_packing_packages
  set
    status =
      'labelled',
    sscc =
      v_label.sscc,
    updated_at =
      now()
  where account_id = p_account_id
    and packing_id = v_packing.id
    and id = v_package.id
  returning *
  into v_package;

  -- ==========================================================
  -- RESPONSE
  -- ==========================================================

  v_result :=
    jsonb_build_object(
      'ok',
        true,
      'action',
        v_action,
      'packingId',
        v_packing.id,
      'packageId',
        v_package.id,
      'packageStatus',
        v_package.status,
      'labelId',
        v_label.id,
      'labelNumber',
        v_label.label_number,
      'labelStatus',
        v_label.status,
      'type',
        v_label.type,
      'format',
        v_label.format,
      'sscc',
        v_label.sscc,
      'barcodeValue',
        v_label.barcode_value,
      'content',
        v_label.content,
      'printerId',
        v_label.printer_id,
      'generatedAt',
        v_label.generated_at,
      'createdBy',
        v_label.created_by
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
$warehouse_packing_generate_package_label_write$;


revoke all on function
  public.warehouse_packing_generate_package_label_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    text
  )
from public;

revoke all on function
  public.warehouse_packing_generate_package_label_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    text
  )
from anon;

revoke all on function
  public.warehouse_packing_generate_package_label_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    text
  )
from authenticated;

grant execute on function
  public.warehouse_packing_generate_package_label_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    text
  )
to authenticated;
