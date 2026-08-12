-- =========================================================
-- WarehouseIQ — Picking Persistence Foundation
-- EPIC-010F / A2
--
-- Amaç:
-- - Picking domain modelini PostgreSQL üzerinde kalıcılaştırmak.
-- - Caller JWT + RLS sınırını korumak.
-- - authenticated kullanıcıya yalnız SELECT vermek.
-- - Tüm mutation işlemlerini sonraki dar SECURITY DEFINER
--   RPC katmanına bırakmak.
--
-- ÖNEMLİ:
-- - Bu migration stok bakiyesi değiştirmez.
-- - Inventory movement oluşturmaz.
-- - Reservation tüketmez.
-- - Yükseltilmiş ayrıcalıklı sunucu anahtarı kullanılmaz.
-- - Barkod taraması hiçbir write işlemi başlatmaz.
-- - warehouse inventory reservation production tablosu henüz
--   bulunmadığı için reservation_id UUID olarak tutulur fakat
--   olmayan bir tabloya sahte foreign key bağlanmaz.
-- =========================================================


-- =========================================================
-- 1. Picking Wave
-- =========================================================

create table if not exists public.warehouse_picking_waves (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null
    references public.warehouse_accounts(id)
    on delete cascade,

  wave_number text not null,

  warehouse_id uuid not null,

  status text not null default 'draft',

  picking_ids uuid[] not null
    default array[]::uuid[],

  planned_at timestamptz,
  released_at timestamptz,
  completed_at timestamptz,

  notes text,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_picking_waves_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete restrict,

  constraint warehouse_picking_waves_number_not_blank_check
    check (length(btrim(wave_number)) > 0),

  constraint warehouse_picking_waves_status_check
    check (
      status in (
        'draft',
        'planned',
        'released',
        'in_progress',
        'completed',
        'cancelled'
      )
    ),

  constraint warehouse_picking_waves_account_number_unique
    unique (account_id, wave_number),

  constraint warehouse_picking_waves_account_id_id_unique
    unique (account_id, id)
);

create index if not exists warehouse_picking_waves_status_idx
  on public.warehouse_picking_waves (
    account_id,
    warehouse_id,
    status,
    created_at desc
  );


-- =========================================================
-- 2. Picking Batch
-- =========================================================

create table if not exists public.warehouse_picking_batches (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null
    references public.warehouse_accounts(id)
    on delete cascade,

  batch_number text not null,

  warehouse_id uuid not null,

  status text not null default 'draft',

  picking_ids uuid[] not null
    default array[]::uuid[],

  assigned_user_id uuid,
  assigned_equipment_id uuid,

  planned_at timestamptz,
  released_at timestamptz,
  completed_at timestamptz,

  notes text,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_picking_batches_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete restrict,

  constraint warehouse_picking_batches_number_not_blank_check
    check (length(btrim(batch_number)) > 0),

  constraint warehouse_picking_batches_status_check
    check (
      status in (
        'draft',
        'planned',
        'released',
        'in_progress',
        'completed',
        'cancelled'
      )
    ),

  constraint warehouse_picking_batches_account_number_unique
    unique (account_id, batch_number),

  constraint warehouse_picking_batches_account_id_id_unique
    unique (account_id, id)
);

create index if not exists warehouse_picking_batches_status_idx
  on public.warehouse_picking_batches (
    account_id,
    warehouse_id,
    status,
    created_at desc
  );

create index if not exists warehouse_picking_batches_assignee_idx
  on public.warehouse_picking_batches (
    account_id,
    assigned_user_id,
    status
  );


-- =========================================================
-- 3. Ana Picking kaydı
-- =========================================================

