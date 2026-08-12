-- =========================================================
-- WarehouseIQ · Putaway Persistence
-- EPIC-010E / A3
--
-- Güvenlik ilkeleri:
-- - Authenticated kullanıcılar Putaway tablolarını RLS üzerinden okuyabilir.
-- - Putaway mutation işlemleri tablolara doğrudan yapılmaz.
-- - INSERT / UPDATE / DELETE authenticated rolüne açık değildir.
-- - Sonraki aşamadaki dar write RPC, auth.uid() ve hesap rolünü doğrulayacaktır.
-- - Inventory movement / balance tablolarına burada hiçbir yazma kapısı açılmaz.
-- =========================================================

-- =========================================================
-- Yerleştirme ana kayıtları
-- =========================================================

create table if not exists public.warehouse_putaways (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null
    references public.warehouse_accounts(id)
    on delete cascade,

  putaway_number text not null,

  warehouse_id uuid not null,
  source_location_id uuid not null,

  strategy text not null,
  status text not null default 'draft',

  receiving_id uuid,
  quality_inspection_id uuid,

  reference_type text,
  reference_id text,
  reference_number text,

  planned_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,

  cancellation_reason text,
  notes text,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_putaways_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete restrict,

  constraint warehouse_putaways_source_location_fk
    foreign key (
      account_id,
      warehouse_id,
      source_location_id
    )
    references public.warehouse_locations(
      account_id,
      warehouse_id,
      id
    )
    on delete restrict,

  constraint warehouse_putaways_receiving_fk
    foreign key (account_id, receiving_id)
    references public.warehouse_receivings(account_id, id)
    on delete restrict,

  constraint warehouse_putaways_number_not_blank_check
    check (length(btrim(putaway_number)) > 0),

  constraint warehouse_putaways_strategy_check
    check (
      strategy in (
        'fixed_location',
        'dynamic_location',
        'nearest_location',
        'fifo',
        'fefo',
        'zone_based',
        'capacity_based',
        'temperature_based',
        'hazardous_material_based',
        'abc_class_based'
      )
    ),

  constraint warehouse_putaways_status_check
    check (
      status in (
        'draft',
        'planned',
        'in_progress',
        'partially_completed',
        'completed',
        'cancelled'
      )
    ),

  constraint warehouse_putaways_account_number_unique
    unique (account_id, putaway_number),

  constraint warehouse_putaways_account_id_id_unique
    unique (account_id, id)
);

create unique index if not exists warehouse_putaways_receiving_uidx
  on public.warehouse_putaways (
    account_id,
    receiving_id
  )
  where receiving_id is not null;

create unique index if not exists warehouse_putaways_quality_inspection_uidx
  on public.warehouse_putaways (
    account_id,
    quality_inspection_id
  )
  where quality_inspection_id is not null;

create index if not exists warehouse_putaways_status_idx
  on public.warehouse_putaways (
    account_id,
    warehouse_id,
    status,
    updated_at desc
  );

drop trigger if exists trg_warehouse_putaways_updated_at
  on public.warehouse_putaways;

create trigger trg_warehouse_putaways_updated_at
before update on public.warehouse_putaways
for each row
execute function public.warehouse_set_updated_at();

-- =========================================================
-- Yerleştirme ürün satırları
-- =========================================================

