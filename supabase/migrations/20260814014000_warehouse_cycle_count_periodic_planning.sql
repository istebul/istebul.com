-- =========================================================
-- WarehouseIQ — Periodic Cycle Count Planning Persistence
--
-- Bu migration yalnız persistence foundation oluşturur.
--
-- Kapsam:
-- - periyodik sayım kuralları
-- - aylık / yıllık takvimler
-- - dönem bazlı idempotent scheduler run kayıtları
-- - mevcut Cycle Count rule_id / schedule_id FK bağları
--
-- Bu migration:
-- - Cycle Count oluşturmaz
-- - inventory snapshot oluşturmaz
-- - task oluşturmaz
-- - otomatik release çalıştırmaz
-- - inventory balance / movement değiştirmez
-- =========================================================

create table if not exists
  public.warehouse_cycle_count_rules (
    id uuid primary key
      default gen_random_uuid(),

    account_id uuid not null
      references public.warehouse_accounts(id)
      on delete cascade,

    warehouse_id uuid not null,

    code text not null,
    name text not null,
    description text,

    status text not null
      default 'active',

    strategy text not null
      default 'full_inventory',

    blind_count boolean not null
      default false,

    freeze_inventory boolean not null
      default false,

    tolerance_quantity numeric(18, 6),
    tolerance_percentage numeric(9, 4),

    priority integer not null
      default 50,

    selection_config jsonb not null
      default '{}'::jsonb,

    auto_release boolean not null
      default true,

    created_by uuid not null,
    updated_by uuid,

    created_at timestamptz not null
      default now(),

    updated_at timestamptz not null
      default now(),

    constraint warehouse_cycle_count_rules_code_not_blank_check
      check (
        btrim(code) <> ''
      ),

    constraint warehouse_cycle_count_rules_name_not_blank_check
      check (
        btrim(name) <> ''
      ),

    constraint warehouse_cycle_count_rules_status_check
      check (
        status in (
          'active',
          'paused',
          'archived'
        )
      ),

    constraint warehouse_cycle_count_rules_strategy_check
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

    constraint warehouse_cycle_count_rules_priority_check
      check (
        priority >= 0
        and priority <= 100
      ),

    constraint warehouse_cycle_count_rules_tolerance_quantity_check
      check (
        tolerance_quantity is null
        or tolerance_quantity >= 0
      ),

    constraint warehouse_cycle_count_rules_tolerance_percentage_check
      check (
        tolerance_percentage is null
        or tolerance_percentage >= 0
      ),

    constraint warehouse_cycle_count_rules_selection_config_check
      check (
        jsonb_typeof(
          selection_config
        ) = 'object'
      ),

    constraint warehouse_cycle_count_rules_account_warehouse_fk
      foreign key (
        account_id,
        warehouse_id
      )
      references public.warehouses(
        account_id,
        id
      )
      on delete cascade,

    constraint warehouse_cycle_count_rules_account_warehouse_code_unique
      unique (
        account_id,
        warehouse_id,
        code
      ),

    constraint warehouse_cycle_count_rules_account_id_id_unique
      unique (
        account_id,
        id
      ),

    constraint warehouse_cycle_count_rules_account_warehouse_id_unique
      unique (
        account_id,
        warehouse_id,
        id
      )
  );

create index if not exists
  warehouse_cycle_count_rules_active_idx
on public.warehouse_cycle_count_rules (
  account_id,
  warehouse_id,
  status,
  strategy
);

