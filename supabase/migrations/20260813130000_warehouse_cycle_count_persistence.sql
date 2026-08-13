-- =========================================================
-- WarehouseIQ — Cycle Count Operational Persistence
-- A7.0.1
--
-- Amaç:
-- - Döngüsel sayım ana kayıtları
-- - Sayım satırları
-- - Mobil/saha sayım görevleri
--
-- Bu migration:
-- - stok düzeltme RPC'si oluşturmaz,
-- - otomatik inventory mutation yapmaz,
-- - service role kullanmaz,
-- - CycleCount domain kurallarını SQL içinde yeniden yazmaz.
-- =========================================================

-- =========================================================
-- 1. CYCLE COUNTS
-- =========================================================

create table if not exists public.warehouse_cycle_counts (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null
    references public.warehouse_accounts(id)
    on delete cascade,

  warehouse_id uuid not null,

  cycle_count_number text not null,

  strategy text not null,

  status text not null default 'draft',

  rule_id uuid,
  schedule_id uuid,

  reference_type text,
  reference_id text,
  reference_number text,

  blind_count boolean not null default false,
  freeze_inventory boolean not null default false,

  tolerance_quantity numeric(18, 6),
  tolerance_percentage numeric(9, 4),

  priority integer not null default 50,

  planned_at timestamptz,
  released_at timestamptz,
  started_at timestamptz,
  counted_at timestamptz,
  approved_at timestamptz,
  adjusted_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,

  cancellation_reason text,
  notes text,

  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_cycle_counts_number_not_blank_check
    check (btrim(cycle_count_number) <> ''),

  constraint warehouse_cycle_counts_strategy_check
    check (
      strategy in (
        'abc_classification',
        'location_based',
        'product_based',
        'lot_based',
        'serial_based',
        'random_sample',
        'risk_based',
        'value_based',
        'movement_based',
        'exception_based',
        'full_inventory',
        'blind_count'
      )
    ),

  constraint warehouse_cycle_counts_status_check
    check (
      status in (
        'draft',
        'planned',
        'released',
        'assigned',
        'in_progress',
        'counted',
        'recount_required',
        'under_review',
        'approved',
        'adjusted',
        'completed',
        'cancelled'
      )
    ),

  constraint warehouse_cycle_counts_priority_check
    check (priority >= 0 and priority <= 100),

  constraint warehouse_cycle_counts_tolerance_quantity_check
    check (
      tolerance_quantity is null
      or tolerance_quantity >= 0
    ),

  constraint warehouse_cycle_counts_tolerance_percentage_check
    check (
      tolerance_percentage is null
      or tolerance_percentage >= 0
    ),

  constraint warehouse_cycle_counts_account_number_unique
    unique (account_id, cycle_count_number),

  constraint warehouse_cycle_counts_account_id_id_unique
    unique (account_id, id),

  constraint warehouse_cycle_counts_account_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
);

create index if not exists warehouse_cycle_counts_status_idx
  on public.warehouse_cycle_counts (
    account_id,
    warehouse_id,
    status
  );

create index if not exists warehouse_cycle_counts_planned_idx
  on public.warehouse_cycle_counts (
    account_id,
    warehouse_id,
    planned_at
  )
  where planned_at is not null;

create index if not exists warehouse_cycle_counts_reference_idx
  on public.warehouse_cycle_counts (
    account_id,
    reference_type,
    reference_id
  )
  where reference_type is not null
    and reference_id is not null;

create index if not exists warehouse_cycle_counts_created_idx
  on public.warehouse_cycle_counts (
    account_id,
    created_at desc
  );

-- =========================================================
-- 2. CYCLE COUNT ITEMS
-- =========================================================

