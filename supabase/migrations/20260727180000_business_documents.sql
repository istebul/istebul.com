create table if not exists public.business_documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.business_accounts(id)
    on delete cascade,
  project_id uuid
    references public.business_projects(id)
    on delete set null,
  uploaded_by uuid not null
    references auth.users(id)
    on delete restrict,
  file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null
    check (file_size_bytes > 0 and file_size_bytes <= 52428800),
  storage_path text not null unique,
  document_type text not null
    check (
      document_type in ('xlsx', 'csv', 'pdf', 'docx', 'pptx')
    ),
  status text not null default 'uploaded'
    check (
      status in ('uploaded', 'processing', 'ready', 'failed')
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_documents_business_id_idx
  on public.business_documents(business_id);

create index if not exists business_documents_project_id_idx
  on public.business_documents(project_id);

alter table public.business_documents enable row level security;

drop policy if exists "business_documents member read"
  on public.business_documents;

create policy "business_documents member read"
  on public.business_documents
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.business_users membership
      where membership.business_id = business_documents.business_id
        and membership.user_id = auth.uid()
    )
  );

drop policy if exists "business_documents member insert"
  on public.business_documents;

create policy "business_documents member insert"
  on public.business_documents
  for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1
      from public.business_users membership
      where membership.business_id = business_documents.business_id
        and membership.user_id = auth.uid()
        and membership.role in ('owner', 'admin', 'editor')
    )
  );

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'business-documents',
  'business-documents',
  false,
  52428800,
  array[
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "business document storage read"
  on storage.objects;

create policy "business document storage read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'business-documents'
    and exists (
      select 1
      from public.business_users membership
      where membership.user_id = auth.uid()
        and membership.business_id::text =
          split_part(storage.objects.name, '/', 1)
    )
  );

drop policy if exists "business document storage insert"
  on storage.objects;

create policy "business document storage insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'business-documents'
    and exists (
      select 1
      from public.business_users membership
      where membership.user_id = auth.uid()
        and membership.business_id::text =
          split_part(storage.objects.name, '/', 1)
        and membership.role in ('owner', 'admin', 'editor')
    )
  );
