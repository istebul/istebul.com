-- =========================================================
-- WarehouseIQ · Quality Control Persistence
-- QC-P1
--
-- Güvenlik sözleşmesi:
-- - Authenticated firma üyeleri kalite kayıtlarını RLS ile okuyabilir.
-- - Ana ve alt kalite tablolarına doğrudan mutation izni verilmez.
-- - Yazma akışı sonraki fazda dar, idempotent RPC üzerinden açılacaktır.
-- - Bu migration inventory balance veya inventory movement oluşturmaz.
-- =========================================================


-- =========================================================
-- Kalite kontrol ana kaydı
-- =========================================================

create table if not exists public.warehouse_quality_inspections (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null
    references public.warehouse_accounts(id)
    on delete cascade,

  inspection_number text not null,

  warehouse_id uuid not null,
  location_id uuid not null,

  receiving_id uuid,

  reference_type text,
  reference_id text,
  reference_number text,

  status text not null default 'draft',
  final_decision text not null default 'pending',

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

  constraint warehouse_quality_inspections_warehouse_fk
    foreign key (
      account_id,
      warehouse_id
    )
    references public.warehouses(
      account_id,
      id
    )
    on delete restrict,

  constraint warehouse_quality_inspections_location_fk
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

  constraint warehouse_quality_inspections_receiving_fk
    foreign key (
      account_id,
      receiving_id
    )
    references public.warehouse_receivings(
      account_id,
      id
    )
    on delete restrict,

  constraint warehouse_quality_inspections_number_not_blank_check
    check (
      length(
        btrim(
          inspection_number
        )
      ) > 0
    ),

  constraint warehouse_quality_inspections_status_check
    check (
      status in (
        'draft',
        'planned',
        'sampling',
        'in_progress',
        'waiting_result',
        'completed',
        'cancelled'
      )
    ),

  constraint warehouse_quality_inspections_final_decision_check
    check (
      final_decision in (
        'pending',
        'accepted',
        'conditionally_accepted',
        'rejected',
        'hold',
        'rework',
        'scrap',
        'return_to_supplier'
      )
    ),

  constraint warehouse_quality_inspections_account_number_unique
    unique (
      account_id,
      inspection_number
    ),

  constraint warehouse_quality_inspections_account_id_id_unique
    unique (
      account_id,
      id
    )
);

create unique index if not exists warehouse_quality_inspections_receiving_uidx
  on public.warehouse_quality_inspections (
    account_id,
    receiving_id
  )
  where receiving_id is not null;

create unique index if not exists warehouse_quality_inspections_reference_uidx
  on public.warehouse_quality_inspections (
    account_id,
    reference_type,
    reference_id
  )
  where reference_type is not null
    and reference_id is not null;

create index if not exists warehouse_quality_inspections_status_idx
  on public.warehouse_quality_inspections (
    account_id,
    warehouse_id,
    status,
    created_at desc
  );

drop trigger if exists trg_warehouse_quality_inspections_updated_at
  on public.warehouse_quality_inspections;

create trigger trg_warehouse_quality_inspections_updated_at
before update on public.warehouse_quality_inspections
for each row
execute function public.warehouse_set_updated_at();


-- =========================================================
-- Kalite kontrol ürün satırları
-- =========================================================

