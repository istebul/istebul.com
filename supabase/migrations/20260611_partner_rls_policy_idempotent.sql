-- Repair: Supabase preview / re-apply safe RLS policies (42710 duplicate policy)

drop policy if exists "admin full access partner applications" on public.partner_applications;
drop policy if exists "admin full access partner endpoints" on public.partner_endpoints;

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
      and coalesce(profiles.is_banned, false) = false
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and coalesce(profiles.is_banned, false) = false
  )
);

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
      and coalesce(profiles.is_banned, false) = false
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and coalesce(profiles.is_banned, false) = false
  )
);
