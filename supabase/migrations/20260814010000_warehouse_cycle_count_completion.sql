-- =========================================================
-- WarehouseIQ — Cycle Count Completion Persistence
-- Adjustment + Approval + Immutable Completion Report
-- =========================================================

alter table public.warehouse_cycle_count_write_requests
  drop constraint if exists
    warehouse_cycle_count_write_requests_action_check;

alter table public.warehouse_cycle_count_write_requests
  add constraint
    warehouse_cycle_count_write_requests_action_check
  check (
    action in (
      'record_quantity',
      'evaluate_first_count',
      'record_recount_quantity',
      'evaluate_recount',
      'approve_count',
      'prepare_adjustments',
      'approve_adjustments',
      'reject_adjustments',
      'process_adjustments',
      'complete_count'
    )
  );

-- =========================================================
-- ADJUSTMENTS
-- =========================================================

create table if not exists
  public.warehouse_cycle_count_adjustments (
    id uuid primary key default gen_random_uuid(),

    account_id uuid not null
      references public.warehouse_accounts(id)
      on delete cascade,

    cycle_count_id uuid not null,
    cycle_count_item_id uuid not null,
    result_id uuid not null,

    type text not null,
    status text not null default 'pending',

    warehouse_id uuid not null,
    location_id uuid not null,
    product_id uuid not null,
    sku_id uuid,

    quantity numeric(18, 6) not null,
    unit text not null,

    previous_quantity numeric(18, 6) not null,
    adjusted_quantity numeric(18, 6) not null,

    stock_status text,
    target_stock_status text,

    inventory_movement_id uuid,

    external_system text,
    external_reference_id text,
    failure_reason text,

    requested_by uuid not null,
    requested_at timestamptz not null default now(),

    approved_by uuid,
    approved_at timestamptz,

    processed_by uuid,
    processed_at timestamptz,

    notes text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint warehouse_cycle_count_adjustments_type_check
      check (
        type in (
          'increase',
          'decrease',
          'damage',
          'stock_status_change'
        )
      ),

    constraint warehouse_cycle_count_adjustments_status_check
      check (
        status in (
          'pending',
          'approval_required',
          'approved',
          'processing',
          'completed',
          'failed',
          'cancelled'
        )
      ),

    constraint warehouse_cycle_count_adjustments_quantity_check
      check (quantity >= 0),

    constraint warehouse_cycle_count_adjustments_previous_quantity_check
      check (previous_quantity >= 0),

    constraint warehouse_cycle_count_adjustments_adjusted_quantity_check
      check (adjusted_quantity >= 0),

    constraint warehouse_cycle_count_adjustments_unit_check
      check (btrim(unit) <> ''),

    constraint warehouse_cycle_count_adjustments_count_fk
      foreign key (
        account_id,
        cycle_count_id
      )
      references public.warehouse_cycle_counts(
        account_id,
        id
      )
      on delete cascade,

    constraint warehouse_cycle_count_adjustments_item_fk
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

    constraint warehouse_cycle_count_adjustments_result_fk
      foreign key (result_id)
      references public.warehouse_cycle_count_results(id)
      on delete restrict,

    constraint warehouse_cycle_count_adjustments_warehouse_fk
      foreign key (
        account_id,
        warehouse_id
      )
      references public.warehouses(
        account_id,
        id
      ),

    constraint warehouse_cycle_count_adjustments_location_fk
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

    constraint warehouse_cycle_count_adjustments_product_fk
      foreign key (
        account_id,
        product_id
      )
      references public.warehouse_products(
        account_id,
        id
      )
  );

create index if not exists
  warehouse_cycle_count_adjustments_count_idx
  on public.warehouse_cycle_count_adjustments (
    account_id,
    cycle_count_id,
    status,
    created_at desc
  );

create index if not exists
  warehouse_cycle_count_adjustments_item_idx
  on public.warehouse_cycle_count_adjustments (
    account_id,
    cycle_count_item_id,
    status
  );

create unique index if not exists
  warehouse_cycle_count_adjustments_active_item_uidx
  on public.warehouse_cycle_count_adjustments (
    account_id,
    cycle_count_item_id
  )
  where status not in (
    'failed',
    'cancelled',
    'completed'
  );

-- =========================================================
-- APPROVALS
-- =========================================================

