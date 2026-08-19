-- ============================================================
-- WarehouseIQ · Replenishment Persistence
-- RP-P1
--
-- Güvenlik sözleşmesi:
-- - Authenticated firma üyeleri yalnız kendi account kayıtlarını
--   RLS üzerinden okuyabilir.
-- - Ana ve alt ikmal tablolarında authenticated doğrudan
--   INSERT / UPDATE / DELETE yetkisi yoktur.
-- - Mutation akışı bu fazda açılmaz.
-- - Dar ve idempotent write RPC kapıları sonraki fazdır.
-- - Inventory balance / movement / reservation mutation yoktur.
-- - Picking / packing / shipping mutation yoktur.
-- ============================================================


-- ============================================================
-- 1. Replenishment rules
-- ============================================================

create table if not exists public.warehouse_replenishment_rules (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null
    references public.warehouse_accounts(id)
    on delete cascade,

  code text not null,
  name text not null,
  description text,

  warehouse_id uuid,
  zone_id text,
  destination_location_id uuid,

  product_id uuid,
  sku_id uuid,
  product_category_id text,
  abc_class text,

  strategy text not null,

  minimum_quantity numeric,
  maximum_quantity numeric,
  safety_stock_quantity numeric,
  reorder_point numeric,
  target_fill_percentage numeric,

  minimum_transfer_quantity numeric,
  maximum_transfer_quantity numeric,
  transfer_multiple numeric,
  lead_time_minutes integer,

  priority integer not null default 50,
  automatic_release boolean not null default false,
  allow_partial_allocation boolean not null default true,
  active boolean not null default true,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_replenishment_rules_code_check
    check (btrim(code) <> ''),

  constraint warehouse_replenishment_rules_name_check
    check (btrim(name) <> ''),

  constraint warehouse_replenishment_rules_abc_class_check
    check (
      abc_class is null
      or abc_class in ('A', 'B', 'C')
    ),

  constraint warehouse_replenishment_rules_strategy_check
    check (
      strategy in (
        'minimum_maximum',
        'demand_based',
        'order_based',
        'wave_based',
        'forward_pick',
        'top_up',
        'emergency',
        'batch',
        'case',
        'pallet',
        'abc_priority',
        'movement_velocity',
        'predictive'
      )
    ),

  constraint warehouse_replenishment_rules_quantity_check
    check (
      (minimum_quantity is null or minimum_quantity >= 0)
      and
      (maximum_quantity is null or maximum_quantity >= 0)
      and
      (
        minimum_quantity is null
        or maximum_quantity is null
        or minimum_quantity <= maximum_quantity
      )
      and
      (safety_stock_quantity is null or safety_stock_quantity >= 0)
      and
      (reorder_point is null or reorder_point >= 0)
      and
      (
        minimum_transfer_quantity is null
        or minimum_transfer_quantity > 0
      )
      and
      (
        maximum_transfer_quantity is null
        or maximum_transfer_quantity > 0
      )
      and
      (
        minimum_transfer_quantity is null
        or maximum_transfer_quantity is null
        or minimum_transfer_quantity <= maximum_transfer_quantity
      )
      and
      (transfer_multiple is null or transfer_multiple > 0)
    ),

  constraint warehouse_replenishment_rules_fill_check
    check (
      target_fill_percentage is null
      or (
        target_fill_percentage >= 0
        and target_fill_percentage <= 100
      )
    ),

  constraint warehouse_replenishment_rules_lead_time_check
    check (
      lead_time_minutes is null
      or lead_time_minutes >= 0
    ),

  constraint warehouse_replenishment_rules_priority_check
    check (priority >= 0),

  constraint warehouse_replenishment_rules_destination_scope_check
    check (
      destination_location_id is null
      or warehouse_id is not null
    ),

  constraint warehouse_replenishment_rules_account_id_unique
    unique (account_id, id),

  constraint warehouse_replenishment_rules_account_code_unique
    unique (account_id, code),

  constraint warehouse_replenishment_rules_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete cascade,

  constraint warehouse_replenishment_rules_destination_fk
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
    on delete restrict
);

create index if not exists
  warehouse_replenishment_rules_lookup_idx
