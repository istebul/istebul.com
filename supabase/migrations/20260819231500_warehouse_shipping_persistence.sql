-- WarehouseIQ Shipping production persistence.
--
-- A9.1 security model:
-- - account/tenant isolation is mandatory,
-- - authenticated browser clients have SELECT-only access,
-- - direct INSERT / UPDATE / DELETE is intentionally unavailable,
-- - Shipping mutations will later use narrow, idempotent privileged RPC contracts,
-- - browser/client code never receives service-role credentials.
--
-- Packing is an internal WarehouseIQ UUID entity.
-- ERP / OMS order and reference identifiers remain TEXT because an
-- upstream identifier is not guaranteed to be a UUID.

create table if not exists public.warehouse_shipping_carriers (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null
    references public.warehouse_accounts(id)
    on delete cascade,
  code text not null,
  name text not null,
  type text not null,
  tax_number text,
  contact_name text,
  phone text,
  email text,
  website text,
  account_number text,
  integration_code text,
  api_enabled boolean not null default false,
  tracking_supported boolean not null default false,
  manifest_supported boolean not null default false,
  asn_supported boolean not null default false,
  temperature_controlled boolean not null default false,
  hazardous_material_allowed boolean not null default false,
  international boolean not null default false,
  active boolean not null default true,
  created_by uuid not null
    references auth.users(id)
    on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_shipping_carriers_code_not_blank_check
    check (length(btrim(code)) > 0),

  constraint warehouse_shipping_carriers_name_not_blank_check
    check (length(btrim(name)) > 0),

  constraint warehouse_shipping_carriers_type_check
    check (
      type in (
        'internal_fleet',
        'parcel_carrier',
        'freight_carrier',
        'courier',
        'third_party_logistics',
        'customer_pickup',
        'international_forwarder'
      )
    ),

  constraint warehouse_shipping_carriers_account_code_unique
    unique (account_id, code),

  constraint warehouse_shipping_carriers_account_id_unique
    unique (account_id, id)
);

create index if not exists
  warehouse_shipping_carriers_active_idx
on public.warehouse_shipping_carriers(
  account_id,
  active,
  code
);

create table if not exists public.warehouse_shipping_service_levels (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  carrier_id uuid not null,
  code text not null,
  name text not null,
  type text not null,
  description text,
  minimum_delivery_hours numeric(12,2),
  maximum_delivery_hours numeric(12,2),
  cutoff_time text,
  maximum_weight numeric(18,6),
  maximum_volume numeric(18,6),
  weight_unit text,
  volume_unit text,
  temperature_controlled boolean not null default false,
  hazardous_material_allowed boolean not null default false,
  international boolean not null default false,
  tracking_supported boolean not null default false,
  proof_of_delivery_required boolean not null default false,
  active boolean not null default true,
  created_by uuid not null
    references auth.users(id)
    on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_shipping_service_levels_carrier_fk
    foreign key (account_id, carrier_id)
    references public.warehouse_shipping_carriers(account_id, id)
    on delete cascade,

  constraint warehouse_shipping_service_levels_code_check
    check (length(btrim(code)) > 0),

  constraint warehouse_shipping_service_levels_name_check
    check (length(btrim(name)) > 0),

  constraint warehouse_shipping_service_levels_type_check
    check (
      type in (
        'same_day',
        'next_day',
        'express',
        'standard',
        'economy',
        'scheduled',
        'temperature_controlled',
        'hazardous_material',
        'international',
        'custom'
      )
    ),

  constraint warehouse_shipping_service_levels_hours_check
    check (
      (minimum_delivery_hours is null or minimum_delivery_hours >= 0)
      and
      (maximum_delivery_hours is null or maximum_delivery_hours >= 0)
      and
      (
        minimum_delivery_hours is null
        or maximum_delivery_hours is null
        or maximum_delivery_hours >= minimum_delivery_hours
      )
    ),

  constraint warehouse_shipping_service_levels_weight_check
    check (maximum_weight is null or maximum_weight >= 0),

  constraint warehouse_shipping_service_levels_volume_check
    check (maximum_volume is null or maximum_volume >= 0),

  constraint warehouse_shipping_service_levels_account_carrier_code_unique
    unique (account_id, carrier_id, code),

  constraint warehouse_shipping_service_levels_account_carrier_id_unique
    unique (account_id, carrier_id, id),

  constraint warehouse_shipping_service_levels_account_id_unique
    unique (account_id, id)
);

create index if not exists
  warehouse_shipping_service_levels_active_idx
on public.warehouse_shipping_service_levels(
  account_id,
  carrier_id,
  active,
  code
);

