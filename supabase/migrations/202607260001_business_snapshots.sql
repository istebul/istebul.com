create table if not exists public.business_snapshots (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null,
    snapshot jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_business_snapshots_business
on public.business_snapshots(business_id);

alter table public.business_snapshots enable row level security;

drop policy if exists "business_snapshots_service_role" on public.business_snapshots;

create policy "business_snapshots_service_role"
on public.business_snapshots
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