create table if not exists public.warehouse_putaway_items (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null,
  putaway_id uuid not null,
  line_number integer not null,

  warehouse_id uuid not null,
  source_location_id uuid not null,
  target_location_id uuid,

  product_id uuid not null,
  sku_id uuid,

  requested_quantity numeric(18,6) not null,
  placed_quantity numeric(18,6) not null default 0,
  remaining_quantity numeric(18,6) not null,

  unit text not null,
  stock_status text not null default 'available',
  strategy text not null,

  lot_number text,
  serial_number text,
  production_date date,
  expiry_date date,

  suggestion_id uuid,

  inventory_movement_ids uuid[] not null default array[]::uuid[],
  transaction_group_ids text[] not null default array[]::text[],

  notes text,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_putaway_items_putaway_fk
    foreign key (account_id, putaway_id)
    references public.warehouse_putaways(account_id, id)
    on delete cascade,

  constraint warehouse_putaway_items_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete restrict,

  constraint warehouse_putaway_items_source_location_fk
    foreign key (
      account_id,
      warehouse_id,
      source_location_id
    )
    references public.warehouse_locations(
      account_id,
      warehouse_id,
      id
    )
    on delete restrict,

  constraint warehouse_putaway_items_target_location_fk
    foreign key (
      account_id,
      warehouse_id,
      target_location_id
    )
    references public.warehouse_locations(
      account_id,
      warehouse_id,
      id
    )
    on delete restrict,

  constraint warehouse_putaway_items_product_fk
    foreign key (account_id, product_id)
    references public.warehouse_products(account_id, id)
    on delete restrict,

  constraint warehouse_putaway_items_sku_fk
    foreign key (account_id, product_id, sku_id)
    references public.warehouse_product_skus(
      account_id,
      product_id,
      id
    )
    on delete restrict,

  constraint warehouse_putaway_items_line_check
    check (line_number > 0),

  constraint warehouse_putaway_items_quantity_check
    check (
      requested_quantity > 0
      and placed_quantity >= 0
      and remaining_quantity >= 0
      and placed_quantity <= requested_quantity
      and remaining_quantity =
        requested_quantity - placed_quantity
    ),

  constraint warehouse_putaway_items_source_target_check
    check (
      target_location_id is null
      or target_location_id <> source_location_id
    ),

  constraint warehouse_putaway_items_unit_check
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

  constraint warehouse_putaway_items_stock_status_check
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

  constraint warehouse_putaway_items_strategy_check
    check (
      strategy in (
        'fixed_location',
        'dynamic_location',
        'nearest_location',
        'fifo',
        'fefo',
        'zone_based',
        'capacity_based',
        'temperature_based',
        'hazardous_material_based',
        'abc_class_based'
      )
    ),

  constraint warehouse_putaway_items_tracking_dates_check
    check (
      production_date is null
      or expiry_date is null
      or production_date <= expiry_date
    ),

  constraint warehouse_putaway_items_account_line_unique
    unique (
      account_id,
      putaway_id,
      line_number
    ),

  constraint warehouse_putaway_items_account_putaway_id_unique
    unique (
      account_id,
      putaway_id,
      id
    )
);

create index if not exists warehouse_putaway_items_product_idx
  on public.warehouse_putaway_items (
    account_id,
    warehouse_id,
    product_id,
    sku_id
  );

create index if not exists warehouse_putaway_items_open_idx
  on public.warehouse_putaway_items (
    account_id,
    putaway_id,
    remaining_quantity
  )
  where remaining_quantity > 0;

drop trigger if exists trg_warehouse_putaway_items_updated_at
  on public.warehouse_putaway_items;

create trigger trg_warehouse_putaway_items_updated_at
before update on public.warehouse_putaway_items
for each row
execute function public.warehouse_set_updated_at();

-- =========================================================
-- Idempotent Putaway write request kayıtları
-- =========================================================

create table if not exists public.warehouse_putaway_write_requests (
  account_id uuid not null
    references public.warehouse_accounts(id)
    on delete cascade,

  request_id uuid not null,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  action text not null,

  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb,

  created_at timestamptz not null default now(),
  completed_at timestamptz,

  primary key (account_id, request_id),

  constraint warehouse_putaway_write_requests_action_check
    check (
      action in (
        'create',
        'add_item',
        'start',
        'execute_item',
        'complete',
        'cancel'
      )
    ),

  constraint warehouse_putaway_write_requests_payload_object_check
    check (jsonb_typeof(request_payload) = 'object'),

  constraint warehouse_putaway_write_requests_response_object_check
    check (
      response_payload is null
      or jsonb_typeof(response_payload) = 'object'
    )
);

create index if not exists warehouse_putaway_write_requests_user_idx
  on public.warehouse_putaway_write_requests (
    account_id,
    user_id,
    created_at desc
  );

-- =========================================================
-- RLS
-- =========================================================

alter table public.warehouse_putaways
  enable row level security;

alter table public.warehouse_putaway_items
  enable row level security;

alter table public.warehouse_putaway_write_requests
  enable row level security;

drop policy if exists warehouse_putaways_member_select
  on public.warehouse_putaways;

create policy warehouse_putaways_member_select
on public.warehouse_putaways
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);

drop policy if exists warehouse_putaway_items_member_select
  on public.warehouse_putaway_items;

create policy warehouse_putaway_items_member_select
on public.warehouse_putaway_items
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);

drop policy if exists warehouse_putaway_write_requests_owner_select
  on public.warehouse_putaway_write_requests;

create policy warehouse_putaway_write_requests_owner_select
on public.warehouse_putaway_write_requests
for select
to authenticated
using (
  user_id = auth.uid()
  and public.warehouse_has_account_access(account_id)
);

-- =========================================================
-- Mutation sınırı
-- =========================================================

revoke insert, update, delete
  on public.warehouse_putaways
  from authenticated;

revoke insert, update, delete
  on public.warehouse_putaway_items
  from authenticated;

revoke insert, update, delete
  on public.warehouse_putaway_write_requests
  from authenticated;

grant select
  on public.warehouse_putaways
  to authenticated;

grant select
  on public.warehouse_putaway_items
  to authenticated;

grant select
  on public.warehouse_putaway_write_requests
  to authenticated;