create table if not exists public.warehouse_shipping_vehicles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null
    references public.warehouse_accounts(id)
    on delete cascade,
  carrier_id uuid,
  code text not null,
  plate_number text not null,
  type text not null,
  trailer_plate_number text,
  maximum_weight numeric(18,6),
  maximum_volume numeric(18,6),
  weight_unit text,
  volume_unit text,
  pallet_capacity integer,
  package_capacity integer,
  temperature_controlled boolean not null default false,
  minimum_temperature numeric(10,3),
  maximum_temperature numeric(10,3),
  hazardous_material_allowed boolean not null default false,
  gps_enabled boolean not null default false,
  active boolean not null default true,
  created_by uuid not null
    references auth.users(id)
    on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_shipping_vehicles_carrier_fk
    foreign key (account_id, carrier_id)
    references public.warehouse_shipping_carriers(account_id, id)
    on delete restrict,

  constraint warehouse_shipping_vehicles_code_check
    check (length(btrim(code)) > 0),

  constraint warehouse_shipping_vehicles_plate_check
    check (length(btrim(plate_number)) > 0),

  constraint warehouse_shipping_vehicles_type_check
    check (
      type in (
        'motorcycle',
        'van',
        'panel_van',
        'truck',
        'semi_trailer',
        'refrigerated_truck',
        'tanker',
        'container_truck',
        'customer_vehicle',
        'other'
      )
    ),

  constraint warehouse_shipping_vehicles_capacity_check
    check (
      (maximum_weight is null or maximum_weight >= 0)
      and
      (maximum_volume is null or maximum_volume >= 0)
      and
      (pallet_capacity is null or pallet_capacity >= 0)
      and
      (package_capacity is null or package_capacity >= 0)
    ),

  constraint warehouse_shipping_vehicles_temperature_check
    check (
      minimum_temperature is null
      or maximum_temperature is null
      or maximum_temperature >= minimum_temperature
    ),

  constraint warehouse_shipping_vehicles_account_code_unique
    unique (account_id, code),

  constraint warehouse_shipping_vehicles_account_plate_unique
    unique (account_id, plate_number),

  constraint warehouse_shipping_vehicles_account_id_unique
    unique (account_id, id)
);

create index if not exists
  warehouse_shipping_vehicles_active_idx
on public.warehouse_shipping_vehicles(
  account_id,
  active,
  code
);

create table if not exists public.warehouse_shipping_docks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  warehouse_id uuid not null,
  location_id uuid not null,
  code text not null,
  name text not null,
  status text not null default 'available',
  vehicle_types text[] not null default '{}'::text[],
  maximum_vehicle_height numeric(18,6),
  maximum_vehicle_weight numeric(18,6),
  temperature_controlled boolean not null default false,
  hazardous_material_allowed boolean not null default false,
  active boolean not null default true,
  created_by uuid not null
    references auth.users(id)
    on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_shipping_docks_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete cascade,

  constraint warehouse_shipping_docks_location_fk
    foreign key (account_id, warehouse_id, location_id)
    references public.warehouse_locations(account_id, warehouse_id, id)
    on delete restrict,

  constraint warehouse_shipping_docks_code_check
    check (length(btrim(code)) > 0),

  constraint warehouse_shipping_docks_name_check
    check (length(btrim(name)) > 0),

  constraint warehouse_shipping_docks_status_check
    check (
      status in (
        'available',
        'reserved',
        'occupied',
        'blocked',
        'maintenance',
        'inactive'
      )
    ),

  constraint warehouse_shipping_docks_dimension_check
    check (
      (maximum_vehicle_height is null or maximum_vehicle_height >= 0)
      and
      (maximum_vehicle_weight is null or maximum_vehicle_weight >= 0)
    ),

  constraint warehouse_shipping_docks_account_warehouse_code_unique
    unique (account_id, warehouse_id, code),

  constraint warehouse_shipping_docks_account_warehouse_id_unique
    unique (account_id, warehouse_id, id),

  constraint warehouse_shipping_docks_account_id_unique
    unique (account_id, id)
);

create index if not exists
  warehouse_shipping_docks_status_idx
on public.warehouse_shipping_docks(
  account_id,
  warehouse_id,
  active,
  status,
  code
);

