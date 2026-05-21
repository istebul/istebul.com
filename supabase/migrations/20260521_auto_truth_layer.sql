-- Auto Truth Layer
-- Vehicle model catalog + optional dealer inventory.
-- This does not replace existing listings, auto_leads, or auto_events tables.

create table if not exists public.vehicle_catalog (
  id uuid primary key default gen_random_uuid(),

  brand text not null,
  model text not null,
  trim text,
  model_year integer,

  body text not null check (body in ('suv','sedan','hatchback','mpv','pickup','van')),
  fuel text not null check (fuel in ('gasoline','diesel','hybrid','electric','lpg')),
  transmission text default 'automatic',

  price_reference numeric,
  city_consumption numeric,
  highway_consumption numeric,

  family_score integer default 5 check (family_score between 1 and 10),
  city_score integer default 5 check (city_score between 1 and 10),
  long_score integer default 5 check (long_score between 1 and 10),
  resale_score integer default 5 check (resale_score between 1 and 10),
  maintenance_score integer default 5 check (maintenance_score between 1 and 10),
  reliability_score integer default 5 check (reliability_score between 1 and 10),
  depreciation_score integer default 5 check (depreciation_score between 1 and 10),

  insurance_band text,
  kasko_band text,
  tax_band text,

  source text default 'manual',
  source_url text,
  is_active boolean default true,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique (brand, model, trim, model_year, fuel, body)
);

create index if not exists idx_vehicle_catalog_active on public.vehicle_catalog(is_active);
create index if not exists idx_vehicle_catalog_body on public.vehicle_catalog(body);
create index if not exists idx_vehicle_catalog_fuel on public.vehicle_catalog(fuel);
create index if not exists idx_vehicle_catalog_brand on public.vehicle_catalog(brand);

create table if not exists public.dealer_inventory (
  id uuid primary key default gen_random_uuid(),

  vehicle_catalog_id uuid references public.vehicle_catalog(id) on delete set null,

  dealer_name text not null,
  dealer_city text default 'İzmir',
  dealer_district text,

  title text not null,
  price numeric,
  km integer,
  color text,

  condition text default 'used' check (condition in ('new','used')),
  listing_url text,
  image_url text,
  stock_status text default 'available' check (stock_status in ('available','reserved','sold','inactive')),

  partner_status text default 'manual' check (partner_status in ('manual','partner','verified')),
  source text default 'manual',
  source_url text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_dealer_inventory_vehicle on public.dealer_inventory(vehicle_catalog_id);
create index if not exists idx_dealer_inventory_status on public.dealer_inventory(stock_status);
create index if not exists idx_dealer_inventory_city on public.dealer_inventory(dealer_city);

alter table public.vehicle_catalog enable row level security;
alter table public.dealer_inventory enable row level security;

drop policy if exists "Public can read active vehicle catalog" on public.vehicle_catalog;
create policy "Public can read active vehicle catalog"
on public.vehicle_catalog
for select
using (is_active = true);

drop policy if exists "Public can read available dealer inventory" on public.dealer_inventory;
create policy "Public can read available dealer inventory"
on public.dealer_inventory
for select
using (stock_status = 'available');

-- Writes should stay admin/service-role only.
