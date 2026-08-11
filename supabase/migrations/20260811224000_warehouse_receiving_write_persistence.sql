-- WarehouseIQ Mal Kabul Kalıcılığı ve Güvenli Yazma RPC Temeli
-- EPIC-010D-A2
--
-- Güvenlik ilkeleri:
-- - Yalnız authenticated kullanıcı JWT'si.
-- - Service role kullanılmaz.
-- - RLS + account rolü son yetki kapısıdır.
-- - İlk mobil yazma yüzeyi stok posting yapmaz.
-- - create / add_item / start / receive_quantity işlemleri idempotent RPC ile yürür.
-- - RPC çağrısı tek PostgreSQL transaction'ı içinde atomiktir.

-- =========================================================
-- A1 stok hareketi ile tenant güvenli ilişki
-- =========================================================

create unique index if not exists warehouse_inventory_movements_account_id_id_uidx
  on public.warehouse_inventory_movements (account_id, id);

-- =========================================================
-- Mal kabul ana kaydı
-- =========================================================

create table if not exists public.warehouse_receivings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null
    references public.warehouse_accounts(id) on delete cascade,

  receiving_number text not null,
  warehouse_id uuid not null,
  receiving_location_id uuid not null,

  source text not null,
  status text not null default 'draft',

  supplier_id text,
  supplier_name text,

  reference_type text,
  reference_id text,
  reference_number text,

  vehicle_plate text,
  delivery_note_number text,

  planned_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,

  notes text,
  cancellation_reason text,

  exceptions jsonb not null default '[]'::jsonb,

  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_receivings_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete restrict,

  constraint warehouse_receivings_location_fk
    foreign key (account_id, warehouse_id, receiving_location_id)
    references public.warehouse_locations(account_id, warehouse_id, id)
    on delete restrict,

  constraint warehouse_receivings_number_not_blank_check
    check (length(btrim(receiving_number)) > 0),

  constraint warehouse_receivings_source_check
    check (
      source in (
        'purchase_order',
        'advance_shipping_notice',
        'warehouse_transfer',
        'customer_return',
        'production',
        'manual'
      )
    ),

  constraint warehouse_receivings_status_check
    check (
      status in (
        'draft',
        'planned',
        'in_progress',
        'partially_received',
        'quality_control',
        'completed',
        'cancelled'
      )
    ),

  constraint warehouse_receivings_exceptions_array_check
    check (jsonb_typeof(exceptions) = 'array'),

  constraint warehouse_receivings_account_number_unique
    unique (account_id, receiving_number),

  constraint warehouse_receivings_account_id_id_unique
    unique (account_id, id)
);

create unique index if not exists warehouse_receivings_reference_uidx
  on public.warehouse_receivings (
    account_id,
    reference_type,
    reference_id
  )
  where reference_type is not null
    and reference_id is not null;

create index if not exists warehouse_receivings_account_status_idx
  on public.warehouse_receivings (
    account_id,
    warehouse_id,
    status,
    created_at desc
  );

drop trigger if exists trg_warehouse_receivings_updated_at
  on public.warehouse_receivings;

create trigger trg_warehouse_receivings_updated_at
before update on public.warehouse_receivings
for each row execute function public.warehouse_set_updated_at();

-- =========================================================
-- Mal kabul satırları
-- =========================================================

