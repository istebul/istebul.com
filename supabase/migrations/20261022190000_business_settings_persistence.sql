-- İSTEBUL Business: işletme bazlı ayarların kalıcı saklanması.
-- Bu migration yalnızca şema ve erişim kurallarını tanımlar.
-- Bildirim veya AI işlevlerini etkinleştirmez.

create table if not exists public.business_settings (
  business_id uuid primary key
    references public.business_accounts(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb
    check (jsonb_typeof(settings) = 'object'),
  created_by uuid default auth.uid()
    references auth.users(id) on delete set null,
  updated_by uuid default auth.uid()
    references auth.users(id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

comment on table public.business_settings is
  'İSTEBUL Business işletme bazlı yapılandırma verileri.';

alter table public.business_settings enable row level security;

-- Varsayılan veya önceki tablo izinlerine güvenme.
-- DELETE yetkisi verilmez.
revoke all on table public.business_settings
  from anon, public, authenticated;

grant select, insert, update on table public.business_settings
  to authenticated;

-- All business members may read settings; only owner/admin may write.
drop policy if exists business_settings_owner_admin_read
  on public.business_settings;

drop policy if exists business_settings_member_read
  on public.business_settings;

create policy business_settings_member_read
  on public.business_settings
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.business_users bu
      where bu.business_id = business_settings.business_id
        and bu.user_id = auth.uid()
    )
  );

drop policy if exists business_settings_owner_admin_insert
  on public.business_settings;

create policy business_settings_owner_admin_insert
  on public.business_settings
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.business_users bu
      where bu.business_id = business_settings.business_id
        and bu.user_id = auth.uid()
        and bu.role in ('owner', 'admin')
    )
  );

drop policy if exists business_settings_owner_admin_update
  on public.business_settings;

create policy business_settings_owner_admin_update
  on public.business_settings
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.business_users bu
      where bu.business_id = business_settings.business_id
        and bu.user_id = auth.uid()
        and bu.role in ('owner', 'admin')
    )
  )
  with check (
    updated_by = auth.uid()
    and exists (
      select 1
      from public.business_users bu
      where bu.business_id = business_settings.business_id
        and bu.user_id = auth.uid()
        and bu.role in ('owner', 'admin')
    )
  );

create or replace function public.business_settings_touch_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := pg_catalog.now();
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;

  new.updated_at := pg_catalog.now();
  new.updated_by := auth.uid();
  return new;
end;
$function$;

revoke execute on function public.business_settings_touch_updated_at()
  from public, anon, authenticated;

drop trigger if exists business_settings_touch_updated_at
  on public.business_settings;

create trigger business_settings_touch_updated_at
  before insert or update on public.business_settings
  for each row
  execute function public.business_settings_touch_updated_at();
