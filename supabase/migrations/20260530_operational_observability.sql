-- operational observability
-- idempotent / non-destructive

create table if not exists public.ops_observability_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  severity text,
  service text,
  message text,
  metadata jsonb default '{}'::jsonb
);

alter table public.ops_observability_logs enable row level security;