create table if not exists public.warehouse_pickings (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null
    references public.warehouse_accounts(id)
    on delete cascade,

  picking_number text not null,

  warehouse_id uuid not null,
  destination_location_id uuid not null,

  strategy text not null,
  status text not null default 'draft',

  -- Order kimliği domain modelinde string olduğu için UUID
  -- varsayımı yapılmaz.
  order_id text,
  order_number text,

  wave_id uuid,
  batch_id uuid,

  reference_type text,
  reference_id text,
  reference_number text,

  priority integer not null default 50,

  planned_at timestamptz,
  released_at timestamptz,
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

  constraint warehouse_pickings_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete restrict,

  constraint warehouse_pickings_destination_location_fk
    foreign key (
      account_id,
      warehouse_id,
      destination_location_id
    )
    references public.warehouse_locations(
      account_id,
      warehouse_id,
      id
    )
    on delete restrict,

  constraint warehouse_pickings_wave_fk
    foreign key (account_id, wave_id)
    references public.warehouse_picking_waves(account_id, id)
    on delete restrict,

  constraint warehouse_pickings_batch_fk
    foreign key (account_id, batch_id)
    references public.warehouse_picking_batches(account_id, id)
    on delete restrict,

  constraint warehouse_pickings_number_not_blank_check
    check (length(btrim(picking_number)) > 0),

  constraint warehouse_pickings_status_check
    check (
      status in (
        'draft',
        'planned',
        'released',
        'in_progress',
        'partially_completed',
        'completed',
        'cancelled'
      )
    ),

  constraint warehouse_pickings_strategy_check
    check (
      strategy in (
        'single_order',
        'batch',
        'wave',
        'zone',
        'cluster',
        'multi_order',
        'fifo',
        'fefo',
        'nearest_location',
        'route_optimized'
      )
    ),

  constraint warehouse_pickings_priority_check
    check (priority between 1 and 100),

  constraint warehouse_pickings_cancel_reason_check
    check (
      status <> 'cancelled'
      or (
        cancellation_reason is not null
        and length(btrim(cancellation_reason)) > 0
      )
    ),

  constraint warehouse_pickings_account_number_unique
    unique (account_id, picking_number),

  constraint warehouse_pickings_account_id_id_unique
    unique (account_id, id)
);

create unique index if not exists warehouse_pickings_order_uidx
  on public.warehouse_pickings (
    account_id,
    order_id
  )
  where order_id is not null;

create index if not exists warehouse_pickings_status_idx
  on public.warehouse_pickings (
    account_id,
    warehouse_id,
    status,
    priority desc,
    created_at
  );

create index if not exists warehouse_pickings_destination_idx
  on public.warehouse_pickings (
    account_id,
    warehouse_id,
    destination_location_id,
    status
  );


-- =========================================================
-- 4. Picking ürün satırları
-- =========================================================

create table if not exists public.warehouse_picking_items (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null,
  picking_id uuid not null,

  line_number integer not null,

  warehouse_id uuid not null,

  product_id uuid not null,
  sku_id uuid,

  requested_quantity numeric(18,6) not null,
  picked_quantity numeric(18,6) not null default 0,
  short_quantity numeric(18,6) not null default 0,
  remaining_quantity numeric(18,6) not null,

  unit text not null,
  stock_status text not null default 'available',
  strategy text not null,

  lot_number text,
  serial_number text,
  production_date date,
  expiry_date date,

  -- Domain InventoryTracking yapısının ileriye dönük alanları
  -- kaybolmasın diye ham JSON da tutulur.
  tracking jsonb not null default '{}'::jsonb,

  source_location_id uuid,
  destination_location_id uuid,

  suggestion_id uuid,

  -- Reservation production persistence henüz mevcut değildir.
  -- Bu alan bilinçli olarak foreign key olmadan tutulur.
  reservation_id uuid,

  inventory_movement_ids uuid[] not null
    default array[]::uuid[],

  transaction_group_ids text[] not null
    default array[]::text[],

  notes text,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_picking_items_picking_fk
    foreign key (account_id, picking_id)
    references public.warehouse_pickings(account_id, id)
    on delete cascade,

  constraint warehouse_picking_items_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete restrict,

  constraint warehouse_picking_items_source_location_fk
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

  constraint warehouse_picking_items_destination_location_fk
    foreign key (
      account_id,
      warehouse_id,
      destination_location_id
    )
    references public.warehouse_locations(
      account_id,
      warehouse_id,
      id
    )
    on delete restrict,

  constraint warehouse_picking_items_product_fk
    foreign key (account_id, product_id)
    references public.warehouse_products(account_id, id)
    on delete restrict,

  constraint warehouse_picking_items_sku_fk
    foreign key (account_id, product_id, sku_id)
    references public.warehouse_product_skus(
      account_id,
      product_id,
      id
    )
    on delete restrict,

  constraint warehouse_picking_items_line_check
    check (line_number > 0),

  constraint warehouse_picking_items_quantity_check
    check (
      requested_quantity > 0
      and picked_quantity >= 0
      and short_quantity >= 0
      and remaining_quantity >= 0
      and picked_quantity + short_quantity
        <= requested_quantity
      and remaining_quantity =
        requested_quantity
        - picked_quantity
        - short_quantity
    ),

  constraint warehouse_picking_items_source_destination_check
    check (
      source_location_id is null
      or destination_location_id is null
      or source_location_id <> destination_location_id
    ),

  constraint warehouse_picking_items_unit_check
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

  constraint warehouse_picking_items_stock_status_check
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

  constraint warehouse_picking_items_strategy_check
    check (
      strategy in (
        'single_order',
        'batch',
        'wave',
        'zone',
        'cluster',
        'multi_order',
        'fifo',
        'fefo',
        'nearest_location',
        'route_optimized'
      )
    ),

  constraint warehouse_picking_items_tracking_object_check
    check (jsonb_typeof(tracking) = 'object'),

  constraint warehouse_picking_items_tracking_dates_check
    check (
      production_date is null
      or expiry_date is null
      or production_date <= expiry_date
    ),

  constraint warehouse_picking_items_account_line_unique
    unique (
      account_id,
      picking_id,
      line_number
    ),

  constraint warehouse_picking_items_account_picking_id_unique
    unique (
      account_id,
      picking_id,
      id
    )
);