create table if not exists
  public.warehouse_cycle_count_approvals (
    id uuid primary key default gen_random_uuid(),

    account_id uuid not null
      references public.warehouse_accounts(id)
      on delete cascade,

    cycle_count_id uuid not null,
    cycle_count_item_id uuid,
    adjustment_id uuid,

    status text not null default 'pending',
    level integer not null default 1,

    requested_by uuid not null,
    requested_at timestamptz not null default now(),

    approver_role text,
    approver_id uuid,

    approved_by uuid,
    approved_at timestamptz,

    rejected_by uuid,
    rejected_at timestamptz,
    rejection_reason text,

    notes text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint warehouse_cycle_count_approvals_status_check
      check (
        status in (
          'pending',
          'approved',
          'rejected',
          'cancelled'
        )
      ),

    constraint warehouse_cycle_count_approvals_level_check
      check (level > 0),

    constraint warehouse_cycle_count_approvals_count_fk
      foreign key (
        account_id,
        cycle_count_id
      )
      references public.warehouse_cycle_counts(
        account_id,
        id
      )
      on delete cascade,

    constraint warehouse_cycle_count_approvals_item_fk
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

    constraint warehouse_cycle_count_approvals_adjustment_fk
      foreign key (adjustment_id)
      references public.warehouse_cycle_count_adjustments(id)
      on delete cascade
  );

create index if not exists
  warehouse_cycle_count_approvals_count_idx
  on public.warehouse_cycle_count_approvals (
    account_id,
    cycle_count_id,
    status,
    requested_at desc
  );

create unique index if not exists
  warehouse_cycle_count_approvals_pending_adjustment_uidx
  on public.warehouse_cycle_count_approvals (
    account_id,
    adjustment_id
  )
  where
    adjustment_id is not null
    and status = 'pending';

-- =========================================================
-- IMMUTABLE COMPLETION REPORT
-- =========================================================

create table if not exists
  public.warehouse_cycle_count_reports (
    id uuid primary key default gen_random_uuid(),

    account_id uuid not null
      references public.warehouse_accounts(id)
      on delete cascade,

    warehouse_id uuid not null,
    cycle_count_id uuid not null,

    cycle_count_number text not null,
    strategy text not null,
    status text not null,

    summary jsonb not null,
    items jsonb not null,

    generated_by uuid not null,
    generated_at timestamptz not null default now(),

    constraint warehouse_cycle_count_reports_number_check
      check (btrim(cycle_count_number) <> ''),

    constraint warehouse_cycle_count_reports_summary_check
      check (jsonb_typeof(summary) = 'object'),

    constraint warehouse_cycle_count_reports_items_check
      check (jsonb_typeof(items) = 'array'),

    constraint warehouse_cycle_count_reports_status_check
      check (status = 'completed'),

    constraint warehouse_cycle_count_reports_count_fk
      foreign key (
        account_id,
        cycle_count_id
      )
      references public.warehouse_cycle_counts(
        account_id,
        id
      )
      on delete cascade,

    constraint warehouse_cycle_count_reports_warehouse_fk
      foreign key (
        account_id,
        warehouse_id
      )
      references public.warehouses(
        account_id,
        id
      ),

    constraint warehouse_cycle_count_reports_count_unique
      unique (
        account_id,
        cycle_count_id
      )
  );

create index if not exists
  warehouse_cycle_count_reports_warehouse_idx
  on public.warehouse_cycle_count_reports (
    account_id,
    warehouse_id,
    generated_at desc
  );

-- =========================================================
-- RLS + DIRECT ACCESS CLOSED
-- =========================================================

alter table
  public.warehouse_cycle_count_adjustments
  enable row level security;

alter table
  public.warehouse_cycle_count_approvals
  enable row level security;

alter table
  public.warehouse_cycle_count_reports
  enable row level security;

revoke all
  on table public.warehouse_cycle_count_adjustments
  from public;

revoke all
  on table public.warehouse_cycle_count_adjustments
  from anon;

revoke all
  on table public.warehouse_cycle_count_adjustments
  from authenticated;

revoke all
  on table public.warehouse_cycle_count_approvals
  from public;

revoke all
  on table public.warehouse_cycle_count_approvals
  from anon;

revoke all
  on table public.warehouse_cycle_count_approvals
  from authenticated;

revoke all
  on table public.warehouse_cycle_count_reports
  from public;

revoke all
  on table public.warehouse_cycle_count_reports
  from anon;

revoke all
  on table public.warehouse_cycle_count_reports
  from authenticated;

-- =========================================================
-- BOUNDARY
-- =========================================================
--
-- Bu migration yalnız persistence + action contract sağlar.
-- Inventory mutation yalnız sonraki SECURITY DEFINER lifecycle
-- RPC içinde, caller JWT + rol + idempotency + FOR UPDATE ile yapılır.
-- Browser doğrudan bu üç tabloya yazamaz veya okuyamaz.
-- =========================================================