-- Inventory tablolarında hiçbir grant değiştirilmez.
-- Putaway stok transferi sonraki dar atomik RPC aşamasında eklenecektir.


-- =========================================================
-- Yerleştirme lokasyon önerileri
-- =========================================================

create table if not exists public.warehouse_putaway_suggestions (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null,
  putaway_id uuid not null,
  putaway_item_id uuid not null,

  warehouse_id uuid not null,
  source_location_id uuid not null,
  target_location_id uuid not null,

  strategy text not null,

  suggested_quantity numeric(18,6) not null,
  unit text not null,

  available_capacity numeric(18,6),
  distance numeric(18,6),

  capacity_score numeric(10,4) not null,
  distance_score numeric(10,4) not null,
  compatibility_score numeric(10,4) not null,
  strategy_score numeric(10,4) not null,
  total_score numeric(10,4) not null,

  reasons text[] not null default array[]::text[],
  warnings text[] not null default array[]::text[],

  selected boolean not null default false,

  created_at timestamptz not null default now(),

  constraint warehouse_putaway_suggestions_putaway_fk
    foreign key (account_id, putaway_id)
    references public.warehouse_putaways(account_id, id)
    on delete cascade,

  constraint warehouse_putaway_suggestions_item_fk
    foreign key (
      account_id,
      putaway_id,
      putaway_item_id
    )
    references public.warehouse_putaway_items(
      account_id,
      putaway_id,
      id
    )
    on delete cascade,

  constraint warehouse_putaway_suggestions_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete restrict,

  constraint warehouse_putaway_suggestions_source_location_fk
    foreign key (
      account_id,
      warehouse_id,
      source_location_id
    )
    references public.warehouse_locations(
      account_id,
      warehouse_id,
      id
    )
    on delete restrict,

  constraint warehouse_putaway_suggestions_target_location_fk
    foreign key (
      account_id,
      warehouse_id,
      target_location_id
    )
    references public.warehouse_locations(
      account_id,
      warehouse_id,
      id
    )
    on delete restrict,

  constraint warehouse_putaway_suggestions_source_target_check
    check (source_location_id <> target_location_id),

  constraint warehouse_putaway_suggestions_quantity_check
    check (
      suggested_quantity > 0
      and (
        available_capacity is null
        or available_capacity >= 0
      )
      and (
        distance is null
        or distance >= 0
      )
    ),

  constraint warehouse_putaway_suggestions_score_check
    check (
      capacity_score >= 0
      and distance_score >= 0
      and compatibility_score >= 0
      and strategy_score >= 0
      and total_score >= 0
    ),

  constraint warehouse_putaway_suggestions_strategy_check
    check (
      strategy in (
        'fixed_location',
        'dynamic_location',
        'nearest_location',
        'fifo',
        'fefo',
        'zone_based',
        'capacity_based',
        'temperature_based',
        'hazardous_material_based',
        'abc_class_based'
      )
    ),

  constraint warehouse_putaway_suggestions_unit_check
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

  constraint warehouse_putaway_suggestions_account_putaway_id_unique
    unique (
      account_id,
      putaway_id,
      id
    )
);

create index if not exists warehouse_putaway_suggestions_item_idx
  on public.warehouse_putaway_suggestions (
    account_id,
    putaway_id,
    putaway_item_id,
    total_score desc
  );

-- =========================================================
-- Yerleştirme görevleri
-- =========================================================

create table if not exists public.warehouse_putaway_tasks (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null,
  putaway_id uuid not null,
  putaway_item_id uuid,

  source_location_id uuid not null,
  target_location_id uuid not null,

  assigned_user_id uuid
    references auth.users(id)
    on delete set null,

  assigned_equipment_id uuid,

  status text not null default 'pending',
  priority integer not null default 50,

  planned_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,

  notes text,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_putaway_tasks_putaway_fk
    foreign key (account_id, putaway_id)
    references public.warehouse_putaways(account_id, id)
    on delete cascade,

  constraint warehouse_putaway_tasks_item_fk
    foreign key (
      account_id,
      putaway_id,
      putaway_item_id
    )
    references public.warehouse_putaway_items(
      account_id,
      putaway_id,
      id
    )
    on delete cascade,

  constraint warehouse_putaway_tasks_source_location_fk
    foreign key (source_location_id)
    references public.warehouse_locations(id)
    on delete restrict,

  constraint warehouse_putaway_tasks_target_location_fk
    foreign key (target_location_id)
    references public.warehouse_locations(id)
    on delete restrict,

  constraint warehouse_putaway_tasks_source_target_check
    check (source_location_id <> target_location_id),

  constraint warehouse_putaway_tasks_status_check
    check (
      status in (
        'pending',
        'assigned',
        'in_progress',
        'completed',
        'cancelled'
      )
    ),

  constraint warehouse_putaway_tasks_priority_check
    check (
      priority between 1 and 100
    )
);