create table if not exists public.warehouse_cycle_count_items (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null
    references public.warehouse_accounts(id)
    on delete cascade,

  cycle_count_id uuid not null,

  line_number integer not null,

  warehouse_id uuid not null,
  location_id uuid not null,
  product_id uuid not null,
  sku_id uuid,

  inventory_balance_id uuid,

  stock_status text,

  -- InventoryTracking domain nesnesi storage katmanında
  -- şema-bağımsız biçimde korunur.
  tracking jsonb,

  unit text not null,

  status text not null default 'pending',

  blind_count boolean not null default false,

  expected_quantity numeric(18, 6) not null,
  first_count_quantity numeric(18, 6),
  second_count_quantity numeric(18, 6),
  final_count_quantity numeric(18, 6),

  damaged_quantity numeric(18, 6) not null default 0,

  variance_quantity numeric(18, 6),
  variance_percentage numeric(12, 6),
  variance_value numeric(18, 6),

  unit_cost numeric(18, 6),
  currency text,

  tolerance_quantity numeric(18, 6),
  tolerance_percentage numeric(9, 4),

  recount_required boolean not null default false,
  adjustment_required boolean not null default false,

  counted_by uuid,
  counted_at timestamptz,

  recounted_by uuid,
  recounted_at timestamptz,

  approved_by uuid,
  approved_at timestamptz,

  notes text,

  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_cycle_count_items_line_check
    check (line_number > 0),

  constraint warehouse_cycle_count_items_unit_not_blank_check
    check (btrim(unit) <> ''),

  constraint warehouse_cycle_count_items_status_check
    check (
      status in (
        'pending',
        'assigned',
        'in_progress',
        'counted',
        'recount_required',
        'under_review',
        'approved',
        'adjusted',
        'cancelled'
      )
    ),

  constraint warehouse_cycle_count_items_expected_quantity_check
    check (expected_quantity >= 0),

  constraint warehouse_cycle_count_items_damaged_quantity_check
    check (damaged_quantity >= 0),

  constraint warehouse_cycle_count_items_count_quantities_check
    check (
      (first_count_quantity is null or first_count_quantity >= 0)
      and
      (second_count_quantity is null or second_count_quantity >= 0)
      and
      (final_count_quantity is null or final_count_quantity >= 0)
    ),

  constraint warehouse_cycle_count_items_tolerance_quantity_check
    check (
      tolerance_quantity is null
      or tolerance_quantity >= 0
    ),

  constraint warehouse_cycle_count_items_tolerance_percentage_check
    check (
      tolerance_percentage is null
      or tolerance_percentage >= 0
    ),

  constraint warehouse_cycle_count_items_currency_check
    check (
      currency is null
      or char_length(currency) = 3
    ),

  constraint warehouse_cycle_count_items_account_count_line_unique
    unique (
      account_id,
      cycle_count_id,
      line_number
    ),

  constraint warehouse_cycle_count_items_account_count_id_unique
    unique (
      account_id,
      cycle_count_id,
      id
    ),

  constraint warehouse_cycle_count_items_count_fk
    foreign key (
      account_id,
      cycle_count_id
    )
    references public.warehouse_cycle_counts(
      account_id,
      id
    )
    on delete cascade,

  constraint warehouse_cycle_count_items_warehouse_fk
    foreign key (
      account_id,
      warehouse_id
    )
    references public.warehouses(
      account_id,
      id
    ),

  constraint warehouse_cycle_count_items_location_fk
    foreign key (
      account_id,
      warehouse_id,
      location_id
    )
    references public.warehouse_locations(
      account_id,
      warehouse_id,
      id
    ),

  constraint warehouse_cycle_count_items_product_fk
    foreign key (
      account_id,
      product_id
    )
    references public.warehouse_products(
      account_id,
      id
    ),

  constraint warehouse_cycle_count_items_sku_fk
    foreign key (
      account_id,
      product_id,
      sku_id
    )
    references public.warehouse_product_skus(
      account_id,
      product_id,
      id
    )
);

create index if not exists warehouse_cycle_count_items_status_idx
  on public.warehouse_cycle_count_items (
    account_id,
    cycle_count_id,
    status
  );

create index if not exists warehouse_cycle_count_items_location_idx
  on public.warehouse_cycle_count_items (
    account_id,
    warehouse_id,
    location_id
  );

create index if not exists warehouse_cycle_count_items_product_idx
  on public.warehouse_cycle_count_items (
    account_id,
    product_id,
    sku_id
  );

create index if not exists warehouse_cycle_count_items_recount_idx
  on public.warehouse_cycle_count_items (
    account_id,
    cycle_count_id,
    recount_required
  )
  where recount_required = true;

-- =========================================================
-- 3. CYCLE COUNT TASKS
-- =========================================================