create table if not exists
  public.warehouse_cycle_count_schedules (
    id uuid primary key
      default gen_random_uuid(),

    account_id uuid not null
      references public.warehouse_accounts(id)
      on delete cascade,

    warehouse_id uuid not null,

    rule_id uuid not null,

    cadence text not null,

    timezone text not null
      default 'Europe/Istanbul',

    month_of_year integer,

    day_of_month integer not null
      default 1,

    local_time time without time zone
      not null
      default time '02:00:00',

    status text not null
      default 'active',

    next_run_at timestamptz not null,
    last_run_at timestamptz,

    created_by uuid not null,
    updated_by uuid,

    created_at timestamptz not null
      default now(),

    updated_at timestamptz not null
      default now(),

    constraint warehouse_cycle_count_schedules_cadence_check
      check (
        cadence in (
          'monthly',
          'annual'
        )
      ),

    constraint warehouse_cycle_count_schedules_timezone_check
      check (
        btrim(timezone) <> ''
      ),

    constraint warehouse_cycle_count_schedules_month_check
      check (
        (
          cadence = 'monthly'
          and month_of_year is null
        )
        or
        (
          cadence = 'annual'
          and month_of_year
            between 1 and 12
        )
      ),

    constraint warehouse_cycle_count_schedules_day_check
      check (
        day_of_month
          between 1 and 28
      ),

    constraint warehouse_cycle_count_schedules_status_check
      check (
        status in (
          'active',
          'paused',
          'archived'
        )
      ),

    constraint warehouse_cycle_count_schedules_run_order_check
      check (
        last_run_at is null
        or next_run_at > last_run_at
      ),

    constraint warehouse_cycle_count_schedules_account_warehouse_fk
      foreign key (
        account_id,
        warehouse_id
      )
      references public.warehouses(
        account_id,
        id
      )
      on delete cascade,

    constraint warehouse_cycle_count_schedules_rule_fk
      foreign key (
        account_id,
        warehouse_id,
        rule_id
      )
      references public.warehouse_cycle_count_rules(
        account_id,
        warehouse_id,
        id
      )
      on delete cascade,

    constraint warehouse_cycle_count_schedules_account_id_id_unique
      unique (
        account_id,
        id
      ),

    constraint warehouse_cycle_count_schedules_account_warehouse_id_unique
      unique (
        account_id,
        warehouse_id,
        id
      ),

    constraint warehouse_cycle_count_schedules_account_warehouse_rule_id_unique
      unique (
        account_id,
        warehouse_id,
        rule_id,
        id
      ),

    constraint warehouse_cycle_count_schedules_rule_cadence_unique
      unique (
        account_id,
        rule_id,
        cadence
      )
  );

create index if not exists
  warehouse_cycle_count_schedules_due_idx
on public.warehouse_cycle_count_schedules (
  status,
  next_run_at,
  account_id,
  warehouse_id
)
where status = 'active';

create unique index if not exists
  warehouse_cycle_counts_account_warehouse_id_uidx
on public.warehouse_cycle_counts (
  account_id,
  warehouse_id,
  id
);

create table if not exists
  public.warehouse_cycle_count_schedule_runs (
    id uuid primary key
      default gen_random_uuid(),

    account_id uuid not null
      references public.warehouse_accounts(id)
      on delete cascade,

    warehouse_id uuid not null,

    rule_id uuid not null,
    schedule_id uuid not null,

    period_key text not null,

    scheduled_for timestamptz not null,

    status text not null
      default 'pending',

    cycle_count_id uuid,

    generated_at timestamptz,
    released_at timestamptz,

    failure_reason text,

    rule_snapshot jsonb not null
      default '{}'::jsonb,

    created_at timestamptz not null
      default now(),

    updated_at timestamptz not null
      default now(),

    constraint warehouse_cycle_count_schedule_runs_period_key_check
      check (
        btrim(period_key) <> ''
      ),

    constraint warehouse_cycle_count_schedule_runs_status_check
      check (
        status in (
          'pending',
          'generated',
          'released',
          'skipped',
          'failed'
        )
      ),

    constraint warehouse_cycle_count_schedule_runs_snapshot_check
      check (
        jsonb_typeof(
          rule_snapshot
        ) = 'object'
      ),

    constraint warehouse_cycle_count_schedule_runs_generated_state_check
      check (
        (
          status = 'pending'
          and cycle_count_id is null
          and generated_at is null
          and released_at is null
        )
        or
        (
          status = 'generated'
          and cycle_count_id is not null
          and generated_at is not null
          and released_at is null
        )
        or
        (
          status = 'released'
          and cycle_count_id is not null
          and generated_at is not null
          and released_at is not null
        )
        or
        (
          status in (
            'skipped',
            'failed'
          )
          and cycle_count_id is null
          and generated_at is null
          and released_at is null
        )
      ),

    constraint warehouse_cycle_count_schedule_runs_account_warehouse_fk
      foreign key (
        account_id,
        warehouse_id
      )
      references public.warehouses(
        account_id,
        id
      )
      on delete cascade,

    constraint warehouse_cycle_count_schedule_runs_rule_fk
      foreign key (
        account_id,
        warehouse_id,
        rule_id
      )
      references public.warehouse_cycle_count_rules(
        account_id,
        warehouse_id,
        id
      )
      on delete cascade,

    constraint warehouse_cycle_count_schedule_runs_schedule_fk
      foreign key (
        account_id,
        warehouse_id,
        rule_id,
        schedule_id
      )
      references public.warehouse_cycle_count_schedules(
        account_id,
        warehouse_id,
        rule_id,
        id
      )
      on delete cascade,

    constraint warehouse_cycle_count_schedule_runs_count_fk
      foreign key (
        account_id,
        warehouse_id,
        cycle_count_id
      )
      references public.warehouse_cycle_counts(
        account_id,
        warehouse_id,
        id
      ),

    constraint warehouse_cycle_count_schedule_runs_period_unique
      unique (
        account_id,
        schedule_id,
        period_key
      )
  );

