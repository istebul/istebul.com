-- WarehouseIQ Packing production persistence.
--
-- Güvenlik modeli:
-- - tenant/account izolasyonu zorunludur,
-- - authenticated istemciler salt okunur erişir,
-- - doğrudan INSERT / UPDATE / DELETE kapalıdır,
-- - mutation işlemleri sonraki dar SECURITY DEFINER RPC katmanından geçecektir,
-- - service-role browser/client sözleşmesi yoktur.
--
-- Sipariş kimliği harici sistem referansıdır ve UUID varsayılmaz.
-- Picking ise WarehouseIQ iç varlığı olduğu için UUID FK ile bağlanır.

create table if not exists public.warehouse_packings (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null
    references public.warehouse_accounts(id)
    on delete cascade,

  packing_number text not null,

  warehouse_id uuid not null,
  packing_location_id uuid not null,
  shipping_location_id uuid,

  strategy text not null,
  status text not null default 'draft',

  picking_id uuid,

  -- ERP / OMS / upstream sipariş kimliği UUID olmak zorunda değildir.
  order_id text,
  order_number text,

  reference_type text,
  reference_id text,
  reference_number text,

  priority integer not null default 50,

  planned_at timestamptz,
  released_at timestamptz,
  started_at timestamptz,
  packed_at timestamptz,
  shipping_ready_at timestamptz,
  cancelled_at timestamptz,

  cancellation_reason text,
  notes text,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_packings_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete restrict,

  constraint warehouse_packings_packing_location_fk
    foreign key (
      account_id,
      warehouse_id,
      packing_location_id
    )
    references public.warehouse_locations(
      account_id,
      warehouse_id,
      id
    )
    on delete restrict,

  constraint warehouse_packings_shipping_location_fk
    foreign key (
      account_id,
      warehouse_id,
      shipping_location_id
    )
    references public.warehouse_locations(
      account_id,
      warehouse_id,
      id
    )
    on delete restrict,

  constraint warehouse_packings_picking_fk
    foreign key (account_id, picking_id)
    references public.warehouse_pickings(account_id, id)
    on delete restrict,

  constraint warehouse_packings_number_not_blank_check
    check (length(btrim(packing_number)) > 0),

  constraint warehouse_packings_status_check
    check (
      status in (
        'draft',
        'planned',
        'released',
        'in_progress',
        'partially_packed',
        'packed',
        'shipping_ready',
        'cancelled'
      )
    ),

  constraint warehouse_packings_strategy_check
    check (
      strategy in (
        'single_package',
        'multi_package',
        'cartonization',
        'palletization',
        'mixed_sku',
        'single_sku',
        'weight_based',
        'volume_based',
        'temperature_controlled',
        'hazardous_material',
        'carrier_optimized'
      )
    ),

  constraint warehouse_packings_priority_check
    check (priority between 1 and 100),

  constraint warehouse_packings_cancel_reason_check
    check (
      status <> 'cancelled'
      or (
        cancellation_reason is not null
        and length(btrim(cancellation_reason)) > 0
      )
    ),

  constraint warehouse_packings_account_number_unique
    unique (account_id, packing_number),

  constraint warehouse_packings_account_id_id_unique
    unique (account_id, id)
);

create unique index if not exists
  warehouse_packings_picking_unique
on public.warehouse_packings(account_id, picking_id)
where picking_id is not null;

create unique index if not exists
  warehouse_packings_order_unique
on public.warehouse_packings(account_id, order_id)
where order_id is not null;

create unique index if not exists
  warehouse_packings_reference_unique
on public.warehouse_packings(
  account_id,
  reference_type,
  reference_id
)
where reference_type is not null
  and reference_id is not null;

create index if not exists
  warehouse_packings_status_idx
on public.warehouse_packings(
  account_id,
  warehouse_id,
  status,
  updated_at desc
);

create index if not exists
  warehouse_packings_location_idx
on public.warehouse_packings(
  account_id,
  warehouse_id,
  packing_location_id,
  status
);


-- ============================================================
-- Packing items
-- ============================================================