create index if not exists warehouse_putaway_tasks_putaway_idx
  on public.warehouse_putaway_tasks (
    account_id,
    putaway_id,
    priority,
    created_at
  );

create index if not exists warehouse_putaway_tasks_assignee_idx
  on public.warehouse_putaway_tasks (
    account_id,
    assigned_user_id,
    status,
    priority
  );

drop trigger if exists trg_warehouse_putaway_tasks_updated_at
  on public.warehouse_putaway_tasks;

create trigger trg_warehouse_putaway_tasks_updated_at
before update on public.warehouse_putaway_tasks
for each row
execute function public.warehouse_set_updated_at();

-- =========================================================
-- Yerleştirme istisnaları
-- =========================================================

create table if not exists public.warehouse_putaway_exceptions (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null,
  putaway_id uuid not null,
  putaway_item_id uuid,

  type text not null,
  message text not null,

  source_location_id uuid,
  target_location_id uuid,

  resolved boolean not null default false,

  resolved_by uuid
    references auth.users(id)
    on delete set null,

  resolved_at timestamptz,
  resolution_notes text,

  created_at timestamptz not null default now(),

  constraint warehouse_putaway_exceptions_putaway_fk
    foreign key (account_id, putaway_id)
    references public.warehouse_putaways(account_id, id)
    on delete cascade,

  constraint warehouse_putaway_exceptions_item_fk
    foreign key (
      account_id,
      putaway_id,
      putaway_item_id
    )
    references public.warehouse_putaway_items(
      account_id,
      putaway_id,
      id
    )
    on delete cascade,

  constraint warehouse_putaway_exceptions_source_location_fk
    foreign key (source_location_id)
    references public.warehouse_locations(id)
    on delete restrict,

  constraint warehouse_putaway_exceptions_target_location_fk
    foreign key (target_location_id)
    references public.warehouse_locations(id)
    on delete restrict,

  constraint warehouse_putaway_exceptions_type_check
    check (
      type in (
        'location_capacity_exceeded',
        'location_not_available',
        'temperature_mismatch',
        'hazardous_material_mismatch',
        'product_location_mismatch',
        'lot_mismatch',
        'serial_number_mismatch',
        'expiry_date_invalid',
        'source_stock_not_found',
        'quantity_exceeded',
        'target_location_blocked'
      )
    ),

  constraint warehouse_putaway_exceptions_message_check
    check (length(btrim(message)) > 0),

  constraint warehouse_putaway_exceptions_resolution_check
    check (
      (
        resolved = false
        and resolved_by is null
        and resolved_at is null
      )
      or (
        resolved = true
        and resolved_by is not null
        and resolved_at is not null
      )
    )
);

create index if not exists warehouse_putaway_exceptions_open_idx
  on public.warehouse_putaway_exceptions (
    account_id,
    putaway_id,
    created_at
  )
  where resolved = false;

-- =========================================================
-- Putaway item suggestion referansı
-- =========================================================

alter table public.warehouse_putaway_items
  add constraint warehouse_putaway_items_suggestion_fk
  foreign key (
    account_id,
    putaway_id,
    suggestion_id
  )
  references public.warehouse_putaway_suggestions(
    account_id,
    putaway_id,
    id
  )
  on delete set null;

-- =========================================================
-- Alt tablo RLS
-- =========================================================

alter table public.warehouse_putaway_suggestions
  enable row level security;

alter table public.warehouse_putaway_tasks
  enable row level security;

alter table public.warehouse_putaway_exceptions
  enable row level security;

drop policy if exists warehouse_putaway_suggestions_member_select
  on public.warehouse_putaway_suggestions;

create policy warehouse_putaway_suggestions_member_select
on public.warehouse_putaway_suggestions
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);

drop policy if exists warehouse_putaway_tasks_member_select
  on public.warehouse_putaway_tasks;

create policy warehouse_putaway_tasks_member_select
on public.warehouse_putaway_tasks
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);

drop policy if exists warehouse_putaway_exceptions_member_select
  on public.warehouse_putaway_exceptions;

create policy warehouse_putaway_exceptions_member_select
on public.warehouse_putaway_exceptions
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);

-- =========================================================
-- Alt tablo mutation sınırı
-- =========================================================

revoke insert, update, delete
  on public.warehouse_putaway_suggestions
  from authenticated;

revoke insert, update, delete
  on public.warehouse_putaway_tasks
  from authenticated;

revoke insert, update, delete
  on public.warehouse_putaway_exceptions
  from authenticated;

grant select
  on public.warehouse_putaway_suggestions
  to authenticated;

grant select
  on public.warehouse_putaway_tasks
  to authenticated;

grant select
  on public.warehouse_putaway_exceptions
  to authenticated;