create table if not exists public.warehouse_cycle_count_tasks (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null
    references public.warehouse_accounts(id)
    on delete cascade,

  cycle_count_id uuid not null,
  cycle_count_item_id uuid,

  warehouse_id uuid not null,

  location_id uuid,
  product_id uuid,

  type text not null,
  status text not null default 'pending',

  priority integer not null default 50,
  sequence integer not null default 1,

  assigned_user_id uuid,

  -- Domain model bu kimlikleri storage bağımsız string olarak
  -- tanımladığı için henüz harici FK zorlanmaz.
  assigned_team_id text,
  assigned_equipment_id text,

  planned_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,

  notes text,

  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_cycle_count_tasks_type_check
    check (
      type in (
        'count_location',
        'count_product',
        'count_lot',
        'count_serial',
        'blind_count',
        'recount',
        'variance_review',
        'adjustment_review'
      )
    ),

  constraint warehouse_cycle_count_tasks_status_check
    check (
      status in (
        'pending',
        'assigned',
        'in_progress',
        'completed',
        'cancelled'
      )
    ),

  constraint warehouse_cycle_count_tasks_priority_check
    check (priority >= 0 and priority <= 100),

  constraint warehouse_cycle_count_tasks_sequence_check
    check (sequence > 0),

  constraint warehouse_cycle_count_tasks_account_count_id_unique
    unique (
      account_id,
      cycle_count_id,
      id
    ),

  constraint warehouse_cycle_count_tasks_count_fk
    foreign key (
      account_id,
      cycle_count_id
    )
    references public.warehouse_cycle_counts(
      account_id,
      id
    )
    on delete cascade,

  constraint warehouse_cycle_count_tasks_item_fk
    foreign key (
      account_id,
      cycle_count_id,
      cycle_count_item_id
    )
    references public.warehouse_cycle_count_items(
      account_id,
      cycle_count_id,
      id
    )
    on delete cascade,

  constraint warehouse_cycle_count_tasks_warehouse_fk
    foreign key (
      account_id,
      warehouse_id
    )
    references public.warehouses(
      account_id,
      id
    )
);

create index if not exists warehouse_cycle_count_tasks_status_idx
  on public.warehouse_cycle_count_tasks (
    account_id,
    warehouse_id,
    status
  );

create index if not exists warehouse_cycle_count_tasks_assignee_idx
  on public.warehouse_cycle_count_tasks (
    account_id,
    assigned_user_id,
    status
  )
  where assigned_user_id is not null;

create index if not exists warehouse_cycle_count_tasks_sequence_idx
  on public.warehouse_cycle_count_tasks (
    account_id,
    cycle_count_id,
    sequence,
    priority desc
  );

-- =========================================================
-- 4. UPDATED_AT
-- =========================================================

create or replace function public.warehouse_cycle_count_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all
on function public.warehouse_cycle_count_touch_updated_at()
from public;

drop trigger if exists trg_warehouse_cycle_counts_updated_at
  on public.warehouse_cycle_counts;

create trigger trg_warehouse_cycle_counts_updated_at
before update on public.warehouse_cycle_counts
for each row
execute function public.warehouse_cycle_count_touch_updated_at();

drop trigger if exists trg_warehouse_cycle_count_items_updated_at
  on public.warehouse_cycle_count_items;

create trigger trg_warehouse_cycle_count_items_updated_at
before update on public.warehouse_cycle_count_items
for each row
execute function public.warehouse_cycle_count_touch_updated_at();

drop trigger if exists trg_warehouse_cycle_count_tasks_updated_at
  on public.warehouse_cycle_count_tasks;

create trigger trg_warehouse_cycle_count_tasks_updated_at
before update on public.warehouse_cycle_count_tasks
for each row
execute function public.warehouse_cycle_count_touch_updated_at();

-- =========================================================
-- 5. ROW LEVEL SECURITY
-- =========================================================

alter table public.warehouse_cycle_counts
  enable row level security;

alter table public.warehouse_cycle_count_items
  enable row level security;

alter table public.warehouse_cycle_count_tasks
  enable row level security;

-- ---------------------------------------------------------
-- Cycle Counts
-- ---------------------------------------------------------

drop policy if exists warehouse_cycle_counts_member_select
  on public.warehouse_cycle_counts;

create policy warehouse_cycle_counts_member_select
on public.warehouse_cycle_counts
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);

drop policy if exists warehouse_cycle_counts_manager_insert
  on public.warehouse_cycle_counts;