create table if not exists public.warehouse_packing_items (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null,
  packing_id uuid not null,

  line_number integer not null,

  picking_id uuid,
  picking_item_id uuid,

  warehouse_id uuid not null,
  packing_location_id uuid not null,

  product_id uuid not null,
  sku_id uuid,

  requested_quantity numeric(18,6) not null,
  packed_quantity numeric(18,6) not null default 0,
  damaged_quantity numeric(18,6) not null default 0,
  missing_quantity numeric(18,6) not null default 0,
  remaining_quantity numeric(18,6) not null,

  unit text not null,

  tracking jsonb,

  barcode text,

  unit_weight numeric(18,6),
  unit_volume numeric(18,6),

  weight_unit text,
  volume_unit text,

  temperature_controlled boolean not null default false,
  hazardous_material boolean not null default false,

  notes text,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_packing_items_packing_fk
    foreign key (account_id, packing_id)
    references public.warehouse_packings(account_id, id)
    on delete cascade,

  constraint warehouse_packing_items_picking_fk
    foreign key (account_id, picking_id)
    references public.warehouse_pickings(account_id, id)
    on delete restrict,

  constraint warehouse_packing_items_picking_item_fk
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
    on delete restrict,

  constraint warehouse_packing_items_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete restrict,

  constraint warehouse_packing_items_location_fk
    foreign key (
      account_id,
      warehouse_id,
      packing_location_id
    )
    references public.warehouse_locations(
      account_id,
      warehouse_id,
      id
    )
    on delete restrict,

  constraint warehouse_packing_items_product_fk
    foreign key (account_id, product_id)
    references public.warehouse_products(account_id, id)
    on delete restrict,

  constraint warehouse_packing_items_sku_fk
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
    on delete restrict,

  constraint warehouse_packing_items_line_check
    check (line_number > 0),

  constraint warehouse_packing_items_quantity_check
    check (
      requested_quantity > 0
      and packed_quantity >= 0
      and damaged_quantity >= 0
      and missing_quantity >= 0
      and remaining_quantity >= 0
      and packed_quantity
        + damaged_quantity
        + missing_quantity
        <= requested_quantity
      and remaining_quantity =
        requested_quantity
        - packed_quantity
        - damaged_quantity
        - missing_quantity
    ),

  constraint warehouse_packing_items_picking_pair_check
    check (
      picking_item_id is null
      or picking_id is not null
    ),

  constraint warehouse_packing_items_tracking_check
    check (
      tracking is null
      or jsonb_typeof(tracking) = 'object'
    ),

  constraint warehouse_packing_items_weight_check
    check (
      unit_weight is null
      or unit_weight >= 0
    ),

  constraint warehouse_packing_items_volume_check
    check (
      unit_volume is null
      or unit_volume >= 0
    ),

  constraint warehouse_packing_items_weight_unit_check
    check (
      weight_unit is null
      or weight_unit in ('g', 'kg')
    ),

  constraint warehouse_packing_items_volume_unit_check
    check (
      volume_unit is null
      or volume_unit in ('cm3', 'm3')
    ),

  constraint warehouse_packing_items_account_line_unique
    unique (
      account_id,
      packing_id,
      line_number
    ),

  constraint warehouse_packing_items_account_packing_id_unique
    unique (
      account_id,
      packing_id,
      id
    )
);

create index if not exists
  warehouse_packing_items_product_idx
on public.warehouse_packing_items(
  account_id,
  product_id,
  sku_id
);

create index if not exists
  warehouse_packing_items_open_idx
on public.warehouse_packing_items(
  account_id,
  packing_id,
  remaining_quantity
)
where remaining_quantity > 0;


-- ============================================================
-- Packing containers
-- ============================================================