create table if not exists public.warehouse_shippings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null
    references public.warehouse_accounts(id)
    on delete cascade,
  shipping_number text not null,
  warehouse_id uuid not null,
  shipping_location_id uuid not null,
  strategy text not null,
  status text not null default 'draft',
  packing_id uuid,
  order_id text,
  order_number text,
  reference_type text,
  reference_id text,
  reference_number text,
  carrier_id uuid,
  service_level_id uuid,
  vehicle_id uuid,
  dock_id uuid,
  driver_id text,
  driver_name text,
  driver_phone text,
  tracking_number text,
  manifest_id uuid,
  asn_id uuid,
  ship_from_address jsonb not null,
  ship_to_address jsonb not null,
  priority integer not null default 50,
  planned_at timestamptz,
  released_at timestamptz,
  loading_ready_at timestamptz,
  loading_started_at timestamptz,
  loaded_at timestamptz,
  dispatched_at timestamptz,
  in_transit_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  expected_delivery_at timestamptz,
  actual_delivery_at timestamptz,
  cancellation_reason text,
  delivery_failure_reason text,
  notes text,
  temperature_controlled boolean not null default false,
  hazardous_material boolean not null default false,
  created_by uuid not null
    references auth.users(id)
    on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_shippings_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete restrict,

  constraint warehouse_shippings_location_fk
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

  constraint warehouse_shippings_packing_fk
    foreign key (account_id, packing_id)
    references public.warehouse_packings(account_id, id)
    on delete restrict,

  constraint warehouse_shippings_carrier_fk
    foreign key (account_id, carrier_id)
    references public.warehouse_shipping_carriers(account_id, id)
    on delete restrict,

  constraint warehouse_shippings_service_level_fk
    foreign key (account_id, carrier_id, service_level_id)
    references public.warehouse_shipping_service_levels(
      account_id,
      carrier_id,
      id
    )
    on delete restrict,

  constraint warehouse_shippings_vehicle_fk
    foreign key (account_id, vehicle_id)
    references public.warehouse_shipping_vehicles(account_id, id)
    on delete restrict,

  constraint warehouse_shippings_dock_fk
    foreign key (account_id, warehouse_id, dock_id)
    references public.warehouse_shipping_docks(
      account_id,
      warehouse_id,
      id
    )
    on delete restrict,

  constraint warehouse_shippings_number_check
    check (length(btrim(shipping_number)) > 0),

  constraint warehouse_shippings_strategy_check
    check (
      strategy in (
        'single_shipment',
        'multi_order',
        'consolidated',
        'direct_delivery',
        'cross_dock',
        'parcel',
        'less_than_truckload',
        'full_truckload',
        'milk_run',
        'route_optimized',
        'carrier_optimized',
        'cost_optimized',
        'service_level_optimized',
        'temperature_controlled',
        'hazardous_material'
      )
    ),

  constraint warehouse_shippings_status_check
    check (
      status in (
        'draft',
        'planned',
        'released',
        'loading_ready',
        'loading',
        'loaded',
        'dispatched',
        'in_transit',
        'delivered',
        'partially_delivered',
        'delivery_failed',
        'returned',
        'cancelled'
      )
    ),

  constraint warehouse_shippings_service_level_pair_check
    check (
      service_level_id is null
      or carrier_id is not null
    ),

  constraint warehouse_shippings_address_object_check
    check (
      jsonb_typeof(ship_from_address) = 'object'
      and jsonb_typeof(ship_to_address) = 'object'
    ),

  constraint warehouse_shippings_priority_check
    check (priority between 1 and 100),

  constraint warehouse_shippings_cancel_reason_check
    check (
      status <> 'cancelled'
      or (
        cancellation_reason is not null
        and length(btrim(cancellation_reason)) > 0
      )
    ),

  constraint warehouse_shippings_account_number_unique
    unique (account_id, shipping_number),

  constraint warehouse_shippings_account_id_unique
    unique (account_id, id)
);

create unique index if not exists
  warehouse_shippings_packing_unique
on public.warehouse_shippings(account_id, packing_id)
where packing_id is not null;

create unique index if not exists
  warehouse_shippings_reference_unique
on public.warehouse_shippings(
  account_id,
  reference_type,
  reference_id
)
where reference_type is not null
  and reference_id is not null;

create index if not exists
  warehouse_shippings_status_idx
on public.warehouse_shippings(
  account_id,
  warehouse_id,
  status,
  updated_at desc
);

create index if not exists
  warehouse_shippings_carrier_idx
on public.warehouse_shippings(
  account_id,
  carrier_id,
  status
);

create table if not exists public.warehouse_shipping_items (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  shipping_id uuid not null,
  line_number integer not null,
  packing_id uuid,
  packing_item_id uuid,
  order_id text,
  order_item_id text,
  warehouse_id uuid not null,
  product_id uuid not null,
  sku_id uuid,
  requested_quantity numeric(18,6) not null,
  loaded_quantity numeric(18,6) not null default 0,
  delivered_quantity numeric(18,6) not null default 0,
  returned_quantity numeric(18,6) not null default 0,
  damaged_quantity numeric(18,6) not null default 0,
  missing_quantity numeric(18,6) not null default 0,
  remaining_quantity numeric(18,6) not null,
  unit text not null,
  tracking jsonb,
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

  constraint warehouse_shipping_items_shipping_fk
    foreign key (account_id, shipping_id)
    references public.warehouse_shippings(account_id, id)
    on delete cascade,

  constraint warehouse_shipping_items_packing_fk
    foreign key (account_id, packing_id)
    references public.warehouse_packings(account_id, id)
    on delete restrict,

  constraint warehouse_shipping_items_packing_item_fk
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

  constraint warehouse_shipping_items_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete restrict,

  constraint warehouse_shipping_items_product_fk
    foreign key (account_id, product_id)
    references public.warehouse_products(account_id, id)
    on delete restrict,

  constraint warehouse_shipping_items_sku_fk
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

  constraint warehouse_shipping_items_line_check
    check (line_number > 0),

  constraint warehouse_shipping_items_quantity_check
    check (
      requested_quantity > 0
      and loaded_quantity >= 0
      and delivered_quantity >= 0
      and returned_quantity >= 0
      and damaged_quantity >= 0
      and missing_quantity >= 0
      and remaining_quantity >= 0
      and loaded_quantity + damaged_quantity + missing_quantity
        <= requested_quantity
      and remaining_quantity =
        requested_quantity
        - loaded_quantity
        - damaged_quantity
        - missing_quantity
    ),

  constraint warehouse_shipping_items_packing_pair_check
    check (
      packing_item_id is null
      or packing_id is not null
    ),

  constraint warehouse_shipping_items_tracking_check
    check (
      tracking is null
      or jsonb_typeof(tracking) = 'object'
    ),

  constraint warehouse_shipping_items_account_shipping_line_unique
    unique (account_id, shipping_id, line_number),

  constraint warehouse_shipping_items_account_shipping_id_unique
    unique (account_id, shipping_id, id)
);

