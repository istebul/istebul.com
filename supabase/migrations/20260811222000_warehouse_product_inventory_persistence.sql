-- WarehouseIQ Ürün, SKU, Barkod ve Stok Kalıcılığı
-- EPIC-010D-A1
--
-- Güvenlik:
-- - account_id ile firma izolasyonu
-- - authenticated kullanıcı JWT'si
-- - warehouse_has_account_access / warehouse_has_account_role RLS yardımcıları
-- - stok hareket defteri append-only

-- =========================================================
-- Ürünler
-- =========================================================

create table if not exists public.warehouse_products (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null
    references public.warehouse_accounts(id) on delete cascade,

  code text not null,
  name text not null,
  description text,
  category text,
  brand text,

  status text not null default 'draft',
  base_unit text not null,

  weight_kilograms numeric(18,6),
  volume_cubic_meters numeric(18,9),
  width_centimeters numeric(18,3),
  depth_centimeters numeric(18,3),
  height_centimeters numeric(18,3),

  lot_tracking_required boolean not null default false,
  serial_tracking_required boolean not null default false,
  expiry_date_tracking_required boolean not null default false,
  production_date_tracking_required boolean not null default false,
  minimum_shelf_life_days integer,

  minimum_stock_quantity numeric(18,6),
  maximum_stock_quantity numeric(18,6),
  reorder_point_quantity numeric(18,6),
  reorder_quantity numeric(18,6),
  safety_stock_quantity numeric(18,6),

  hazardous_material boolean not null default false,
  temperature_controlled boolean not null default false,

  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_products_code_not_blank_check
    check (length(btrim(code)) > 0),
  constraint warehouse_products_name_not_blank_check
    check (length(btrim(name)) > 0),
  constraint warehouse_products_status_check
    check (
      status in (
        'draft',
        'active',
        'inactive',
        'discontinued',
        'archived'
      )
    ),
  constraint warehouse_products_base_unit_check
    check (
      base_unit in (
        'piece',
        'box',
        'case',
        'package',
        'pallet',
        'kilogram',
        'gram',
        'liter',
        'milliliter',
        'meter',
        'square_meter',
        'cubic_meter'
      )
    ),
  constraint warehouse_products_weight_check
    check (weight_kilograms is null or weight_kilograms >= 0),
  constraint warehouse_products_volume_check
    check (volume_cubic_meters is null or volume_cubic_meters >= 0),
  constraint warehouse_products_dimensions_check
    check (
      (width_centimeters is null or width_centimeters >= 0)
      and (depth_centimeters is null or depth_centimeters >= 0)
      and (height_centimeters is null or height_centimeters >= 0)
    ),
  constraint warehouse_products_shelf_life_check
    check (
      minimum_shelf_life_days is null
      or minimum_shelf_life_days >= 0
    ),
  constraint warehouse_products_stock_rules_check
    check (
      (minimum_stock_quantity is null or minimum_stock_quantity >= 0)
      and (maximum_stock_quantity is null or maximum_stock_quantity >= 0)
      and (reorder_point_quantity is null or reorder_point_quantity >= 0)
      and (reorder_quantity is null or reorder_quantity >= 0)
      and (safety_stock_quantity is null or safety_stock_quantity >= 0)
      and (
        minimum_stock_quantity is null
        or maximum_stock_quantity is null
        or minimum_stock_quantity <= maximum_stock_quantity
      )
    ),
  constraint warehouse_products_account_code_unique
    unique (account_id, code),
  constraint warehouse_products_account_id_id_unique
    unique (account_id, id)
);

create index if not exists warehouse_products_account_status_idx
  on public.warehouse_products (account_id, status);

create index if not exists warehouse_products_account_name_idx
  on public.warehouse_products (account_id, name);

drop trigger if exists trg_warehouse_products_updated_at
  on public.warehouse_products;

create trigger trg_warehouse_products_updated_at
before update on public.warehouse_products
for each row execute function public.warehouse_set_updated_at();