create index if not exists warehouse_picking_items_product_idx
  on public.warehouse_picking_items (
    account_id,
    warehouse_id,
    product_id,
    sku_id
  );

create index if not exists warehouse_picking_items_source_idx
  on public.warehouse_picking_items (
    account_id,
    warehouse_id,
    source_location_id,
    remaining_quantity
  );

create index if not exists warehouse_picking_items_open_idx
  on public.warehouse_picking_items (
    account_id,
    picking_id,
    remaining_quantity
  )
  where remaining_quantity > 0;

create index if not exists warehouse_picking_items_reservation_idx
  on public.warehouse_picking_items (
    account_id,
    reservation_id
  )
  where reservation_id is not null;


-- =========================================================
-- 5. Picking önerileri
-- =========================================================

create table if not exists public.warehouse_picking_suggestions (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null,

  picking_id uuid not null,
  picking_item_id uuid not null,

  warehouse_id uuid not null,
  location_id uuid not null,

  strategy text not null,

  suggested_quantity numeric(18,6) not null,
  unit text not null,

  balance jsonb not null,
  score jsonb not null,

  reasons text[] not null default array[]::text[],
  warnings text[] not null default array[]::text[],

  selected boolean not null default false,

  created_at timestamptz not null default now(),

  constraint warehouse_picking_suggestions_picking_fk
    foreign key (account_id, picking_id)
    references public.warehouse_pickings(account_id, id)
    on delete cascade,

  constraint warehouse_picking_suggestions_item_fk
    foreign key (
      account_id,
      picking_id,
      picking_item_id
    )
    references public.warehouse_picking_items(
      account_id,
      picking_id,
      id
    )
    on delete cascade,

  constraint warehouse_picking_suggestions_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete restrict,

  constraint warehouse_picking_suggestions_location_fk
    foreign key (
      account_id,
      warehouse_id,
      location_id
    )
    references public.warehouse_locations(
      account_id,
      warehouse_id,
      id
    )
    on delete restrict,

  constraint warehouse_picking_suggestions_quantity_check
    check (suggested_quantity > 0),

  constraint warehouse_picking_suggestions_unit_check
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

  constraint warehouse_picking_suggestions_strategy_check
    check (
      strategy in (
        'single_order',
        'batch',
        'wave',
        'zone',
        'cluster',
        'multi_order',
        'fifo',
        'fefo',
        'nearest_location',
        'route_optimized'
      )
    ),

  constraint warehouse_picking_suggestions_balance_object_check
    check (jsonb_typeof(balance) = 'object'),

  constraint warehouse_picking_suggestions_score_object_check
    check (jsonb_typeof(score) = 'object'),

  constraint warehouse_picking_suggestions_account_id_unique
    unique (
      account_id,
      picking_id,
      id
    )
);

create index if not exists warehouse_picking_suggestions_item_idx
  on public.warehouse_picking_suggestions (
    account_id,
    picking_id,
    picking_item_id,
    selected,
    created_at
  );


-- Picking satırındaki selected suggestion bağı.
alter table public.warehouse_picking_items
  add constraint warehouse_picking_items_suggestion_fk
  foreign key (
    account_id,
    picking_id,
    suggestion_id
  )
  references public.warehouse_picking_suggestions(
    account_id,
    picking_id,
    id
  )
  on delete set null;


