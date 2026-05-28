-- partner delivery enterprise
-- idempotent / non-destructive

create table if not exists public.partner_delivery_events (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  partner_name text,
  event_type text,
  payload jsonb default '{}'::jsonb
);

alter table public.partner_delivery_events enable row level security;
