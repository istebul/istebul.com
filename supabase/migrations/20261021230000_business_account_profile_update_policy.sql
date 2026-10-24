-- Restrict business profile updates to the name column.
-- RLS additionally requires owner/admin membership.

revoke update on table public.business_accounts
  from anon, authenticated, public;

revoke update (
  id,
  name,
  slug,
  status,
  created_by,
  created_at,
  updated_at
) on table public.business_accounts
  from anon, authenticated, public;

drop policy if exists "business_accounts owner admin update"
  on public.business_accounts;

create policy "business_accounts owner admin update"
  on public.business_accounts
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.business_users bu
      where bu.business_id = business_accounts.id
        and bu.user_id = auth.uid()
        and bu.role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1
      from public.business_users bu
      where bu.business_id = business_accounts.id
        and bu.user_id = auth.uid()
        and bu.role in ('owner', 'admin')
    )
  );

grant update (name)
  on table public.business_accounts
  to authenticated;