-- =========================================================
-- 6. Picking görevleri
-- =========================================================

create table if not exists public.warehouse_picking_tasks (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null,

  picking_id uuid not null,
  picking_item_id uuid,

  warehouse_id uuid not null,

  source_location_id uuid not null,
  destination_location_id uuid,

  assigned_user_id uuid,
  assigned_equipment_id uuid,

  status text not null default 'pending',

  priority integer not null default 50,
  sequence integer not null default 1,

  planned_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,

  notes text,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_picking_tasks_picking_fk
    foreign key (account_id, picking_id)
    references public.warehouse_pickings(account_id, id)
    on delete cascade,

  constraint warehouse_picking_tasks_item_fk
    foreign key (
      account_id,
      picking_id,
      picking_item_id
    )
    references public.warehouse_picking_items(
      account_id,
      picking_id,
      id
    )
    on delete cascade,

  constraint warehouse_picking_tasks_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete restrict,

  constraint warehouse_picking_tasks_source_location_fk
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

  constraint warehouse_picking_tasks_destination_location_fk
    foreign key (
      account_id,
      warehouse_id,
      destination_location_id
    )
    references public.warehouse_locations(
      account_id,
      warehouse_id,
      id
    )
    on delete restrict,

  constraint warehouse_picking_tasks_status_check
    check (
      status in (
        'pending',
        'assigned',
        'in_progress',
        'partially_completed',
        'completed',
        'cancelled'
      )
    ),

  constraint warehouse_picking_tasks_priority_check
    check (priority between 1 and 100),

  constraint warehouse_picking_tasks_sequence_check
    check (sequence > 0),

  constraint warehouse_picking_tasks_locations_check
    check (
      destination_location_id is null
      or source_location_id <> destination_location_id
    ),

  constraint warehouse_picking_tasks_account_id_unique
    unique (
      account_id,
      picking_id,
      id
    )
);

create index if not exists warehouse_picking_tasks_picking_idx
  on public.warehouse_picking_tasks (
    account_id,
    picking_id,
    status,
    sequence
  );

create index if not exists warehouse_picking_tasks_assignee_idx
  on public.warehouse_picking_tasks (
    account_id,
    assigned_user_id,
    status
  );


-- =========================================================
-- 7. Picking rotaları
-- =========================================================

create table if not exists public.warehouse_picking_routes (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null,

  picking_id uuid not null,
  warehouse_id uuid not null,

  start_location_id uuid,
  end_location_id uuid,

  total_distance numeric(18,6) not null default 0,
  estimated_duration_seconds integer not null default 0,

  optimized boolean not null default false,

  steps jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),

  constraint warehouse_picking_routes_picking_fk
    foreign key (account_id, picking_id)
    references public.warehouse_pickings(account_id, id)
    on delete cascade,

  constraint warehouse_picking_routes_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete restrict,

  constraint warehouse_picking_routes_start_location_fk
    foreign key (
      account_id,
      warehouse_id,
      start_location_id
    )
    references public.warehouse_locations(
      account_id,
      warehouse_id,
      id
    )
    on delete restrict,

  constraint warehouse_picking_routes_end_location_fk
    foreign key (
      account_id,
      warehouse_id,
      end_location_id
    )
    references public.warehouse_locations(
      account_id,
      warehouse_id,
      id
    )
    on delete restrict,

  constraint warehouse_picking_routes_distance_check
    check (total_distance >= 0),

  constraint warehouse_picking_routes_duration_check
    check (estimated_duration_seconds >= 0),

  constraint warehouse_picking_routes_steps_array_check
    check (jsonb_typeof(steps) = 'array'),

  constraint warehouse_picking_routes_account_id_unique
    unique (
      account_id,
      picking_id,
      id
    )
);

create index if not exists warehouse_picking_routes_picking_idx
  on public.warehouse_picking_routes (
    account_id,
    picking_id,
    created_at
  );


-- =========================================================
-- 8. Picking istisnaları
-- =========================================================