create table if not exists public.warehouse_quality_inspection_items (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null,

  inspection_id uuid not null,
  line_number integer not null,

  product_id uuid not null,
  sku_id uuid,

  receiving_id uuid,
  receiving_item_id uuid,

  warehouse_id uuid not null,
  location_id uuid not null,

  control_type text not null,

  inspected_quantity numeric(18,6) not null,
  accepted_quantity numeric(18,6) not null default 0,
  rejected_quantity numeric(18,6) not null default 0,
  conditional_quantity numeric(18,6) not null default 0,
  hold_quantity numeric(18,6) not null default 0,

  unit text not null,
  decision text not null default 'pending',

  tracking jsonb,

  measured_value jsonb,
  expected_value jsonb,

  notes text,

  inspected_by uuid
    references auth.users(id)
    on delete restrict,

  inspected_at timestamptz,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_quality_inspection_items_inspection_fk
    foreign key (
      account_id,
      inspection_id
    )
    references public.warehouse_quality_inspections(
      account_id,
      id
    )
    on delete cascade,

  constraint warehouse_quality_inspection_items_warehouse_fk
    foreign key (
      account_id,
      warehouse_id
    )
    references public.warehouses(
      account_id,
      id
    )
    on delete restrict,

  constraint warehouse_quality_inspection_items_location_fk
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

  constraint warehouse_quality_inspection_items_line_positive_check
    check (
      line_number > 0
    ),

  constraint warehouse_quality_inspection_items_quantity_check
    check (
      inspected_quantity > 0
      and accepted_quantity >= 0
      and rejected_quantity >= 0
      and conditional_quantity >= 0
      and hold_quantity >= 0
      and
      (
        accepted_quantity
        + rejected_quantity
        + conditional_quantity
        + hold_quantity
      ) <= inspected_quantity
    ),

  constraint warehouse_quality_inspection_items_unit_not_blank_check
    check (
      length(
        btrim(
          unit
        )
      ) > 0
    ),

  constraint warehouse_quality_inspection_items_control_type_check
    check (
      control_type in (
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
      )
    ),

  constraint warehouse_quality_inspection_items_decision_check
    check (
      decision in (
        'pending',
        'accepted',
        'conditionally_accepted',
        'rejected',
        'hold',
        'rework',
        'scrap',
        'return_to_supplier'
      )
    ),

  constraint warehouse_quality_inspection_items_line_unique
    unique (
      account_id,
      inspection_id,
      line_number
    ),

  constraint warehouse_quality_inspection_items_account_inspection_id_unique
    unique (
      account_id,
      inspection_id,
      id
    )
);

create index if not exists warehouse_quality_inspection_items_product_idx
  on public.warehouse_quality_inspection_items (
    account_id,
    warehouse_id,
    product_id
  );

drop trigger if exists trg_warehouse_quality_inspection_items_updated_at
  on public.warehouse_quality_inspection_items;

create trigger trg_warehouse_quality_inspection_items_updated_at
before update on public.warehouse_quality_inspection_items
for each row
execute function public.warehouse_set_updated_at();


-- =========================================================
-- Kalite numuneleri
-- =========================================================

create table if not exists public.warehouse_quality_samples (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null,

  inspection_id uuid not null,
  inspection_item_id uuid,

  sample_number text not null,

  quantity numeric(18,6) not null,
  unit text not null,

  status text not null default 'planned',

  lot_number text,
  serial_number text,

  collected_by uuid
    references auth.users(id)
    on delete restrict,

  collected_at timestamptz,

  notes text,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_quality_samples_inspection_fk
    foreign key (
      account_id,
      inspection_id
    )
    references public.warehouse_quality_inspections(
      account_id,
      id
    )
    on delete cascade,

  constraint warehouse_quality_samples_item_fk
    foreign key (
      account_id,
      inspection_id,
      inspection_item_id
    )
    references public.warehouse_quality_inspection_items(
      account_id,
      inspection_id,
      id
    )
    on delete cascade,

  constraint warehouse_quality_samples_quantity_check
    check (
      quantity > 0
    ),

  constraint warehouse_quality_samples_unit_not_blank_check
    check (
      length(
        btrim(
          unit
        )
      ) > 0
    ),

  constraint warehouse_quality_samples_status_check
    check (
      status in (
        'planned',
        'collected',
        'under_review',
        'approved',
        'rejected',
        'cancelled'
      )
    ),

  constraint warehouse_quality_samples_account_number_unique
    unique (
      account_id,
      sample_number
    ),

  constraint warehouse_quality_samples_account_inspection_id_unique
    unique (
      account_id,
      inspection_id,
      id
    )
);

create index if not exists warehouse_quality_samples_inspection_idx
  on public.warehouse_quality_samples (
    account_id,
    inspection_id,
    created_at
  );

drop trigger if exists trg_warehouse_quality_samples_updated_at
  on public.warehouse_quality_samples;

create trigger trg_warehouse_quality_samples_updated_at
before update on public.warehouse_quality_samples
for each row
execute function public.warehouse_set_updated_at();


-- =========================================================
-- Kalite belgeleri
-- =========================================================

