create table if not exists public.business_document_analyses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.business_accounts(id)
    on delete cascade,
  document_id uuid not null
    references public.business_documents(id)
    on delete cascade,
  created_by uuid not null
    references auth.users(id)
    on delete restrict,
  analysis_type text not null,
  category text not null,
  score integer not null
    check (score >= 0 and score <= 100),
  summary text not null,
  kpis jsonb not null default '[]'::jsonb,
  insights jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id)
);

create index if not exists business_document_analyses_business_id_idx
  on public.business_document_analyses (
    business_id,
    created_at desc
  );

create index if not exists business_document_analyses_document_id_idx
  on public.business_document_analyses (document_id);

alter table public.business_document_analyses
  enable row level security;

drop policy if exists "business document analyses member read"
  on public.business_document_analyses;

create policy "business document analyses member read"
  on public.business_document_analyses
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.business_users membership
      where membership.business_id =
        business_document_analyses.business_id
        and membership.user_id = auth.uid()
    )
  );

drop policy if exists "business document analyses member insert"
  on public.business_document_analyses;

create policy "business document analyses member insert"
  on public.business_document_analyses
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.business_users membership
      where membership.business_id =
        business_document_analyses.business_id
        and membership.user_id = auth.uid()
        and membership.role in ('owner', 'admin', 'editor')
    )
  );

drop policy if exists "business document analyses member update"
  on public.business_document_analyses;

create policy "business document analyses member update"
  on public.business_document_analyses
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.business_users membership
      where membership.business_id =
        business_document_analyses.business_id
        and membership.user_id = auth.uid()
        and membership.role in ('owner', 'admin', 'editor')
    )
  )
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.business_users membership
      where membership.business_id =
        business_document_analyses.business_id
        and membership.user_id = auth.uid()
        and membership.role in ('owner', 'admin', 'editor')
    )
  );

drop policy if exists "business documents member update"
  on public.business_documents;

create policy "business documents member update"
  on public.business_documents
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.business_users membership
      where membership.business_id =
        business_documents.business_id
        and membership.user_id = auth.uid()
        and membership.role in ('owner', 'admin', 'editor')
    )
  )
  with check (
    exists (
      select 1
      from public.business_users membership
      where membership.business_id =
        business_documents.business_id
        and membership.user_id = auth.uid()
        and membership.role in ('owner', 'admin', 'editor')
    )
  );