on public.warehouse_replenishment_rules(
  account_id,
  warehouse_id,
  active,
  priority desc,
  code
);


-- ============================================================
-- 2. Replenishment master
-- ============================================================

create table if not exists public.warehouse_replenishments (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null
    references public.warehouse_accounts(id)
    on delete cascade,

  replenishment_number text not null,
  warehouse_id uuid not null,

  strategy text not null,
  source jsonb not null,

  status text not null default 'draft',
  priority integer not null default 50,

  rule_id uuid,

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

  constraint warehouse_replenishments_number_check
    check (btrim(replenishment_number) <> ''),

  constraint warehouse_replenishments_strategy_check
    check (
      strategy in (
        'minimum_maximum',
        'demand_based',
        'order_based',
        'wave_based',
        'forward_pick',
        'top_up',
        'emergency',
        'batch',
        'case',
        'pallet',
        'abc_priority',
        'movement_velocity',
        'predictive'
      )
    ),

  constraint warehouse_replenishments_status_check
    check (
      status in (
        'draft',
        'planned',
        'released',
        'assigned',
        'in_progress',
        'partially_completed',
        'completed',
        'exception',
        'cancelled'
      )
    ),

  constraint warehouse_replenishments_source_check
    check (
      jsonb_typeof(source) = 'object'
      and source ? 'type'
      and source->>'type' in (
        'manual',
        'minimum_stock',
        'maximum_stock',
        'order_demand',
        'wave_demand',
        'short_pick',
        'cycle_count',
        'inventory_exception',
        'forecast',
        'scheduled',
        'external_system'
      )
    ),

  constraint warehouse_replenishments_priority_check
    check (priority >= 0),

  constraint warehouse_replenishments_account_id_unique
    unique (account_id, id),

  constraint warehouse_replenishments_account_number_unique
    unique (account_id, replenishment_number),

  constraint warehouse_replenishments_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete restrict,

  constraint warehouse_replenishments_rule_fk
    foreign key (account_id, rule_id)
    references public.warehouse_replenishment_rules(account_id, id)
    on delete set null
);

create unique index if not exists
  warehouse_replenishments_source_reference_uidx
on public.warehouse_replenishments(
  account_id,
  (source->>'type'),
  (source->>'referenceId')
)
where
  source ? 'referenceId'
  and nullif(btrim(source->>'referenceId'), '') is not null;

create index if not exists
  warehouse_replenishments_list_idx
on public.warehouse_replenishments(
  account_id,
  warehouse_id,
  status,
  priority desc,
  created_at desc
);


-- ============================================================
-- 3. Replenishment items
-- ============================================================

create table if not exists public.warehouse_replenishment_items (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null,
  replenishment_id uuid not null,

  line_number integer not null,
  warehouse_id uuid not null,
  destination_location_id uuid not null,

  product_id uuid not null,
  sku_id uuid,
  stock_status text not null,
  unit text not null,

  requested_quantity numeric not null,
  allocated_quantity numeric not null default 0,
  transferred_quantity numeric not null default 0,
  remaining_quantity numeric not null,

  minimum_quantity numeric,
  maximum_quantity numeric,
  current_destination_quantity numeric not null default 0,

  priority integer not null default 50,
  status text not null default 'pending',

  tracking jsonb,

  required_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,

  notes text,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_replenishment_items_parent_fk
    foreign key (account_id, replenishment_id)
    references public.warehouse_replenishments(account_id, id)
    on delete cascade,

  constraint warehouse_replenishment_items_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete restrict,

  constraint warehouse_replenishment_items_destination_fk
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

  constraint warehouse_replenishment_items_status_check
    check (
      status in (
        'pending',
        'allocated',
        'assigned',
        'in_progress',
        'partially_completed',
        'completed',
        'exception',
        'cancelled'
      )
    ),

  constraint warehouse_replenishment_items_line_check
    check (line_number > 0),

  constraint warehouse_replenishment_items_quantity_check
    check (
      requested_quantity > 0
      and allocated_quantity >= 0
      and transferred_quantity >= 0
      and remaining_quantity >= 0
      and current_destination_quantity >= 0
      and allocated_quantity <= requested_quantity
      and transferred_quantity <= requested_quantity
      and remaining_quantity <= requested_quantity
      and (
        minimum_quantity is null
        or minimum_quantity >= 0
      )
      and (
        maximum_quantity is null
        or maximum_quantity >= 0
      )
      and (
        minimum_quantity is null
        or maximum_quantity is null
        or minimum_quantity <= maximum_quantity
      )
    ),

  constraint warehouse_replenishment_items_priority_check
    check (priority >= 0),

  constraint warehouse_replenishment_items_tracking_check
    check (
      tracking is null
      or jsonb_typeof(tracking) = 'object'
    ),

  constraint warehouse_replenishment_items_account_id_unique
    unique (account_id, replenishment_id, id),

  constraint warehouse_replenishment_items_line_unique
    unique (account_id, replenishment_id, line_number)
);

