-- =========================================================
-- WarehouseIQ · Quality Control Write Foundation
-- QC-P2.1
--
-- İlk güvenli yazma dilimi:
-- - create
-- - add_item
-- - start
--
-- Bu migration:
-- - caller JWT / auth.uid() kullanır.
-- - Firma rolünü PostgreSQL tarafında doğrular.
-- - Aynı request_id + action + payload için idempotenttir.
-- - Quality tablolarına doğrudan authenticated mutation grant açmaz.
-- - record_result / complete / cancel / exception / sample /
--   document / task mutation işlemlerini açmaz.
-- - Inventory movement veya balance tablolarına yazmaz.
-- =========================================================


-- =========================================================
-- Kalite kontrol numarası sequence'i
-- =========================================================

create sequence if not exists
  public.warehouse_quality_inspection_number_seq;


-- =========================================================
-- İdempotent Quality write istekleri
-- =========================================================

create table if not exists
  public.warehouse_quality_write_requests (
    account_id uuid not null
      references public.warehouse_accounts(id)
      on delete cascade,

    request_id uuid not null,

    user_id uuid not null
      references auth.users(id)
      on delete cascade,

    action text not null,

    request_payload jsonb not null
      default '{}'::jsonb,

    response_payload jsonb,

    created_at timestamptz not null
      default now(),

    completed_at timestamptz,

    primary key (
      account_id,
      request_id
    ),

    constraint warehouse_quality_write_requests_action_check
      check (
        action in (
          'create',
          'add_item',
          'start'
        )
      ),

    constraint warehouse_quality_write_requests_payload_object_check
      check (
        jsonb_typeof(request_payload) = 'object'
      )
  );

create index if not exists
  warehouse_quality_write_requests_user_idx
on public.warehouse_quality_write_requests (
  account_id,
  user_id,
  created_at desc
);

alter table public.warehouse_quality_write_requests
  enable row level security;

-- Bu tablo browser/client tarafından doğrudan kullanılmaz.
-- SECURITY DEFINER RPC kendi transaction'ı içinde yönetir.
revoke all
  on table public.warehouse_quality_write_requests
  from public;

revoke all
  on table public.warehouse_quality_write_requests
  from anon;

revoke all
  on table public.warehouse_quality_write_requests
  from authenticated;


-- =========================================================
-- Quality write RPC
-- =========================================================

