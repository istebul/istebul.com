create table if not exists public.business_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active'
    check (status in ('active', 'trial', 'suspended', 'closed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_users (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'analyst', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create index if not exists business_users_user_id_idx
  on public.business_users(user_id);

create index if not exists business_users_business_id_idx
  on public.business_users(business_id);

alter table public.business_accounts enable row level security;
alter table public.business_users enable row level security;

alter table public.business_snapshots
  add column if not exists created_by uuid references auth.users(id) on delete set null;

create unique index if not exists business_snapshots_business_unique
  on public.business_snapshots(business_id);

alter table public.business_snapshots enable row level security;

drop policy if exists "business_accounts member read"
  on public.business_accounts;

create policy "business_accounts member read"
  on public.business_accounts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.business_users bu
      where bu.business_id = business_accounts.id
        and bu.user_id = auth.uid()
    )
  );

drop policy if exists "business_users member read"
  on public.business_users;

create policy "business_users member read"
  on public.business_users
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.business_users manager
      where manager.business_id = business_users.business_id
        and manager.user_id = auth.uid()
        and manager.role in ('owner', 'admin')
    )
  );

drop policy if exists "business_users owner admin manage"
  on public.business_users;

create policy "business_users owner admin manage"
  on public.business_users
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.business_users manager
      where manager.business_id = business_users.business_id
        and manager.user_id = auth.uid()
        and manager.role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1
      from public.business_users manager
      where manager.business_id = business_users.business_id
        and manager.user_id = auth.uid()
        and manager.role in ('owner', 'admin')
    )
  );

drop policy if exists "business_snapshots member read"
  on public.business_snapshots;

create policy "business_snapshots member read"
  on public.business_snapshots
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.business_users bu
      where bu.business_id = business_snapshots.business_id
        and bu.user_id = auth.uid()
    )
  );

drop policy if exists "business_snapshots editor manage"
  on public.business_snapshots;

create policy "business_snapshots editor manage"
  on public.business_snapshots
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.business_users bu
      where bu.business_id = business_snapshots.business_id
        and bu.user_id = auth.uid()
        and bu.role in ('owner', 'admin', 'analyst')
    )
  )
  with check (
    exists (
      select 1
      from public.business_users bu
      where bu.business_id = business_snapshots.business_id
        and bu.user_id = auth.uid()
        and bu.role in ('owner', 'admin', 'analyst')
    )
  );
