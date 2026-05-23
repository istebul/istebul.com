-- Enterprise partner lead delivery: observability, health, RPCs, callback idempotency

alter table public.partner_endpoints
  add column if not exists health_status text not null default 'healthy',
  add column if not exists circuit_open_until timestamptz,
  add column if not exists consecutive_failures integer not null default 0,
  add column if not exists last_success_at timestamptz,
  add column if not exists last_failure_at timestamptz,
  add column if not exists failover_route text,
  add column if not exists min_lead_priority text not null default 'hot';

alter table public.partner_endpoints
  drop constraint if exists partner_endpoints_health_status_check;

alter table public.partner_endpoints
  add constraint partner_endpoints_health_status_check
    check (health_status in ('healthy', 'degraded', 'unhealthy'));

alter table public.partner_endpoints
  drop constraint if exists partner_endpoints_min_lead_priority_check;

alter table public.partner_endpoints
  add constraint partner_endpoints_min_lead_priority_check
    check (min_lead_priority in ('hot', 'very_hot'));

create table if not exists public.partner_lead_dispatch_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  lead_id uuid,
  partner_route text not null,
  endpoint_id uuid references public.partner_endpoints(id) on delete set null,
  endpoint_name text,

  attempt_number integer not null default 1,
  trigger_source text not null default 'unknown',
  dispatch_attempt_id uuid,

  http_status integer,
  duration_ms integer,
  success boolean not null default false,
  error_message text,
  response_preview text,

  constraint partner_dispatch_trigger_check
    check (trigger_source in (
      'auto_intake',
      'partner_retry',
      'partner_dispatch',
      'failover'
    ))
);

create index if not exists partner_dispatch_logs_lead_id_idx
  on public.partner_lead_dispatch_logs (lead_id, created_at desc);

create index if not exists partner_dispatch_logs_endpoint_idx
  on public.partner_lead_dispatch_logs (endpoint_id, created_at desc);

alter table public.partner_lead_dispatch_logs enable row level security;

drop policy if exists "admin read partner dispatch logs" on public.partner_lead_dispatch_logs;
create policy "admin read partner dispatch logs"
on public.partner_lead_dispatch_logs
for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and coalesce(profiles.is_banned, false) = false
  )
);

create table if not exists public.partner_callback_events (
  idempotency_key text primary key,
  created_at timestamptz not null default now(),
  lead_id uuid not null,
  partner_status text not null,
  payload jsonb default '{}'::jsonb
);

create index if not exists partner_callback_events_lead_idx
  on public.partner_callback_events (lead_id, created_at desc);

alter table public.partner_callback_events enable row level security;

drop policy if exists "deny partner callback events direct" on public.partner_callback_events;
create policy "deny partner callback events direct"
on public.partner_callback_events
for all
to authenticated
using (false)
with check (false);

create or replace function public.increment_partner_endpoint_success(endpoint_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.partner_endpoints
  set
    success_count = success_count + 1,
    sent_today = sent_today + 1,
    consecutive_failures = 0,
    health_status = 'healthy',
    circuit_open_until = null,
    last_success_at = now(),
    updated_at = now()
  where id = endpoint_id;
end;
$$;

create or replace function public.increment_partner_endpoint_fail(endpoint_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  fails integer;
begin
  update public.partner_endpoints
  set
    fail_count = fail_count + 1,
    consecutive_failures = consecutive_failures + 1,
    last_failure_at = now(),
    updated_at = now()
  where id = endpoint_id
  returning consecutive_failures into fails;

  if fails >= 5 then
    update public.partner_endpoints
    set
      health_status = 'unhealthy',
      circuit_open_until = now() + interval '15 minutes'
    where id = endpoint_id;
  elsif fails >= 3 then
    update public.partner_endpoints
    set health_status = 'degraded'
    where id = endpoint_id and health_status = 'healthy';
  end if;
end;
$$;

revoke all on function public.increment_partner_endpoint_success(uuid) from public;
revoke all on function public.increment_partner_endpoint_fail(uuid) from public;
grant execute on function public.increment_partner_endpoint_success(uuid) to service_role;
grant execute on function public.increment_partner_endpoint_fail(uuid) to service_role;

alter table public.auto_leads
  add column if not exists partner_endpoint_id uuid references public.partner_endpoints(id) on delete set null;
