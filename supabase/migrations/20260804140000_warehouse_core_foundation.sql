-- WarehouseIQ Core Database Foundation
-- Accounts, users, warehouses and warehouse locations.

create extension if not exists pgcrypto;

-- =========================================================
-- Updated-at trigger
-- =========================================================

create or replace function public.warehouse_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- Warehouse accounts
-- =========================================================

create table if not exists public.warehouse_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  status text not null default 'active',
  timezone text not null default 'Europe/Istanbul',
  country_code text not null default 'TR',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_accounts_code_format_check
    check (code ~ '^[A-Z0-9][A-Z0-9_-]{1,31}$'),

  constraint warehouse_accounts_name_not_blank_check
    check (length(btrim(name)) > 0),

  constraint warehouse_accounts_status_check
    check (status in ('active', 'suspended', 'inactive', 'archived')),

  constraint warehouse_accounts_country_code_check
    check (country_code ~ '^[A-Z]{2}$'),

  constraint warehouse_accounts_code_unique
    unique (code)
);

-- =========================================================
-- Warehouse account memberships
-- =========================================================

create table if not exists public.warehouse_users (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null
    references public.warehouse_accounts(id) on delete cascade,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  role text not null default 'operator',
  status text not null default 'active',
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_users_role_check
    check (
      role in (
        'owner',
        'admin',
        'warehouse_manager',
        'supervisor',
        'inventory_controller',
        'receiver',
        'quality_controller',
        'forklift_operator',
        'picker',
        'packer',
        'dispatcher',
        'driver',
        'operator',
        'viewer'
      )
    ),

  constraint warehouse_users_status_check
    check (status in ('invited', 'active', 'suspended', 'inactive')),

  constraint warehouse_users_account_user_unique
    unique (account_id, user_id)
);

-- =========================================================
-- Membership helpers
-- =========================================================

create or replace function public.warehouse_has_account_access(
  requested_account_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.warehouse_users membership
    where membership.account_id = requested_account_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  );
$$;

create or replace function public.warehouse_has_account_role(
  requested_account_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.warehouse_users membership
    where membership.account_id = requested_account_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = any (allowed_roles)
  );
$$;

revoke all on function public.warehouse_has_account_access(uuid)
  from public;

revoke all on function public.warehouse_has_account_role(uuid, text[])
  from public;

grant execute on function public.warehouse_has_account_access(uuid)
  to authenticated;

grant execute on function public.warehouse_has_account_role(uuid, text[])
  to authenticated;

-- =========================================================
-- Warehouses
-- =========================================================

create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null
    references public.warehouse_accounts(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  status text not null default 'draft',
  timezone text not null default 'Europe/Istanbul',

  address_line text,
  district text,
  city text,
  postal_code text,
  country_code text not null default 'TR',

  total_area_square_meters numeric(14, 3),
  usable_area_square_meters numeric(14, 3),
  maximum_pallet_capacity integer,
  maximum_bin_capacity integer,

  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouses_code_format_check
    check (code ~ '^[A-Z0-9][A-Z0-9_-]{1,31}$'),

  constraint warehouses_name_not_blank_check
    check (length(btrim(name)) > 0),

  constraint warehouses_status_check
    check (
      status in (
        'draft',
        'active',
        'temporarily_closed',
        'inactive',
        'archived'
      )
    ),

  constraint warehouses_country_code_check
    check (country_code ~ '^[A-Z]{2}$'),

  constraint warehouses_total_area_check
    check (
      total_area_square_meters is null
      or total_area_square_meters >= 0
    ),

  constraint warehouses_usable_area_check
    check (
      usable_area_square_meters is null
      or usable_area_square_meters >= 0
    ),

  constraint warehouses_area_relationship_check
    check (
      total_area_square_meters is null
      or usable_area_square_meters is null
      or usable_area_square_meters <= total_area_square_meters
    ),

  constraint warehouses_pallet_capacity_check
    check (
      maximum_pallet_capacity is null
      or maximum_pallet_capacity >= 0
    ),

  constraint warehouses_bin_capacity_check
    check (
      maximum_bin_capacity is null
      or maximum_bin_capacity >= 0
    ),

  constraint warehouses_account_code_unique
    unique (account_id, code),

  constraint warehouses_account_id_id_unique
    unique (account_id, id)
);

-- =========================================================
-- Warehouse locations
-- =========================================================