create index if not exists
  warehouse_shipping_items_product_idx
on public.warehouse_shipping_items(
  account_id,
  warehouse_id,
  product_id,
  sku_id
);

create table if not exists public.warehouse_shipping_packages (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  shipping_id uuid not null,
  packing_id uuid not null,
  packing_package_id uuid not null,
  package_number text not null,
  sscc text,
  tracking_number text,
  status text not null default 'pending',
  weight numeric(18,6),
  volume numeric(18,6),
  weight_unit text,
  volume_unit text,
  pallet_id text,
  parent_package_id uuid,
  loading_sequence integer not null default 0,
  loaded_by text,
  loaded_at timestamptz,
  dispatched_at timestamptz,
  delivered_at timestamptz,
  returned_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_shipping_packages_shipping_fk
    foreign key (account_id, shipping_id)
    references public.warehouse_shippings(account_id, id)
    on delete cascade,

  constraint warehouse_shipping_packages_packing_fk
    foreign key (account_id, packing_id)
    references public.warehouse_packings(account_id, id)
    on delete restrict,

  constraint warehouse_shipping_packages_packing_package_fk
    foreign key (
      account_id,
      packing_id,
      packing_package_id
    )
    references public.warehouse_packing_packages(
      account_id,
      packing_id,
      id
    )
    on delete restrict,

  constraint warehouse_shipping_packages_parent_fk
    foreign key (
      account_id,
      shipping_id,
      parent_package_id
    )
    references public.warehouse_shipping_packages(
      account_id,
      shipping_id,
      id
    )
    on delete restrict,

  constraint warehouse_shipping_packages_number_check
    check (length(btrim(package_number)) > 0),

  constraint warehouse_shipping_packages_status_check
    check (
      status in (
        'pending',
        'loading_ready',
        'loading',
        'loaded',
        'dispatched',
        'in_transit',
        'delivered',
        'delivery_failed',
        'returned',
        'cancelled'
      )
    ),

  constraint warehouse_shipping_packages_dimension_check
    check (
      (weight is null or weight >= 0)
      and
      (volume is null or volume >= 0)
      and loading_sequence >= 0
    ),

  constraint warehouse_shipping_packages_account_shipping_number_unique
    unique (account_id, shipping_id, package_number),

  constraint warehouse_shipping_packages_account_shipping_id_unique
    unique (account_id, shipping_id, id)
);

create unique index if not exists
  warehouse_shipping_packages_packing_package_unique
on public.warehouse_shipping_packages(
  account_id,
  packing_id,
  packing_package_id
);

create index if not exists
  warehouse_shipping_packages_loading_idx
on public.warehouse_shipping_packages(
  account_id,
  shipping_id,
  loading_sequence
);

create table if not exists public.warehouse_shipping_tasks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  shipping_id uuid not null,
  shipping_item_id uuid,
  shipping_package_id uuid,
  warehouse_id uuid not null,
  shipping_location_id uuid not null,
  dock_id uuid,
  vehicle_id uuid,
  type text not null,
  status text not null default 'pending',
  assigned_user_id text,
  assigned_equipment_id text,
  priority integer not null default 50,
  sequence integer not null default 0,
  planned_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_by uuid not null
    references auth.users(id)
    on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_shipping_tasks_shipping_fk
    foreign key (account_id, shipping_id)
    references public.warehouse_shippings(account_id, id)
    on delete cascade,

  constraint warehouse_shipping_tasks_item_fk
    foreign key (
      account_id,
      shipping_id,
      shipping_item_id
    )
    references public.warehouse_shipping_items(
      account_id,
      shipping_id,
      id
    )
    on delete restrict,

  constraint warehouse_shipping_tasks_package_fk
    foreign key (
      account_id,
      shipping_id,
      shipping_package_id
    )
    references public.warehouse_shipping_packages(
      account_id,
      shipping_id,
      id
    )
    on delete restrict,

  constraint warehouse_shipping_tasks_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete restrict,

  constraint warehouse_shipping_tasks_location_fk
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

  constraint warehouse_shipping_tasks_dock_fk
    foreign key (
      account_id,
      warehouse_id,
      dock_id
    )
    references public.warehouse_shipping_docks(
      account_id,
      warehouse_id,
      id
    )
    on delete restrict,

  constraint warehouse_shipping_tasks_vehicle_fk
    foreign key (account_id, vehicle_id)
    references public.warehouse_shipping_vehicles(account_id, id)
    on delete restrict,

  constraint warehouse_shipping_tasks_type_check
    check (
      type in (
        'prepare_packages',
        'verify_packages',
        'assign_dock',
        'assign_vehicle',
        'load_package',
        'verify_weight',
        'verify_manifest',
        'generate_asn',
        'dispatch_vehicle',
        'confirm_delivery'
      )
    ),

  constraint warehouse_shipping_tasks_status_check
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

  constraint warehouse_shipping_tasks_priority_check
    check (priority between 1 and 100),

  constraint warehouse_shipping_tasks_sequence_check
    check (sequence >= 0),

  constraint warehouse_shipping_tasks_account_shipping_id_unique
    unique (account_id, shipping_id, id)
);