create policy warehouse_cycle_counts_manager_insert
on public.warehouse_cycle_counts
for insert
to authenticated
with check (
  public.warehouse_has_account_role(
    account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager',
      'supervisor',
      'inventory_controller'
    ]::text[]
  )
);

drop policy if exists warehouse_cycle_counts_manager_update
  on public.warehouse_cycle_counts;

create policy warehouse_cycle_counts_manager_update
on public.warehouse_cycle_counts
for update
to authenticated
using (
  public.warehouse_has_account_role(
    account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager',
      'supervisor',
      'inventory_controller'
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
      'inventory_controller'
    ]::text[]
  )
);

drop policy if exists warehouse_cycle_counts_manager_delete
  on public.warehouse_cycle_counts;

create policy warehouse_cycle_counts_manager_delete
on public.warehouse_cycle_counts
for delete
to authenticated
using (
  public.warehouse_has_account_role(
    account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager'
    ]::text[]
  )
);

-- ---------------------------------------------------------
-- Cycle Count Items
-- ---------------------------------------------------------

drop policy if exists warehouse_cycle_count_items_member_select
  on public.warehouse_cycle_count_items;

create policy warehouse_cycle_count_items_member_select
on public.warehouse_cycle_count_items
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);

drop policy if exists warehouse_cycle_count_items_manager_insert
  on public.warehouse_cycle_count_items;

create policy warehouse_cycle_count_items_manager_insert
on public.warehouse_cycle_count_items
for insert
to authenticated
with check (
  public.warehouse_has_account_role(
    account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager',
      'supervisor',
      'inventory_controller'
    ]::text[]
  )
);

drop policy if exists warehouse_cycle_count_items_manager_update
  on public.warehouse_cycle_count_items;

create policy warehouse_cycle_count_items_manager_update
on public.warehouse_cycle_count_items
for update
to authenticated
using (
  public.warehouse_has_account_role(
    account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager',
      'supervisor',
      'inventory_controller'
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
      'inventory_controller'
    ]::text[]
  )
);

drop policy if exists warehouse_cycle_count_items_manager_delete
  on public.warehouse_cycle_count_items;

create policy warehouse_cycle_count_items_manager_delete
on public.warehouse_cycle_count_items
for delete
to authenticated
using (
  public.warehouse_has_account_role(
    account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager'
    ]::text[]
  )
);

-- ---------------------------------------------------------
-- Cycle Count Tasks
-- ---------------------------------------------------------

drop policy if exists warehouse_cycle_count_tasks_member_select
  on public.warehouse_cycle_count_tasks;

create policy warehouse_cycle_count_tasks_member_select
on public.warehouse_cycle_count_tasks
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);

drop policy if exists warehouse_cycle_count_tasks_manager_insert
  on public.warehouse_cycle_count_tasks;

create policy warehouse_cycle_count_tasks_manager_insert
on public.warehouse_cycle_count_tasks
for insert
to authenticated
with check (
  public.warehouse_has_account_role(
    account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager',
      'supervisor',
      'inventory_controller'
    ]::text[]
  )
);

drop policy if exists warehouse_cycle_count_tasks_manager_update
  on public.warehouse_cycle_count_tasks;

create policy warehouse_cycle_count_tasks_manager_update
on public.warehouse_cycle_count_tasks
for update
to authenticated
using (
  public.warehouse_has_account_role(
    account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager',
      'supervisor',
      'inventory_controller'
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
      'inventory_controller'
    ]::text[]
  )
);

drop policy if exists warehouse_cycle_count_tasks_manager_delete
  on public.warehouse_cycle_count_tasks;

create policy warehouse_cycle_count_tasks_manager_delete
on public.warehouse_cycle_count_tasks
for delete
to authenticated
using (
  public.warehouse_has_account_role(
    account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager'
    ]::text[]
  )
);

-- =========================================================
-- 6. PRIVILEGES
-- =========================================================

grant select
on public.warehouse_cycle_counts,
   public.warehouse_cycle_count_items,
   public.warehouse_cycle_count_tasks
to authenticated;

grant insert, update, delete
on public.warehouse_cycle_counts,
   public.warehouse_cycle_count_items,
   public.warehouse_cycle_count_tasks
to authenticated;

-- =========================================================
-- A7.0.1 güvenlik sınırı:
-- Bu migration içinde stok hareketi, stok bakiyesi,
-- adjustment posting veya otomatik sayım sonucu write yoktur.
-- =========================================================
