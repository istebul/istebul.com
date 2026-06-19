-- Repair: idempotent partner dispatch fields + kasko_leads (no is_admin_user dependency)

alter table public.housing_leads
  add column if not exists partner_endpoint_id uuid references public.partner_endpoints(id) on delete set null,
  add column if not exists partner_dispatch_status text not null default 'pending',
  add column if not exists partner_dispatch_at timestamptz,
  add column if not exists partner_dispatch_error text,
  add column if not exists partner_dispatch_retry_count integer not null default 0,
  add column if not exists partner_dispatch_next_retry_at timestamptz;

alter table public.vacation_leads
  add column if not exists partner_endpoint_id uuid references public.partner_endpoints(id) on delete set null,
  add column if not exists partner_dispatch_status text not null default 'pending',
  add column if not exists partner_dispatch_at timestamptz,
  add column if not exists partner_dispatch_error text,
  add column if not exists partner_dispatch_retry_count integer not null default 0,
  add column if not exists partner_dispatch_next_retry_at timestamptz;

alter table public.sigorta_leads
  add column if not exists partner_endpoint_id uuid references public.partner_endpoints(id) on delete set null,
  add column if not exists partner_dispatch_status text not null default 'pending',
  add column if not exists partner_dispatch_at timestamptz,
  add column if not exists partner_dispatch_error text,
  add column if not exists partner_dispatch_retry_count integer not null default 0,
  add column if not exists partner_dispatch_next_retry_at timestamptz;

alter table public.vertical_leads
  add column if not exists partner_endpoint_id uuid references public.partner_endpoints(id) on delete set null,
  add column if not exists partner_dispatch_status text not null default 'pending',
  add column if not exists partner_dispatch_at timestamptz,
  add column if not exists partner_dispatch_error text,
  add column if not exists partner_dispatch_retry_count integer not null default 0,
  add column if not exists partner_dispatch_next_retry_at timestamptz;

create table if not exists public.kasko_leads (
  id uuid primary key default gen_random_uuid(),
  session_id text,
  full_name text,
  email text,
  phone text,
  vehicle_info text,
  coverage_preference text,
  decision_score int,
  ai_summary text,
  profile_json jsonb not null default '{}'::jsonb,
  selected_option text,
  status text not null default 'new',
  notes text,
  partner_endpoint_id uuid references public.partner_endpoints(id) on delete set null,
  partner_dispatch_status text not null default 'pending',
  partner_dispatch_at timestamptz,
  partner_dispatch_error text,
  partner_dispatch_retry_count integer not null default 0,
  partner_dispatch_next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.partner_endpoints
  drop constraint if exists partner_endpoints_route_type_check;

alter table public.partner_endpoints
  add constraint partner_endpoints_route_type_check
    check (route_type in (
      'dealer_partner',
      'finance_partner',
      'insurance_partner',
      'premium_report',
      'general_sales',
      'housing',
      'finance',
      'vacation',
      'insurance',
      'kasko'
    ));

alter table public.partner_lead_dispatch_logs
  add column if not exists lead_source text not null default 'auto_leads';

alter table public.kasko_leads enable row level security;

drop policy if exists "kasko_leads anon insert" on public.kasko_leads;
create policy "kasko_leads anon insert" on public.kasko_leads
  for insert to anon, authenticated with check (true);

drop policy if exists "kasko_leads deny client read" on public.kasko_leads;
create policy "kasko_leads deny client read" on public.kasko_leads
  for select to anon using (false);

drop policy if exists "Admins full kasko_leads" on public.kasko_leads;
create policy "Admins full kasko_leads" on public.kasko_leads
  for all to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and coalesce(p.is_banned, false) = false
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and coalesce(p.is_banned, false) = false
  ));