create unique index if not exists
  warehouse_replenishment_items_destination_product_uidx
on public.warehouse_replenishment_items(
  account_id,
  replenishment_id,
  destination_location_id,
  product_id,
  coalesce(
    sku_id,
    '00000000-0000-0000-0000-000000000000'::uuid
  ),
  stock_status,
  unit
);

create index if not exists
  warehouse_replenishment_items_lookup_idx
on public.warehouse_replenishment_items(
  account_id,
  replenishment_id,
  status,
  priority desc,
  line_number
);


-- ============================================================
-- 4. Replenishment demands
-- ============================================================

create table if not exists public.warehouse_replenishment_demands (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null,
  replenishment_id uuid not null,

  warehouse_id uuid not null,
  destination_location_id uuid not null,

  product_id uuid not null,
  sku_id uuid,
  stock_status text not null,
  unit text not null,

  current_quantity numeric not null,
  minimum_quantity numeric,
  maximum_quantity numeric,

  order_demand_quantity numeric not null default 0,
  forecast_demand_quantity numeric not null default 0,
  safety_stock_quantity numeric not null default 0,

  required_quantity numeric not null,
  urgency_score numeric not null,
  priority integer not null default 50,

  source jsonb not null,
  tracking jsonb,

  required_at timestamptz,
  created_at timestamptz not null default now(),

  constraint warehouse_replenishment_demands_parent_fk
    foreign key (account_id, replenishment_id)
    references public.warehouse_replenishments(account_id, id)
    on delete cascade,

  constraint warehouse_replenishment_demands_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete restrict,

  constraint warehouse_replenishment_demands_destination_fk
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

  constraint warehouse_replenishment_demands_quantity_check
    check (
      current_quantity >= 0
      and order_demand_quantity >= 0
      and forecast_demand_quantity >= 0
      and safety_stock_quantity >= 0
      and required_quantity >= 0
      and (
        minimum_quantity is null
        or minimum_quantity >= 0
      )
      and (
        maximum_quantity is null
        or maximum_quantity >= 0
      )
      and (
        minimum_quantity is null
        or maximum_quantity is null
        or minimum_quantity <= maximum_quantity
      )
    ),

  constraint warehouse_replenishment_demands_score_check
    check (
      urgency_score >= 0
      and urgency_score <= 100
      and priority >= 0
    ),

  constraint warehouse_replenishment_demands_source_check
    check (
      jsonb_typeof(source) = 'object'
      and source ? 'type'
    ),

  constraint warehouse_replenishment_demands_tracking_check
    check (
      tracking is null
      or jsonb_typeof(tracking) = 'object'
    ),

  constraint warehouse_replenishment_demands_account_id_unique
    unique (account_id, replenishment_id, id)
);

create index if not exists
  warehouse_replenishment_demands_lookup_idx
on public.warehouse_replenishment_demands(
  account_id,
  replenishment_id,
  priority desc,
  urgency_score desc,
  created_at
);


-- ============================================================
-- 5. Replenishment allocations
-- ============================================================