create table if not exists public.warehouse_picking_exceptions (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null,

  picking_id uuid not null,
  picking_item_id uuid,
  task_id uuid,

  type text not null,
  message text not null,

  warehouse_id uuid,
  location_id uuid,
  product_id uuid,

  resolved boolean not null default false,

  resolved_by uuid
    references auth.users(id)
    on delete restrict,

  resolved_at timestamptz,
  resolution_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_picking_exceptions_picking_fk
    foreign key (account_id, picking_id)
    references public.warehouse_pickings(account_id, id)
    on delete cascade,

  constraint warehouse_picking_exceptions_item_fk
    foreign key (
      account_id,
      picking_id,
      picking_item_id
    )
    references public.warehouse_picking_items(
      account_id,
      picking_id,
      id
    )
    on delete cascade,

  constraint warehouse_picking_exceptions_task_fk
    foreign key (
      account_id,
      picking_id,
      task_id
    )
    references public.warehouse_picking_tasks(
      account_id,
      picking_id,
      id
    )
    on delete cascade,

  constraint warehouse_picking_exceptions_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete restrict,

  constraint warehouse_picking_exceptions_location_fk
    foreign key (
      account_id,
      warehouse_id,
      location_id
    )
    references public.warehouse_locations(
      account_id,
      warehouse_id,
      id
    )
    on delete restrict,

  constraint warehouse_picking_exceptions_product_fk
    foreign key (account_id, product_id)
    references public.warehouse_products(account_id, id)
    on delete restrict,

  constraint warehouse_picking_exceptions_type_check
    check (
      type in (
        'stock_not_found',
        'insufficient_stock',
        'short_pick',
        'location_mismatch',
        'barcode_mismatch',
        'lot_mismatch',
        'serial_number_mismatch',
        'expiry_date_mismatch',
        'damaged_product',
        'blocked_location',
        'unit_mismatch',
        'quantity_exceeded',
        'task_assignment_error'
      )
    ),

  constraint warehouse_picking_exceptions_message_check
    check (length(btrim(message)) > 0),

  constraint warehouse_picking_exceptions_resolution_check
    check (
      (
        resolved = false
        and resolved_by is null
        and resolved_at is null
      )
      or
      (
        resolved = true
        and resolved_by is not null
        and resolved_at is not null
      )
    ),

  constraint warehouse_picking_exceptions_location_context_check
    check (
      location_id is null
      or warehouse_id is not null
    )
);

create index if not exists warehouse_picking_exceptions_open_idx
  on public.warehouse_picking_exceptions (
    account_id,
    picking_id,
    resolved,
    created_at
  )
  where resolved = false;


-- =========================================================
-- 9. Idempotent Picking write request kayıtları
-- =========================================================

create table if not exists public.warehouse_picking_write_requests (
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

  constraint warehouse_picking_write_requests_action_check
    check (
      action in (
        'create',
        'add_item',
        'release',
        'start',
        'create_task',
        'execute_item',
        'resolve_exception',
        'complete',
        'cancel',
        'create_wave',
        'create_batch'
      )
    ),

  constraint warehouse_picking_write_requests_payload_object_check
    check (jsonb_typeof(request_payload) = 'object'),

  constraint warehouse_picking_write_requests_response_object_check
    check (
      response_payload is null
      or jsonb_typeof(response_payload) = 'object'
    )
);

create index if not exists warehouse_picking_write_requests_user_idx
  on public.warehouse_picking_write_requests (
    account_id,
    user_id,
    created_at desc
  );


-- =========================================================
-- 10. updated_at triggerları
-- =========================================================

drop trigger if exists trg_warehouse_picking_waves_updated_at
  on public.warehouse_picking_waves;

create trigger trg_warehouse_picking_waves_updated_at
before update on public.warehouse_picking_waves
for each row
execute function public.warehouse_set_updated_at();


drop trigger if exists trg_warehouse_picking_batches_updated_at
  on public.warehouse_picking_batches;

create trigger trg_warehouse_picking_batches_updated_at
before update on public.warehouse_picking_batches
for each row
execute function public.warehouse_set_updated_at();


drop trigger if exists trg_warehouse_pickings_updated_at
  on public.warehouse_pickings;

create trigger trg_warehouse_pickings_updated_at
before update on public.warehouse_pickings
for each row
execute function public.warehouse_set_updated_at();


drop trigger if exists trg_warehouse_picking_items_updated_at
  on public.warehouse_picking_items;

create trigger trg_warehouse_picking_items_updated_at
before update on public.warehouse_picking_items
for each row
execute function public.warehouse_set_updated_at();


drop trigger if exists trg_warehouse_picking_tasks_updated_at
  on public.warehouse_picking_tasks;

create trigger trg_warehouse_picking_tasks_updated_at
before update on public.warehouse_picking_tasks
for each row
execute function public.warehouse_set_updated_at();


