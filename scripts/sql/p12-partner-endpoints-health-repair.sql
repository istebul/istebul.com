-- =============================================================================
-- P12 Partner Ops Monitor — production-safe idempotent repair (manual only)
-- =============================================================================
-- Project:  hjfrcdstbyonmgatgwcc (isteBul production)
-- Purpose:  Add missing partner_endpoints health/ops columns blocked by
--           schema_migrations version collision on 20260525.
-- Apply in: Supabase Dashboard → SQL Editor (production)
--
-- SAFE:
--   - ADD COLUMN IF NOT EXISTS only
--   - No DELETE / TRUNCATE / DROP TABLE
--   - No writes to supabase_migrations.schema_migrations
--   - Re-runnable (idempotent)
--
-- Source:   supabase/migrations/20260525_partner_delivery_enterprise.sql (lines 3–24)
-- Canonical DDL parity: repair ALTER/constraint block matches source byte-for-byte.
-- min_lead_priority: text NOT NULL DEFAULT 'hot' (check: hot|very_hot) — not integer.
-- Does NOT: create tables, RPCs, or alter migration history
-- =============================================================================

-- Optional: inspect current state before applying (run separately)
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'partner_endpoints'
-- ORDER BY ordinal_position;

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

-- Optional: inspect after apply (run separately)
-- SELECT column_name
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'partner_endpoints'
--   AND column_name IN (
--     'health_status', 'circuit_open_until', 'consecutive_failures',
--     'last_success_at', 'last_failure_at', 'failover_route', 'min_lead_priority',
--     'sent_today', 'daily_cap'
--   )
-- ORDER BY column_name;

-- Optional: P12-equivalent smoke SELECT (run separately)
-- SELECT id, name, route_type, is_active,
--        health_status, circuit_open_until, consecutive_failures,
--        last_success_at, last_failure_at, sent_today, daily_cap
-- FROM public.partner_endpoints
-- LIMIT 5;