create index if not exists
  warehouse_shipping_tasks_sequence_idx
on public.warehouse_shipping_tasks(
  account_id,
  shipping_id,
  status,
  sequence,
  priority
);

create table if not exists public.warehouse_shipping_manifests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  shipping_id uuid not null,
  manifest_number text not null,
  status text not null default 'draft',
  carrier_id uuid,
  service_level_id uuid,
  vehicle_id uuid,
  package_count integer not null default 0,
  total_weight numeric(18,6),
  total_volume numeric(18,6),
  weight_unit text,
  volume_unit text,
  packages jsonb not null default '[]'::jsonb,
  generated_by text,
  generated_at timestamptz,
  approved_by text,
  approved_at timestamptz,
  submitted_at timestamptz,
  accepted_at timestamptz,
  rejection_reason text,
  notes text,
  created_by uuid not null
    references auth.users(id)
    on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_shipping_manifests_shipping_fk
    foreign key (account_id, shipping_id)
    references public.warehouse_shippings(account_id, id)
    on delete cascade,

  constraint warehouse_shipping_manifests_carrier_fk
    foreign key (account_id, carrier_id)
    references public.warehouse_shipping_carriers(account_id, id)
    on delete restrict,

  constraint warehouse_shipping_manifests_service_level_fk
    foreign key (account_id, carrier_id, service_level_id)
    references public.warehouse_shipping_service_levels(
      account_id,
      carrier_id,
      id
    )
    on delete restrict,

  constraint warehouse_shipping_manifests_vehicle_fk
    foreign key (account_id, vehicle_id)
    references public.warehouse_shipping_vehicles(account_id, id)
    on delete restrict,

  constraint warehouse_shipping_manifests_number_check
    check (length(btrim(manifest_number)) > 0),

  constraint warehouse_shipping_manifests_status_check
    check (
      status in (
        'draft',
        'generated',
        'approved',
        'submitted',
        'accepted',
        'rejected',
        'cancelled'
      )
    ),

  constraint warehouse_shipping_manifests_packages_check
    check (jsonb_typeof(packages) = 'array'),

  constraint warehouse_shipping_manifests_quantity_check
    check (
      package_count >= 0
      and (total_weight is null or total_weight >= 0)
      and (total_volume is null or total_volume >= 0)
    ),

  constraint warehouse_shipping_manifests_service_pair_check
    check (
      service_level_id is null
      or carrier_id is not null
    ),

  constraint warehouse_shipping_manifests_account_number_unique
    unique (account_id, manifest_number),

  constraint warehouse_shipping_manifests_account_shipping_id_unique
    unique (account_id, shipping_id, id)
);

create index if not exists
  warehouse_shipping_manifests_shipping_idx
on public.warehouse_shipping_manifests(
  account_id,
  shipping_id,
  created_at
);

create table if not exists public.warehouse_shipping_asns (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  shipping_id uuid not null,
  asn_number text not null,
  status text not null default 'draft',
  sender_code text,
  receiver_code text,
  planned_dispatch_at timestamptz,
  expected_delivery_at timestamptz,
  package_count integer not null default 0,
  lines jsonb not null default '[]'::jsonb,
  format text not null default 'json',
  content text,
  generated_at timestamptz,
  sent_at timestamptz,
  acknowledged_at timestamptz,
  rejection_reason text,
  notes text,
  created_by uuid not null
    references auth.users(id)
    on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_shipping_asns_shipping_fk
    foreign key (account_id, shipping_id)
    references public.warehouse_shippings(account_id, id)
    on delete cascade,

  constraint warehouse_shipping_asns_number_check
    check (length(btrim(asn_number)) > 0),

  constraint warehouse_shipping_asns_status_check
    check (
      status in (
        'draft',
        'generated',
        'sent',
        'acknowledged',
        'rejected',
        'cancelled'
      )
    ),

  constraint warehouse_shipping_asns_format_check
    check (
      format in (
        'json',
        'xml',
        'edi',
        'edifact',
        'custom'
      )
    ),

  constraint warehouse_shipping_asns_lines_check
    check (jsonb_typeof(lines) = 'array'),

  constraint warehouse_shipping_asns_package_count_check
    check (package_count >= 0),

  constraint warehouse_shipping_asns_account_number_unique
    unique (account_id, asn_number),

  constraint warehouse_shipping_asns_account_shipping_id_unique
    unique (account_id, shipping_id, id)
);

create index if not exists
  warehouse_shipping_asns_shipping_idx
on public.warehouse_shipping_asns(
  account_id,
  shipping_id,
  created_at
);

