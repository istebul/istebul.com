-- =========================================================
-- WarehouseIQ — A7.3.0.1
-- Cycle Count variance / recount persistence foundation
-- =========================================================
--
-- Amaç:
-- - CycleCountResult domain kayıtlarını kalıcılaştırmak.
-- - CycleCountException domain kayıtlarını kalıcılaştırmak.
-- - İlk sayım ve yeniden sayım değerlendirmelerini ayrı,
--   audit edilebilir persistence kayıtları olarak saklamak.
--
-- Kritik invariant:
-- - expected_quantity, Cycle Count item oluşturulurken alınmış
--   sayım snapshot değeridir.
-- - A7.3 değerlendirmesi canlı stok bakiyesini yeniden okuyup
--   expected_quantity değerini değiştirmez.
-- - Bu migration inventory balance veya ledger mutation yapmaz.
-- - Bu migration evaluation/recount RPC oluşturmaz.
-- - Bu migration adjustment veya approval persistence oluşturmaz.
-- =========================================================

create table if not exists public.warehouse_cycle_count_results (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null
    references public.warehouse_accounts(id)
    on delete cascade,

  cycle_count_id uuid not null,
  cycle_count_item_id uuid not null,

  evaluation_stage text not null,

  type text not null,

  expected_quantity numeric(18, 6) not null,
  counted_quantity numeric(18, 6) not null,
  damaged_quantity numeric(18, 6) not null default 0,

  variance_quantity numeric(18, 6) not null,
  variance_percentage numeric(12, 6) not null,
  variance_value numeric(18, 6),

  within_tolerance boolean not null,
  recount_required boolean not null,
  adjustment_required boolean not null,

  calculated_at timestamptz not null default now(),

  constraint warehouse_cycle_count_results_stage_check
    check (
      evaluation_stage in (
        'first_count',
        'recount'
      )
    ),

  constraint warehouse_cycle_count_results_type_check
    check (
      type in (
        'match',
        'shortage',
        'surplus',
        'damaged',
        'unexpected_stock',
        'missing_stock',
        'recount_required'
      )
    ),

  constraint warehouse_cycle_count_results_expected_quantity_check
    check (expected_quantity >= 0),

  constraint warehouse_cycle_count_results_counted_quantity_check
    check (counted_quantity >= 0),

  constraint warehouse_cycle_count_results_damaged_quantity_check
    check (damaged_quantity >= 0),

  constraint warehouse_cycle_count_results_variance_value_check
    check (
      variance_value is null
      or variance_value >= 0
    ),

  constraint warehouse_cycle_count_results_item_stage_unique
    unique (
      account_id,
      cycle_count_item_id,
      evaluation_stage
    ),

  constraint warehouse_cycle_count_results_count_fk
    foreign key (
      account_id,
      cycle_count_id
    )
    references public.warehouse_cycle_counts(
      account_id,
      id
    )
    on delete cascade,

  constraint warehouse_cycle_count_results_item_fk
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
    on delete cascade
);

create index if not exists warehouse_cycle_count_results_count_idx
  on public.warehouse_cycle_count_results (
    account_id,
    cycle_count_id,
    calculated_at desc
  );

create index if not exists warehouse_cycle_count_results_item_idx
  on public.warehouse_cycle_count_results (
    account_id,
    cycle_count_item_id,
    evaluation_stage
  );

create table if not exists public.warehouse_cycle_count_exceptions (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null
    references public.warehouse_accounts(id)
    on delete cascade,

  cycle_count_id uuid not null,
  cycle_count_item_id uuid,
  task_id uuid,

  warehouse_id uuid,
  location_id uuid,
  product_id uuid,

  lot_number text,
  serial_number text,

  type text not null,
  message text not null,

  resolved boolean not null default false,
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_notes text,

  created_at timestamptz not null default now(),

  constraint warehouse_cycle_count_exceptions_type_check
    check (
      type in (
        'location_not_found',
        'location_blocked',
        'product_not_found',
        'barcode_mismatch',
        'lot_mismatch',
        'serial_number_mismatch',
        'unexpected_product',
        'missing_stock',
        'excess_stock',
        'damaged_stock',
        'unit_mismatch',
        'variance_exceeded',
        'recount_required',
        'count_interrupted',
        'inventory_movement_detected',
        'approval_required',
        'adjustment_failed'
      )
    ),

  constraint warehouse_cycle_count_exceptions_message_check
    check (btrim(message) <> ''),

  constraint warehouse_cycle_count_exceptions_location_scope_check
    check (
      location_id is null
      or warehouse_id is not null
    ),

  constraint warehouse_cycle_count_exceptions_resolution_check
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

  constraint warehouse_cycle_count_exceptions_count_fk
    foreign key (
      account_id,
      cycle_count_id
    )
    references public.warehouse_cycle_counts(
      account_id,
      id
    )
    on delete cascade,

  constraint warehouse_cycle_count_exceptions_item_fk
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

  constraint warehouse_cycle_count_exceptions_task_fk
    foreign key (
      account_id,
      cycle_count_id,
      task_id
    )
    references public.warehouse_cycle_count_tasks(
      account_id,
      cycle_count_id,
      id
    )
    on delete cascade,

  constraint warehouse_cycle_count_exceptions_warehouse_fk
    foreign key (
      account_id,
      warehouse_id
    )
    references public.warehouses(
      account_id,
      id
    ),

  constraint warehouse_cycle_count_exceptions_location_fk
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

  constraint warehouse_cycle_count_exceptions_product_fk
    foreign key (
      account_id,
      product_id
    )
    references public.warehouse_products(
      account_id,
      id
    )
);

create index if not exists warehouse_cycle_count_exceptions_count_idx
  on public.warehouse_cycle_count_exceptions (
    account_id,
    cycle_count_id,
    resolved,
    created_at desc
  );

create index if not exists warehouse_cycle_count_exceptions_item_idx
  on public.warehouse_cycle_count_exceptions (
    account_id,
    cycle_count_item_id,
    resolved,
    created_at desc
  )
  where cycle_count_item_id is not null;

create unique index if not exists warehouse_cycle_count_exceptions_open_item_type_uidx
  on public.warehouse_cycle_count_exceptions (
    account_id,
    cycle_count_item_id,
    type
  )
  where
    resolved = false
    and cycle_count_item_id is not null;

alter table public.warehouse_cycle_count_results
  enable row level security;

alter table public.warehouse_cycle_count_exceptions
  enable row level security;

drop policy if exists warehouse_cycle_count_results_member_select
  on public.warehouse_cycle_count_results;

drop policy if exists warehouse_cycle_count_exceptions_member_select
  on public.warehouse_cycle_count_exceptions;

-- Kör sayım invariantı:
-- Result ve Exception kayıtları hassas değerlendirme verisi taşır.
-- Uygulama istemcileri bu tablolara doğrudan REST/SELECT yapmaz.
-- Sonraki kontrollü API/RPC yüzeyi yalnız güvenli alanları açacaktır.

revoke all
on table public.warehouse_cycle_count_results
from anon;

revoke all
on table public.warehouse_cycle_count_exceptions
from anon;

revoke all
on table public.warehouse_cycle_count_results
from authenticated;

revoke all
on table public.warehouse_cycle_count_exceptions
from authenticated;
