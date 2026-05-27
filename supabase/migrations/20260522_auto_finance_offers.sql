create table if not exists public.finance_offers (
  id uuid primary key default gen_random_uuid(),
  provider_name text not null,
  provider_type text default 'bank',
  min_amount numeric,
  max_amount numeric,
  min_term integer,
  max_term integer,
  monthly_rate numeric not null,
  allocation_fee numeric default 0,
  insurance_required boolean default false,
  is_active boolean default true,
  apply_url text,
  source text default 'seed',
  updated_at timestamptz default now()
);

alter table public.finance_offers enable row level security;

drop policy if exists "Public can read active finance offers" on public.finance_offers;

create policy "Public can read active finance offers"
on public.finance_offers
for select
using (is_active = true);
alter table public.vehicle_catalog
add column if not exists image_url text;