create table if not exists public.warehouse_quality_documents (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null,

  inspection_id uuid not null,
  inspection_item_id uuid,

  type text not null,

  document_number text,
  document_date date,

  file_name text,
  file_url text,
  notes text,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null default now(),

  constraint warehouse_quality_documents_inspection_fk
    foreign key (
      account_id,
      inspection_id
    )
    references public.warehouse_quality_inspections(
      account_id,
      id
    )
    on delete cascade,

  constraint warehouse_quality_documents_item_fk
    foreign key (
      account_id,
      inspection_id,
      inspection_item_id
    )
    references public.warehouse_quality_inspection_items(
      account_id,
      inspection_id,
      id
    )
    on delete cascade,

  constraint warehouse_quality_documents_type_check
    check (
      type in (
        'inspection_report',
        'laboratory_report',
        'certificate_of_analysis',
        'supplier_certificate',
        'photo',
        'other'
      )
    )
);

create index if not exists warehouse_quality_documents_inspection_idx
  on public.warehouse_quality_documents (
    account_id,
    inspection_id,
    created_at
  );


-- =========================================================
-- Kalite görevleri
-- =========================================================

create table if not exists public.warehouse_quality_tasks (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null,

  inspection_id uuid not null,
  inspection_item_id uuid,

  type text not null,
  status text not null default 'pending',

  assigned_user_id uuid
    references auth.users(id)
    on delete restrict,

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

  constraint warehouse_quality_tasks_inspection_fk
    foreign key (
      account_id,
      inspection_id
    )
    references public.warehouse_quality_inspections(
      account_id,
      id
    )
    on delete cascade,

  constraint warehouse_quality_tasks_item_fk
    foreign key (
      account_id,
      inspection_id,
      inspection_item_id
    )
    references public.warehouse_quality_inspection_items(
      account_id,
      inspection_id,
      id
    )
    on delete cascade,

  constraint warehouse_quality_tasks_type_check
    check (
      type in (
        'sampling',
        'visual_inspection',
        'measurement',
        'temperature_check',
        'document_review',
        'laboratory_test',
        'final_approval'
      )
    ),

  constraint warehouse_quality_tasks_status_check
    check (
      status in (
        'pending',
        'assigned',
        'in_progress',
        'completed',
        'cancelled'
      )
    ),

  constraint warehouse_quality_tasks_priority_check
    check (
      priority between 1 and 100
    )
);

create index if not exists warehouse_quality_tasks_inspection_idx
  on public.warehouse_quality_tasks (
    account_id,
    inspection_id,
    priority,
    created_at
  );

drop trigger if exists trg_warehouse_quality_tasks_updated_at
  on public.warehouse_quality_tasks;

create trigger trg_warehouse_quality_tasks_updated_at
before update on public.warehouse_quality_tasks
for each row
execute function public.warehouse_set_updated_at();


-- =========================================================
-- Kalite istisnaları
-- =========================================================

create table if not exists public.warehouse_quality_exceptions (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null,

  inspection_id uuid not null,
  inspection_item_id uuid,

  type text not null,
  message text not null,

  rule_id text,
  sample_id uuid,

  expected_value text,
  actual_value text,

  resolved boolean not null default false,

  resolved_by uuid
    references auth.users(id)
    on delete restrict,

  resolved_at timestamptz,
  resolution_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_quality_exceptions_inspection_fk
    foreign key (
      account_id,
      inspection_id
    )
    references public.warehouse_quality_inspections(
      account_id,
      id
    )
    on delete cascade,

  constraint warehouse_quality_exceptions_item_fk
    foreign key (
      account_id,
      inspection_id,
      inspection_item_id
    )
    references public.warehouse_quality_inspection_items(
      account_id,
      inspection_id,
      id
    )
    on delete cascade,

  constraint warehouse_quality_exceptions_sample_fk
    foreign key (
      account_id,
      inspection_id,
      sample_id
    )
    references public.warehouse_quality_samples(
      account_id,
      inspection_id,
      id
    )
    on delete restrict,

  constraint warehouse_quality_exceptions_type_check
    check (
      type in (
        'rule_failed',
        'sample_failed',
        'temperature_out_of_range',
        'dimension_out_of_range',
        'packaging_damage',
        'barcode_mismatch',
        'label_mismatch',
        'lot_mismatch',
        'serial_number_mismatch',
        'expiry_date_invalid',
        'document_missing',
        'laboratory_result_failed'
      )
    ),

  constraint warehouse_quality_exceptions_message_not_blank_check
    check (
      length(
        btrim(
          message
        )
      ) > 0
    )
);

