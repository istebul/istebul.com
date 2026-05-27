-- Final production lead qualification columns (idempotent).
-- Safe to run when 20260525_auto_lead_qualification.sql was skipped on remote.
-- Does not alter RLS, NOT NULL constraints, or existing rows.

ALTER TABLE public.auto_leads
  ADD COLUMN IF NOT EXISTS purchase_timeline text,
  ADD COLUMN IF NOT EXISTS financing_intent text,
  ADD COLUMN IF NOT EXISTS trade_in text,
  ADD COLUMN IF NOT EXISTS urgency text,
  ADD COLUMN IF NOT EXISTS contact_preference text;

COMMENT ON COLUMN public.auto_leads.purchase_timeline IS 'Lead: expected purchase window (0-30, 1-3, 3-6, 6+)';
COMMENT ON COLUMN public.auto_leads.financing_intent IS 'Lead: financing intent (yes/no or detail)';
COMMENT ON COLUMN public.auto_leads.trade_in IS 'Lead: trade-in yes/no';
COMMENT ON COLUMN public.auto_leads.urgency IS 'Lead: urgency low|medium|high';
COMMENT ON COLUMN public.auto_leads.contact_preference IS 'Lead: phone|whatsapp|email';

-- Optional filter for CRM (admin service role only; no RLS change)
CREATE INDEX IF NOT EXISTS idx_auto_leads_purchase_timeline
  ON public.auto_leads (purchase_timeline)
  WHERE purchase_timeline IS NOT NULL;
-- Unified platform analytics (journeys, funnels, conversions, attribution)

create table if not exists public.analytics_sessions (
  session_id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  user_id uuid,
  first_page_path text,
  last_page_path text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  device_type text,
  consent_analytics boolean default false
);

create index if not exists analytics_sessions_user_idx
  on public.analytics_sessions (user_id, updated_at desc);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  event_name text not null,
  event_category text not null,

  session_id text,
  user_id uuid,
  anonymous_id text,

  page_path text,
  page_section text,
  funnel text,
  funnel_step text,
  step_index integer,

  cta_id text,
  element_id text,

  email text,
  phone text,

  revenue_cents integer default 0,
  currency text default 'TRY',

  properties jsonb not null default '{}'::jsonb,
  attribution jsonb not null default '{}'::jsonb,

  source text not null default 'web',
  idempotency_key text,

  constraint analytics_events_category_check
    check (event_category in (
      'page',
      'cta',
      'auth',
      'subscription',
      'lead',
      'auto',
      'finance',
      'partner',
      'admin',
      'revenue'
    ))
);

create unique index if not exists analytics_events_idempotency_idx
  on public.analytics_events (idempotency_key)
  where idempotency_key is not null;

create index if not exists analytics_events_name_time_idx
  on public.analytics_events (event_name, created_at desc);

create index if not exists analytics_events_funnel_idx
  on public.analytics_events (funnel, funnel_step, created_at desc);

create index if not exists analytics_events_session_idx
  on public.analytics_events (session_id, created_at desc);

create index if not exists analytics_events_category_time_idx
  on public.analytics_events (event_category, created_at desc);

alter table public.analytics_sessions enable row level security;
alter table public.analytics_events enable row level security;

drop policy if exists "deny direct analytics_sessions" on public.analytics_sessions;
create policy "deny direct analytics_sessions"
on public.analytics_sessions
for all
to authenticated
using (false)
with check (false);

drop policy if exists "admin read analytics events" on public.analytics_events;
create policy "admin read analytics events"
on public.analytics_events
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

drop policy if exists "deny analytics events write" on public.analytics_events;
create policy "deny analytics events write"
on public.analytics_events
for insert
to authenticated
with check (false);

-- Funnel conversion summary (admin dashboards)
create or replace view public.analytics_funnel_daily as
select
  date_trunc('day', created_at) as day,
  funnel,
  funnel_step,
  count(*)::bigint as events,
  count(distinct session_id)::bigint as sessions
from public.analytics_events
where funnel is not null and funnel_step is not null
group by 1, 2, 3;

grant select on public.analytics_funnel_daily to authenticated;