create table if not exists public.warehouse_locations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  warehouse_id uuid not null,
  parent_location_id uuid,

  code text not null,
  full_code text not null,
  barcode text not null,
  name text not null,
  description text,

  location_type text not null,
  status text not null default 'empty',

  zone_code text not null,
  aisle_code text,
  rack_code text,
  level_code text,
  bin_code text,

  maximum_weight_kilograms numeric(14, 3),
  maximum_volume_cubic_meters numeric(14, 6),
  maximum_pallet_count integer,
  maximum_unit_count numeric(16, 3),

  width_centimeters numeric(14, 3),
  depth_centimeters numeric(14, 3),
  height_centimeters numeric(14, 3),

  coordinate_x numeric(14, 3),
  coordinate_y numeric(14, 3),
  coordinate_z numeric(14, 3),

  temperature_minimum_celsius numeric(6, 2),
  temperature_maximum_celsius numeric(6, 2),

  hazardous_material_allowed boolean not null default false,
  mixed_sku_allowed boolean not null default false,
  active boolean not null default true,

  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_locations_account_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete cascade,

  constraint warehouse_locations_parent_fk
    foreign key (parent_location_id)
    references public.warehouse_locations(id)
    on delete restrict,

  constraint warehouse_locations_code_format_check
    check (code ~ '^[A-Z0-9][A-Z0-9_-]{0,31}$'),

  constraint warehouse_locations_full_code_not_blank_check
    check (length(btrim(full_code)) > 0),

  constraint warehouse_locations_barcode_not_blank_check
    check (length(btrim(barcode)) > 0),

  constraint warehouse_locations_name_not_blank_check
    check (length(btrim(name)) > 0),

  constraint warehouse_locations_zone_code_check
    check (zone_code ~ '^[A-Z0-9][A-Z0-9_-]{0,31}$'),

  constraint warehouse_locations_type_check
    check (
      location_type in (
        'receiving',
        'quality_control',
        'reserve',
        'picking',
        'bulk',
        'cold_storage',
        'hazardous',
        'returns',
        'damaged',
        'packing',
        'shipping',
        'cross_dock'
      )
    ),

  constraint warehouse_locations_status_check
    check (
      status in (
        'empty',
        'available',
        'reserved',
        'occupied',
        'blocked',
        'maintenance',
        'inactive'
      )
    ),

  constraint warehouse_locations_weight_check
    check (
      maximum_weight_kilograms is null
      or maximum_weight_kilograms >= 0
    ),

  constraint warehouse_locations_volume_check
    check (
      maximum_volume_cubic_meters is null
      or maximum_volume_cubic_meters >= 0
    ),

  constraint warehouse_locations_pallet_check
    check (
      maximum_pallet_count is null
      or maximum_pallet_count >= 0
    ),

  constraint warehouse_locations_unit_check
    check (
      maximum_unit_count is null
      or maximum_unit_count >= 0
    ),

  constraint warehouse_locations_width_check
    check (width_centimeters is null or width_centimeters >= 0),

  constraint warehouse_locations_depth_check
    check (depth_centimeters is null or depth_centimeters >= 0),

  constraint warehouse_locations_height_check
    check (height_centimeters is null or height_centimeters >= 0),

  constraint warehouse_locations_min_temperature_check
    check (
      temperature_minimum_celsius is null
      or temperature_minimum_celsius between -100 and 100
    ),

  constraint warehouse_locations_max_temperature_check
    check (
      temperature_maximum_celsius is null
      or temperature_maximum_celsius between -100 and 100
    ),

  constraint warehouse_locations_temperature_range_check
    check (
      temperature_minimum_celsius is null
      or temperature_maximum_celsius is null
      or temperature_minimum_celsius <= temperature_maximum_celsius
    ),

  constraint warehouse_locations_warehouse_full_code_unique
    unique (warehouse_id, full_code),

  constraint warehouse_locations_warehouse_barcode_unique
    unique (warehouse_id, barcode)
);

-- =========================================================
-- Indexes
-- =========================================================

create index if not exists warehouse_users_user_status_idx
  on public.warehouse_users (user_id, status);

create index if not exists warehouse_users_account_role_idx
  on public.warehouse_users (account_id, role, status);

create index if not exists warehouses_account_status_idx
  on public.warehouses (account_id, status);

create index if not exists warehouses_account_name_idx
  on public.warehouses (account_id, name);

create index if not exists warehouse_locations_warehouse_status_idx
  on public.warehouse_locations (warehouse_id, status);

create index if not exists warehouse_locations_warehouse_type_idx
  on public.warehouse_locations (warehouse_id, location_type);

create index if not exists warehouse_locations_parent_idx
  on public.warehouse_locations (parent_location_id);

create index if not exists warehouse_locations_hierarchy_idx
  on public.warehouse_locations (
    warehouse_id,
    zone_code,
    aisle_code,
    rack_code,
    level_code,
    bin_code
  );

-- =========================================================
-- Updated-at triggers
-- =========================================================

drop trigger if exists trg_warehouse_accounts_updated_at
  on public.warehouse_accounts;

create trigger trg_warehouse_accounts_updated_at
before update on public.warehouse_accounts
for each row execute function public.warehouse_set_updated_at();

drop trigger if exists trg_warehouse_users_updated_at
  on public.warehouse_users;

create trigger trg_warehouse_users_updated_at
before update on public.warehouse_users
for each row execute function public.warehouse_set_updated_at();

drop trigger if exists trg_warehouses_updated_at
  on public.warehouses;

create trigger trg_warehouses_updated_at
before update on public.warehouses
for each row execute function public.warehouse_set_updated_at();