create table if not exists public.warehouse_receiving_items (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  receiving_id uuid not null,
  line_number integer not null,

  warehouse_id uuid not null,
  receiving_location_id uuid not null,
  product_id uuid not null,
  sku_id uuid,

  expected_quantity numeric(18,6) not null,
  received_quantity numeric(18,6) not null default 0,
  accepted_quantity numeric(18,6) not null default 0,
  rejected_quantity numeric(18,6) not null default 0,
  damaged_quantity numeric(18,6) not null default 0,
  unit text not null,

  stock_status text not null default 'available',

  lot_number text,
  serial_number text,
  production_date date,
  expiry_date date,

  quality_control_required boolean not null default false,
  unexpected_product boolean not null default false,
  over_delivery_allowed boolean not null default false,

  rejection_reason text,
  notes text,

  inventory_movement_id uuid,

  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_receiving_items_receiving_fk
    foreign key (account_id, receiving_id)
    references public.warehouse_receivings(account_id, id)
    on delete cascade,

  constraint warehouse_receiving_items_location_fk
    foreign key (account_id, warehouse_id, receiving_location_id)
    references public.warehouse_locations(account_id, warehouse_id, id)
    on delete restrict,

  constraint warehouse_receiving_items_product_fk
    foreign key (account_id, product_id)
    references public.warehouse_products(account_id, id)
    on delete restrict,

  constraint warehouse_receiving_items_sku_fk
    foreign key (account_id, product_id, sku_id)
    references public.warehouse_product_skus(account_id, product_id, id)
    on delete restrict,

  constraint warehouse_receiving_items_inventory_movement_fk
    foreign key (account_id, inventory_movement_id)
    references public.warehouse_inventory_movements(account_id, id)
    on delete restrict,

  constraint warehouse_receiving_items_line_check
    check (line_number > 0),

  constraint warehouse_receiving_items_quantity_check
    check (
      expected_quantity > 0
      and received_quantity >= 0
      and accepted_quantity >= 0
      and rejected_quantity >= 0
      and damaged_quantity >= 0
      and (
        over_delivery_allowed
        or received_quantity <= expected_quantity
      )
    ),

  constraint warehouse_receiving_items_unit_check
    check (
      unit in (
        'piece',
        'box',
        'case',
        'package',
        'pallet',
        'kilogram',
        'gram',
        'liter',
        'milliliter',
        'meter',
        'square_meter',
        'cubic_meter'
      )
    ),

  constraint warehouse_receiving_items_stock_status_check
    check (
      stock_status in (
        'available',
        'reserved',
        'blocked',
        'quality_control',
        'damaged',
        'scrap',
        'disposal',
        'in_transit'
      )
    ),

  constraint warehouse_receiving_items_tracking_dates_check
    check (
      production_date is null
      or expiry_date is null
      or production_date <= expiry_date
    ),

  constraint warehouse_receiving_items_account_line_unique
    unique (account_id, receiving_id, line_number),

  constraint warehouse_receiving_items_account_receiving_id_unique
    unique (account_id, receiving_id, id)
);

create index if not exists warehouse_receiving_items_product_idx
  on public.warehouse_receiving_items (
    account_id,
    receiving_id,
    product_id
  );

drop trigger if exists trg_warehouse_receiving_items_updated_at
  on public.warehouse_receiving_items;

create trigger trg_warehouse_receiving_items_updated_at
before update on public.warehouse_receiving_items
for each row execute function public.warehouse_set_updated_at();

-- =========================================================
-- Mal kabul belgeleri
-- =========================================================

create table if not exists public.warehouse_receiving_documents (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  receiving_id uuid not null,

  type text not null,
  document_number text not null,
  document_date date,

  external_system text,
  external_id text,
  file_name text,
  file_url text,
  notes text,

  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),

  constraint warehouse_receiving_documents_receiving_fk
    foreign key (account_id, receiving_id)
    references public.warehouse_receivings(account_id, id)
    on delete cascade,

  constraint warehouse_receiving_documents_type_check
    check (
      type in (
        'purchase_order',
        'advance_shipping_notice',
        'delivery_note',
        'invoice',
        'transfer_order',
        'return_document',
        'quality_document',
        'other'
      )
    ),

  constraint warehouse_receiving_documents_number_not_blank_check
    check (length(btrim(document_number)) > 0)
);

create index if not exists warehouse_receiving_documents_receiving_idx
  on public.warehouse_receiving_documents (
    account_id,
    receiving_id,
    created_at
  );

-- =========================================================
-- Mal kabul görevleri
-- =========================================================

create table if not exists public.warehouse_receiving_tasks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  receiving_id uuid not null,
  receiving_item_id uuid,

  type text not null,
  status text not null default 'pending',

  assigned_user_id text,
  assigned_equipment_id text,
  priority integer not null default 50,

  planned_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,

  notes text,

  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_receiving_tasks_receiving_fk
    foreign key (account_id, receiving_id)
    references public.warehouse_receivings(account_id, id)
    on delete cascade,

  constraint warehouse_receiving_tasks_item_fk
    foreign key (account_id, receiving_id, receiving_item_id)
    references public.warehouse_receiving_items(account_id, receiving_id, id)
    on delete cascade,

  constraint warehouse_receiving_tasks_type_check
    check (
      type in (
        'vehicle_check_in',
        'document_check',
        'unloading',
        'quantity_control',
        'quality_control',
        'labeling',
        'palletizing',
        'inventory_posting'
      )
    ),

  constraint warehouse_receiving_tasks_status_check
    check (
      status in (
        'pending',
        'assigned',
        'in_progress',
        'completed',
        'cancelled'
      )
    ),

  constraint warehouse_receiving_tasks_priority_check
    check (priority between 1 and 100)
);

create index if not exists warehouse_receiving_tasks_receiving_idx
  on public.warehouse_receiving_tasks (
    account_id,
    receiving_id,
    priority,
    created_at
  );

drop trigger if exists trg_warehouse_receiving_tasks_updated_at
  on public.warehouse_receiving_tasks;

