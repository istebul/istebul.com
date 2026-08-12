-- =========================================================
-- WarehouseIQ — Inventory Reservation Persistence
-- EPIC-010F / A5.1
--
-- Warehouse stok rezervasyonu, GarsonAI restoran
-- rezervasyonundan tamamen ayrı bir bounded context'tir.
--
-- Bu migration:
-- - Warehouse inventory reservation tablosunu oluşturur.
-- - Tenant/depo/lokasyon/ürün/SKU bütünlüğünü kurar.
-- - RLS ile authenticated SELECT sağlar.
-- - Doğrudan INSERT / UPDATE / DELETE açmaz.
-- - Picking satırındaki reservation_id alanını gerçek
--   Warehouse inventory reservation tablosuna bağlar.
--
-- Bu migration:
-- - stok bakiyesi değiştirmez,
-- - inventory movement üretmez,
-- - rezervasyon tüketmez,
-- - Picking execute işlemi yapmaz.
-- =========================================================


create table if not exists public.warehouse_inventory_reservations (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null
    references public.warehouse_accounts(id)
    on delete cascade,

  reservation_number text not null,

  warehouse_id uuid not null,
  location_id uuid not null,

  product_id uuid not null,
  sku_id uuid,

  lot_number text,
  serial_number text,

  quantity numeric(18,6) not null,
  consumed_quantity numeric(18,6) not null default 0,

  unit text not null,

  status text not null default 'active',

  reference_type text,
  reference_id text,
  reference_number text,

  expires_at timestamptz,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_inventory_reservations_warehouse_fk
    foreign key (
      account_id,
      warehouse_id
    )
    references public.warehouses(
      account_id,
      id
    )
    on delete restrict,

  constraint warehouse_inventory_reservations_location_fk
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

  constraint warehouse_inventory_reservations_product_fk
    foreign key (
      account_id,
      product_id
    )
    references public.warehouse_products(
      account_id,
      id
    )
    on delete restrict,

  constraint warehouse_inventory_reservations_sku_fk
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

  constraint warehouse_inventory_reservations_number_not_blank_check
    check (
      length(btrim(reservation_number)) > 0
    ),

  constraint warehouse_inventory_reservations_unit_not_blank_check
    check (
      length(btrim(unit)) > 0
    ),

  constraint warehouse_inventory_reservations_quantity_check
    check (
      quantity > 0
      and consumed_quantity >= 0
      and consumed_quantity <= quantity
    ),

  constraint warehouse_inventory_reservations_status_check
    check (
      status in (
        'active',
        'partially_consumed',
        'consumed',
        'cancelled',
        'expired'
      )
    ),

  constraint warehouse_inventory_reservations_status_quantity_check
    check (
      (
        status = 'active'
        and consumed_quantity = 0
      )
      or
      (
        status = 'partially_consumed'
        and consumed_quantity > 0
        and consumed_quantity < quantity
      )
      or
      (
        status = 'consumed'
        and consumed_quantity = quantity
      )
      or
      status in (
        'cancelled',
        'expired'
      )
    ),

  constraint warehouse_inventory_reservations_reference_pair_check
    check (
      (
        reference_type is null
        and reference_id is null
      )
      or
      (
        reference_type is not null
        and length(btrim(reference_type)) > 0
        and reference_id is not null
        and length(btrim(reference_id)) > 0
      )
    ),

  constraint warehouse_inventory_reservations_account_number_unique
    unique (
      account_id,
      reservation_number
    ),

  constraint warehouse_inventory_reservations_account_id_id_unique
    unique (
      account_id,
      id
    )
);


create index if not exists
  warehouse_inventory_reservations_inventory_idx
on public.warehouse_inventory_reservations (
  account_id,
  warehouse_id,
  location_id,
  product_id,
  sku_id,
  status
);


create index if not exists
  warehouse_inventory_reservations_tracking_idx
on public.warehouse_inventory_reservations (
  account_id,
  product_id,
  sku_id,
  lot_number,
  serial_number
);


create index if not exists
  warehouse_inventory_reservations_reference_idx
on public.warehouse_inventory_reservations (
  account_id,
  reference_type,
  reference_id
)
where
  reference_type is not null
  and reference_id is not null;


create index if not exists
  warehouse_inventory_reservations_active_idx
on public.warehouse_inventory_reservations (
  account_id,
  warehouse_id,
  location_id,
  product_id,
  created_at
)
where status in (
  'active',
  'partially_consumed'
);


create index if not exists
  warehouse_inventory_reservations_expiry_idx
on public.warehouse_inventory_reservations (
  account_id,
  expires_at
)
where
  status in (
    'active',
    'partially_consumed'
  )
  and expires_at is not null;


-- =========================================================
-- updated_at
-- =========================================================

drop trigger if exists
  trg_warehouse_inventory_reservations_updated_at
on public.warehouse_inventory_reservations;

create trigger
  trg_warehouse_inventory_reservations_updated_at
before update
on public.warehouse_inventory_reservations
for each row
execute function public.warehouse_set_updated_at();


-- =========================================================
-- Picking reservation FK
--
-- A2 sırasında Warehouse reservation persistence henüz
-- bulunmadığı için reservation_id yalnız UUID idi.
-- Artık gerçek bounded-context FK kurulabilir.
-- =========================================================

alter table public.warehouse_picking_items
  add constraint warehouse_picking_items_inventory_reservation_fk
  foreign key (
    account_id,
    reservation_id
  )
  references public.warehouse_inventory_reservations(
    account_id,
    id
  )
  on delete restrict;


-- =========================================================
-- RLS
-- =========================================================

alter table public.warehouse_inventory_reservations
  enable row level security;


drop policy if exists
  warehouse_inventory_reservations_member_select
on public.warehouse_inventory_reservations;

create policy
  warehouse_inventory_reservations_member_select
on public.warehouse_inventory_reservations
for select
to authenticated
using (
  public.warehouse_has_account_access(
    account_id
  )
);


-- =========================================================
-- Direct mutation kapalıdır.
--
-- Reservation create/consume/cancel işlemleri daha sonra
-- kontrollü SECURITY DEFINER RPC kapılarından yapılacaktır.
-- =========================================================

revoke insert, update, delete
on public.warehouse_inventory_reservations
from authenticated;

grant select
on public.warehouse_inventory_reservations
to authenticated;
