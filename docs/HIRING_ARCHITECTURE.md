# Hiring Architecture (P21)

**Goal:** Scalable team design — hire on **metrics and OS gaps**, not founder overload.

Config: `data/ops/hiring-architecture.json`  
Admin: **Hiring Architecture** · CLI: `npm run metrics:hiring:architecture`

**Rules:** Max **2** concurrent reqs · **DR-*** decision before offer · **90-day plan** before day 1.

---

## Hire sequence (recommended)

| # | Role | When to hire |
|---|------|----------------|
| 1 | **Ops Manager** | Ops health yellow 2w OR founder >6h/week on incidents |
| 2 | **Growth Marketer** | CAC payback >6mo OR funnel CR −20% QoQ |
| 3 | **B2B Sales Lead** | Partner pipeline >50 active OR MRR stalls |
| 4 | **Frontend Engineer** | ≥3 frontend items blocked in **now** queue |
| 5 | **Partner Success Manager** | Dispatch <85% OR ≥5 active partners |
| 6 | **Backend / Platform Engineer** | 100K path / analytics cap 2w |
| 7 | **Product Designer** | Planlar/checkout redesign or 2+ vertical launches |
| 8 | **AI / Product Analyst** | AI cost >8% margin OR narration >15% MAU |

---

## Squad model

| Squad | Lead (role id) | Specialists | North-star |
|-------|----------------|-------------|------------|
| Growth | vp_growth | growth_marketer | funnel_cr |
| Product | vp_product | product_designer, frontend_engineer, ai_product_analyst | pro_subscriptions |
| Platform | scale_architect | backend_platform_engineer, ops_manager | ops_health |
| Revenue | vp_revenue | b2b_sales_lead, partner_success_manager | mrr_try |

---

## Roles

### 1. Growth Marketer

| | |
|--|--|
| **Neden** | Paid/organic, CRO velocity, lifecycle copy — founder cannot own growth review alone. |
| **Ne zaman** | CAC payback >6mo (2 weekly KPIs) OR paid >₺50K/mo without stable funnel CR. |
| **KPI** | CAC payback ≤6mo · funnel CR up QoQ · ≥2 experiments/mo · organic sessions up |
| **90 gün** | D30: baseline CAC/LTV + 1 experiment · D60: 2 channels + lifecycle audit · D90: CR +10% or payback ≤6mo |

### 2. Product Designer

| | |
|--|--|
| **Neden** | Planlar, checkout, decision UX — conversion and mobile polish need design owner. |
| **Ne zaman** | Checkout/pricing in **now** queue OR UX blocks 2+ RICE items. |
| **KPI** | Checkout CR up · mobile UX audit pass · 0 critical P4 failures · ≥1 design-led CRO win/quarter |
| **90 gün** | D30: audit + system alignment · D60: pricing A/B + mobile top 5 · D90: measurable checkout lift |

### 3. Frontend Engineer

| | |
|--|--|
| **Neden** | SPA, admin, Auto — CRO and i18n blocked without dedicated FE capacity. |
| **Ne zaman** | ≥3 frontend **now** items OR bundle budget blocks release. |
| **KPI** | ≥4 PRs/mo · bundle budget pass · admin stability pass · LCP <2.5s (lab) |
| **90 gün** | D30: admin stability + 1 CRO · D60: lazy admin + i18n top 20 · D90: release train w/o founder |

### 4. Backend / Platform Engineer

| | |
|--|--|
| **Neden** | Supabase, edge, analytics volume, 100K MAU — warehouse and purge need platform owner. |
| **Ne zaman** | analytics cap 2w OR 100K confidence <70% with infra in **now**. |
| **KPI** | 4w without cap alert · retention job 100% · edge errors <0.5% · dispatch p95 <15m |
| **90 gün** | D30: own edge + rollup PR · D60: warehouse spike + pooler · D90: 100K checklist 80%, MTTD <4h |

### 5. AI / Product Analyst

| | |
|--|--|
| **Neden** | Scoring, narration, AI unit economics — control Groq spend and improve explainability. |
| **Ne zaman** | AI rate-limit ops up 2w OR narration >10% MAU without conversion lift. |
| **KPI** | AI cost/MAU ≤ cap · narration helpful ≥70% · explainability audit pass · ≤2 AI incidents/mo |
| **90 gün** | D30: cost dashboard + tier map · D60: quota/A/B · D90: margin on target, AI slice in product review |

### 6. B2B Sales Lead

| | |
|--|--|
| **Neden** | High-LTV partner/Pro deals need human close beyond automation. |
| **Ne zaman** | >30 qualified leads/mo OR pipeline <2× quota. |
| **KPI** | Pipeline ≥3× quota · win rate ≥25% · sales cycle down · B2B MRR up MoM |
| **90 gün** | D30: CRM + 10 convos · D60: partner playbook · D90: ≥3 won, sales review w/o founder on calls |

### 7. Partner Success Manager

| | |
|--|--|
| **Neden** | Dispatch SLA, onboarding, partner churn — automation needs human activation owner. |
| **Ne zaman** | ≥5 active endpoints OR dispatch <85% for 2w. |
| **KPI** | Dispatch ≥85% · active partners up · ≤1 SLA breach/wk · partner NPS ≥40 |
| **90 gün** | D30: health dashboard + cut dead dispatches 50% · D60: onboarding <7d · D90: dispatch ≥90% |

### 8. Ops Manager

| | |
|--|--|
| **Neden** | First hire — run Company OS, incidents, crons; founder exits firefighting. |
| **Ne zaman** | **First hire:** ops not green 2w OR founder incidents >6h/week. |
| **KPI** | 3/4 weeks ops green · MTTD <4h · snapshots fresh · weekly KPI held |
| **90 gün** | D30: daily ops + KPI · D60: postmortems + independence ≥80% · D90: founder <2h/wk ops |

---

## Related

- [COMPANY_OPERATING_SYSTEM.md](./COMPANY_OPERATING_SYSTEM.md)  
- [STARTUP_OPERATING_MODE.md](./STARTUP_OPERATING_MODE.md)  
- [SCALE_ARCHITECTURE_EXECUTION.md](./SCALE_ARCHITECTURE_EXECUTION.md)  

## Verify

```bash
npm test
node scripts/p21-hiring-architecture-audit.cjs
npm run metrics:hiring:architecture
```