create trigger trg_warehouse_receiving_tasks_updated_at
before update on public.warehouse_receiving_tasks
for each row execute function public.warehouse_set_updated_at();

-- =========================================================
-- İdempotent yazma istekleri
-- =========================================================

create table if not exists public.warehouse_receiving_write_requests (
  account_id uuid not null
    references public.warehouse_accounts(id) on delete cascade,
  request_id uuid not null,
  user_id uuid not null references auth.users(id) on delete restrict,

  action text not null,
  payload jsonb not null,
  response jsonb,

  created_at timestamptz not null default now(),
  completed_at timestamptz,

  primary key (account_id, request_id),

  constraint warehouse_receiving_write_requests_action_check
    check (
      action in (
        'create',
        'add_item',
        'start',
        'receive_quantity'
      )
    ),

  constraint warehouse_receiving_write_requests_payload_object_check
    check (jsonb_typeof(payload) = 'object')
);

create index if not exists warehouse_receiving_write_requests_user_idx
  on public.warehouse_receiving_write_requests (
    account_id,
    user_id,
    created_at desc
  );

-- =========================================================
-- RLS
-- =========================================================

alter table public.warehouse_receivings enable row level security;
alter table public.warehouse_receiving_items enable row level security;
alter table public.warehouse_receiving_documents enable row level security;
alter table public.warehouse_receiving_tasks enable row level security;
alter table public.warehouse_receiving_write_requests enable row level security;

-- Aktif firma üyeleri okuyabilir.
drop policy if exists warehouse_receivings_member_select
  on public.warehouse_receivings;

create policy warehouse_receivings_member_select
on public.warehouse_receivings
for select to authenticated
using (public.warehouse_has_account_access(account_id));

drop policy if exists warehouse_receiving_items_member_select
  on public.warehouse_receiving_items;

create policy warehouse_receiving_items_member_select
on public.warehouse_receiving_items
for select to authenticated
using (public.warehouse_has_account_access(account_id));

drop policy if exists warehouse_receiving_documents_member_select
  on public.warehouse_receiving_documents;

create policy warehouse_receiving_documents_member_select
on public.warehouse_receiving_documents
for select to authenticated
using (public.warehouse_has_account_access(account_id));

drop policy if exists warehouse_receiving_tasks_member_select
  on public.warehouse_receiving_tasks;

create policy warehouse_receiving_tasks_member_select
on public.warehouse_receiving_tasks
for select to authenticated
using (public.warehouse_has_account_access(account_id));

-- Mal kabul yazma rolleri.
drop policy if exists warehouse_receivings_operator_insert
  on public.warehouse_receivings;

create policy warehouse_receivings_operator_insert
on public.warehouse_receivings
for insert to authenticated
with check (
  public.warehouse_has_account_role(
    account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager',
      'supervisor',
      'inventory_controller',
      'receiver',
      'quality_controller',
      'operator'
    ]::text[]
  )
  and created_by = auth.uid()
);

drop policy if exists warehouse_receivings_operator_update
  on public.warehouse_receivings;

create policy warehouse_receivings_operator_update
on public.warehouse_receivings
for update to authenticated
using (
  public.warehouse_has_account_role(
    account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager',
      'supervisor',
      'inventory_controller',
      'receiver',
      'quality_controller',
      'operator'
    ]::text[]
  )
)
with check (
  public.warehouse_has_account_role(
    account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager',
      'supervisor',
      'inventory_controller',
      'receiver',
      'quality_controller',
      'operator'
    ]::text[]
  )
);

drop policy if exists warehouse_receiving_items_operator_insert
  on public.warehouse_receiving_items;

create policy warehouse_receiving_items_operator_insert
on public.warehouse_receiving_items
for insert to authenticated
with check (
  public.warehouse_has_account_role(
    account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager',
      'supervisor',
      'inventory_controller',
      'receiver',
      'quality_controller',
      'operator'
    ]::text[]
  )
  and created_by = auth.uid()
);

drop policy if exists warehouse_receiving_items_operator_update
  on public.warehouse_receiving_items;

create policy warehouse_receiving_items_operator_update
on public.warehouse_receiving_items
for update to authenticated
using (
  public.warehouse_has_account_role(
    account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager',
      'supervisor',
      'inventory_controller',
      'receiver',
      'quality_controller',
      'operator'
    ]::text[]
  )
)
with check (
  public.warehouse_has_account_role(
    account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager',
      'supervisor',
      'inventory_controller',
      'receiver',
      'quality_controller',
      'operator'
    ]::text[]
  )
);

drop policy if exists warehouse_receiving_documents_operator_insert
  on public.warehouse_receiving_documents;