alter table public.warehouse_shippings
  add constraint warehouse_shippings_manifest_fk
  foreign key (
    account_id,
    id,
    manifest_id
  )
  references public.warehouse_shipping_manifests(
    account_id,
    shipping_id,
    id
  )
  on delete restrict;

alter table public.warehouse_shippings
  add constraint warehouse_shippings_asn_fk
  foreign key (
    account_id,
    id,
    asn_id
  )
  references public.warehouse_shipping_asns(
    account_id,
    shipping_id,
    id
  )
  on delete restrict;

create table if not exists public.warehouse_shipping_tracking_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  shipping_id uuid not null,
  shipping_package_id uuid,
  tracking_number text,
  type text not null,
  message text not null,
  location_name text,
  city text,
  country_code text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  source text not null,
  external_event_code text,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),

  constraint warehouse_shipping_tracking_events_shipping_fk
    foreign key (account_id, shipping_id)
    references public.warehouse_shippings(account_id, id)
    on delete cascade,

  constraint warehouse_shipping_tracking_events_package_fk
    foreign key (
      account_id,
      shipping_id,
      shipping_package_id
    )
    references public.warehouse_shipping_packages(
      account_id,
      shipping_id,
      id
    )
    on delete restrict,

  constraint warehouse_shipping_tracking_events_type_check
    check (
      type in (
        'shipment_created',
        'released',
        'loading_ready',
        'loading_started',
        'package_loaded',
        'vehicle_loaded',
        'dispatched',
        'carrier_received',
        'in_transit',
        'transfer_center',
        'out_for_delivery',
        'delivery_attempted',
        'delivered',
        'delivery_failed',
        'returned',
        'exception'
      )
    ),

  constraint warehouse_shipping_tracking_events_source_check
    check (
      source in (
        'warehouse',
        'carrier',
        'driver',
        'customer',
        'system'
      )
    ),

  constraint warehouse_shipping_tracking_events_message_check
    check (length(btrim(message)) > 0),

  constraint warehouse_shipping_tracking_events_coordinates_check
    check (
      (latitude is null or latitude between -90 and 90)
      and
      (longitude is null or longitude between -180 and 180)
    ),

  constraint warehouse_shipping_tracking_events_account_shipping_id_unique
    unique (account_id, shipping_id, id)
);

create index if not exists
  warehouse_shipping_tracking_events_time_idx
on public.warehouse_shipping_tracking_events(
  account_id,
  shipping_id,
  occurred_at
);

create table if not exists public.warehouse_shipping_proofs_of_delivery (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  shipping_id uuid not null,
  status text not null default 'pending',
  recipient_name text not null,
  recipient_identity_number text,
  recipient_phone text,
  signature_url text,
  photo_urls text[] not null default '{}'::text[],
  document_urls text[] not null default '{}'::text[],
  latitude numeric(10,7),
  longitude numeric(10,7),
  delivery_address text,
  delivered_at timestamptz not null,
  captured_by text not null,
  verified_by text,
  verified_at timestamptz,
  rejection_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_shipping_pod_shipping_fk
    foreign key (account_id, shipping_id)
    references public.warehouse_shippings(account_id, id)
    on delete cascade,

  constraint warehouse_shipping_pod_status_check
    check (
      status in (
        'pending',
        'captured',
        'verified',
        'rejected',
        'cancelled'
      )
    ),

  constraint warehouse_shipping_pod_recipient_check
    check (length(btrim(recipient_name)) > 0),

  constraint warehouse_shipping_pod_captured_by_check
    check (length(btrim(captured_by)) > 0),

  constraint warehouse_shipping_pod_coordinates_check
    check (
      (latitude is null or latitude between -90 and 90)
      and
      (longitude is null or longitude between -180 and 180)
    ),

  constraint warehouse_shipping_pod_account_shipping_id_unique
    unique (account_id, shipping_id, id)
);

create index if not exists
  warehouse_shipping_pod_shipping_idx
on public.warehouse_shipping_proofs_of_delivery(
  account_id,
  shipping_id,
  delivered_at
);