drop trigger if exists trg_warehouse_locations_updated_at
  on public.warehouse_locations;

create trigger trg_warehouse_locations_updated_at
before update on public.warehouse_locations
for each row execute function public.warehouse_set_updated_at();

-- =========================================================
-- Row Level Security
-- =========================================================

alter table public.warehouse_accounts enable row level security;
alter table public.warehouse_users enable row level security;
alter table public.warehouses enable row level security;
alter table public.warehouse_locations enable row level security;

-- Account policies

drop policy if exists warehouse_accounts_member_select
  on public.warehouse_accounts;

create policy warehouse_accounts_member_select
on public.warehouse_accounts
for select
to authenticated
using (public.warehouse_has_account_access(id));

drop policy if exists warehouse_accounts_manager_update
  on public.warehouse_accounts;

create policy warehouse_accounts_manager_update
on public.warehouse_accounts
for update
to authenticated
using (
  public.warehouse_has_account_role(
    id,
    array['owner', 'admin']::text[]
  )
)
with check (
  public.warehouse_has_account_role(
    id,
    array['owner', 'admin']::text[]
  )
);

-- Membership policies

drop policy if exists warehouse_users_member_select
  on public.warehouse_users;

create policy warehouse_users_member_select
on public.warehouse_users
for select
to authenticated
using (
  user_id = auth.uid()
  or public.warehouse_has_account_role(
    account_id,
    array['owner', 'admin', 'warehouse_manager']::text[]
  )
);

drop policy if exists warehouse_users_manager_insert
  on public.warehouse_users;

create policy warehouse_users_manager_insert
on public.warehouse_users
for insert
to authenticated
with check (
  public.warehouse_has_account_role(
    account_id,
    array['owner', 'admin']::text[]
  )
);

drop policy if exists warehouse_users_manager_update
  on public.warehouse_users;

create policy warehouse_users_manager_update
on public.warehouse_users
for update
to authenticated
using (
  public.warehouse_has_account_role(
    account_id,
    array['owner', 'admin']::text[]
  )
)
with check (
  public.warehouse_has_account_role(
    account_id,
    array['owner', 'admin']::text[]
  )
);

drop policy if exists warehouse_users_manager_delete
  on public.warehouse_users;

create policy warehouse_users_manager_delete
on public.warehouse_users
for delete
to authenticated
using (
  public.warehouse_has_account_role(
    account_id,
    array['owner', 'admin']::text[]
  )
);

-- Warehouse policies

drop policy if exists warehouses_member_select
  on public.warehouses;

create policy warehouses_member_select
on public.warehouses
for select
to authenticated
using (public.warehouse_has_account_access(account_id));

drop policy if exists warehouses_manager_insert
  on public.warehouses;

create policy warehouses_manager_insert
on public.warehouses
for insert
to authenticated
with check (
  public.warehouse_has_account_role(
    account_id,
    array['owner', 'admin', 'warehouse_manager']::text[]
  )
  and created_by = auth.uid()
);

drop policy if exists warehouses_manager_update
  on public.warehouses;

create policy warehouses_manager_update
on public.warehouses
for update
to authenticated
using (
  public.warehouse_has_account_role(
    account_id,
    array['owner', 'admin', 'warehouse_manager']::text[]
  )
)
with check (
  public.warehouse_has_account_role(
    account_id,
    array['owner', 'admin', 'warehouse_manager']::text[]
  )
);

drop policy if exists warehouses_admin_delete
  on public.warehouses;

create policy warehouses_admin_delete
on public.warehouses
for delete
to authenticated
using (
  public.warehouse_has_account_role(
    account_id,
    array['owner', 'admin']::text[]
  )
);

-- Location policies

drop policy if exists warehouse_locations_member_select
  on public.warehouse_locations;

create policy warehouse_locations_member_select
on public.warehouse_locations
for select
to authenticated
using (public.warehouse_has_account_access(account_id));

drop policy if exists warehouse_locations_operator_insert
  on public.warehouse_locations;

create policy warehouse_locations_operator_insert
on public.warehouse_locations
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
  and created_by = auth.uid()
);

drop policy if exists warehouse_locations_operator_update
  on public.warehouse_locations;

create policy warehouse_locations_operator_update
on public.warehouse_locations
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

drop policy if exists warehouse_locations_manager_delete
  on public.warehouse_locations;

create policy warehouse_locations_manager_delete
on public.warehouse_locations
for delete
to authenticated
using (
  public.warehouse_has_account_role(
    account_id,
    array['owner', 'admin', 'warehouse_manager']::text[]
  )
);

-- =========================================================
-- Grants
-- =========================================================

grant select, insert, update, delete
  on public.warehouse_accounts
  to authenticated;

grant select, insert, update, delete
  on public.warehouse_users
  to authenticated;

grant select, insert, update, delete
  on public.warehouses
  to authenticated;

grant select, insert, update, delete
  on public.warehouse_locations
  to authenticated;
