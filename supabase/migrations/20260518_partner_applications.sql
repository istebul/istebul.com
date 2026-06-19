create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  company_name text not null,
  contact_name text not null,
  phone text not null,
  email text not null,
  city text,
  category text not null,
  lead_capacity text,
  webhook_ready boolean default false,

  status text not null default 'new',
  notes text default '',

  constraint partner_applications_status_check
    check (status in (
      'new',
      'contacted',
      'qualified',
      'integrating',
      'live',
      'rejected'
    ))
);

alter table public.partner_applications enable row level security;

drop policy if exists "admin full access partner applications" on public.partner_applications;
create policy "admin full access partner applications"
on public.partner_applications
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and coalesce(profiles.is_banned,false) = false
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and coalesce(profiles.is_banned,false) = false
  )
);
create table if not exists public.partner_endpoints (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  name text not null,
  route_type text not null,
  webhook_url text not null,
  shared_secret text,
  is_active boolean not null default true,

  priority_weight integer not null default 100,
  daily_cap integer,
  sent_today integer not null default 0,
  success_count integer not null default 0,
  fail_count integer not null default 0,

  notes text default '',

  constraint partner_endpoints_route_type_check
    check (route_type in (
      'dealer_partner',
      'finance_partner',
      'insurance_partner',
      'premium_report',
      'general_sales'
    ))
);

alter table public.partner_endpoints enable row level security;

drop policy if exists "admin full access partner endpoints" on public.partner_endpoints;
create policy "admin full access partner endpoints"
on public.partner_endpoints
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and coalesce(profiles.is_banned,false) = false
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and coalesce(profiles.is_banned,false) = false
  )
);