create table if not exists public.warehouse_shipping_suggestions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  shipping_id uuid not null,
  carrier_id uuid,
  service_level_id uuid,
  vehicle_id uuid,
  dock_id uuid,
  carrier_snapshot jsonb,
  service_level_snapshot jsonb,
  vehicle_snapshot jsonb,
  dock_snapshot jsonb,
  estimated_cost numeric(18,6),
  currency text,
  estimated_delivery_at timestamptz,
  score jsonb not null,
  reasons text[] not null default '{}'::text[],
  warnings text[] not null default '{}'::text[],
  selected boolean not null default false,
  created_at timestamptz not null default now(),

  constraint warehouse_shipping_suggestions_shipping_fk
    foreign key (account_id, shipping_id)
    references public.warehouse_shippings(account_id, id)
    on delete cascade,

  constraint warehouse_shipping_suggestions_carrier_fk
    foreign key (account_id, carrier_id)
    references public.warehouse_shipping_carriers(account_id, id)
    on delete restrict,

  constraint warehouse_shipping_suggestions_service_level_fk
    foreign key (account_id, carrier_id, service_level_id)
    references public.warehouse_shipping_service_levels(
      account_id,
      carrier_id,
      id
    )
    on delete restrict,

  constraint warehouse_shipping_suggestions_vehicle_fk
    foreign key (account_id, vehicle_id)
    references public.warehouse_shipping_vehicles(account_id, id)
    on delete restrict,

  constraint warehouse_shipping_suggestions_dock_fk
    foreign key (account_id, dock_id)
    references public.warehouse_shipping_docks(account_id, id)
    on delete restrict,

  constraint warehouse_shipping_suggestions_service_pair_check
    check (
      service_level_id is null
      or carrier_id is not null
    ),

  constraint warehouse_shipping_suggestions_cost_check
    check (estimated_cost is null or estimated_cost >= 0),

  constraint warehouse_shipping_suggestions_score_check
    check (jsonb_typeof(score) = 'object'),

  constraint warehouse_shipping_suggestions_snapshot_check
    check (
      (carrier_snapshot is null or jsonb_typeof(carrier_snapshot) = 'object')
      and
      (
        service_level_snapshot is null
        or jsonb_typeof(service_level_snapshot) = 'object'
      )
      and
      (vehicle_snapshot is null or jsonb_typeof(vehicle_snapshot) = 'object')
      and
      (dock_snapshot is null or jsonb_typeof(dock_snapshot) = 'object')
    ),

  constraint warehouse_shipping_suggestions_account_shipping_id_unique
    unique (account_id, shipping_id, id)
);

create index if not exists
  warehouse_shipping_suggestions_score_idx
on public.warehouse_shipping_suggestions(
  account_id,
  shipping_id,
  selected,
  created_at
);

create table if not exists public.warehouse_shipping_exceptions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  shipping_id uuid not null,
  shipping_item_id uuid,
  shipping_package_id uuid,
  task_id uuid,
  manifest_id uuid,
  type text not null,
  message text not null,
  warehouse_id uuid,
  dock_id uuid,
  vehicle_id uuid,
  carrier_id uuid,
  resolved boolean not null default false,
  resolved_by text,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now(),

  constraint warehouse_shipping_exceptions_shipping_fk
    foreign key (account_id, shipping_id)
    references public.warehouse_shippings(account_id, id)
    on delete cascade,

  constraint warehouse_shipping_exceptions_item_fk
    foreign key (
      account_id,
      shipping_id,
      shipping_item_id
    )
    references public.warehouse_shipping_items(
      account_id,
      shipping_id,
      id
    )
    on delete restrict,

  constraint warehouse_shipping_exceptions_package_fk
    foreign key (
      account_id,
      shipping_id,
      shipping_package_id
    )
    references public.warehouse_shipping_packages(
      account_id,
      shipping_id,
      id
    )
    on delete restrict,

  constraint warehouse_shipping_exceptions_task_fk
    foreign key (
      account_id,
      shipping_id,
      task_id
    )
    references public.warehouse_shipping_tasks(
      account_id,
      shipping_id,
      id
    )
    on delete restrict,

  constraint warehouse_shipping_exceptions_manifest_fk
    foreign key (
      account_id,
      shipping_id,
      manifest_id
    )
    references public.warehouse_shipping_manifests(
      account_id,
      shipping_id,
      id
    )
    on delete restrict,

  constraint warehouse_shipping_exceptions_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete restrict,

  constraint warehouse_shipping_exceptions_dock_fk
    foreign key (account_id, dock_id)
    references public.warehouse_shipping_docks(account_id, id)
    on delete restrict,

  constraint warehouse_shipping_exceptions_vehicle_fk
    foreign key (account_id, vehicle_id)
    references public.warehouse_shipping_vehicles(account_id, id)
    on delete restrict,

  constraint warehouse_shipping_exceptions_carrier_fk
    foreign key (account_id, carrier_id)
    references public.warehouse_shipping_carriers(account_id, id)
    on delete restrict,

  constraint warehouse_shipping_exceptions_type_check
    check (
      type in (
        'package_missing',
        'package_excess',
        'package_damaged',
        'package_not_ready',
        'package_label_missing',
        'package_sscc_mismatch',
        'weight_mismatch',
        'volume_exceeded',
        'vehicle_capacity_exceeded',
        'vehicle_not_available',
        'driver_not_available',
        'carrier_not_available',
        'carrier_service_unavailable',
        'dock_not_available',
        'dock_assignment_conflict',
        'loading_sequence_error',
        'manifest_mismatch',
        'asn_generation_failed',
        'tracking_number_missing',
        'temperature_mismatch',
        'hazardous_material_mismatch',
        'address_invalid',
        'dispatch_blocked',
        'delivery_failed',
        'proof_of_delivery_missing'
      )
    ),

  constraint warehouse_shipping_exceptions_message_check
    check (length(btrim(message)) > 0),

  constraint warehouse_shipping_exceptions_resolution_check
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

  constraint warehouse_shipping_exceptions_account_shipping_id_unique
    unique (account_id, shipping_id, id)
);

create index if not exists
  warehouse_shipping_exceptions_open_idx
on public.warehouse_shipping_exceptions(
  account_id,
  shipping_id,
  resolved,
  created_at
);