create table if not exists public.warehouse_packing_containers (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null
    references public.warehouse_accounts(id)
    on delete cascade,

  code text not null,
  name text not null,
  type text not null,

  description text,

  dimensions jsonb,

  empty_weight numeric(18,6),
  maximum_weight numeric(18,6),
  maximum_volume numeric(18,6),

  weight_unit text,
  volume_unit text,

  temperature_controlled boolean not null default false,
  hazardous_material_allowed boolean not null default false,
  reusable boolean not null default false,
  active boolean not null default true,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_packing_containers_code_not_blank_check
    check (length(btrim(code)) > 0),

  constraint warehouse_packing_containers_name_not_blank_check
    check (length(btrim(name)) > 0),

  constraint warehouse_packing_containers_type_check
    check (
      type in (
        'box',
        'carton',
        'crate',
        'pallet',
        'envelope',
        'bag',
        'thermal_box',
        'hazardous_container',
        'custom'
      )
    ),

  constraint warehouse_packing_containers_dimensions_check
    check (
      dimensions is null
      or jsonb_typeof(dimensions) = 'object'
    ),

  constraint warehouse_packing_containers_weight_check
    check (
      (empty_weight is null or empty_weight >= 0)
      and
      (maximum_weight is null or maximum_weight > 0)
      and
      (
        empty_weight is null
        or maximum_weight is null
        or empty_weight <= maximum_weight
      )
    ),

  constraint warehouse_packing_containers_volume_check
    check (
      maximum_volume is null
      or maximum_volume > 0
    ),

  constraint warehouse_packing_containers_weight_unit_check
    check (
      weight_unit is null
      or weight_unit in ('g', 'kg')
    ),

  constraint warehouse_packing_containers_volume_unit_check
    check (
      volume_unit is null
      or volume_unit in ('cm3', 'm3')
    ),

  constraint warehouse_packing_containers_account_code_unique
    unique (account_id, code),

  constraint warehouse_packing_containers_account_id_id_unique
    unique (account_id, id)
);

create index if not exists
  warehouse_packing_containers_active_idx
on public.warehouse_packing_containers(
  account_id,
  active,
  code
);


-- ============================================================
-- Packing packages
-- ============================================================

create table if not exists public.warehouse_packing_packages (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null,
  packing_id uuid not null,

  package_number text not null,

  container_id uuid not null,
  parent_package_id uuid,

  status text not null default 'open',

  sscc text,
  license_plate_number text,
  seal_number text,

  actual_weight numeric(18,6),
  calculated_weight numeric(18,6),

  actual_volume numeric(18,6),
  calculated_volume numeric(18,6),

  weight_unit text not null default 'kg',
  volume_unit text not null default 'cm3',

  sealed_by uuid
    references auth.users(id)
    on delete restrict,

  sealed_at timestamptz,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_packing_packages_packing_fk
    foreign key (account_id, packing_id)
    references public.warehouse_packings(account_id, id)
    on delete cascade,

  constraint warehouse_packing_packages_container_fk
    foreign key (account_id, container_id)
    references public.warehouse_packing_containers(account_id, id)
    on delete restrict,

  constraint warehouse_packing_packages_parent_fk
    foreign key (
      account_id,
      packing_id,
      parent_package_id
    )
    references public.warehouse_packing_packages(
      account_id,
      packing_id,
      id
    )
    on delete restrict,

  constraint warehouse_packing_packages_number_not_blank_check
    check (length(btrim(package_number)) > 0),

  constraint warehouse_packing_packages_status_check
    check (
      status in (
        'open',
        'in_progress',
        'sealed',
        'labelled',
        'shipping_ready',
        'cancelled'
      )
    ),

  constraint warehouse_packing_packages_weight_check
    check (
      (actual_weight is null or actual_weight > 0)
      and
      (calculated_weight is null or calculated_weight >= 0)
    ),

  constraint warehouse_packing_packages_volume_check
    check (
      (actual_volume is null or actual_volume > 0)
      and
      (calculated_volume is null or calculated_volume >= 0)
    ),

  constraint warehouse_packing_packages_weight_unit_check
    check (weight_unit in ('g', 'kg')),

  constraint warehouse_packing_packages_volume_unit_check
    check (volume_unit in ('cm3', 'm3')),

  constraint warehouse_packing_packages_seal_check
    check (
      status not in ('sealed', 'labelled', 'shipping_ready')
      or (
        sealed_by is not null
        and sealed_at is not null
      )
    ),

  constraint warehouse_packing_packages_account_number_unique
    unique (
      account_id,
      packing_id,
      package_number
    ),

  constraint warehouse_packing_packages_account_packing_id_unique
    unique (
      account_id,
      packing_id,
      id
    )
);