create table if not exists public.warehouse_replenishment_allocations (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null,
  replenishment_id uuid not null,
  replenishment_item_id uuid not null,

  source_location_id uuid not null,
  destination_location_id uuid not null,

  product_id uuid not null,
  sku_id uuid,
  inventory_balance_id uuid,

  stock_status text not null,
  unit text not null,

  allocated_quantity numeric not null,
  transferred_quantity numeric not null default 0,
  remaining_quantity numeric not null,

  sequence integer not null,
  score numeric not null,
  status text not null default 'planned',

  tracking jsonb,

  inventory_reservation_id uuid,
  inventory_movement_id uuid,

  reserved_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_replenishment_allocations_parent_fk
    foreign key (account_id, replenishment_id)
    references public.warehouse_replenishments(account_id, id)
    on delete cascade,

  constraint warehouse_replenishment_allocations_item_fk
    foreign key (
      account_id,
      replenishment_id,
      replenishment_item_id
    )
    references public.warehouse_replenishment_items(
      account_id,
      replenishment_id,
      id
    )
    on delete cascade,

  constraint warehouse_replenishment_allocations_status_check
    check (
      status in (
        'planned',
        'reserved',
        'in_progress',
        'completed',
        'released',
        'cancelled'
      )
    ),

  constraint warehouse_replenishment_allocations_quantity_check
    check (
      allocated_quantity > 0
      and transferred_quantity >= 0
      and remaining_quantity >= 0
      and transferred_quantity <= allocated_quantity
      and remaining_quantity <= allocated_quantity
    ),

  constraint warehouse_replenishment_allocations_sequence_check
    check (sequence > 0),

  constraint warehouse_replenishment_allocations_score_check
    check (score >= 0),

  constraint warehouse_replenishment_allocations_tracking_check
    check (
      tracking is null
      or jsonb_typeof(tracking) = 'object'
    ),

  constraint warehouse_replenishment_allocations_account_id_unique
    unique (account_id, replenishment_id, id)
);

create index if not exists
  warehouse_replenishment_allocations_lookup_idx
on public.warehouse_replenishment_allocations(
  account_id,
  replenishment_id,
  replenishment_item_id,
  status,
  sequence
);


-- ============================================================
-- 6. Replenishment suggestions
-- ============================================================

create table if not exists public.warehouse_replenishment_suggestions (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null,
  replenishment_id uuid not null,
  replenishment_item_id uuid not null,

  source_location_id uuid not null,
  destination_location_id uuid not null,

  product_id uuid not null,
  sku_id uuid,
  inventory_balance_id uuid,

  stock_status text not null,
  unit text not null,

  suggested_quantity numeric not null,
  available_quantity numeric not null,
  source_remaining_quantity numeric not null,
  source_distance numeric not null,

  capacity_score numeric not null,
  distance_score numeric not null,
  stock_age_score numeric not null,
  compatibility_score numeric not null,
  total_score numeric not null,

  reasons text[] not null default array[]::text[],
  warnings text[] not null default array[]::text[],

  tracking jsonb,

  created_at timestamptz not null default now(),

  constraint warehouse_replenishment_suggestions_parent_fk
    foreign key (account_id, replenishment_id)
    references public.warehouse_replenishments(account_id, id)
    on delete cascade,

  constraint warehouse_replenishment_suggestions_item_fk
    foreign key (
      account_id,
      replenishment_id,
      replenishment_item_id
    )
    references public.warehouse_replenishment_items(
      account_id,
      replenishment_id,
      id
    )
    on delete cascade,

  constraint warehouse_replenishment_suggestions_quantity_check
    check (
      suggested_quantity > 0
      and available_quantity >= 0
      and source_remaining_quantity >= 0
      and source_distance >= 0
      and suggested_quantity <= available_quantity
    ),

  constraint warehouse_replenishment_suggestions_score_check
    check (
      capacity_score >= 0
      and capacity_score <= 100
      and distance_score >= 0
      and distance_score <= 100
      and stock_age_score >= 0
      and stock_age_score <= 100
      and compatibility_score >= 0
      and compatibility_score <= 100
      and total_score >= 0
      and total_score <= 100
    ),

  constraint warehouse_replenishment_suggestions_tracking_check
    check (
      tracking is null
      or jsonb_typeof(tracking) = 'object'
    ),

  constraint warehouse_replenishment_suggestions_account_id_unique
    unique (account_id, replenishment_id, id)
);

create index if not exists
  warehouse_replenishment_suggestions_score_idx
