-- WarehouseIQ Operasyon Kalıcılığı
-- Dashboard snapshot, operasyon istisnası ve süreç hacmi kayıtları.

create table if not exists public.warehouse_operations_dashboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.warehouse_accounts(id) on delete cascade,
  warehouse_id uuid,
  period_start timestamptz not null,
  period_end timestamptz not null,
  total_orders integer not null default 0,
  completed_orders integer not null default 0,
  on_time_orders integer not null default 0,
  delayed_orders integer not null default 0,
  total_tasks integer not null default 0,
  completed_tasks integer not null default 0,
  exception_tasks integer not null default 0,
  total_inventory_checks integer not null default 0,
  accurate_inventory_checks integer not null default 0,
  used_capacity numeric(18,3) not null default 0,
  total_capacity numeric(18,3) not null default 0,
  productive_minutes integer not null default 0,
  available_labor_minutes integer not null default 0,
  requested_items numeric(18,3) not null default 0,
  fulfilled_items numeric(18,3) not null default 0,
  short_items numeric(18,3) not null default 0,
  order_completion_rate numeric(7,4) not null default 0,
  on_time_dispatch_rate numeric(7,4) not null default 0,
  task_completion_rate numeric(7,4) not null default 0,
  task_exception_rate numeric(7,4) not null default 0,
  inventory_accuracy_rate numeric(7,4) not null default 0,
  capacity_utilization_rate numeric(7,4) not null default 0,
  labor_utilization_rate numeric(7,4) not null default 0,
  item_fulfillment_rate numeric(7,4) not null default 0,
  short_pick_rate numeric(7,4) not null default 0,
  health_score numeric(7,4) not null default 0,
  health_status text not null,
  kpis jsonb not null default '[]'::jsonb,
  alerts jsonb not null default '[]'::jsonb,
  calculated_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint warehouse_operations_dashboard_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id) on delete cascade,
  constraint warehouse_operations_dashboard_period_check
    check (period_start <= period_end),
  constraint warehouse_operations_dashboard_health_status_check
    check (health_status in ('healthy','attention','critical')),
  constraint warehouse_operations_dashboard_nonnegative_counts_check
    check (
      total_orders >= 0 and completed_orders >= 0 and on_time_orders >= 0 and delayed_orders >= 0
      and total_tasks >= 0 and completed_tasks >= 0 and exception_tasks >= 0
      and total_inventory_checks >= 0 and accurate_inventory_checks >= 0
      and used_capacity >= 0 and total_capacity >= 0
      and productive_minutes >= 0 and available_labor_minutes >= 0
      and requested_items >= 0 and fulfilled_items >= 0 and short_items >= 0
    ),
  constraint warehouse_operations_dashboard_rates_check
    check (
      order_completion_rate between 0 and 100
      and on_time_dispatch_rate between 0 and 100
      and task_completion_rate between 0 and 100
      and task_exception_rate between 0 and 100
      and inventory_accuracy_rate between 0 and 100
      and capacity_utilization_rate between 0 and 100
      and labor_utilization_rate between 0 and 100
      and item_fulfillment_rate between 0 and 100
      and short_pick_rate between 0 and 100
      and health_score between 0 and 100
    ),
  constraint warehouse_operations_dashboard_kpis_array_check
    check (jsonb_typeof(kpis) = 'array'),
  constraint warehouse_operations_dashboard_alerts_array_check
    check (jsonb_typeof(alerts) = 'array')
);

create table if not exists public.warehouse_operations_exceptions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.warehouse_accounts(id) on delete cascade,
  warehouse_id uuid,
  process text not null,
  category text not null,
  code text not null,
  severity text not null,
  root_cause text not null,
  description text not null,
  occurred_at timestamptz not null,
  resolved_at timestamptz,
  resolution_note text,
  delay_minutes integer not null default 0,
  impacted_orders integer not null default 0,
  impacted_tasks integer not null default 0,
  impacted_items numeric(18,3) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint warehouse_operations_exceptions_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id) on delete cascade,
  constraint warehouse_operations_exceptions_process_check
    check (process in ('receiving','quality_control','putaway','replenishment','picking','wave_planning','packing','shipping','cycle_count','inventory')),
  constraint warehouse_operations_exceptions_category_check
    check (category in ('delay','quality','inventory','capacity','equipment','labor','system','carrier','other')),
  constraint warehouse_operations_exceptions_severity_check
    check (severity in ('info','warning','critical')),
  constraint warehouse_operations_exceptions_code_not_blank_check
    check (length(btrim(code)) > 0),
  constraint warehouse_operations_exceptions_root_cause_not_blank_check
    check (length(btrim(root_cause)) > 0),
  constraint warehouse_operations_exceptions_description_not_blank_check
    check (length(btrim(description)) > 0),
  constraint warehouse_operations_exceptions_resolution_time_check
    check (resolved_at is null or resolved_at >= occurred_at),
  constraint warehouse_operations_exceptions_nonnegative_impact_check
    check (delay_minutes >= 0 and impacted_orders >= 0 and impacted_tasks >= 0 and impacted_items >= 0)
);

create table if not exists public.warehouse_operations_process_volumes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.warehouse_accounts(id) on delete cascade,
  warehouse_id uuid,
  period_start timestamptz not null,
  period_end timestamptz not null,
  process text not null,
  operation_count integer not null default 0,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint warehouse_operations_process_volumes_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id) on delete cascade,
  constraint warehouse_operations_process_volumes_period_check
    check (period_start <= period_end),
  constraint warehouse_operations_process_volumes_process_check
    check (process in ('receiving','quality_control','putaway','replenishment','picking','wave_planning','packing','shipping','cycle_count','inventory')),
  constraint warehouse_operations_process_volumes_count_check
    check (operation_count >= 0),
  constraint warehouse_operations_process_volumes_unique
    unique nulls not distinct (account_id, warehouse_id, period_start, period_end, process)
);