create unique index if not exists
  warehouse_packing_packages_sscc_unique
on public.warehouse_packing_packages(account_id, sscc)
where sscc is not null;

create index if not exists
  warehouse_packing_packages_status_idx
on public.warehouse_packing_packages(
  account_id,
  packing_id,
  status
);


-- ============================================================
-- Package items
-- ============================================================

create table if not exists public.warehouse_packing_package_items (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null,
  packing_id uuid not null,
  package_id uuid not null,
  packing_item_id uuid not null,

  product_id uuid not null,
  sku_id uuid,

  quantity numeric(18,6) not null,
  unit text not null,

  tracking jsonb,

  weight numeric(18,6),
  volume numeric(18,6),

  created_at timestamptz not null default now(),

  constraint warehouse_packing_package_items_package_fk
    foreign key (
      account_id,
      packing_id,
      package_id
    )
    references public.warehouse_packing_packages(
      account_id,
      packing_id,
      id
    )
    on delete cascade,

  constraint warehouse_packing_package_items_item_fk
    foreign key (
      account_id,
      packing_id,
      packing_item_id
    )
    references public.warehouse_packing_items(
      account_id,
      packing_id,
      id
    )
    on delete restrict,

  constraint warehouse_packing_package_items_product_fk
    foreign key (account_id, product_id)
    references public.warehouse_products(account_id, id)
    on delete restrict,

  constraint warehouse_packing_package_items_sku_fk
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
    on delete restrict,

  constraint warehouse_packing_package_items_quantity_check
    check (quantity > 0),

  constraint warehouse_packing_package_items_tracking_check
    check (
      tracking is null
      or jsonb_typeof(tracking) = 'object'
    ),

  constraint warehouse_packing_package_items_weight_check
    check (
      weight is null
      or weight >= 0
    ),

  constraint warehouse_packing_package_items_volume_check
    check (
      volume is null
      or volume >= 0
    ),

  constraint warehouse_packing_package_items_account_id_unique
    unique (
      account_id,
      packing_id,
      package_id,
      id
    )
);

create index if not exists
  warehouse_packing_package_items_item_idx
on public.warehouse_packing_package_items(
  account_id,
  packing_id,
  packing_item_id
);


-- ============================================================
-- Labels
-- ============================================================

create table if not exists public.warehouse_packing_labels (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null,
  packing_id uuid not null,
  package_id uuid,

  type text not null,
  status text not null default 'created',

  label_number text not null,

  barcode_value text,
  sscc text,

  format text not null,

  content text,
  printer_id text,

  generated_at timestamptz,
  printed_at timestamptz,

  failure_reason text,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_packing_labels_packing_fk
    foreign key (account_id, packing_id)
    references public.warehouse_packings(account_id, id)
    on delete cascade,

  constraint warehouse_packing_labels_package_fk
    foreign key (
      account_id,
      packing_id,
      package_id
    )
    references public.warehouse_packing_packages(
      account_id,
      packing_id,
      id
    )
    on delete cascade,

  constraint warehouse_packing_labels_type_check
    check (
      type in (
        'package',
        'shipping',
        'sscc',
        'gs1_128',
        'carrier',
        'hazardous_material',
        'temperature_controlled',
        'return',
        'custom'
      )
    ),

  constraint warehouse_packing_labels_status_check
    check (
      status in (
        'created',
        'generated',
        'printed',
        'failed',
        'cancelled'
      )
    ),

  constraint warehouse_packing_labels_format_check
    check (
      format in (
        'zpl',
        'pdf',
        'png',
        'svg',
        'text'
      )
    ),

  constraint warehouse_packing_labels_number_not_blank_check
    check (length(btrim(label_number)) > 0),

  constraint warehouse_packing_labels_failure_check
    check (
      status <> 'failed'
      or (
        failure_reason is not null
        and length(btrim(failure_reason)) > 0
      )
    ),

  constraint warehouse_packing_labels_account_number_unique
    unique (account_id, label_number),

  constraint warehouse_packing_labels_account_packing_id_unique
    unique (account_id, packing_id, id)
);

create unique index if not exists
  warehouse_packing_labels_sscc_unique