on public.warehouse_replenishment_suggestions(
  account_id,
  replenishment_id,
  replenishment_item_id,
  total_score desc,
  created_at
);


-- ============================================================
-- 7. Replenishment tasks
-- ============================================================

create table if not exists public.warehouse_replenishment_tasks (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null,
  replenishment_id uuid not null,

  replenishment_item_id uuid,
  allocation_id uuid,

  warehouse_id uuid not null,

  source_location_id uuid,
  destination_location_id uuid,
  product_id uuid,

  type text not null,
  status text not null default 'pending',

  priority integer not null default 50,
  sequence integer not null default 1,

  assigned_user_id uuid
    references auth.users(id)
    on delete set null,

  assigned_team_id text,
  assigned_equipment_id text,

  planned_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,

  notes text,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_replenishment_tasks_parent_fk
    foreign key (account_id, replenishment_id)
    references public.warehouse_replenishments(account_id, id)
    on delete cascade,

  constraint warehouse_replenishment_tasks_item_fk
    foreign key (
      account_id,
      replenishment_id,
      replenishment_item_id
    )
    references public.warehouse_replenishment_items(
      account_id,
      replenishment_id,
      id
    )
    on delete cascade,

  constraint warehouse_replenishment_tasks_allocation_fk
    foreign key (
      account_id,
      replenishment_id,
      allocation_id
    )
    references public.warehouse_replenishment_allocations(
      account_id,
      replenishment_id,
      id
    )
    on delete cascade,

  constraint warehouse_replenishment_tasks_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete restrict,

  constraint warehouse_replenishment_tasks_type_check
    check (
      type in (
        'move_stock',
        'move_case',
        'move_pallet',
        'top_up_location',
        'emergency_replenishment'
      )
    ),

  constraint warehouse_replenishment_tasks_status_check
    check (
      status in (
        'pending',
        'assigned',
        'in_progress',
        'completed',
        'exception',
        'cancelled'
      )
    ),

  constraint warehouse_replenishment_tasks_priority_check
    check (priority >= 0),

  constraint warehouse_replenishment_tasks_sequence_check
    check (sequence > 0),

  constraint warehouse_replenishment_tasks_account_id_unique
    unique (account_id, replenishment_id, id)
);

create index if not exists
  warehouse_replenishment_tasks_queue_idx
on public.warehouse_replenishment_tasks(
  account_id,
  warehouse_id,
  status,
  priority desc,
  sequence,
  planned_at
);


-- ============================================================
-- 8. Replenishment exceptions
-- ============================================================

create table if not exists public.warehouse_replenishment_exceptions (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null,
  replenishment_id uuid not null,

  replenishment_item_id uuid,
  task_id uuid,
  allocation_id uuid,

  warehouse_id uuid,
  source_location_id uuid,
  destination_location_id uuid,

  product_id uuid,
  sku_id uuid,

  type text not null,
  message text not null,

  resolved boolean not null default false,

  resolved_by uuid
    references auth.users(id)
    on delete set null,

  resolved_at timestamptz,
  resolution_notes text,

  created_at timestamptz not null default now(),

  constraint warehouse_replenishment_exceptions_parent_fk
    foreign key (account_id, replenishment_id)
    references public.warehouse_replenishments(account_id, id)
    on delete cascade,

  constraint warehouse_replenishment_exceptions_item_fk
    foreign key (
      account_id,
      replenishment_id,
      replenishment_item_id
    )
    references public.warehouse_replenishment_items(
      account_id,
      replenishment_id,
      id
    )
    on delete cascade,

  constraint warehouse_replenishment_exceptions_task_fk
    foreign key (
      account_id,
      replenishment_id,
      task_id
    )
    references public.warehouse_replenishment_tasks(
      account_id,
      replenishment_id,
      id
    )
    on delete cascade,

  constraint warehouse_replenishment_exceptions_allocation_fk
    foreign key (
      account_id,
      replenishment_id,
      allocation_id
    )
    references public.warehouse_replenishment_allocations(
      account_id,
      replenishment_id,
      id
    )
    on delete cascade,

  constraint warehouse_replenishment_exceptions_type_check
    check (
      type in (
        'source_stock_missing',
        'source_stock_insufficient',
        'source_location_blocked',
        'destination_location_blocked',
        'destination_capacity_exceeded',
        'destination_stock_limit_exceeded',
        'product_mismatch',
        'sku_mismatch',
        'lot_mismatch',
        'serial_number_mismatch',
        'stock_status_mismatch',
        'unit_mismatch',
        'transfer_quantity_exceeded',
        'task_not_assigned',
        'inventory_movement_failed',
        'allocation_failed',
        'no_suitable_source',
        'demand_changed',
        'replenishment_interrupted'
      )
    ),

  constraint warehouse_replenishment_exceptions_message_check
    check (btrim(message) <> ''),

  constraint warehouse_replenishment_exceptions_resolution_check
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

  constraint warehouse_replenishment_exceptions_account_id_unique
    unique (account_id, replenishment_id, id)
);

