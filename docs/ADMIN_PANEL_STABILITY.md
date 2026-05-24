# Admin panel stability

## Problem

Production Observability and some platform sections failed when PostgREST schema cache lacked tables (e.g. `operational_events` before `supabase db push`).

## Solution

1. **`js/admin/admin-query.js`** — `fetchAdminTable()` tries direct Supabase read, then falls back to `admin-action` `list` with service role.
2. **`js/features/ops/ops-health.js`** — Client-side `rollupSeverity24h` / `rollupHealth24h` replace DB views when needed.
3. **`supabase/functions/admin-action`** — Lists `operational_events`, `admin_audit_logs`, `partner_lead_dispatch_logs`, `analytics_events`.
4. **Warning banner** — Yellow alert when data loads via fallback or partial failure.

## Deploy checklist

```bash
supabase db push   # applies 20260530_operational_observability.sql, partner logs, etc.
supabase functions deploy admin-action
npm run build && npm run deploy:cf
```

## CI

`node scripts/admin-panel-stability-audit.cjs` runs in `npm test`.