create or replace function
  public.warehouse_quality_control_write(
    p_action text,
    p_request_id uuid,
    p_account_id uuid,
    p_payload jsonb default '{}'::jsonb
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
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

  v_user_id uuid :=
    auth.uid();

  v_existing_action text;
  v_existing_payload jsonb;
  v_existing_response jsonb;
  v_existing_user_id uuid;

  v_inserted integer := 0;

  v_inspection
    public.warehouse_quality_inspections%rowtype;

  v_item
    public.warehouse_quality_inspection_items%rowtype;

  v_inspection_id uuid;
  v_inspection_item_id uuid;

  v_warehouse_id uuid;
  v_location_id uuid;

  v_receiving_id uuid;
  v_receiving_item_id uuid;

  v_product_id uuid;
  v_sku_id uuid;

  v_control_type text;
  v_unit text;

  v_inspected_quantity numeric(18,6);

  v_line_number integer;

  v_planned_at timestamptz;

  v_reference_type text;
  v_reference_id text;
  v_reference_number text;
  v_notes text;

  v_tracking jsonb;
  v_expected_value jsonb;

  v_inspection_number text;

  v_result jsonb;

  v_now timestamptz :=
    now();
begin

  -- =======================================================
  -- Ortak güvenlik / input kapıları
  -- =======================================================

  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message =
        'WarehouseIQ oturumu gerekli.';
  end if;

  if p_request_id is null then
    raise exception using
      errcode = '22023',
      message =
        'İstek kimliği zorunludur.';
  end if;

  if p_account_id is null then
    raise exception using
      errcode = '22023',
      message =
        'Firma kimliği zorunludur.';
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    raise exception using
      errcode = '22023',
      message =
        'İstek verisi JSON nesnesi olmalıdır.';
  end if;

  if not (
    v_action = any (
      array[
        'create',
        'add_item',
        'start'
      ]::text[]
    )
  ) then
    raise exception using
      errcode = '22023',
      message =
        'Desteklenmeyen kalite kontrol işlemi.';
  end if;

  if not public.warehouse_has_account_role(
    p_account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager',
      'supervisor',
      'inventory_controller',
      'quality_controller',
      'operator'
    ]::text[]
  ) then
    raise exception using
      errcode = '42501',
      message =
        'Bu firma için kalite kontrol yazma yetkiniz bulunmuyor.';
  end if;


  -- =======================================================
  -- Idempotency
  -- =======================================================

  select
    action,
    request_payload,
    response_payload,
    user_id
  into
    v_existing_action,
    v_existing_payload,
    v_existing_response,
    v_existing_user_id
  from public.warehouse_quality_write_requests
  where account_id = p_account_id
    and request_id = p_request_id;

  if found then

    if v_existing_user_id <> v_user_id then
      raise exception using
        errcode = '23505',
        message =
          'Aynı istek kimliği başka bir kullanıcı tarafından kullanılmış.';
    end if;

    if v_existing_action <> v_action
      or v_existing_payload <> v_payload
    then
      raise exception using
        errcode = '23505',
        message =
          'Aynı istek kimliği farklı bir işlem için kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception using
      errcode = '40001',
      message =
        'Aynı istek halen işleniyor. Tekrar deneyin.';
  end if;


  insert into public.warehouse_quality_write_requests (
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
      response_payload,
      user_id
    into
      v_existing_action,
      v_existing_payload,
      v_existing_response,
      v_existing_user_id
    from public.warehouse_quality_write_requests
    where account_id = p_account_id
      and request_id = p_request_id;

    if not found then
      raise exception using
        errcode = '40001',
        message =
          'İstek eşzamanlı olarak işleniyor. Tekrar deneyin.';
    end if;

    if v_existing_user_id <> v_user_id then
      raise exception using
        errcode = '23505',
        message =
          'Aynı istek kimliği başka bir kullanıcı tarafından kullanılmış.';
    end if;

    if v_existing_action <> v_action
      or v_existing_payload <> v_payload
    then
      raise exception using
        errcode = '23505',
        message =
          'Aynı istek kimliği farklı bir işlem için kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception using
      errcode = '40001',
      message =
        'Aynı istek halen işleniyor. Tekrar deneyin.';
  end if;


  -- =======================================================
  -- CREATE
  -- =======================================================

  if v_action = 'create' then

    v_warehouse_id :=
      nullif(
        btrim(
          v_payload ->> 'warehouseId'
        ),
        ''
      )::uuid;

    v_location_id :=
      nullif(
        btrim(
          v_payload ->> 'locationId'
        ),
        ''
      )::uuid;

    v_receiving_id :=
      nullif(
        btrim(
          v_payload ->> 'receivingId'
        ),
        ''
      )::uuid;

    v_reference_type :=
      nullif(
        btrim(
          v_payload ->> 'referenceType'
        ),
        ''
      );

    v_reference_id :=
      nullif(
        btrim(
          v_payload ->> 'referenceId'
        ),
        ''
      );

    v_reference_number :=
      nullif(
        btrim(
          v_payload ->> 'referenceNumber'
        ),
        ''
      );

    v_notes :=
      nullif(
        btrim(
          v_payload ->> 'notes'
        ),
        ''
      );

    if v_warehouse_id is null then
      raise exception using
        errcode = '22023',
        message =
          'Depo kimliği zorunludur.';
    end if;

    if v_location_id is null then
      raise exception using
        errcode = '22023',
        message =
          'Lokasyon kimliği zorunludur.';
    end if;

    if nullif(
      btrim(
        v_payload ->> 'plannedAt'
      ),
      ''
    ) is not null then
      v_planned_at :=
        (
          nullif(
            btrim(
              v_payload ->> 'plannedAt'
            ),
            ''
          )
        )::timestamptz;
    end if;


    perform 1
    from public.warehouses
    where account_id = p_account_id
      and id = v_warehouse_id;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Depo bulunamadı.';
    end if;


    perform 1
    from public.warehouse_locations
    where account_id = p_account_id
      and warehouse_id = v_warehouse_id
      and id = v_location_id;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Kalite kontrol lokasyonu bulunamadı.';
    end if;


    if v_receiving_id is not null then

      perform 1
      from public.warehouse_receivings
      where account_id = p_account_id
        and id = v_receiving_id;

      if not found then
        raise exception using
          errcode = 'P0002',
          message =
            'Mal kabul kaydı bulunamadı.';
      end if;


      perform 1
      from public.warehouse_quality_inspections
      where account_id = p_account_id
        and receiving_id = v_receiving_id;

      if found then
        raise exception using
          errcode = '23505',
          message =
            'Bu mal kabul kaydı için daha önce kalite kontrol oluşturulmuş.';
      end if;

    end if;


    v_inspection_id :=
      gen_random_uuid();

    v_inspection_number :=
      'KK-'
      ||
      to_char(
        v_now at time zone 'UTC',
        'YYYYMMDD'
      )
      ||
      '-'
      ||
      lpad(
        nextval(
          'public.warehouse_quality_inspection_number_seq'
        )::text,
        6,
        '0'
      );


    insert into public.warehouse_quality_inspections (
      id,
      account_id,
      inspection_number,
      warehouse_id,
      location_id,
      receiving_id,
      reference_type,
      reference_id,
      reference_number,
      status,
      final_decision,
      planned_at,
      notes,
      created_by
    )
    values (
      v_inspection_id,
      p_account_id,
      v_inspection_number,
      v_warehouse_id,
      v_location_id,
      v_receiving_id,
      v_reference_type,
      v_reference_id,
      v_reference_number,
      'draft',
      'pending',
      v_planned_at,
      v_notes,
      v_user_id
    )
    returning *
    into v_inspection;


    v_result :=
      jsonb_build_object(
        'action',
        v_action,

        'inspectionId',
        v_inspection.id,

        'inspectionNumber',
        v_inspection.inspection_number,

        'status',
        v_inspection.status,

        'finalDecision',
        v_inspection.final_decision
      );


  -- =======================================================
  -- ADD ITEM
  -- =======================================================

  elsif v_action = 'add_item' then

    v_inspection_id :=
      nullif(
        btrim(
          v_payload ->> 'inspectionId'
        ),
        ''
      )::uuid;

    v_product_id :=
      nullif(
        btrim(
          v_payload ->> 'productId'
        ),
        ''
      )::uuid;

    v_sku_id :=
      nullif(
        btrim(
          v_payload ->> 'skuId'
        ),
        ''
      )::uuid;

    v_receiving_id :=
      nullif(
        btrim(
          v_payload ->> 'receivingId'
        ),
        ''
      )::uuid;

    v_receiving_item_id :=
      nullif(
        btrim(
          v_payload ->> 'receivingItemId'
        ),
        ''
      )::uuid;

    v_warehouse_id :=
      nullif(
        btrim(
          v_payload ->> 'warehouseId'
        ),
        ''
      )::uuid;

    v_location_id :=
      nullif(
        btrim(
          v_payload ->> 'locationId'
        ),
        ''
      )::uuid;

    v_control_type :=
      lower(
        btrim(
          coalesce(
            v_payload ->> 'controlType',
            ''
          )
        )
      );

    v_unit :=
      btrim(
        coalesce(
          v_payload ->> 'unit',
          ''
        )
      );

    v_notes :=
      nullif(
        btrim(
          v_payload ->> 'notes'
        ),
        ''
      );

    if v_inspection_id is null then
      raise exception using
        errcode = '22023',
        message =
          'Kalite kontrol kimliği zorunludur.';
    end if;

    if v_product_id is null then
      raise exception using
        errcode = '22023',
        message =
          'Ürün kimliği zorunludur.';
    end if;

    if v_warehouse_id is null then
      raise exception using
        errcode = '22023',
        message =
          'Depo kimliği zorunludur.';
    end if;

    if v_location_id is null then
      raise exception using
        errcode = '22023',
        message =
          'Lokasyon kimliği zorunludur.';
    end if;

    if v_control_type = '' then
      raise exception using
        errcode = '22023',
        message =
          'Kontrol türü zorunludur.';
    end if;

    if not (
      v_control_type = any (
        array[
          'receiving_inspection',
          'sampling_inspection',
          'visual_inspection',
          'dimensional_inspection',
          'temperature_inspection',
          'packaging_inspection',
          'barcode_inspection',
          'label_inspection',
          'laboratory_inspection',
          'final_inspection'
        ]::text[]
      )
    ) then
      raise exception using
        errcode = '22023',
        message =
          'Kontrol türü geçersizdir.';
    end if;

    if v_unit = '' then
      raise exception using
        errcode = '22023',
        message =
          'Ölçü birimi boş bırakılamaz.';
    end if;


    begin
      v_inspected_quantity :=
        (
          v_payload ->> 'inspectedQuantity'
        )::numeric(18,6);
    exception
      when invalid_text_representation
        or numeric_value_out_of_range
      then
        raise exception using
          errcode = '22023',
          message =
            'Kontrol miktarı geçerli bir sayı olmalıdır.';
    end;

    if v_inspected_quantity is null
      or v_inspected_quantity <= 0
    then
      raise exception using
        errcode = '22023',
        message =
          'Kontrol miktarı sıfırdan büyük olmalıdır.';
    end if;


    if v_payload ? 'tracking'
      and v_payload -> 'tracking' <> 'null'::jsonb
      and jsonb_typeof(
        v_payload -> 'tracking'
      ) <> 'object'
    then
      raise exception using
        errcode = '22023',
        message =
          'Takip bilgisi JSON nesnesi olmalıdır.';
    end if;

    v_tracking :=
      case
        when v_payload ? 'tracking'
          and v_payload -> 'tracking' <> 'null'::jsonb
        then v_payload -> 'tracking'
        else null
      end;

    v_expected_value :=
      case
        when v_payload ? 'expectedValue'
          and v_payload -> 'expectedValue' <> 'null'::jsonb
        then v_payload -> 'expectedValue'
        else null
      end;


    select *
    into v_inspection
    from public.warehouse_quality_inspections
    where account_id = p_account_id
      and id = v_inspection_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Kalite kontrol kaydı bulunamadı.';
    end if;


    if v_inspection.status not in (
      'draft',
      'planned'
    ) then
      raise exception using
        errcode = '22023',
        message =
          'Kalite kontrol satırı yalnızca taslak veya planlanmış kayda eklenebilir.';
    end if;


    if v_inspection.warehouse_id <> v_warehouse_id then
      raise exception using
        errcode = '22023',
        message =
          'Kontrol satırındaki depo, kalite kontrol deposuyla aynı olmalıdır.';
    end if;


    if v_inspection.location_id <> v_location_id then
      raise exception using
        errcode = '22023',
        message =
          'Kontrol satırındaki lokasyon, kalite kontrol lokasyonuyla aynı olmalıdır.';
    end if;


    if v_inspection.receiving_id is not null
      and v_receiving_id is not null
      and v_inspection.receiving_id <> v_receiving_id
    then
      raise exception using
        errcode = '22023',
        message =
          'Kontrol satırındaki mal kabul, kalite kontrol kaydıyla aynı olmalıdır.';
    end if;


    perform 1
    from public.warehouse_products
    where account_id = p_account_id
      and id = v_product_id;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Ürün bulunamadı.';
    end if;


    if v_sku_id is not null then

      perform 1
      from public.warehouse_product_skus
      where account_id = p_account_id
        and product_id = v_product_id
        and id = v_sku_id;

      if not found then
        raise exception using
          errcode = 'P0002',
          message =
            'SKU bulunamadı.';
      end if;

    end if;


    if v_receiving_id is not null then

      perform 1
      from public.warehouse_receivings
      where account_id = p_account_id
        and id = v_receiving_id;

      if not found then
        raise exception using
          errcode = 'P0002',
          message =
            'Mal kabul kaydı bulunamadı.';
      end if;

    end if;


    if v_receiving_item_id is not null then

      if v_receiving_id is null then
        raise exception using
          errcode = '22023',
          message =
            'Mal kabul satırı kullanıldığında mal kabul kimliği de zorunludur.';
      end if;

      perform 1
      from public.warehouse_receiving_items
      where account_id = p_account_id
        and receiving_id = v_receiving_id
        and id = v_receiving_item_id;

      if not found then
        raise exception using
          errcode = 'P0002',
          message =
            'Mal kabul ürün satırı bulunamadı.';
      end if;

    end if;


    select
      coalesce(
        max(line_number),
        0
      ) + 1
    into v_line_number
    from public.warehouse_quality_inspection_items
    where account_id = p_account_id
      and inspection_id = v_inspection_id;


    v_inspection_item_id :=
      gen_random_uuid();


    insert into public.warehouse_quality_inspection_items (
      id,
      account_id,
      inspection_id,
      line_number,
      product_id,
      sku_id,
      receiving_id,
      receiving_item_id,
      warehouse_id,
      location_id,
      control_type,
      inspected_quantity,
      accepted_quantity,
      rejected_quantity,
      conditional_quantity,
      hold_quantity,
      unit,
      decision,
      tracking,
      expected_value,
      notes,
      created_by
    )
    values (
      v_inspection_item_id,
      p_account_id,
      v_inspection_id,
      v_line_number,
      v_product_id,
      v_sku_id,
      v_receiving_id,
      v_receiving_item_id,
      v_inspection.warehouse_id,
      v_inspection.location_id,
      v_control_type,
      v_inspected_quantity,
      0,
      0,
      0,
      0,
      v_unit,
      'pending',
      v_tracking,
      v_expected_value,
      v_notes,
      v_user_id
    )
    returning *
    into v_item;


    v_result :=
      jsonb_build_object(
        'action',
        v_action,

        'inspectionId',
        v_item.inspection_id,

        'inspectionItemId',
        v_item.id,

        'lineNumber',
        v_item.line_number,

        'decision',
        v_item.decision
      );


  -- =======================================================
  -- START
  -- =======================================================

  elsif v_action = 'start' then

    v_inspection_id :=
      nullif(
        btrim(
          v_payload ->> 'inspectionId'
        ),
        ''
      )::uuid;

    if v_inspection_id is null then
      raise exception using
        errcode = '22023',
        message =
          'Kalite kontrol kimliği zorunludur.';
    end if;


    select *
    into v_inspection
    from public.warehouse_quality_inspections
    where account_id = p_account_id
      and id = v_inspection_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Kalite kontrol kaydı bulunamadı.';
    end if;


    if v_inspection.status not in (
      'draft',
      'planned'
    ) then
      raise exception using
        errcode = '22023',
        message =
          'Yalnızca taslak veya planlanmış kalite kontrol başlatılabilir.';
    end if;


    perform 1
    from public.warehouse_quality_inspection_items
    where account_id = p_account_id
      and inspection_id = v_inspection_id
    limit 1;

    if not found then
      raise exception using
        errcode = '22023',
        message =
          'Kalite kontrol başlatılmadan önce en az bir kontrol satırı eklenmelidir.';
    end if;


    update public.warehouse_quality_inspections
    set
      status = 'in_progress',
      started_at = v_now,
      updated_at = v_now
    where account_id = p_account_id
      and id = v_inspection_id
    returning *
    into v_inspection;


    v_result :=
      jsonb_build_object(
        'action',
        v_action,

        'inspectionId',
        v_inspection.id,

        'status',
        v_inspection.status,

        'startedAt',
        v_inspection.started_at
      );

  end if;


  -- =======================================================
  -- Idempotent response kapanışı
  -- =======================================================

  update public.warehouse_quality_write_requests
  set
    response_payload = v_result,
    completed_at = now()
  where account_id = p_account_id
    and request_id = p_request_id
    and user_id = v_user_id;

  return v_result;
end;
$$;


revoke all on function
  public.warehouse_quality_control_write(
    text,
    uuid,
    uuid,
    jsonb
  )
from public;

revoke all on function
  public.warehouse_quality_control_write(
    text,
    uuid,
    uuid,
    jsonb
  )
from anon;

grant execute on function
  public.warehouse_quality_control_write(
    text,
    uuid,
    uuid,
    jsonb
  )
to authenticated;