create index if not exists
  warehouse_replenishment_exceptions_open_idx
on public.warehouse_replenishment_exceptions(
  account_id,
  replenishment_id,
  resolved,
  created_at desc
);


-- ============================================================
-- 9. Replenishment performance
-- ============================================================

create table if not exists public.warehouse_replenishment_performance (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null
    references public.warehouse_accounts(id)
    on delete cascade,

  warehouse_id uuid,

  period_start timestamptz not null,
  period_end timestamptz not null,

  total_replenishments integer not null,
  completed_replenishments integer not null,
  cancelled_replenishments integer not null,
  exception_replenishments integer not null,

  total_requested_quantity numeric not null,
  total_transferred_quantity numeric not null,

  completion_rate numeric not null,
  fulfillment_rate numeric not null,

  average_completion_minutes numeric not null,
  average_task_minutes numeric not null,

  source_utilization_rate numeric not null,
  destination_fill_rate numeric not null,
  emergency_replenishment_rate numeric not null,

  calculated_at timestamptz not null default now(),

  constraint warehouse_replenishment_performance_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete cascade,

  constraint warehouse_replenishment_performance_period_check
    check (period_end >= period_start),

  constraint warehouse_replenishment_performance_count_check
    check (
      total_replenishments >= 0
      and completed_replenishments >= 0
      and cancelled_replenishments >= 0
      and exception_replenishments >= 0
    ),

  constraint warehouse_replenishment_performance_quantity_check
    check (
      total_requested_quantity >= 0
      and total_transferred_quantity >= 0
      and average_completion_minutes >= 0
      and average_task_minutes >= 0
    ),

  constraint warehouse_replenishment_performance_rate_check
    check (
      completion_rate >= 0
      and completion_rate <= 100
      and fulfillment_rate >= 0
      and fulfillment_rate <= 100
      and source_utilization_rate >= 0
      and source_utilization_rate <= 100
      and destination_fill_rate >= 0
      and destination_fill_rate <= 100
      and emergency_replenishment_rate >= 0
      and emergency_replenishment_rate <= 100
    ),

  constraint warehouse_replenishment_performance_account_id_unique
    unique (account_id, id)
);

create index if not exists
  warehouse_replenishment_performance_period_idx
on public.warehouse_replenishment_performance(
  account_id,
  warehouse_id,
  period_start desc,
  period_end desc
);


-- ============================================================
-- 10. RLS
-- ============================================================

alter table public.warehouse_replenishment_rules
  enable row level security;

alter table public.warehouse_replenishments
  enable row level security;

alter table public.warehouse_replenishment_items
  enable row level security;

alter table public.warehouse_replenishment_demands
  enable row level security;

alter table public.warehouse_replenishment_allocations
  enable row level security;

alter table public.warehouse_replenishment_suggestions
  enable row level security;

alter table public.warehouse_replenishment_tasks
  enable row level security;

alter table public.warehouse_replenishment_exceptions
  enable row level security;

alter table public.warehouse_replenishment_performance
  enable row level security;


-- ============================================================
-- 11. Tenant-scoped member read policies
-- ============================================================

drop policy if exists
  warehouse_replenishment_rules_member_select
on public.warehouse_replenishment_rules;

create policy
  warehouse_replenishment_rules_member_select
on public.warehouse_replenishment_rules
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);


