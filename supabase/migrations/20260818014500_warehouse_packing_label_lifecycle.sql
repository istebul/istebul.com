-- ============================================================
-- WarehouseIQ — A8.2.4.1
-- Packing Label Operational Lifecycle
--
-- Supported actions:
--   create_label
--   generate_label
--   mark_label_printed
--   mark_label_failed
--   cancel_label
--
-- Security:
-- - caller JWT / auth.uid()
-- - account role authorization
-- - account + request_id idempotency
-- - Packing / label / optional package account scoping
-- - row locking
-- - no browser direct DML
-- - no service role
--
-- Boundary:
-- - package lifecycle değiştirmez
-- - Packing parent lifecycle değiştirmez
-- - inventory / Picking değiştirmez
-- ============================================================

create or replace function public.warehouse_packing_label_write(
  p_action text,
  p_request_id uuid,
  p_account_id uuid,
  p_packing_id uuid,
  p_label_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_packing_label_write$
declare
  v_user_id uuid :=
    auth.uid();

  v_action text :=
    lower(
      btrim(
        coalesce(
          p_action,
          ''
        )
      )
    );

  v_payload jsonb :=
    coalesce(
      p_payload,
      '{}'::jsonb
    );

  v_request_payload jsonb;

  v_existing_action text;
  v_existing_payload jsonb;
  v_existing_response jsonb;
  v_inserted integer := 0;

  v_packing public.warehouse_packings%rowtype;
  v_package public.warehouse_packing_packages%rowtype;
  v_label public.warehouse_packing_labels%rowtype;

  v_package_id uuid;

  v_type text;
  v_format text;

  v_barcode_value text;
  v_sscc text;
  v_printer_id text;
  v_content text;
  v_failure_reason text;

  v_label_seq bigint;
  v_label_number text;

  v_sscc_seq bigint;
  v_sscc_serial text;
  v_sscc_base text;
  v_sscc_sum integer;
  v_sscc_check_digit integer;

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
    or p_packing_id is null then

    raise exception using
      errcode = '22023',
      message =
        'İstek, firma ve paketleme kimlikleri zorunludur.';
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    raise exception using
      errcode = '22023',
      message =
        'Etiket işlem verisi JSON nesnesi olmalıdır.';
  end if;

  if not (
    v_action = any (
      array[
        'create_label',
        'generate_label',
        'mark_label_printed',
        'mark_label_failed',
        'cancel_label'
      ]::text[]
    )
  ) then
    raise exception using
      errcode = '22023',
      message =
        'Desteklenmeyen etiket işlemi.';
  end if;

  if v_action = 'create_label' then
    if p_label_id is not null then
      raise exception using
        errcode = '22023',
        message =
          'Etiket oluşturma işleminde labelId gönderilmemelidir.';
    end if;
  else
    if p_label_id is null then
      raise exception using
        errcode = '22023',
        message =
          'Etiket kimliği zorunludur.';
    end if;
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
  -- CANONICAL IDEMPOTENCY PAYLOAD
  -- ==========================================================

  v_request_payload :=
    jsonb_strip_nulls(
      jsonb_build_object(
        'packingId',
          p_packing_id,
        'labelId',
          p_label_id,
        'payload',
          v_payload
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
      or v_existing_payload <>
        v_request_payload then

      raise exception using
        errcode = '23505',
        message =
          'Aynı istek kimliği farklı bir etiket işlemi için kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception using
      errcode = '40001',
      message =
        'Aynı etiket isteği halen işleniyor. Tekrar deneyin.';
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
    v_request_payload
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
      or v_existing_payload <>
        v_request_payload then

      raise exception using
        errcode = '23505',
        message =
          'Aynı istek kimliği farklı bir etiket işlemi için kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception using
      errcode = '40001',
      message =
        'Aynı etiket isteği halen işleniyor. Tekrar deneyin.';
  end if;

  -- ==========================================================
  -- PACKING SCOPE / LOCK
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
  -- CREATE LABEL
  -- ==========================================================

  if v_action = 'create_label' then
    if v_packing.status = 'cancelled' then
      raise exception using
        errcode = '22023',
        message =
          'İptal edilmiş paketleme için etiket oluşturulamaz.';
    end if;

    v_package_id :=
      nullif(
        btrim(
          v_payload ->> 'packageId'
        ),
        ''
      )::uuid;

    v_type :=
      lower(
        btrim(
          coalesce(
            v_payload ->> 'type',
            ''
          )
        )
      );

    v_format :=
      lower(
        btrim(
          coalesce(
            v_payload ->> 'format',
            ''
          )
        )
      );

    v_barcode_value :=
      nullif(
        btrim(
          v_payload ->> 'barcodeValue'
        ),
        ''
      );

    v_sscc :=
      nullif(
        btrim(
          v_payload ->> 'sscc'
        ),
        ''
      );

    v_printer_id :=
      nullif(
        btrim(
          v_payload ->> 'printerId'
        ),
        ''
      );

    if v_type not in (
      'package',
      'shipping',
      'sscc',
      'gs1_128',
      'carrier',
      'hazardous_material',
      'temperature_controlled',
      'return',
      'custom'
    ) then
      raise exception using
        errcode = '22023',
        message =
          'Etiket türü geçersizdir.';
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

    if v_type = 'sscc'
      and v_sscc is null then

      raise exception using
        errcode = '22023',
        message =
          'SSCC etiketi için SSCC değeri zorunludur.';
    end if;

    if v_package_id is not null then
      select *
      into v_package
      from public.warehouse_packing_packages
      where account_id = p_account_id
        and packing_id = v_packing.id
        and id = v_package_id
      for share;

      if not found then
        raise exception using
          errcode = 'P0002',
          message =
            'Etiketin bağlı olduğu paket bulunamadı.';
      end if;
    end if;

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
      printer_id,
      created_by,
      created_at,
      updated_at
    )
    values (
      p_account_id,
      v_packing.id,
      v_package_id,
      v_type,
      'created',
      v_label_number,
      v_barcode_value,
      v_sscc,
      v_format,
      v_printer_id,
      v_user_id,
      now(),
      now()
    )
    returning *
    into v_label;

  -- ==========================================================
  -- EXISTING LABEL LOCK
  -- ==========================================================

  else
    select *
    into v_label
    from public.warehouse_packing_labels
    where account_id = p_account_id
      and packing_id = v_packing.id
      and id = p_label_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Paketleme etiketi bulunamadı.';
    end if;

    -- ========================================================
    -- GENERATE LABEL
    -- ========================================================

    if v_action = 'generate_label' then
      if v_label.status in (
        'printed',
        'cancelled'
      ) then
        raise exception using
          errcode = '22023',
          message =
            'Yazdırılmış veya iptal edilmiş etiket yeniden üretilemez.';
      end if;

      v_sscc :=
        nullif(
          btrim(
            v_payload ->> 'sscc'
          ),
          ''
        );

      if v_sscc is null then
        v_sscc :=
          v_label.sscc;
      end if;

      if v_sscc is null
        and v_label.type in (
          'sscc',
          'gs1_128'
        ) then

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
      end if;

      v_barcode_value :=
        nullif(
          btrim(
            v_payload ->> 'barcodeValue'
          ),
          ''
        );

      if v_barcode_value is null then
        v_barcode_value :=
          coalesce(
            v_label.barcode_value,
            v_sscc
          );
      end if;

      v_content :=
        nullif(
          btrim(
            v_payload ->> 'content'
          ),
          ''
        );

      if v_content is null then
        if v_label.format = 'zpl' then
          v_content :=
            '^XA' || E'\n' ||
            '^FO40,40^A0N,35,35' || E'\n' ||
            '^FD' ||
              v_label.label_number ||
              '^FS' || E'\n' ||
            case
              when v_barcode_value is not null
                then
                  '^FO40,100^BY2' || E'\n' ||
                  '^BCN,100,Y,N,N' || E'\n' ||
                  '^FD' ||
                    v_barcode_value ||
                    '^FS' || E'\n'
              else ''
            end ||
            '^XZ';

        elsif v_label.format = 'text' then
          v_content :=
            'Etiket: ' ||
            v_label.label_number ||
            E'\n' ||
            'Tür: ' ||
            v_label.type ||
            case
              when v_barcode_value is not null
                then
                  E'\n' ||
                  'Barkod: ' ||
                  v_barcode_value
              else ''
            end ||
            case
              when v_sscc is not null
                then
                  E'\n' ||
                  'SSCC: ' ||
                  v_sscc
              else ''
            end;

        else
          v_content :=
            jsonb_strip_nulls(
              jsonb_build_object(
                'labelNumber',
                  v_label.label_number,
                'type',
                  v_label.type,
                'barcodeValue',
                  v_barcode_value,
                'sscc',
                  v_sscc,
                'format',
                  v_label.format
              )
            )::text;
        end if;
      end if;

      update public.warehouse_packing_labels
      set
        status =
          'generated',
        content =
          v_content,
        generated_at =
          now(),
        sscc =
          v_sscc,
        barcode_value =
          v_barcode_value,
        updated_at =
          now()
      where account_id = p_account_id
        and packing_id = v_packing.id
        and id = v_label.id
      returning *
      into v_label;

    -- ========================================================
    -- MARK PRINTED
    -- ========================================================

    elsif v_action = 'mark_label_printed' then
      if v_label.status <> 'generated' then
        raise exception using
          errcode = '22023',
          message =
            'Yalnızca üretilmiş etiket yazdırıldı olarak işaretlenebilir.';
      end if;

      v_printer_id :=
        nullif(
          btrim(
            v_payload ->> 'printerId'
          ),
          ''
        );

      if v_printer_id is null then
        v_printer_id :=
          v_label.printer_id;
      end if;

      update public.warehouse_packing_labels
      set
        status =
          'printed',
        printer_id =
          v_printer_id,
        printed_at =
          now(),
        updated_at =
          now()
      where account_id = p_account_id
        and packing_id = v_packing.id
        and id = v_label.id
      returning *
      into v_label;

    -- ========================================================
    -- MARK FAILED
    -- ========================================================

    elsif v_action = 'mark_label_failed' then
      if v_label.status in (
        'printed',
        'cancelled'
      ) then
        raise exception using
          errcode = '22023',
          message =
            'Yazdırılmış veya iptal edilmiş etiket başarısız olarak işaretlenemez.';
      end if;

      v_failure_reason :=
        nullif(
          btrim(
            v_payload ->> 'failureReason'
          ),
          ''
        );

      if v_failure_reason is null then
        raise exception using
          errcode = '22023',
          message =
            'Etiket hata nedeni boş bırakılamaz.';
      end if;

      update public.warehouse_packing_labels
      set
        status =
          'failed',
        failure_reason =
          v_failure_reason,
        updated_at =
          now()
      where account_id = p_account_id
        and packing_id = v_packing.id
        and id = v_label.id
      returning *
      into v_label;

    -- ========================================================
    -- CANCEL LABEL
    -- ========================================================

    elsif v_action = 'cancel_label' then
      if v_label.status = 'printed' then
        raise exception using
          errcode = '22023',
          message =
            'Yazdırılmış etiket doğrudan iptal edilemez.';
      end if;

      if v_label.status = 'cancelled' then
        raise exception using
          errcode = '22023',
          message =
            'Etiket daha önce iptal edilmiş.';
      end if;

      update public.warehouse_packing_labels
      set
        status =
          'cancelled',
        updated_at =
          now()
      where account_id = p_account_id
        and packing_id = v_packing.id
        and id = v_label.id
      returning *
      into v_label;
    end if;
  end if;

  -- ==========================================================
  -- RESPONSE
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
        'labelId',
          v_label.id,
        'packageId',
          v_label.package_id,
        'type',
          v_label.type,
        'status',
          v_label.status,
        'labelNumber',
          v_label.label_number,
        'barcodeValue',
          v_label.barcode_value,
        'sscc',
          v_label.sscc,
        'format',
          v_label.format,
        'content',
          v_label.content,
        'printerId',
          v_label.printer_id,
        'generatedAt',
          v_label.generated_at,
        'printedAt',
          v_label.printed_at,
        'failureReason',
          v_label.failure_reason,
        'createdBy',
          v_label.created_by,
        'createdAt',
          v_label.created_at,
        'updatedAt',
          v_label.updated_at
      )
    );

  update public.warehouse_packing_write_requests
  set
    response_payload =
      v_result,
    completed_at =
      now()
  where account_id = p_account_id
    and request_id = p_request_id
    and user_id = v_user_id;

  return v_result;
end;
$warehouse_packing_label_write$;


revoke all on function
  public.warehouse_packing_label_write(
    text,
    uuid,
    uuid,
    uuid,
    uuid,
    jsonb
  )
from public;

revoke all on function
  public.warehouse_packing_label_write(
    text,
    uuid,
    uuid,
    uuid,
    uuid,
    jsonb
  )
from anon;

revoke all on function
  public.warehouse_packing_label_write(
    text,
    uuid,
    uuid,
    uuid,
    uuid,
    jsonb
  )
from authenticated;

grant execute on function
  public.warehouse_packing_label_write(
    text,
    uuid,
    uuid,
    uuid,
    uuid,
    jsonb
  )
to authenticated;
