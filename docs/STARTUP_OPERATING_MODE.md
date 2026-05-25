# Startup Operating Mode (P18)

**Goal:** Transform isteBul from an automation-first product into a **scale-ready category company** with explicit executive accountability, decision cadence, bottleneck registry, and phased scale roadmap.

## Executive operating model

| Role | Accountability |
|------|----------------|
| **CEO** | Vision, capital, category narrative, weekly operating review |
| **COO** | Ops command center, incidents, partner SLA, automation coverage |
| **VP Growth** | Acquisition, CRO, lifecycle, retention |
| **VP Product** | Decision engine, vertical expansion, i18n, AI guardrails |
| **VP Revenue** | Stripe MRR, RevOps, unit economics, pricing |
| **Scale Architect** | Infra unit economics, analytics caps, resilience |

Config: `data/ops/startup-operating-mode.json`  
Live rollup: **Admin → Startup Operating Center** or `npm run metrics:startup:operating`

## System analysis (current state)

### Strengths

- P9 digital ops: command center, alert digest, daily `ops-automation.yml`
- P10–P13: RevOps flows, customer ops, partner monitor, CEO hourly alerts
- P16–P17: infra guardrails + investor unit economics model
- Auto vertical end-to-end: intake → score → lifecycle → partner dispatch → Pro

### Bottlenecks (ranked)

| ID | Severity | Mitigation |
|----|----------|------------|
| `analytics_write_volume` | High | Retention purge, event sampling, warehouse export |
| `no_warehouse_bi` | High | BigQuery/ClickHouse + cohort jobs |
| `multi_vertical_crm` | High | Category registry + `decision_leads` |
| `github_cron_spof` | Medium | Mirror crons (pg_cron / external scheduler) |
| `i18n_content_gap` | Medium | Extract top-50 strings; locale SEO |
| `partner_settlement_manual` | Medium | Settlement ledger automation |
| `single_region_vendors` | Low | Failover runbook |

## Scale roadmap

### Organizational scaling

- RACI on six roles (config `executiveRoles`)
- Exception-only human ops; snapshots drive standups
- Link: `data/ops/automation-roadmap.json`, `docs/P9_DIGITAL_COMPANY_OPS.md`

### Growth scaling

- Paid CAC reporting, CRO experiments, lifecycle cron
- Target: lifecycle message success >95%
- Link: `data/growth/experiments.json`, `npm run metrics:growth`

### Revenue scaling

- Stripe webhook, dunning/recovery flows (P10)
- P17 LTV/CAC/payback in Executive KPIs
- Link: `docs/investor/UNIT_ECONOMICS.md`

### Infrastructure scaling

- AI proxy caps, analytics sample rate, retention purge script
- Link: `docs/INFRA_UNIT_ECONOMICS.md`, `js/core/scale-limits.js`

### Team workflows

- Role dashboards: CEO, Growth, Revenue, Partner Ops, Support
- Link: `docs/INTERNAL_DASHBOARDS.md`

### Decision cadence

| Ritual | Cadence | Command |
|--------|---------|---------|
| Daily ops | 06:00 UTC | `npm run ops:automation:run` |
| CEO alerts | Hourly | `npm run ceo:alerts:run` |
| Weekly growth | Weekly | `npm run metrics:growth` |
| Weekly operating | Mon 07 UTC (via daily ops) | `npm run metrics:startup:operating` |
| Monthly investor | Monthly | `npm run metrics:investor` |
| Unit economics | Monthly | `npm run metrics:unit-economics` |

### International readiness

- 4 locales (`tr`, `en`, `de`, `ar`); pricing localization ready
- Gap: content migration — see `docs/GLOBAL_EXPANSION_READINESS.md`

### Operational resilience

- Alert rules + Telegram digest
- Gap: scheduled analytics purge in CI (script exists; wire cron)
- Link: `.github/workflows/ops-automation.yml`

## Implementation phases

1. **P18.0 (shipped)** — Operating center, snapshot, audit, admin page
2. **P18.1** — Warehouse export, retention cron, category registry MVP, partner ledger
3. **P18.2** — 8-vertical hub, unified CRM, multi-market Stripe, failover drill

## Quick wins (P18)

- Startup Operating Center admin + `dist/startup-operating-snapshot.json`
- Weekly snapshot appended to daily ops automation run
- Bottleneck urgency scored against live ops cap + alerts

## KPIs

| Key | Target | Owner |
|-----|--------|-------|
| automation_coverage_pct | >80% | COO |
| snapshot_freshness_hours | <26 | COO |
| ltv_cac_ratio | >3 | VP Revenue |
| lifecycle_message_success_pct | >95% | VP Growth |
| locales_content_ready | ≥2 full | VP Product |
| mean_time_to_detect_hours | <4 | Scale Architect |

## Related docs

- [OPS_AUTOMATION_ROADMAP.md](./OPS_AUTOMATION_ROADMAP.md)
- [PLATFORM_EXPANSION_ROADMAP.md](./PLATFORM_EXPANSION_ROADMAP.md)
- [GLOBAL_EXPANSION_READINESS.md](./GLOBAL_EXPANSION_READINESS.md)
- [INFRA_UNIT_ECONOMICS.md](./INFRA_UNIT_ECONOMICS.md)
- [investor/UNIT_ECONOMICS.md](./investor/UNIT_ECONOMICS.md)