-- =========================================================
-- SKU
-- =========================================================

create table if not exists public.warehouse_product_skus (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  product_id uuid not null,

  sku_code text not null,
  name text not null,
  unit text not null,
  conversion_factor numeric(18,6) not null default 1,
  active boolean not null default true,

  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_product_skus_product_fk
    foreign key (account_id, product_id)
    references public.warehouse_products(account_id, id)
    on delete cascade,

  constraint warehouse_product_skus_code_not_blank_check
    check (length(btrim(sku_code)) > 0),
  constraint warehouse_product_skus_name_not_blank_check
    check (length(btrim(name)) > 0),
  constraint warehouse_product_skus_unit_check
    check (
      unit in (
        'piece',
        'box',
        'case',
        'package',
        'pallet',
        'kilogram',
        'gram',
        'liter',
        'milliliter',
        'meter',
        'square_meter',
        'cubic_meter'
      )
    ),
  constraint warehouse_product_skus_conversion_factor_check
    check (conversion_factor > 0),
  constraint warehouse_product_skus_account_code_unique
    unique (account_id, sku_code),
  constraint warehouse_product_skus_account_id_id_unique
    unique (account_id, id),
  constraint warehouse_product_skus_account_product_id_unique
    unique (account_id, product_id, id)
);

create index if not exists warehouse_product_skus_product_idx
  on public.warehouse_product_skus (account_id, product_id, active);

drop trigger if exists trg_warehouse_product_skus_updated_at
  on public.warehouse_product_skus;

create trigger trg_warehouse_product_skus_updated_at
before update on public.warehouse_product_skus
for each row execute function public.warehouse_set_updated_at();

-- =========================================================
-- Barkodlar
-- =========================================================

create table if not exists public.warehouse_product_barcodes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  product_id uuid not null,
  sku_id uuid,

  value text not null,
  type text not null,
  is_primary boolean not null default false,
  active boolean not null default true,

  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),

  constraint warehouse_product_barcodes_product_fk
    foreign key (account_id, product_id)
    references public.warehouse_products(account_id, id)
    on delete cascade,

  constraint warehouse_product_barcodes_sku_fk
    foreign key (account_id, product_id, sku_id)
    references public.warehouse_product_skus(account_id, product_id, id)
    on delete cascade,

  constraint warehouse_product_barcodes_value_not_blank_check
    check (length(btrim(value)) > 0),

  constraint warehouse_product_barcodes_type_check
    check (
      type in (
        'ean13',
        'ean8',
        'upca',
        'upce',
        'code128',
        'code39',
        'itf14',
        'qr',
        'internal'
      )
    ),

  constraint warehouse_product_barcodes_account_value_unique
    unique (account_id, value)
);

create index if not exists warehouse_product_barcodes_product_idx
  on public.warehouse_product_barcodes (account_id, product_id, active);

create index if not exists warehouse_product_barcodes_sku_idx
  on public.warehouse_product_barcodes (account_id, sku_id)
  where sku_id is not null;

-- =========================================================
-- Stok hareketleri
-- =========================================================

-- Kaynak/hedef lokasyon FK'ları için mevcut lokasyon tablosunda
-- firma + depo + lokasyon bütünlüğünü adreslenebilir hale getirir.
create unique index if not exists warehouse_locations_account_warehouse_id_uidx
  on public.warehouse_locations (account_id, warehouse_id, id);