drop trigger if exists trg_warehouse_picking_exceptions_updated_at
  on public.warehouse_picking_exceptions;

create trigger trg_warehouse_picking_exceptions_updated_at
before update on public.warehouse_picking_exceptions
for each row
execute function public.warehouse_set_updated_at();


-- =========================================================
-- 11. RLS
-- =========================================================

alter table public.warehouse_picking_waves
  enable row level security;

alter table public.warehouse_picking_batches
  enable row level security;

alter table public.warehouse_pickings
  enable row level security;

alter table public.warehouse_picking_items
  enable row level security;

alter table public.warehouse_picking_suggestions
  enable row level security;

alter table public.warehouse_picking_tasks
  enable row level security;

alter table public.warehouse_picking_routes
  enable row level security;

alter table public.warehouse_picking_exceptions
  enable row level security;

alter table public.warehouse_picking_write_requests
  enable row level security;


drop policy if exists warehouse_picking_waves_member_select
  on public.warehouse_picking_waves;

create policy warehouse_picking_waves_member_select
on public.warehouse_picking_waves
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);


drop policy if exists warehouse_picking_batches_member_select
  on public.warehouse_picking_batches;

create policy warehouse_picking_batches_member_select
on public.warehouse_picking_batches
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);


drop policy if exists warehouse_pickings_member_select
  on public.warehouse_pickings;

create policy warehouse_pickings_member_select
on public.warehouse_pickings
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);


drop policy if exists warehouse_picking_items_member_select
  on public.warehouse_picking_items;

create policy warehouse_picking_items_member_select
on public.warehouse_picking_items
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);


drop policy if exists warehouse_picking_suggestions_member_select
  on public.warehouse_picking_suggestions;

create policy warehouse_picking_suggestions_member_select
on public.warehouse_picking_suggestions
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);


drop policy if exists warehouse_picking_tasks_member_select
  on public.warehouse_picking_tasks;

create policy warehouse_picking_tasks_member_select
on public.warehouse_picking_tasks
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);


drop policy if exists warehouse_picking_routes_member_select
  on public.warehouse_picking_routes;

create policy warehouse_picking_routes_member_select
on public.warehouse_picking_routes
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);


drop policy if exists warehouse_picking_exceptions_member_select
  on public.warehouse_picking_exceptions;

create policy warehouse_picking_exceptions_member_select
on public.warehouse_picking_exceptions
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);


drop policy if exists warehouse_picking_write_requests_owner_select
  on public.warehouse_picking_write_requests;

create policy warehouse_picking_write_requests_owner_select
on public.warehouse_picking_write_requests
for select
to authenticated
using (
  user_id = auth.uid()
  and public.warehouse_has_account_access(account_id)
);


-- =========================================================
-- 12. Mutation sınırı
-- =========================================================

revoke insert, update, delete
  on public.warehouse_picking_waves
  from authenticated;

revoke insert, update, delete
  on public.warehouse_picking_batches
  from authenticated;

revoke insert, update, delete
  on public.warehouse_pickings
  from authenticated;

revoke insert, update, delete
  on public.warehouse_picking_items
  from authenticated;

revoke insert, update, delete
  on public.warehouse_picking_suggestions
  from authenticated;

revoke insert, update, delete
  on public.warehouse_picking_tasks
  from authenticated;

revoke insert, update, delete
  on public.warehouse_picking_routes
  from authenticated;

revoke insert, update, delete
  on public.warehouse_picking_exceptions
  from authenticated;

revoke insert, update, delete
  on public.warehouse_picking_write_requests
  from authenticated;


grant select
  on public.warehouse_picking_waves
  to authenticated;

grant select
  on public.warehouse_picking_batches
  to authenticated;

grant select
  on public.warehouse_pickings
  to authenticated;

grant select
  on public.warehouse_picking_items
  to authenticated;

grant select
  on public.warehouse_picking_suggestions
  to authenticated;

grant select
  on public.warehouse_picking_tasks
  to authenticated;

grant select
  on public.warehouse_picking_routes
  to authenticated;

grant select
  on public.warehouse_picking_exceptions
  to authenticated;

grant select
  on public.warehouse_picking_write_requests
  to authenticated;


-- =========================================================
-- Bu migration inventory tablolarının grant/policy veya
-- bakiyelerine dokunmaz.
--
-- Picking stok transferi + reservation consumption sonraki
-- kontrollü atomik RPC aşamasında ele alınacaktır.
-- =========================================================