create index if not exists warehouse_operations_dashboard_latest_idx
  on public.warehouse_operations_dashboard_snapshots (account_id, warehouse_id, calculated_at desc);
create index if not exists warehouse_operations_dashboard_period_idx
  on public.warehouse_operations_dashboard_snapshots (account_id, warehouse_id, period_start, period_end);
create index if not exists warehouse_operations_exceptions_period_idx
  on public.warehouse_operations_exceptions (account_id, warehouse_id, occurred_at desc);
create index if not exists warehouse_operations_exceptions_open_idx
  on public.warehouse_operations_exceptions (account_id, warehouse_id, severity, occurred_at desc)
  where resolved_at is null;
create index if not exists warehouse_operations_exceptions_process_idx
  on public.warehouse_operations_exceptions (account_id, warehouse_id, process, occurred_at desc);
create index if not exists warehouse_operations_process_volumes_period_idx
  on public.warehouse_operations_process_volumes (account_id, warehouse_id, period_start, period_end);

drop trigger if exists trg_warehouse_operations_exceptions_updated_at
  on public.warehouse_operations_exceptions;
create trigger trg_warehouse_operations_exceptions_updated_at
before update on public.warehouse_operations_exceptions
for each row execute function public.warehouse_set_updated_at();

alter table public.warehouse_operations_dashboard_snapshots enable row level security;
alter table public.warehouse_operations_exceptions enable row level security;
alter table public.warehouse_operations_process_volumes enable row level security;

drop policy if exists warehouse_operations_dashboard_member_select on public.warehouse_operations_dashboard_snapshots;
create policy warehouse_operations_dashboard_member_select
on public.warehouse_operations_dashboard_snapshots
for select to authenticated
using (public.warehouse_has_account_access(account_id));

drop policy if exists warehouse_operations_exceptions_member_select on public.warehouse_operations_exceptions;
create policy warehouse_operations_exceptions_member_select
on public.warehouse_operations_exceptions
for select to authenticated
using (public.warehouse_has_account_access(account_id));

drop policy if exists warehouse_operations_process_volumes_member_select on public.warehouse_operations_process_volumes;
create policy warehouse_operations_process_volumes_member_select
on public.warehouse_operations_process_volumes
for select to authenticated
using (public.warehouse_has_account_access(account_id));

drop policy if exists warehouse_operations_dashboard_manager_insert on public.warehouse_operations_dashboard_snapshots;
create policy warehouse_operations_dashboard_manager_insert
on public.warehouse_operations_dashboard_snapshots
for insert to authenticated
with check (public.warehouse_has_account_role(account_id, array['owner','admin','warehouse_manager','supervisor']::text[]));

drop policy if exists warehouse_operations_exceptions_operator_insert on public.warehouse_operations_exceptions;
create policy warehouse_operations_exceptions_operator_insert
on public.warehouse_operations_exceptions
for insert to authenticated
with check (public.warehouse_has_account_role(account_id, array['owner','admin','warehouse_manager','supervisor','inventory_controller','receiver','quality_controller','forklift_operator','picker','packer','dispatcher','operator']::text[]));

drop policy if exists warehouse_operations_exceptions_manager_update on public.warehouse_operations_exceptions;
create policy warehouse_operations_exceptions_manager_update
on public.warehouse_operations_exceptions
for update to authenticated
using (public.warehouse_has_account_role(account_id, array['owner','admin','warehouse_manager','supervisor']::text[]))
with check (public.warehouse_has_account_role(account_id, array['owner','admin','warehouse_manager','supervisor']::text[]));

drop policy if exists warehouse_operations_process_volumes_manager_insert on public.warehouse_operations_process_volumes;
create policy warehouse_operations_process_volumes_manager_insert
on public.warehouse_operations_process_volumes
for insert to authenticated
with check (public.warehouse_has_account_role(account_id, array['owner','admin','warehouse_manager','supervisor']::text[]));

drop policy if exists warehouse_operations_process_volumes_manager_update on public.warehouse_operations_process_volumes;
create policy warehouse_operations_process_volumes_manager_update
on public.warehouse_operations_process_volumes
for update to authenticated
using (public.warehouse_has_account_role(account_id, array['owner','admin','warehouse_manager','supervisor']::text[]))
with check (public.warehouse_has_account_role(account_id, array['owner','admin','warehouse_manager','supervisor']::text[]));

drop policy if exists warehouse_operations_dashboard_admin_delete on public.warehouse_operations_dashboard_snapshots;
create policy warehouse_operations_dashboard_admin_delete
on public.warehouse_operations_dashboard_snapshots
for delete to authenticated
using (public.warehouse_has_account_role(account_id, array['owner','admin']::text[]));

drop policy if exists warehouse_operations_exceptions_admin_delete on public.warehouse_operations_exceptions;
create policy warehouse_operations_exceptions_admin_delete
on public.warehouse_operations_exceptions
for delete to authenticated
using (public.warehouse_has_account_role(account_id, array['owner','admin']::text[]));

drop policy if exists warehouse_operations_process_volumes_admin_delete on public.warehouse_operations_process_volumes;
create policy warehouse_operations_process_volumes_admin_delete
on public.warehouse_operations_process_volumes
for delete to authenticated
using (public.warehouse_has_account_role(account_id, array['owner','admin']::text[]));
