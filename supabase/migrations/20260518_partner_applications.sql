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