create table if not exists public.warehouse_inventory_movements (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null
    references public.warehouse_accounts(id) on delete cascade,

  movement_number text not null,
  movement_type text not null,
  direction text not null,

  warehouse_id uuid not null,
  location_id uuid not null,
  product_id uuid not null,
  sku_id uuid,

  source_warehouse_id uuid,
  source_location_id uuid,
  destination_warehouse_id uuid,
  destination_location_id uuid,

  stock_status text not null default 'available',
  quantity numeric(18,6) not null,
  unit text not null,

  lot_number text,
  serial_number text,
  production_date date,
  expiry_date date,

  reference_type text,
  reference_id text,
  reference_number text,

  reason text,
  notes text,

  reversal_of_movement_id uuid,
  transaction_group_id text,

  occurred_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),

  constraint warehouse_inventory_movements_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete restrict,

  constraint warehouse_inventory_movements_location_fk
    foreign key (account_id, warehouse_id, location_id)
    references public.warehouse_locations(account_id, warehouse_id, id)
    on delete restrict,

  constraint warehouse_inventory_movements_product_fk
    foreign key (account_id, product_id)
    references public.warehouse_products(account_id, id)
    on delete restrict,

  constraint warehouse_inventory_movements_sku_fk
    foreign key (account_id, product_id, sku_id)
    references public.warehouse_product_skus(account_id, product_id, id)
    on delete restrict,

  constraint warehouse_inventory_movements_source_warehouse_fk
    foreign key (account_id, source_warehouse_id)
    references public.warehouses(account_id, id)
    on delete restrict,

  constraint warehouse_inventory_movements_source_location_fk
    foreign key (account_id, source_warehouse_id, source_location_id)
    references public.warehouse_locations(account_id, warehouse_id, id)
    on delete restrict,

  constraint warehouse_inventory_movements_destination_warehouse_fk
    foreign key (account_id, destination_warehouse_id)
    references public.warehouses(account_id, id)
    on delete restrict,

  constraint warehouse_inventory_movements_destination_location_fk
    foreign key (
      account_id,
      destination_warehouse_id,
      destination_location_id
    )
    references public.warehouse_locations(account_id, warehouse_id, id)
    on delete restrict,

  constraint warehouse_inventory_movements_reversal_fk
    foreign key (reversal_of_movement_id)
    references public.warehouse_inventory_movements(id)
    on delete restrict,

  constraint warehouse_inventory_movements_number_not_blank_check
    check (length(btrim(movement_number)) > 0),

  constraint warehouse_inventory_movements_type_check
    check (
      movement_type in (
        'goods_receipt',
        'purchase_receipt',
        'production_receipt',
        'customer_return',
        'putaway',
        'location_transfer',
        'warehouse_transfer_out',
        'warehouse_transfer_in',
        'reservation',
        'unreservation',
        'order_issue',
        'count_surplus',
        'count_shortage',
        'damage',
        'scrap',
        'disposal',
        'manual_adjustment_in',
        'manual_adjustment_out',
        'reversal'
      )
    ),

  constraint warehouse_inventory_movements_direction_check
    check (
      direction in (
        'inbound',
        'outbound',
        'transfer',
        'reservation',
        'adjustment'
      )
    ),

  constraint warehouse_inventory_movements_stock_status_check
    check (
      stock_status in (
        'available',
        'reserved',
        'blocked',
        'quality_control',
        'damaged',
        'scrap',
        'disposal',
        'in_transit'
      )
    ),

  constraint warehouse_inventory_movements_unit_check
    check (
      unit in (
        'piece',
        'box',
        'case',
        'package',
        'pallet',
        'kilogram',
        'gram',
        'liter',
        'milliliter',
        'meter',
        'square_meter',
        'cubic_meter'
      )
    ),

  constraint warehouse_inventory_movements_quantity_check
    check (quantity > 0),

  constraint warehouse_inventory_movements_tracking_dates_check
    check (
      production_date is null
      or expiry_date is null
      or production_date <= expiry_date
    ),

  constraint warehouse_inventory_movements_source_pair_check
    check (
      (source_warehouse_id is null and source_location_id is null)
      or (
        source_warehouse_id is not null
        and source_location_id is not null
      )
    ),

  constraint warehouse_inventory_movements_destination_pair_check
    check (
      (
        destination_warehouse_id is null
        and destination_location_id is null
      )
      or (
        destination_warehouse_id is not null
        and destination_location_id is not null
      )
    ),

  constraint warehouse_inventory_movements_account_number_unique
    unique (account_id, movement_number)
);