on public.warehouse_packing_labels(account_id, sscc)
where sscc is not null;

create index if not exists
  warehouse_packing_labels_packing_idx
on public.warehouse_packing_labels(
  account_id,
  packing_id,
  created_at
);


-- ============================================================
-- Suggestions
-- ============================================================

create table if not exists public.warehouse_packing_suggestions (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null,
  packing_id uuid not null,

  packing_item_ids uuid[] not null
    default array[]::uuid[],

  container_id uuid not null,
  strategy text not null,

  container_snapshot jsonb not null,

  suggested_package_count integer not null,

  estimated_weight numeric(18,6) not null,
  estimated_volume numeric(18,6) not null,

  score jsonb not null,

  reasons text[] not null default array[]::text[],
  warnings text[] not null default array[]::text[],

  selected boolean not null default false,

  created_at timestamptz not null default now(),

  constraint warehouse_packing_suggestions_packing_fk
    foreign key (account_id, packing_id)
    references public.warehouse_packings(account_id, id)
    on delete cascade,

  constraint warehouse_packing_suggestions_container_fk
    foreign key (account_id, container_id)
    references public.warehouse_packing_containers(account_id, id)
    on delete restrict,

  constraint warehouse_packing_suggestions_strategy_check
    check (
      strategy in (
        'single_package',
        'multi_package',
        'cartonization',
        'palletization',
        'mixed_sku',
        'single_sku',
        'weight_based',
        'volume_based',
        'temperature_controlled',
        'hazardous_material',
        'carrier_optimized'
      )
    ),

  constraint warehouse_packing_suggestions_item_ids_check
    check (cardinality(packing_item_ids) > 0),

  constraint warehouse_packing_suggestions_container_snapshot_check
    check (
      jsonb_typeof(container_snapshot) = 'object'
    ),

  constraint warehouse_packing_suggestions_score_check
    check (
      jsonb_typeof(score) = 'object'
    ),

  constraint warehouse_packing_suggestions_package_count_check
    check (suggested_package_count > 0),

  constraint warehouse_packing_suggestions_weight_check
    check (estimated_weight >= 0),

  constraint warehouse_packing_suggestions_volume_check
    check (estimated_volume >= 0),

  constraint warehouse_packing_suggestions_account_packing_id_unique
    unique (account_id, packing_id, id)
);

create index if not exists
  warehouse_packing_suggestions_score_idx
on public.warehouse_packing_suggestions(
  account_id,
  packing_id,
  selected,
  created_at desc
);


-- ============================================================
-- Tasks
-- ============================================================

create table if not exists public.warehouse_packing_tasks (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null,
  packing_id uuid not null,

  packing_item_id uuid,
  package_id uuid,

  warehouse_id uuid not null,
  packing_location_id uuid not null,

  assigned_user_id uuid
    references auth.users(id)
    on delete restrict,

  -- Ekipman ve istasyon kimlikleri external/string contract olabilir.
  assigned_equipment_id text,
  station_id text,

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

  constraint warehouse_packing_tasks_packing_fk
    foreign key (account_id, packing_id)
    references public.warehouse_packings(account_id, id)
    on delete cascade,

  constraint warehouse_packing_tasks_item_fk
    foreign key (
      account_id,
      packing_id,
      packing_item_id
    )
    references public.warehouse_packing_items(
      account_id,
      packing_id,
      id
    )
    on delete cascade,

  constraint warehouse_packing_tasks_package_fk
    foreign key (
      account_id,
      packing_id,
      package_id
    )
    references public.warehouse_packing_packages(
      account_id,
      packing_id,
      id
    )
    on delete cascade,

  constraint warehouse_packing_tasks_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete restrict,

  constraint warehouse_packing_tasks_location_fk
    foreign key (
      account_id,
      warehouse_id,
      packing_location_id
    )
    references public.warehouse_locations(
      account_id,
      warehouse_id,
      id
    )
    on delete restrict,

  constraint warehouse_packing_tasks_status_check
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

  constraint warehouse_packing_tasks_priority_check
    check (priority between 1 and 100),

  constraint warehouse_packing_tasks_sequence_check
    check (sequence > 0),

  constraint warehouse_packing_tasks_account_packing_id_unique
    unique (account_id, packing_id, id)
);