create index if not exists
  warehouse_cycle_count_schedule_runs_lookup_idx
on public.warehouse_cycle_count_schedule_runs (
  account_id,
  warehouse_id,
  schedule_id,
  scheduled_for desc
);

create index if not exists
  warehouse_cycle_count_schedule_runs_count_idx
on public.warehouse_cycle_count_schedule_runs (
  account_id,
  cycle_count_id
)
where cycle_count_id is not null;

alter table
  public.warehouse_cycle_counts
drop constraint if exists
  warehouse_cycle_counts_periodic_pair_check;

alter table
  public.warehouse_cycle_counts
add constraint
  warehouse_cycle_counts_periodic_pair_check
check (
  (
    rule_id is null
    and schedule_id is null
  )
  or
  (
    rule_id is not null
    and schedule_id is not null
  )
)
not valid;

alter table
  public.warehouse_cycle_counts
drop constraint if exists
  warehouse_cycle_counts_periodic_rule_fk;

alter table
  public.warehouse_cycle_counts
add constraint
  warehouse_cycle_counts_periodic_rule_fk
foreign key (
  account_id,
  warehouse_id,
  rule_id
)
references public.warehouse_cycle_count_rules(
  account_id,
  warehouse_id,
  id
)
not valid;

alter table
  public.warehouse_cycle_counts
drop constraint if exists
  warehouse_cycle_counts_periodic_rule_schedule_match_fk;

alter table
  public.warehouse_cycle_counts
add constraint
  warehouse_cycle_counts_periodic_rule_schedule_match_fk
foreign key (
  account_id,
  warehouse_id,
  rule_id,
  schedule_id
)
references public.warehouse_cycle_count_schedules(
  account_id,
  warehouse_id,
  rule_id,
  id
)
not valid;

alter table
  public.warehouse_cycle_counts
drop constraint if exists
  warehouse_cycle_counts_periodic_schedule_fk;

alter table
  public.warehouse_cycle_counts
add constraint
  warehouse_cycle_counts_periodic_schedule_fk
foreign key (
  account_id,
  warehouse_id,
  schedule_id
)
references public.warehouse_cycle_count_schedules(
  account_id,
  warehouse_id,
  id
)
not valid;

alter table
  public.warehouse_cycle_count_rules
enable row level security;

alter table
  public.warehouse_cycle_count_schedules
enable row level security;

alter table
  public.warehouse_cycle_count_schedule_runs
enable row level security;

revoke all
on table
  public.warehouse_cycle_count_rules
from public;

revoke all
on table
  public.warehouse_cycle_count_rules
from anon;

revoke all
on table
  public.warehouse_cycle_count_rules
from authenticated;

revoke all
on table
  public.warehouse_cycle_count_schedules
from public;

revoke all
on table
  public.warehouse_cycle_count_schedules
from anon;

revoke all
on table
  public.warehouse_cycle_count_schedules
from authenticated;

revoke all
on table
  public.warehouse_cycle_count_schedule_runs
from public;

revoke all
on table
  public.warehouse_cycle_count_schedule_runs
from anon;

revoke all
on table
  public.warehouse_cycle_count_schedule_runs
from authenticated;

comment on table
  public.warehouse_cycle_count_rules
is
  'WarehouseIQ aylık/yıllık Cycle Count üretim kuralları. Doğrudan browser erişimine kapalıdır.';

comment on table
  public.warehouse_cycle_count_schedules
is
  'WarehouseIQ Cycle Count periyodik takvimleri. Timezone-aware scheduler tarafından işlenir.';

comment on table
  public.warehouse_cycle_count_schedule_runs
is
  'Her schedule dönemi için idempotent Cycle Count üretim audit kaydı.';