alter table public.warehouse_shipping_carriers enable row level security;
alter table public.warehouse_shipping_service_levels enable row level security;
alter table public.warehouse_shipping_vehicles enable row level security;
alter table public.warehouse_shipping_docks enable row level security;
alter table public.warehouse_shippings enable row level security;
alter table public.warehouse_shipping_items enable row level security;
alter table public.warehouse_shipping_packages enable row level security;
alter table public.warehouse_shipping_tasks enable row level security;
alter table public.warehouse_shipping_manifests enable row level security;
alter table public.warehouse_shipping_asns enable row level security;
alter table public.warehouse_shipping_tracking_events enable row level security;
alter table public.warehouse_shipping_proofs_of_delivery enable row level security;
alter table public.warehouse_shipping_suggestions enable row level security;
alter table public.warehouse_shipping_exceptions enable row level security;

create policy warehouse_shipping_carriers_member_select
on public.warehouse_shipping_carriers
for select to authenticated
using (public.warehouse_has_account_access(account_id));

create policy warehouse_shipping_service_levels_member_select
on public.warehouse_shipping_service_levels
for select to authenticated
using (public.warehouse_has_account_access(account_id));

create policy warehouse_shipping_vehicles_member_select
on public.warehouse_shipping_vehicles
for select to authenticated
using (public.warehouse_has_account_access(account_id));

create policy warehouse_shipping_docks_member_select
on public.warehouse_shipping_docks
for select to authenticated
using (public.warehouse_has_account_access(account_id));

create policy warehouse_shippings_member_select
on public.warehouse_shippings
for select to authenticated
using (public.warehouse_has_account_access(account_id));

create policy warehouse_shipping_items_member_select
on public.warehouse_shipping_items
for select to authenticated
using (public.warehouse_has_account_access(account_id));

create policy warehouse_shipping_packages_member_select
on public.warehouse_shipping_packages
for select to authenticated
using (public.warehouse_has_account_access(account_id));

create policy warehouse_shipping_tasks_member_select
on public.warehouse_shipping_tasks
for select to authenticated
using (public.warehouse_has_account_access(account_id));

create policy warehouse_shipping_manifests_member_select
on public.warehouse_shipping_manifests
for select to authenticated
using (public.warehouse_has_account_access(account_id));

create policy warehouse_shipping_asns_member_select
on public.warehouse_shipping_asns
for select to authenticated
using (public.warehouse_has_account_access(account_id));

create policy warehouse_shipping_tracking_events_member_select
on public.warehouse_shipping_tracking_events
for select to authenticated
using (public.warehouse_has_account_access(account_id));

create policy warehouse_shipping_pod_member_select
on public.warehouse_shipping_proofs_of_delivery
for select to authenticated
using (public.warehouse_has_account_access(account_id));

create policy warehouse_shipping_suggestions_member_select
on public.warehouse_shipping_suggestions
for select to authenticated
using (public.warehouse_has_account_access(account_id));

create policy warehouse_shipping_exceptions_member_select
on public.warehouse_shipping_exceptions
for select to authenticated
using (public.warehouse_has_account_access(account_id));

revoke all on
  public.warehouse_shipping_carriers,
  public.warehouse_shipping_service_levels,
  public.warehouse_shipping_vehicles,
  public.warehouse_shipping_docks,
  public.warehouse_shippings,
  public.warehouse_shipping_items,
  public.warehouse_shipping_packages,
  public.warehouse_shipping_tasks,
  public.warehouse_shipping_manifests,
  public.warehouse_shipping_asns,
  public.warehouse_shipping_tracking_events,
  public.warehouse_shipping_proofs_of_delivery,
  public.warehouse_shipping_suggestions,
  public.warehouse_shipping_exceptions
from anon, authenticated;

grant select on
  public.warehouse_shipping_carriers,
  public.warehouse_shipping_service_levels,
  public.warehouse_shipping_vehicles,
  public.warehouse_shipping_docks,
  public.warehouse_shippings,
  public.warehouse_shipping_items,
  public.warehouse_shipping_packages,
  public.warehouse_shipping_tasks,
  public.warehouse_shipping_manifests,
  public.warehouse_shipping_asns,
  public.warehouse_shipping_tracking_events,
  public.warehouse_shipping_proofs_of_delivery,
  public.warehouse_shipping_suggestions,
  public.warehouse_shipping_exceptions
to authenticated;

grant all on
  public.warehouse_shipping_carriers,
  public.warehouse_shipping_service_levels,
  public.warehouse_shipping_vehicles,
  public.warehouse_shipping_docks,
  public.warehouse_shippings,
  public.warehouse_shipping_items,
  public.warehouse_shipping_packages,
  public.warehouse_shipping_tasks,
  public.warehouse_shipping_manifests,
  public.warehouse_shipping_asns,
  public.warehouse_shipping_tracking_events,
  public.warehouse_shipping_proofs_of_delivery,
  public.warehouse_shipping_suggestions,
  public.warehouse_shipping_exceptions
to service_role;

-- No authenticated INSERT / UPDATE / DELETE policy is created by A9.1.
