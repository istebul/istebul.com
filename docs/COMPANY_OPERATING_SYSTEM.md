# Company Operating System (P20)

**Goal:** isteBul runs without founder-dependent tacit knowledge — reviews, priorities, and decisions live in the repo and admin.

Config: `data/ops/company-operating-system.json`  
Decisions: `data/ops/decision-log.json`  
Admin: **Company OS** · CLI: `npm run metrics:company:operating`

---

## Principles

1. **Metrics before opinions** — open `dist/*.json` snapshots and admin dashboards first.  
2. **Write decisions down** — use `DECISION_RECORD_TEMPLATE.md`.  
3. **Automate the routine** — P9 daily ops, CEO alerts, weekly growth.  
4. **One owner per metric** — RACI in `startup-operating-mode.json`.  
5. **Blameless incidents** — postmortem → decision log + runbook PR.

---

## Operating calendar

| When | Review | Owner | Pre-read |
|------|--------|-------|----------|
| **Monday 09:00** | Weekly KPI review | CEO (facilitator: COO) | ops report, executive, growth, unit economics |
| **Tuesday 10:00** | Growth review | VP Growth | growth weekly, lifecycle, paid CAC |
| **Wednesday 14:00** (biweekly) | Product review | VP Product | expansion roadmap, experiments, feedback themes |
| **Thursday 11:00** | Sales & partner review | VP Revenue | partner ops, CRM, pipeline |
| **Daily 06:00 UTC** | Ops automation | COO | `ops:automation:run` |
| **Ad hoc ≤48h** | Incident review | COO | ops center, observability |

---

## 1. Weekly KPI review structure

**Duration:** 45 min · **Attendees:** CEO, COO, VP Growth, Product, Revenue (+ Scale Architect optional)

### Agenda

1. Red metrics & CEO alerts (COO, 8m)  
2. Revenue & unit economics (VP Revenue, 10m)  
3. Growth & conversion (VP Growth, 10m)  
4. Product & roadmap bets (VP Product, 10m)  
5. Partner & sales pipeline (VP Revenue, 5m)  
6. Decisions & blockers (CEO, 7m)

### Scorecard (pull from npm)

| Metric | Owner | Command |
|--------|-------|---------|
| MRR (TRY) | VP Revenue | `metrics:executive` |
| Funnel CR % | VP Growth | `metrics:growth` |
| LTV:CAC | VP Revenue | `metrics:unit-economics` |
| Dispatch success % | COO | `metrics:ops:center` |
| Lifecycle success % | VP Growth | `metrics:lifecycle` |
| Churn signal | VP Revenue | `metrics:executive` |
| Ops health | COO | `metrics:ops:center` |

### Outputs

- Decision log updates  
- Top 3 **now** roadmap items confirmed  
- Escalations with owner + due date  

---

## 2. Product review cadence

**Biweekly Wednesday · 60 min ·** VP Product, VP Growth, Scale Architect

Focus: shipped vs plan, decision engine, vertical bets (P8), UX debt, **RICE top 5**.

Artifacts: `data/platform/expansion-roadmap.json`, `data/growth/experiments.json`, `data/product/feedback-themes.json`

---

## 3. Growth review cadence

**Weekly Tuesday · 45 min ·** VP Growth, VP Product

Focus: CAC, funnel, CRO experiments, lifecycle, next-week tests.

Artifacts: `metrics:growth`, `metrics:growth:command`, `metrics:paid-cac`, `metrics:lifecycle`

---

## 4. Sales review cadence

**Weekly Thursday · 45 min ·** VP Revenue, COO

Focus: pipeline won/lost, partner dispatch SLA, Stripe/RevOps, applications, settlement gaps.

Artifacts: `metrics:partner:ops`, admin Auto Leads, partner CRM pipeline

---

## 5. Incident review

**Trigger:** SEV1/SEV2 or sustained critical ops alerts  
**Within 48h of resolution · 30 min ·** COO

| Level | Definition |
|-------|------------|
| SEV1 | Revenue down, checkout broken, data loss, security |
| SEV2 | Major degradation, mass partner dispatch fail |
| SEV3 | Isolated errors |

**Postmortem sections:** summary, timeline, root cause, impact, well/wrong, action items, `decision_record_id`

---

## 6. Roadmap prioritization framework (RICE)

```
score = (reach × impact × confidence) / effort
```

| Queue | Max items | Used in |
|-------|-----------|---------|
| **now** | 3 | Weekly KPI + sprint |
| **next** | 7 | Product review |
| **later** | 20 | Backlog |

**North-star metrics:** qualified leads, pro subscriptions, partner dispatch success %

Queue lives in `data/ops/decision-log.json` → `roadmapQueue`.  
Linked roadmaps: expansion P8, automation P9, startup operating P18.

---

## 7. Decision documentation

- **Storage:** `data/ops/decision-log.json`  
- **Template:** `docs/templates/DECISION_RECORD_TEMPLATE.md`  
- **Types:** strategy, product, growth, revenue, ops, incident  
- **Statuses:** proposed → approved → superseded (or incident_closed)

### When required

- MRR / pricing / partner economics changes before ship  
- Experiments > 2 weeks  
- SEV1/SEV2 postmortem  

---

## Founder-independence checks

| Check | Owner |
|-------|-------|
| Snapshots automated in CI | COO |
| ≥1 decision in 14d (or explicit none) | CEO |
| Runbooks + alert rules linked | COO |
| Top 3 **now** items RICE-scored | VP Product |
| Executive RACI documented | CEO |

Score shown in admin **Company OS** page.

---

## Related

- [STARTUP_OPERATING_MODE.md](./STARTUP_OPERATING_MODE.md)  
- [OPS_AUTOMATION_ROADMAP.md](./OPS_AUTOMATION_ROADMAP.md)  
- [SCALE_ARCHITECTURE_EXECUTION.md](./SCALE_ARCHITECTURE_EXECUTION.md)  

## Verify

```bash
npm test
node scripts/p20-company-operating-system-audit.cjs
npm run metrics:company:operating
```
