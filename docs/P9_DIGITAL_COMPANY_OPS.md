# P9 — Digital Company Operations (Executive Summary)

**Goal:** Run isteBul with minimal manual ops — systems own revenue, customer, partner, analytics, lifecycle, alerts, and AI guardrails.

## What shipped (P9)

1. **Ops Command Center** — single rollup across 8 domains + threshold alerts  
2. **Daily automation workflow** — `.github/workflows/ops-automation.yml`  
3. **Alert digest** — `supabase/functions/ops-alert-digest` → Telegram  
4. **Snapshot exports** — `dist/ops-command-center.json`, `operational-health-snapshot.json`, `lifecycle-metrics-snapshot.json`  
5. **Admin page** — Ops Command Center (live metrics + triggered rules)

## Run daily

```bash
npm run ops:automation:run
```

## Health at a glance

| Domain | Primary automation |
|--------|-------------------|
| Revenue | Stripe webhook + executive snapshot |
| Customer | Lifecycle cron + retention engine |
| Partner | Dispatch + retry + Telegram leads |
| Analytics | Ingest + growth command center |
| Lifecycle | Hourly cron + 13 flows |
| Operations | Ops ingest + P9 digest |
| AI | Deterministic score + rate-limited proxy |
| Dashboards | Admin KPI + Observability + Command Center |

Full roadmap: [`OPS_AUTOMATION_ROADMAP.md`](./OPS_AUTOMATION_ROADMAP.md).
