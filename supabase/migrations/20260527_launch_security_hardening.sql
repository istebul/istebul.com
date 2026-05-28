-- isteBul launch security hardening
-- idempotent / non-destructive

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

alter table if exists public.profiles enable row level security;
alter table if exists public.auto_leads enable row level security;
alter table if exists public.auto_events enable row level security;
alter table if exists public.site_settings enable row level security;
alter table if exists public.listings enable row level security;