create index if not exists warehouse_quality_exceptions_inspection_idx
  on public.warehouse_quality_exceptions (
    account_id,
    inspection_id,
    created_at
  );

create index if not exists warehouse_quality_exceptions_open_idx
  on public.warehouse_quality_exceptions (
    account_id,
    inspection_id,
    created_at
  )
  where resolved = false;

drop trigger if exists trg_warehouse_quality_exceptions_updated_at
  on public.warehouse_quality_exceptions;

create trigger trg_warehouse_quality_exceptions_updated_at
before update on public.warehouse_quality_exceptions
for each row
execute function public.warehouse_set_updated_at();


-- =========================================================
-- RLS
-- =========================================================

alter table public.warehouse_quality_inspections
  enable row level security;

alter table public.warehouse_quality_inspection_items
  enable row level security;

alter table public.warehouse_quality_samples
  enable row level security;

alter table public.warehouse_quality_documents
  enable row level security;

alter table public.warehouse_quality_tasks
  enable row level security;

alter table public.warehouse_quality_exceptions
  enable row level security;


-- =========================================================
-- Salt-okunur firma üyeliği politikaları
-- =========================================================

drop policy if exists warehouse_quality_inspections_member_select
  on public.warehouse_quality_inspections;

create policy warehouse_quality_inspections_member_select
on public.warehouse_quality_inspections
for select to authenticated
using (
  public.warehouse_has_account_access(
    account_id
  )
);

drop policy if exists warehouse_quality_inspection_items_member_select
  on public.warehouse_quality_inspection_items;

create policy warehouse_quality_inspection_items_member_select
on public.warehouse_quality_inspection_items
for select to authenticated
using (
  public.warehouse_has_account_access(
    account_id
  )
);

drop policy if exists warehouse_quality_samples_member_select
  on public.warehouse_quality_samples;

create policy warehouse_quality_samples_member_select
on public.warehouse_quality_samples
for select to authenticated
using (
  public.warehouse_has_account_access(
    account_id
  )
);

drop policy if exists warehouse_quality_documents_member_select
  on public.warehouse_quality_documents;

create policy warehouse_quality_documents_member_select
on public.warehouse_quality_documents
for select to authenticated
using (
  public.warehouse_has_account_access(
    account_id
  )
);

drop policy if exists warehouse_quality_tasks_member_select
  on public.warehouse_quality_tasks;

create policy warehouse_quality_tasks_member_select
on public.warehouse_quality_tasks
for select to authenticated
using (
  public.warehouse_has_account_access(
    account_id
  )
);

drop policy if exists warehouse_quality_exceptions_member_select
  on public.warehouse_quality_exceptions;

create policy warehouse_quality_exceptions_member_select
on public.warehouse_quality_exceptions
for select to authenticated
using (
  public.warehouse_has_account_access(
    account_id
  )
);


-- =========================================================
-- Tablo yetkileri
-- =========================================================

revoke all
  on table public.warehouse_quality_inspections
  from anon;

revoke all
  on table public.warehouse_quality_inspection_items
  from anon;

revoke all
  on table public.warehouse_quality_samples
  from anon;

revoke all
  on table public.warehouse_quality_documents
  from anon;

revoke all
  on table public.warehouse_quality_tasks
  from anon;

revoke all
  on table public.warehouse_quality_exceptions
  from anon;

revoke insert, update, delete
  on table public.warehouse_quality_inspections
  from authenticated;

revoke insert, update, delete
  on table public.warehouse_quality_inspection_items
  from authenticated;

revoke insert, update, delete
  on table public.warehouse_quality_samples
  from authenticated;

revoke insert, update, delete
  on table public.warehouse_quality_documents
  from authenticated;

revoke insert, update, delete
  on table public.warehouse_quality_tasks
  from authenticated;

revoke insert, update, delete
  on table public.warehouse_quality_exceptions
  from authenticated;

grant select
  on table public.warehouse_quality_inspections
  to authenticated;

grant select
  on table public.warehouse_quality_inspection_items
  to authenticated;

grant select
  on table public.warehouse_quality_samples
  to authenticated;

grant select
  on table public.warehouse_quality_documents
  to authenticated;

grant select
  on table public.warehouse_quality_tasks
  to authenticated;

grant select
  on table public.warehouse_quality_exceptions
  to authenticated;