create policy warehouse_receiving_documents_operator_insert
on public.warehouse_receiving_documents
for insert to authenticated
with check (
  public.warehouse_has_account_role(
    account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager',
      'supervisor',
      'inventory_controller',
      'receiver',
      'quality_controller',
      'operator'
    ]::text[]
  )
  and created_by = auth.uid()
);

drop policy if exists warehouse_receiving_tasks_operator_insert
  on public.warehouse_receiving_tasks;

create policy warehouse_receiving_tasks_operator_insert
on public.warehouse_receiving_tasks
for insert to authenticated
with check (
  public.warehouse_has_account_role(
    account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager',
      'supervisor',
      'inventory_controller',
      'receiver',
      'quality_controller',
      'operator'
    ]::text[]
  )
  and created_by = auth.uid()
);

drop policy if exists warehouse_receiving_tasks_operator_update
  on public.warehouse_receiving_tasks;

create policy warehouse_receiving_tasks_operator_update
on public.warehouse_receiving_tasks
for update to authenticated
using (
  public.warehouse_has_account_role(
    account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager',
      'supervisor',
      'inventory_controller',
      'receiver',
      'quality_controller',
      'operator'
    ]::text[]
  )
)
with check (
  public.warehouse_has_account_role(
    account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager',
      'supervisor',
      'inventory_controller',
      'receiver',
      'quality_controller',
      'operator'
    ]::text[]
  )
);

-- İdempotency kayıtları yalnız çağrıyı yapan kullanıcıya görünür/yazılır.
drop policy if exists warehouse_receiving_write_requests_owner_select
  on public.warehouse_receiving_write_requests;

create policy warehouse_receiving_write_requests_owner_select
on public.warehouse_receiving_write_requests
for select to authenticated
using (
  user_id = auth.uid()
  and public.warehouse_has_account_access(account_id)
);

drop policy if exists warehouse_receiving_write_requests_owner_insert
  on public.warehouse_receiving_write_requests;

create policy warehouse_receiving_write_requests_owner_insert
on public.warehouse_receiving_write_requests
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.warehouse_has_account_role(
    account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager',
      'supervisor',
      'inventory_controller',
      'receiver',
      'quality_controller',
      'operator'
    ]::text[]
  )
);

drop policy if exists warehouse_receiving_write_requests_owner_update
  on public.warehouse_receiving_write_requests;

create policy warehouse_receiving_write_requests_owner_update
on public.warehouse_receiving_write_requests
for update to authenticated
using (
  user_id = auth.uid()
  and public.warehouse_has_account_role(
    account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager',
      'supervisor',
      'inventory_controller',
      'receiver',
      'quality_controller',
      'operator'
    ]::text[]
  )
)
with check (
  user_id = auth.uid()
  and public.warehouse_has_account_role(
    account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager',
      'supervisor',
      'inventory_controller',
      'receiver',
      'quality_controller',
      'operator'
    ]::text[]
  )
);

-- =========================================================
-- Yetkiler
-- =========================================================

grant select, insert, update
  on public.warehouse_receivings
  to authenticated;

grant select, insert, update
  on public.warehouse_receiving_items
  to authenticated;

grant select, insert
  on public.warehouse_receiving_documents
  to authenticated;

grant select, insert, update
  on public.warehouse_receiving_tasks
  to authenticated;

grant select, insert, update
  on public.warehouse_receiving_write_requests
  to authenticated;

-- =========================================================
-- Atomik ve idempotent mal kabul yazma RPC'si
-- =========================================================

