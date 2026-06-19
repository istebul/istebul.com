# Admin panel stability

## Problem

Production Observability and some platform sections failed when PostgREST schema cache lacked tables (e.g. `operational_events` before `supabase db push`).

## Solution

1. **`js/admin/admin-query.js`** — `fetchAdminTable()` tries direct Supabase read, then falls back to `admin-action` `list` with service role.
2. **`js/features/ops/ops-health.js`** — Client-side `rollupSeverity24h` / `rollupHealth24h` replace DB views when needed.
3. **`supabase/functions/admin-action`** — Lists `operational_events`, `admin_audit_logs`, `partner_lead_dispatch_logs`, `analytics_events`.
4. **Banners** — Yellow alert for real failures / missing schema; blue info note when data loads via `admin-action` (RLS-safe fallback).
5. **Lifecycle CRM** — `20260617_lifecycle_crm_schema_repair.sql` idempotently creates `lifecycle_enrollments` / `lifecycle_messages` if prod missed `20260529_lifecycle_crm.sql`.

## Deploy checklist

```bash
supabase db push   # includes 20260617_lifecycle_crm_schema_repair.sql, 20260609_partner_applications_schema_repair.sql, operational_events, etc.
supabase functions deploy admin-action
npm run build && npm run deploy:cf
```

Partner Başvuruları lists with `select *` when optional columns (e.g. `partner_endpoint_id`) are not yet migrated; repair migration adds them idempotently.

## CI

`node scripts/admin-panel-stability-audit.cjs` runs in `npm test`.