create index if not exists
  warehouse_packing_tasks_packing_idx
on public.warehouse_packing_tasks(
  account_id,
  packing_id,
  sequence
);

create index if not exists
  warehouse_packing_tasks_assignee_idx
on public.warehouse_packing_tasks(
  account_id,
  assigned_user_id,
  status
);


-- ============================================================
-- Exceptions
-- ============================================================

create table if not exists public.warehouse_packing_exceptions (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null,
  packing_id uuid not null,

  packing_item_id uuid,
  package_id uuid,
  container_id uuid,
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

  constraint warehouse_packing_exceptions_packing_fk
    foreign key (account_id, packing_id)
    references public.warehouse_packings(account_id, id)
    on delete cascade,

  constraint warehouse_packing_exceptions_item_fk
    foreign key (
      account_id,
      packing_id,
      packing_item_id
    )
    references public.warehouse_packing_items(
      account_id,
      packing_id,
      id
    )
    on delete cascade,

  constraint warehouse_packing_exceptions_package_fk
    foreign key (
      account_id,
      packing_id,
      package_id
    )
    references public.warehouse_packing_packages(
      account_id,
      packing_id,
      id
    )
    on delete cascade,

  constraint warehouse_packing_exceptions_container_fk
    foreign key (account_id, container_id)
    references public.warehouse_packing_containers(account_id, id)
    on delete restrict,

  constraint warehouse_packing_exceptions_task_fk
    foreign key (
      account_id,
      packing_id,
      task_id
    )
    references public.warehouse_packing_tasks(
      account_id,
      packing_id,
      id
    )
    on delete cascade,

  constraint warehouse_packing_exceptions_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete restrict,

  constraint warehouse_packing_exceptions_location_fk
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

  constraint warehouse_packing_exceptions_product_fk
    foreign key (account_id, product_id)
    references public.warehouse_products(account_id, id)
    on delete restrict,

  constraint warehouse_packing_exceptions_type_check
    check (
      type in (
        'item_missing',
        'item_excess',
        'wrong_product',
        'wrong_barcode',
        'wrong_lot',
        'wrong_serial_number',
        'damaged_product',
        'weight_mismatch',
        'volume_exceeded',
        'container_capacity_exceeded',
        'container_not_compatible',
        'temperature_mismatch',
        'hazardous_material_mismatch',
        'label_generation_failed',
        'label_print_failed',
        'seal_required',
        'seal_mismatch'
      )
    ),

  constraint warehouse_packing_exceptions_message_check
    check (length(btrim(message)) > 0),

  constraint warehouse_packing_exceptions_resolution_check
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
    ),

  constraint warehouse_packing_exceptions_location_context_check
    check (
      location_id is null
      or warehouse_id is not null
    ),

  constraint warehouse_packing_exceptions_account_packing_id_unique
    unique (account_id, packing_id, id)
);

create index if not exists
  warehouse_packing_exceptions_open_idx
on public.warehouse_packing_exceptions(
  account_id,
  packing_id,
  created_at
)
where resolved = false;


-- ============================================================
-- Idempotent write request ledger
-- ============================================================

create table if not exists public.warehouse_packing_write_requests (
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

  constraint warehouse_packing_write_requests_action_check
    check (
      action in (
        'create_from_picking',
        'create',
        'add_item',
        'release',
        'start',
        'create_container',
        'set_container_active',
        'create_package',
        'generate_suggestions',
        'create_task',
        'confirm_item',
        'add_package_item',
        'seal_package',
        'generate_package_label',
        'create_label',
        'generate_label',
        'mark_label_printed',
        'mark_label_failed',
        'cancel_label',
        'create_exception',
        'resolve_exception',
        'complete',
        'mark_shipping_ready',
        'cancel'
      )
    ),

  constraint warehouse_packing_write_requests_payload_object_check
    check (
      jsonb_typeof(request_payload) = 'object'
    ),

  constraint warehouse_packing_write_requests_response_object_check
    check (
      response_payload is null
      or jsonb_typeof(response_payload) = 'object'
    )
);

create index if not exists
  warehouse_packing_write_requests_user_idx