drop policy if exists
  warehouse_replenishments_member_select
on public.warehouse_replenishments;

create policy
  warehouse_replenishments_member_select
on public.warehouse_replenishments
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);


drop policy if exists
  warehouse_replenishment_items_member_select
on public.warehouse_replenishment_items;

create policy
  warehouse_replenishment_items_member_select
on public.warehouse_replenishment_items
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);


drop policy if exists
  warehouse_replenishment_demands_member_select
on public.warehouse_replenishment_demands;

create policy
  warehouse_replenishment_demands_member_select
on public.warehouse_replenishment_demands
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);


drop policy if exists
  warehouse_replenishment_allocations_member_select
on public.warehouse_replenishment_allocations;

create policy
  warehouse_replenishment_allocations_member_select
on public.warehouse_replenishment_allocations
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);


drop policy if exists
  warehouse_replenishment_suggestions_member_select
on public.warehouse_replenishment_suggestions;

create policy
  warehouse_replenishment_suggestions_member_select
on public.warehouse_replenishment_suggestions
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);


drop policy if exists
  warehouse_replenishment_tasks_member_select
on public.warehouse_replenishment_tasks;

create policy
  warehouse_replenishment_tasks_member_select
on public.warehouse_replenishment_tasks
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);


drop policy if exists
  warehouse_replenishment_exceptions_member_select
on public.warehouse_replenishment_exceptions;

create policy
  warehouse_replenishment_exceptions_member_select
on public.warehouse_replenishment_exceptions
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);


drop policy if exists
  warehouse_replenishment_performance_member_select
on public.warehouse_replenishment_performance;

create policy
  warehouse_replenishment_performance_member_select
on public.warehouse_replenishment_performance
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);


-- ============================================================
-- 12. Direct privilege boundary
-- ============================================================

revoke all
  on public.warehouse_replenishment_rules
  from anon, authenticated;

revoke all
  on public.warehouse_replenishments
  from anon, authenticated;

revoke all
  on public.warehouse_replenishment_items
  from anon, authenticated;

revoke all
  on public.warehouse_replenishment_demands
  from anon, authenticated;

revoke all
  on public.warehouse_replenishment_allocations
  from anon, authenticated;

revoke all
  on public.warehouse_replenishment_suggestions
  from anon, authenticated;

revoke all
  on public.warehouse_replenishment_tasks
  from anon, authenticated;

revoke all
  on public.warehouse_replenishment_exceptions
  from anon, authenticated;

revoke all
  on public.warehouse_replenishment_performance
  from anon, authenticated;


grant select
  on public.warehouse_replenishment_rules
  to authenticated;

grant select
  on public.warehouse_replenishments
  to authenticated;

grant select
  on public.warehouse_replenishment_items
  to authenticated;

grant select
  on public.warehouse_replenishment_demands
  to authenticated;

grant select
  on public.warehouse_replenishment_allocations
  to authenticated;

grant select
  on public.warehouse_replenishment_suggestions
  to authenticated;

grant select
  on public.warehouse_replenishment_tasks
  to authenticated;

grant select
  on public.warehouse_replenishment_exceptions
  to authenticated;

grant select
  on public.warehouse_replenishment_performance
  to authenticated;


grant all
  on public.warehouse_replenishment_rules
  to service_role;

grant all
  on public.warehouse_replenishments
  to service_role;

grant all
  on public.warehouse_replenishment_items
  to service_role;

grant all
  on public.warehouse_replenishment_demands
  to service_role;

grant all
  on public.warehouse_replenishment_allocations
  to service_role;

grant all
  on public.warehouse_replenishment_suggestions
  to service_role;

grant all
  on public.warehouse_replenishment_tasks
  to service_role;

grant all
  on public.warehouse_replenishment_exceptions
  to service_role;

grant all
  on public.warehouse_replenishment_performance
  to service_role;


-- ============================================================
-- RP-P1 explicit non-goals
-- ============================================================
--
-- No replenishment mutation function / RPC.
-- No inventory balance mutation.
-- No inventory movement mutation.
-- No inventory reservation mutation.
-- No picking / packing / shipping workflow mutation.
-- No migration-history operation.
-- ============================================================
