create table if not exists public.business_projects (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.business_accounts(id) on delete cascade,
  created_by uuid not null
    references auth.users(id) on delete cascade,
  title text not null,
  project_type text not null
    check (project_type in ('report', 'presentation', 'analysis')),
  template_id text,
  status text not null default 'draft'
    check (status in ('draft', 'processing', 'completed', 'failed')),
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_files (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.business_accounts(id) on delete cascade,
  project_id uuid not null
    references public.business_projects(id) on delete cascade,
  uploaded_by uuid not null
    references auth.users(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  status text not null default 'uploaded'
    check (status in ('uploaded', 'processing', 'ready', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.business_reports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.business_accounts(id) on delete cascade,
  project_id uuid not null
    references public.business_projects(id) on delete cascade,
  created_by uuid not null
    references auth.users(id) on delete cascade,
  title text not null,
  report_type text not null,
  content jsonb not null default '{}'::jsonb,
  executive_summary text,
  output_formats text[] not null default '{}'::text[],
  status text not null default 'draft'
    check (status in ('draft', 'generated', 'reviewed', 'published', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_projects_business_id_idx
  on public.business_projects(business_id);

create index if not exists business_projects_created_by_idx
  on public.business_projects(created_by);

create index if not exists business_files_project_id_idx
  on public.business_files(project_id);

create index if not exists business_reports_project_id_idx
  on public.business_reports(project_id);

alter table public.business_projects enable row level security;
alter table public.business_files enable row level security;
alter table public.business_reports enable row level security;

drop policy if exists "business_projects member read"
  on public.business_projects;

create policy "business_projects member read"
  on public.business_projects
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.business_users bu
      where bu.business_id = business_projects.business_id
        and bu.user_id = auth.uid()
    )
  );

drop policy if exists "business_projects editor manage"
  on public.business_projects;

create policy "business_projects editor manage"
  on public.business_projects
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.business_users bu
      where bu.business_id = business_projects.business_id
        and bu.user_id = auth.uid()
        and bu.role in ('owner', 'admin', 'analyst', 'member')
    )
  )
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.business_users bu
      where bu.business_id = business_projects.business_id
        and bu.user_id = auth.uid()
        and bu.role in ('owner', 'admin', 'analyst', 'member')
    )
  );

drop policy if exists "business_files member access"
  on public.business_files;

create policy "business_files member access"
  on public.business_files
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.business_users bu
      where bu.business_id = business_files.business_id
        and bu.user_id = auth.uid()
    )
  )
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1
      from public.business_users bu
      where bu.business_id = business_files.business_id
        and bu.user_id = auth.uid()
        and bu.role in ('owner', 'admin', 'analyst', 'member')
    )
  );

drop policy if exists "business_reports member read"
  on public.business_reports;

create policy "business_reports member read"
  on public.business_reports
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.business_users bu
      where bu.business_id = business_reports.business_id
        and bu.user_id = auth.uid()
    )
  );

drop policy if exists "business_reports editor manage"
  on public.business_reports;

create policy "business_reports editor manage"
  on public.business_reports
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.business_users bu
      where bu.business_id = business_reports.business_id
        and bu.user_id = auth.uid()
        and bu.role in ('owner', 'admin', 'analyst', 'member')
    )
  )
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.business_users bu
      where bu.business_id = business_reports.business_id
        and bu.user_id = auth.uid()
        and bu.role in ('owner', 'admin', 'analyst', 'member')
    )
  );
