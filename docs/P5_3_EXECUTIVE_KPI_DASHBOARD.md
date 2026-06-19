# P5.3 — Executive KPI dashboard (CEO)

Single-pane decision dashboard for leadership: traffic, full-funnel conversion, monetization, retention, and partner lead quality.

## Access

- **Admin:** Platform → **Executive KPIs**
- **CLI export:** `npm run metrics:executive` (requires `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`)

Output: `dist/executive-kpi-snapshot.json`

## Metrics tracked

| Area | KPIs |
|------|------|
| Traffic | Page views, unique sessions, auto starts |
| Funnel | Executive funnel steps + step/overall CR |
| Conversions | Wizard completion, lead, checkout, paid, referral |
| Revenue | MRR, ARPU, attributed revenue (analytics) |
| Retention | Return visits, engagement, lifecycle enrolls, abandon recovery |
| Churn | Cancel at period end, gross churn signal % |
| Partner quality | Avg lead score, dispatch success, win rate, pipeline ₺ |

Default window: **30 days** (`SCALE_LIMITS.admin.executiveWindowDays`).

## Implementation

- `js/features/metrics/executive-dashboard.js` — `buildExecutiveDashboard()`
- Reuses `growth-kpis.js` funnel math + `investor-kpis.js` subscription/CRM math
- Admin loader: `loadExecutiveKpis()` in `js/admin-panel.js`

## Board rhythm

1. Weekly: compare conversion rates vs prior export.
2. Monthly: ARPU + churn + partner win rate for unit economics review.
3. Quarterly: attach `executive-kpi-snapshot.json` to investor updates (`docs/investor/`).

## Related

- `docs/GROWTH_EXECUTION_PLAN.md` — Growth Command Center (14-day sample)
- `npm run metrics:investor` — due diligence MRR snapshot
- `npm run metrics:growth:command` — growth ops export