create index if not exists warehouse_inventory_movements_lookup_idx
  on public.warehouse_inventory_movements
    (account_id, warehouse_id, location_id, product_id, occurred_at desc);

create index if not exists warehouse_inventory_movements_sku_idx
  on public.warehouse_inventory_movements
    (account_id, sku_id, occurred_at desc)
  where sku_id is not null;

create index if not exists warehouse_inventory_movements_group_idx
  on public.warehouse_inventory_movements
    (account_id, transaction_group_id)
  where transaction_group_id is not null;

create index if not exists warehouse_inventory_movements_reference_idx
  on public.warehouse_inventory_movements
    (account_id, reference_type, reference_id)
  where reference_type is not null and reference_id is not null;

-- =========================================================
-- Stok bakiyeleri
-- =========================================================

create table if not exists public.warehouse_inventory_balances (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null
    references public.warehouse_accounts(id) on delete cascade,

  warehouse_id uuid not null,
  location_id uuid not null,
  product_id uuid not null,
  sku_id uuid,

  lot_number text,
  serial_number text,
  stock_status text not null,

  quantity numeric(18,6) not null default 0,
  unit text not null,

  last_movement_id uuid,
  last_movement_at timestamptz,
  updated_at timestamptz not null default now(),

  constraint warehouse_inventory_balances_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete cascade,

  constraint warehouse_inventory_balances_location_fk
    foreign key (account_id, warehouse_id, location_id)
    references public.warehouse_locations(account_id, warehouse_id, id)
    on delete cascade,

  constraint warehouse_inventory_balances_product_fk
    foreign key (account_id, product_id)
    references public.warehouse_products(account_id, id)
    on delete restrict,

  constraint warehouse_inventory_balances_sku_fk
    foreign key (account_id, product_id, sku_id)
    references public.warehouse_product_skus(account_id, product_id, id)
    on delete restrict,

  constraint warehouse_inventory_balances_quantity_check
    check (quantity >= 0),

  constraint warehouse_inventory_balances_stock_status_check
    check (
      stock_status in (
        'available',
        'reserved',
        'blocked',
        'quality_control',
        'damaged',
        'scrap',
        'disposal',
        'in_transit'
      )
    ),

  constraint warehouse_inventory_balances_unit_check
    check (
      unit in (
        'piece',
        'box',
        'case',
        'package',
        'pallet',
        'kilogram',
        'gram',
        'liter',
        'milliliter',
        'meter',
        'square_meter',
        'cubic_meter'
      )
    )
);

create unique index if not exists warehouse_inventory_balances_natural_uidx
  on public.warehouse_inventory_balances (
    account_id,
    warehouse_id,
    location_id,
    product_id,
    sku_id,
    lot_number,
    serial_number,
    stock_status
  ) nulls not distinct;

create index if not exists warehouse_inventory_balances_product_idx
  on public.warehouse_inventory_balances
    (account_id, warehouse_id, product_id, stock_status);

drop trigger if exists trg_warehouse_inventory_balances_updated_at
  on public.warehouse_inventory_balances;

create trigger trg_warehouse_inventory_balances_updated_at
before update on public.warehouse_inventory_balances
for each row execute function public.warehouse_set_updated_at();

-- =========================================================
-- RLS
-- =========================================================

alter table public.warehouse_products enable row level security;
alter table public.warehouse_product_skus enable row level security;
alter table public.warehouse_product_barcodes enable row level security;
alter table public.warehouse_inventory_movements enable row level security;
alter table public.warehouse_inventory_balances enable row level security;

-- Ürün master verisi: tüm aktif üyeler okuyabilir.
drop policy if exists warehouse_products_member_select
  on public.warehouse_products;

create policy warehouse_products_member_select
on public.warehouse_products
for select to authenticated
using (public.warehouse_has_account_access(account_id));

drop policy if exists warehouse_product_skus_member_select
  on public.warehouse_product_skus;

