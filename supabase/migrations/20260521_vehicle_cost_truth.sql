create table if not exists public.vehicle_cost_profiles (
  id uuid primary key default gen_random_uuid(),

  vehicle_id uuid not null references public.vehicle_catalog(id) on delete cascade,

  fuel_city numeric,
  fuel_highway numeric,

  annual_maintenance integer,
  annual_insurance integer,
  annual_kasko integer,
  annual_tax integer,
  annual_tires integer,

  annual_ev_charging integer,

  depreciation_3y numeric,
  depreciation_5y numeric,

  source text default 'seed',
  confidence integer default 70,

  updated_at timestamptz default now()
);

create unique index if not exists idx_vehicle_cost_profiles_vehicle
on public.vehicle_cost_profiles(vehicle_id);

alter table public.vehicle_cost_profiles enable row level security;

drop policy if exists "Public can read vehicle costs" on public.vehicle_cost_profiles;

create policy "Public can read vehicle costs"
on public.vehicle_cost_profiles
for select
using (true);
