# P14 — Internal company dashboards

**Goal:** Company visibility for leadership and ops — one admin surface, five focused views.

## Dashboards (admin panel)

| Dashboard | Nav ID | Primary metrics |
|-----------|--------|-----------------|
| **CEO** | `dashboard-ceo` | Executive summary, MRR, funnel CR, CEO alerts, pipeline |
| **Growth** | `dashboard-growth` | 7d funnel, channels, experiments, paid, retention |
| **Revenue** | `dashboard-revenue` | MRR/ARR/ARPU, churn, checkout, RevOps signals |
| **Partner Ops** | `dashboard-partner-ops` | Dispatch SLA, retry queue, endpoint health |
| **Support** | `dashboard-support` | FAQ, lifecycle enroll/failures, support workflows |

**Path:** `/admin-panel.html` → sidebar **Şirket görünürlüğü**

## Architecture

```
admin/internal-dashboards.js     → fetch + 2min cache
internal-dashboard-context.js    → merge executive, CEO, partner, growth, support
internal-dashboard-views.js      → HTML render per dashboard
```

Legacy pages remain for drill-down:

- Executive KPIs (`investor-metrics`)
- Ops Command Center (`ops-command-center`)
- Partner dispatch logs, observability, etc.

## CLI export

```bash
npm run metrics:dashboards:internal   # dist/internal-dashboards-snapshot.json
```

Requires `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.

## Manifest

`data/dashboards/internal-dashboards.json`
