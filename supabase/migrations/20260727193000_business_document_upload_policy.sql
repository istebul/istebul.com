alter table public.business_documents
  drop constraint if exists business_documents_document_type_check;

alter table public.business_documents
  add constraint business_documents_document_type_check
  check (
    document_type in (
      'xlsx',
      'xls',
      'csv',
      'pdf',
      'docx',
      'pptx'
    )
  );

drop policy if exists "business document storage delete"
  on storage.objects;

create policy "business document storage delete"
  on storage.objects
  for delete
  to authenticated
  using (
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