create policy warehouse_product_skus_member_select
on public.warehouse_product_skus
for select to authenticated
using (public.warehouse_has_account_access(account_id));

drop policy if exists warehouse_product_barcodes_member_select
  on public.warehouse_product_barcodes;

create policy warehouse_product_barcodes_member_select
on public.warehouse_product_barcodes
for select to authenticated
using (public.warehouse_has_account_access(account_id));

-- Ürün master yazımı: yönetim + stok sorumluları.
drop policy if exists warehouse_products_master_insert
  on public.warehouse_products;

create policy warehouse_products_master_insert
on public.warehouse_products
for insert to authenticated
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

drop policy if exists warehouse_products_master_update
  on public.warehouse_products;

create policy warehouse_products_master_update
on public.warehouse_products
for update to authenticated
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

drop policy if exists warehouse_product_skus_master_insert
  on public.warehouse_product_skus;

create policy warehouse_product_skus_master_insert
on public.warehouse_product_skus
for insert to authenticated
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

drop policy if exists warehouse_product_skus_master_update
  on public.warehouse_product_skus;

create policy warehouse_product_skus_master_update
on public.warehouse_product_skus
for update to authenticated
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

drop policy if exists warehouse_product_barcodes_master_insert
  on public.warehouse_product_barcodes;

create policy warehouse_product_barcodes_master_insert
on public.warehouse_product_barcodes
for insert to authenticated
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

drop policy if exists warehouse_product_barcodes_master_update
  on public.warehouse_product_barcodes;

create policy warehouse_product_barcodes_master_update
on public.warehouse_product_barcodes
for update to authenticated
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

-- Stok verisi: tüm aktif üyeler okuyabilir.
drop policy if exists warehouse_inventory_movements_member_select
  on public.warehouse_inventory_movements;

create policy warehouse_inventory_movements_member_select
on public.warehouse_inventory_movements
for select to authenticated
using (public.warehouse_has_account_access(account_id));

drop policy if exists warehouse_inventory_balances_member_select
  on public.warehouse_inventory_balances;

create policy warehouse_inventory_balances_member_select
on public.warehouse_inventory_balances
for select to authenticated
using (public.warehouse_has_account_access(account_id));

-- Hareket defteri append-only.
drop policy if exists warehouse_inventory_movements_operator_insert
  on public.warehouse_inventory_movements;

create policy warehouse_inventory_movements_operator_insert
on public.warehouse_inventory_movements
for insert to authenticated
with check (
  public.warehouse_has_account_role(
    account_id,
    array[
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
      'operator'
    ]::text[]
  )
  and created_by = auth.uid()
);

-- Bakiye domain servisleri tarafından stok hareketiyle birlikte güncellenir.
drop policy if exists warehouse_inventory_balances_operator_insert
  on public.warehouse_inventory_balances;

create policy warehouse_inventory_balances_operator_insert
on public.warehouse_inventory_balances
for insert to authenticated
with check (
  public.warehouse_has_account_role(
    account_id,
    array[
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
      'operator'
    ]::text[]
  )
);

drop policy if exists warehouse_inventory_balances_operator_update
  on public.warehouse_inventory_balances;

create policy warehouse_inventory_balances_operator_update
on public.warehouse_inventory_balances
for update to authenticated
using (
  public.warehouse_has_account_role(
    account_id,
    array[
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
      'operator'
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
      'inventory_controller',
      'receiver',
      'quality_controller',
      'forklift_operator',
      'picker',
      'packer',
      'dispatcher',
      'operator'
    ]::text[]
  )
);

-- =========================================================
-- Grants
-- =========================================================

grant select, insert, update
  on public.warehouse_products
  to authenticated;

grant select, insert, update
  on public.warehouse_product_skus
  to authenticated;

grant select, insert, update
  on public.warehouse_product_barcodes
  to authenticated;

grant select, insert
  on public.warehouse_inventory_movements
  to authenticated;

grant select, insert, update
  on public.warehouse_inventory_balances
  to authenticated;