create or replace function public.warehouse_receiving_write(
  p_action text,
  p_request_id uuid,
  p_account_id uuid,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_action text := lower(btrim(coalesce(p_action, '')));
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_user_id uuid := auth.uid();

  v_existing_action text;
  v_existing_payload jsonb;
  v_existing_response jsonb;
  v_inserted integer := 0;

  v_receiving public.warehouse_receivings%rowtype;
  v_item public.warehouse_receiving_items%rowtype;

  v_receiving_id uuid;
  v_receiving_item_id uuid;
  v_warehouse_id uuid;
  v_location_id uuid;
  v_product_id uuid;
  v_sku_id uuid;

  v_source text;
  v_unit text;
  v_stock_status text;

  v_reference_type text;
  v_reference_id text;

  v_expected numeric(18,6);
  v_received numeric(18,6);
  v_accepted numeric(18,6);
  v_rejected numeric(18,6);
  v_damaged numeric(18,6);

  v_next_received numeric(18,6);
  v_next_accepted numeric(18,6);
  v_next_rejected numeric(18,6);
  v_next_damaged numeric(18,6);

  v_line_number integer;
  v_item_count integer;
  v_all_expected_received boolean;

  v_planned_at timestamptz;
  v_production_date date;
  v_expiry_date date;

  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'WarehouseIQ oturumu gerekli.';
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

  if jsonb_typeof(v_payload) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'İstek verisi JSON nesnesi olmalıdır.';
  end if;

  if not (
    v_action = any (
      array[
        'create',
        'add_item',
        'start',
        'receive_quantity'
      ]::text[]
    )
  ) then
    raise exception using
      errcode = '22023',
      message = 'Desteklenmeyen mal kabul işlemi.';
  end if;

  if not public.warehouse_has_account_role(
    p_account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager',
      'supervisor',
      'inventory_controller',
      'receiver',
      'quality_controller',
      'operator'
    ]::text[]
  ) then
    raise exception using
      errcode = '42501',
      message = 'Bu firma için mal kabul yazma yetkiniz bulunmuyor.';
  end if;

  -- Daha önce tamamlanmış aynı istek birebir aynı yanıtı döndürür.
  select
    action,
    payload,
    response
  into
    v_existing_action,
    v_existing_payload,
    v_existing_response
  from public.warehouse_receiving_write_requests
  where account_id = p_account_id
    and request_id = p_request_id;

  if found then
    if v_existing_action <> v_action
      or v_existing_payload <> v_payload then
      raise exception using
        errcode = '23505',
        message = 'Aynı istek kimliği farklı bir işlem için kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception using
      errcode = '40001',
      message = 'Aynı istek halen işleniyor. Tekrar deneyin.';
  end if;

  insert into public.warehouse_receiving_write_requests (
    account_id,
    request_id,
    user_id,
    action,
    payload
  )
  values (
    p_account_id,
    p_request_id,
    v_user_id,
    v_action,
    v_payload
  )
  on conflict (account_id, request_id) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    select
      action,
      payload,
      response
    into
      v_existing_action,
      v_existing_payload,
      v_existing_response
    from public.warehouse_receiving_write_requests
    where account_id = p_account_id
      and request_id = p_request_id;

    if v_existing_action <> v_action
      or v_existing_payload <> v_payload then
      raise exception using
        errcode = '23505',
        message = 'Aynı istek kimliği farklı bir işlem için kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception using
      errcode = '40001',
      message = 'Aynı istek halen işleniyor. Tekrar deneyin.';
  end if;

  -- =======================================================
  -- CREATE
  -- =======================================================

  if v_action = 'create' then
    v_warehouse_id := nullif(btrim(v_payload ->> 'warehouseId'), '')::uuid;
    v_location_id := nullif(btrim(v_payload ->> 'receivingLocationId'), '')::uuid;
    v_source := lower(btrim(coalesce(v_payload ->> 'source', '')));

    if v_warehouse_id is null then
      raise exception using
        errcode = '22023',
        message = 'Depo kimliği zorunludur.';
    end if;

    if v_location_id is null then
      raise exception using
        errcode = '22023',
        message = 'Mal kabul lokasyonu zorunludur.';
    end if;

    if not (
      v_source = any (
        array[
          'purchase_order',
          'advance_shipping_notice',
          'warehouse_transfer',
          'customer_return',
          'production',
          'manual'
        ]::text[]
      )
    ) then
      raise exception using
        errcode = '22023',
        message = 'Mal kabul kaynağı geçersizdir.';
    end if;

    perform 1
    from public.warehouses
    where account_id = p_account_id
      and id = v_warehouse_id;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'Depo kaydı bulunamadı.';
    end if;

    perform 1
    from public.warehouse_locations
    where account_id = p_account_id
      and warehouse_id = v_warehouse_id
      and id = v_location_id;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'Mal kabul lokasyonu bulunamadı.';
    end if;

    v_reference_type :=
      nullif(btrim(v_payload ->> 'referenceType'), '');
    v_reference_id :=
      nullif(btrim(v_payload ->> 'referenceId'), '');

    if nullif(btrim(v_payload ->> 'plannedAt'), '') is not null then
      v_planned_at := (v_payload ->> 'plannedAt')::timestamptz;
    else
      v_planned_at := null;
    end if;

    v_receiving_id := gen_random_uuid();

    insert into public.warehouse_receivings (
      id,
      account_id,
      receiving_number,
      warehouse_id,
      receiving_location_id,
      source,
      status,
      supplier_id,
      supplier_name,
      reference_type,
      reference_id,
      reference_number,
      vehicle_plate,
      delivery_note_number,
      planned_at,
      notes,
      created_by
    )
    values (
      v_receiving_id,
      p_account_id,
      'RCV-'
        || to_char(clock_timestamp(), 'YYYYMMDD-HH24MISSMS')
        || '-'
        || upper(substr(replace(v_receiving_id::text, '-', ''), 1, 6)),
      v_warehouse_id,
      v_location_id,
      v_source,
      'draft',
      nullif(btrim(v_payload ->> 'supplierId'), ''),
      nullif(btrim(v_payload ->> 'supplierName'), ''),
      v_reference_type,
      v_reference_id,
      nullif(btrim(v_payload ->> 'referenceNumber'), ''),
      nullif(btrim(v_payload ->> 'vehiclePlate'), ''),
      nullif(btrim(v_payload ->> 'deliveryNoteNumber'), ''),
      v_planned_at,
      nullif(btrim(v_payload ->> 'notes'), ''),
      v_user_id
    )
    returning * into v_receiving;

    v_result := jsonb_build_object(
      'action', v_action,
      'receivingId', v_receiving.id,
      'receivingNumber', v_receiving.receiving_number,
      'status', v_receiving.status
    );

  -- =======================================================
  -- ADD ITEM
  -- =======================================================

  elsif v_action = 'add_item' then
    v_receiving_id :=
      nullif(btrim(v_payload ->> 'receivingId'), '')::uuid;
    v_product_id :=
      nullif(btrim(v_payload ->> 'productId'), '')::uuid;

    if nullif(btrim(v_payload ->> 'skuId'), '') is not null then
      v_sku_id := (v_payload ->> 'skuId')::uuid;
    else
      v_sku_id := null;
    end if;

    v_unit := lower(btrim(coalesce(v_payload ->> 'unit', '')));
    v_stock_status :=
      lower(btrim(coalesce(v_payload ->> 'stockStatus', 'available')));

    v_expected :=
      nullif(btrim(v_payload ->> 'expectedQuantity'), '')::numeric;

    if v_receiving_id is null then
      raise exception using
        errcode = '22023',
        message = 'Mal kabul kimliği zorunludur.';
    end if;

    if v_product_id is null then
      raise exception using
        errcode = '22023',
        message = 'Ürün kimliği zorunludur.';
    end if;

    if v_expected is null or v_expected <= 0 then
      raise exception using
        errcode = '22023',
        message = 'Beklenen miktar sıfırdan büyük olmalıdır.';
    end if;

    if not (
      v_unit = any (
        array[
          'piece',
          'box',
          'case',
          'package',
          'pallet',
          'kilogram',
          'gram',
          'liter',
          'milliliter',
          'meter',
          'square_meter',
          'cubic_meter'
        ]::text[]
      )
    ) then
      raise exception using
        errcode = '22023',
        message = 'Ölçü birimi geçersizdir.';
    end if;

    if not (
      v_stock_status = any (
        array[
          'available',
          'reserved',
          'blocked',
          'quality_control',
          'damaged',
          'scrap',
          'disposal',
          'in_transit'
        ]::text[]
      )
    ) then
      raise exception using
        errcode = '22023',
        message = 'Stok durumu geçersizdir.';
    end if;

    select *
    into v_receiving
    from public.warehouse_receivings
    where account_id = p_account_id
      and id = v_receiving_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'Mal kabul kaydı bulunamadı.';
    end if;

    if v_receiving.status not in ('draft', 'planned') then
      raise exception using
        errcode = '22023',
        message = 'Ürün satırı yalnızca taslak veya planlanmış mal kabule eklenebilir.';
    end if;

    perform 1
    from public.warehouse_products
    where account_id = p_account_id
      and id = v_product_id;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'Ürün kaydı bulunamadı.';
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
          message = 'SKU kaydı bulunamadı.';
      end if;
    end if;

    if nullif(btrim(v_payload #>> '{tracking,productionDate}'), '') is not null then
      v_production_date :=
        (v_payload #>> '{tracking,productionDate}')::date;
    else
      v_production_date := null;
    end if;

    if nullif(btrim(v_payload #>> '{tracking,expiryDate}'), '') is not null then
      v_expiry_date :=
        (v_payload #>> '{tracking,expiryDate}')::date;
    else
      v_expiry_date := null;
    end if;

    if v_production_date is not null
      and v_expiry_date is not null
      and v_production_date > v_expiry_date then
      raise exception using
        errcode = '22023',
        message = 'Üretim tarihi son kullanma tarihinden sonra olamaz.';
    end if;

    select coalesce(max(line_number), 0) + 1
    into v_line_number
    from public.warehouse_receiving_items
    where account_id = p_account_id
      and receiving_id = v_receiving_id;

    v_receiving_item_id := gen_random_uuid();

    insert into public.warehouse_receiving_items (
      id,
      account_id,
      receiving_id,
      line_number,
      warehouse_id,
      receiving_location_id,
      product_id,
      sku_id,
      expected_quantity,
      unit,
      stock_status,
      lot_number,
      serial_number,
      production_date,
      expiry_date,
      quality_control_required,
      unexpected_product,
      over_delivery_allowed,
      notes,
      created_by
    )
    values (
      v_receiving_item_id,
      p_account_id,
      v_receiving_id,
      v_line_number,
      v_receiving.warehouse_id,
      v_receiving.receiving_location_id,
      v_product_id,
      v_sku_id,
      v_expected,
      v_unit,
      v_stock_status,
      nullif(btrim(v_payload #>> '{tracking,lotNumber}'), ''),
      nullif(btrim(v_payload #>> '{tracking,serialNumber}'), ''),
      v_production_date,
      v_expiry_date,
      coalesce((v_payload ->> 'qualityControlRequired')::boolean, false),
      coalesce((v_payload ->> 'unexpectedProduct')::boolean, false),
      coalesce((v_payload ->> 'overDeliveryAllowed')::boolean, false),
      nullif(btrim(v_payload ->> 'notes'), ''),
      v_user_id
    )
    returning * into v_item;

    v_result := jsonb_build_object(
      'action', v_action,
      'receivingId', v_item.receiving_id,
      'receivingItemId', v_item.id,
      'lineNumber', v_item.line_number,
      'status', v_receiving.status
    );

  -- =======================================================
  -- START
  -- =======================================================

  elsif v_action = 'start' then
    v_receiving_id :=
      nullif(btrim(v_payload ->> 'receivingId'), '')::uuid;

    if v_receiving_id is null then
      raise exception using
        errcode = '22023',
        message = 'Mal kabul kimliği zorunludur.';
    end if;

    select *
    into v_receiving
    from public.warehouse_receivings
    where account_id = p_account_id
      and id = v_receiving_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'Mal kabul kaydı bulunamadı.';
    end if;

    if v_receiving.status not in ('draft', 'planned') then
      raise exception using
        errcode = '22023',
        message = 'Yalnızca taslak veya planlanmış mal kabul başlatılabilir.';
    end if;

    select count(*)
    into v_item_count
    from public.warehouse_receiving_items
    where account_id = p_account_id
      and receiving_id = v_receiving_id;

    if v_item_count = 0 then
      raise exception using
        errcode = '22023',
        message = 'Mal kabul başlatılmadan önce en az bir ürün satırı eklenmelidir.';
    end if;

    update public.warehouse_receivings
    set
      status = 'in_progress',
      started_at = now(),
      updated_at = now()
    where account_id = p_account_id
      and id = v_receiving_id
    returning * into v_receiving;

    v_result := jsonb_build_object(
      'action', v_action,
      'receivingId', v_receiving.id,
      'status', v_receiving.status,
      'startedAt', v_receiving.started_at
    );

  -- =======================================================
  -- RECEIVE QUANTITY
  -- =======================================================

  elsif v_action = 'receive_quantity' then
    v_receiving_id :=
      nullif(btrim(v_payload ->> 'receivingId'), '')::uuid;
    v_receiving_item_id :=
      nullif(btrim(v_payload ->> 'receivingItemId'), '')::uuid;

    v_received :=
      nullif(btrim(v_payload ->> 'receivedQuantity'), '')::numeric;
    v_accepted :=
      nullif(btrim(v_payload ->> 'acceptedQuantity'), '')::numeric;
    v_rejected :=
      coalesce(
        nullif(btrim(v_payload ->> 'rejectedQuantity'), '')::numeric,
        0
      );
    v_damaged :=
      coalesce(
        nullif(btrim(v_payload ->> 'damagedQuantity'), '')::numeric,
        0
      );

    if v_receiving_id is null
      or v_receiving_item_id is null then
      raise exception using
        errcode = '22023',
        message = 'Mal kabul ve satır kimliği zorunludur.';
    end if;

    if v_received is null or v_received <= 0 then
      raise exception using
        errcode = '22023',
        message = 'Gelen miktar sıfırdan büyük olmalıdır.';
    end if;

    if v_accepted is null or v_accepted < 0
      or v_rejected < 0
      or v_damaged < 0 then
      raise exception using
        errcode = '22023',
        message = 'Miktar değerleri negatif olamaz.';
    end if;

    if v_accepted + v_rejected > v_received then
      raise exception using
        errcode = '22023',
        message = 'Kabul ve ret miktarı gelen miktarı aşamaz.';
    end if;

    if v_damaged > v_received then
      raise exception using
        errcode = '22023',
        message = 'Hasarlı miktar gelen miktarı aşamaz.';
    end if;

    if v_rejected > 0
      and nullif(btrim(v_payload ->> 'rejectionReason'), '') is null then
      raise exception using
        errcode = '22023',
        message = 'Reddedilen miktar için ret nedeni zorunludur.';
    end if;

    select *
    into v_receiving
    from public.warehouse_receivings
    where account_id = p_account_id
      and id = v_receiving_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'Mal kabul kaydı bulunamadı.';
    end if;

    if v_receiving.status not in (
      'in_progress',
      'partially_received'
    ) then
      raise exception using
        errcode = '22023',
        message = 'Miktar yalnızca devam eden mal kabul işlemine girilebilir.';
    end if;

    select *
    into v_item
    from public.warehouse_receiving_items
    where account_id = p_account_id
      and receiving_id = v_receiving_id
      and id = v_receiving_item_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'Mal kabul satırı bulunamadı.';
    end if;

    v_next_received := v_item.received_quantity + v_received;
    v_next_accepted := v_item.accepted_quantity + v_accepted;
    v_next_rejected := v_item.rejected_quantity + v_rejected;
    v_next_damaged := v_item.damaged_quantity + v_damaged;

    if v_next_received > v_item.expected_quantity
      and not v_item.over_delivery_allowed then
      raise exception using
        errcode = '22023',
        message = 'Fazla teslimata izin verilmediği için gelen miktar beklenen miktarı aşamaz.';
    end if;

    if nullif(btrim(v_payload #>> '{tracking,productionDate}'), '') is not null then
      v_production_date :=
        (v_payload #>> '{tracking,productionDate}')::date;
    else
      v_production_date := v_item.production_date;
    end if;

    if nullif(btrim(v_payload #>> '{tracking,expiryDate}'), '') is not null then
      v_expiry_date :=
        (v_payload #>> '{tracking,expiryDate}')::date;
    else
      v_expiry_date := v_item.expiry_date;
    end if;

    if v_production_date is not null
      and v_expiry_date is not null
      and v_production_date > v_expiry_date then
      raise exception using
        errcode = '22023',
        message = 'Üretim tarihi son kullanma tarihinden sonra olamaz.';
    end if;

    update public.warehouse_receiving_items
    set
      received_quantity = v_next_received,
      accepted_quantity = v_next_accepted,
      rejected_quantity = v_next_rejected,
      damaged_quantity = v_next_damaged,
      lot_number = coalesce(
        nullif(btrim(v_payload #>> '{tracking,lotNumber}'), ''),
        lot_number
      ),
      serial_number = coalesce(
        nullif(btrim(v_payload #>> '{tracking,serialNumber}'), ''),
        serial_number
      ),
      production_date = v_production_date,
      expiry_date = v_expiry_date,
      rejection_reason = coalesce(
        nullif(btrim(v_payload ->> 'rejectionReason'), ''),
        rejection_reason
      ),
      updated_at = now()
    where account_id = p_account_id
      and receiving_id = v_receiving_id
      and id = v_receiving_item_id
    returning * into v_item;

    select bool_and(received_quantity >= expected_quantity)
    into v_all_expected_received
    from public.warehouse_receiving_items
    where account_id = p_account_id
      and receiving_id = v_receiving_id;

    update public.warehouse_receivings
    set
      status = case
        when coalesce(v_all_expected_received, false)
          then 'in_progress'
        else 'partially_received'
      end,
      updated_at = now()
    where account_id = p_account_id
      and id = v_receiving_id
    returning * into v_receiving;

    v_result := jsonb_build_object(
      'action', v_action,
      'receivingId', v_receiving.id,
      'receivingItemId', v_item.id,
      'status', v_receiving.status,
      'receivedQuantity', v_item.received_quantity,
      'acceptedQuantity', v_item.accepted_quantity,
      'rejectedQuantity', v_item.rejected_quantity,
      'damagedQuantity', v_item.damaged_quantity
    );
  end if;

  -- Aynı transaction içinde idempotent yanıtı kapat.
  update public.warehouse_receiving_write_requests
  set
    response = v_result,
    completed_at = now()
  where account_id = p_account_id
    and request_id = p_request_id
    and user_id = v_user_id;

  return v_result;

exception
  when unique_violation then
    raise exception using
      errcode = '23505',
      message = case
        when v_action = 'create'
          then 'Bu referans belge veya mal kabul numarası daha önce kullanılmış.'
        else 'Aynı kayıt daha önce oluşturulmuş.'
      end;
end;
$$;

revoke all on function public.warehouse_receiving_write(
  text,
  uuid,
  uuid,
  jsonb
) from public;

grant execute on function public.warehouse_receiving_write(
  text,
  uuid,
  uuid,
  jsonb
) to authenticated;