on public.warehouse_packing_write_requests(
  account_id,
  user_id,
  created_at desc
);


-- ============================================================
-- RLS
-- ============================================================

alter table public.warehouse_packings
  enable row level security;

alter table public.warehouse_packing_items
  enable row level security;

alter table public.warehouse_packing_containers
  enable row level security;

alter table public.warehouse_packing_packages
  enable row level security;

alter table public.warehouse_packing_package_items
  enable row level security;

alter table public.warehouse_packing_labels
  enable row level security;

alter table public.warehouse_packing_suggestions
  enable row level security;

alter table public.warehouse_packing_tasks
  enable row level security;

alter table public.warehouse_packing_exceptions
  enable row level security;

alter table public.warehouse_packing_write_requests
  enable row level security;


create policy warehouse_packings_member_select
on public.warehouse_packings
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);

create policy warehouse_packing_items_member_select
on public.warehouse_packing_items
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);

create policy warehouse_packing_containers_member_select
on public.warehouse_packing_containers
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);

create policy warehouse_packing_packages_member_select
on public.warehouse_packing_packages
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);

create policy warehouse_packing_package_items_member_select
on public.warehouse_packing_package_items
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);

create policy warehouse_packing_labels_member_select
on public.warehouse_packing_labels
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);

create policy warehouse_packing_suggestions_member_select
on public.warehouse_packing_suggestions
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);

create policy warehouse_packing_tasks_member_select
on public.warehouse_packing_tasks
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);

create policy warehouse_packing_exceptions_member_select
on public.warehouse_packing_exceptions
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
);

create policy warehouse_packing_write_requests_owner_select
on public.warehouse_packing_write_requests
for select
to authenticated
using (
  public.warehouse_has_account_access(account_id)
  and user_id = auth.uid()
);


-- ============================================================
-- Grants
-- Browser/JWT read only. Mutation RPC katmanına ayrılmıştır.
-- ============================================================

revoke all
  on public.warehouse_packings
  from anon;

revoke insert, update, delete
  on public.warehouse_packings
  from authenticated;

grant select
  on public.warehouse_packings
  to authenticated;


revoke all
  on public.warehouse_packing_items
  from anon;

revoke insert, update, delete
  on public.warehouse_packing_items
  from authenticated;

grant select
  on public.warehouse_packing_items
  to authenticated;


revoke all
  on public.warehouse_packing_containers
  from anon;

revoke insert, update, delete
  on public.warehouse_packing_containers
  from authenticated;

grant select
  on public.warehouse_packing_containers
  to authenticated;


revoke all
  on public.warehouse_packing_packages
  from anon;

revoke insert, update, delete
  on public.warehouse_packing_packages
  from authenticated;

grant select
  on public.warehouse_packing_packages
  to authenticated;


revoke all
  on public.warehouse_packing_package_items
  from anon;

revoke insert, update, delete
  on public.warehouse_packing_package_items
  from authenticated;

grant select
  on public.warehouse_packing_package_items
  to authenticated;


revoke all
  on public.warehouse_packing_labels
  from anon;

revoke insert, update, delete
  on public.warehouse_packing_labels
  from authenticated;

grant select
  on public.warehouse_packing_labels
  to authenticated;


revoke all
  on public.warehouse_packing_suggestions
  from anon;

revoke insert, update, delete
  on public.warehouse_packing_suggestions
  from authenticated;

grant select
  on public.warehouse_packing_suggestions
  to authenticated;


revoke all
  on public.warehouse_packing_tasks
  from anon;

revoke insert, update, delete
  on public.warehouse_packing_tasks
  from authenticated;

grant select
  on public.warehouse_packing_tasks
  to authenticated;


revoke all
  on public.warehouse_packing_exceptions
  from anon;

revoke insert, update, delete
  on public.warehouse_packing_exceptions
  from authenticated;

grant select
  on public.warehouse_packing_exceptions
  to authenticated;


revoke all
  on public.warehouse_packing_write_requests
  from anon;

revoke insert, update, delete
  on public.warehouse_packing_write_requests
  from authenticated;

grant select
  on public.warehouse_packing_write_requests
  to authenticated;
