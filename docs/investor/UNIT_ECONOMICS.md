# Unit Economics Model (P17)

Investor-grade financial visibility: **CAC**, **LTV**, **ARPU**, **payback**, **gross margin**, **partner margin**, **AI cost per user**, **support cost**, and **conversion economics**.

**Code:** `js/features/investor/unit-economics-model.js`  
**Assumptions:** `data/investor/unit-economics-model.json`  
**Admin:** Executive KPIs → Unit economics panel  
**Export:** `npm run metrics:unit-economics` → `dist/unit-economics-snapshot.json`

---

## Metrics map

| Metric | Formula (TRY unless noted) | Live source |
|--------|--------------------------|-------------|
| **ARPU** | MRR ÷ billable subs | `executive-dashboard` / Stripe |
| **CAC** | Marketing spend ÷ new paid conversions | `paid-spend.json` + `paid_conversion` events |
| **LTV** | ARPU × gross_margin% × lifetime_months | Model + churn proxy |
| **Payback** | CAC ÷ (ARPU × gross_margin%) | Derived |
| **Gross margin** | (ARPU − Stripe − variable costs) ÷ ARPU | Stripe % + AI + support |
| **Partner margin** | (Actual − partner share − dispatch) ÷ actual | `auto_leads` CRM |
| **AI cost / user** | Groq calls/mo × $/call × FX | P16 infra guardrails |
| **Support cost / user** | Tickets/MAU × cost/ticket | Support analytics events |
| **Conversion economics** | Cost/lead, cost/paid, rev/paid, funnel CR% | Executive funnel |

---

## Formulas

```
monthly_churn_proxy = cancel_at_period_end / active_billable  (capped 0.5%–25%)
lifetime_months = 1 / monthly_churn_proxy  (cap 60, else target 14)
gross_margin_pct = (ARPU - stripe_fees - variable_cost_per_user) / ARPU
LTV = ARPU × gross_margin_pct × lifetime_months
CAC = Σ paid_spend / new_paid_users_in_window
payback_months = CAC / (ARPU × gross_margin_pct)
LTV_CAC_ratio = LTV / CAC

partner_net = actual_revenue - take_rate% - (leads × dispatch_cost)
partner_margin_pct = partner_net / actual_revenue

ai_cost_per_pro = ai_calls_per_month × est_usd_per_call × usd_try
support_cost_per_user = (tickets / MAU) × cost_per_ticket (or modeled default)
```

---

## Planning assumptions (default)

| Driver | Value |
|--------|-------|
| Pro ARPU | ₺299/mo |
| Target CAC | ₺1.200 |
| Target gross margin | 72% |
| Target LTV months | 14 |
| Target payback | ≤ 6 months |
| LTV/CAC minimum | 3× |
| Stripe fee | 3.2% + ₺2.5 |
| AI calls / Pro / month | 4 |
| Support | 12 tickets / 1k MAU · ₺85/ticket |

Edit `data/investor/unit-economics-model.json` for board scenarios.

---

## Live data imports

1. **Paid spend (CAC):** Copy `data/growth/paid-spend.template.json` → `paid-spend.json` weekly (Meta, Google, etc.).
2. **Subscriptions (ARPU/MRR):** Supabase `subscriptions` + `investor-kpis.js`.
3. **Funnel (conversion economics):** `analytics_events` via executive dashboard (30d window).
4. **Partner margin:** `auto_leads.estimated_revenue` vs `actual_revenue`.

---

## CLI exports

```bash
# Live (requires Supabase service role)
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run metrics:unit-economics

# Planning-only (assumptions + formulas, no DB)
node scripts/unit-economics-snapshot.cjs --planning

# Related
npm run metrics:investor
node scripts/infra-unit-economics-snapshot.cjs
```

---

## Investor workflow

1. Weekly: `metrics:unit-economics` + `metrics:investor` → attach JSON to data room.
2. Reconcile MRR with Stripe (`docs/investor/STRIPE_MRR_EVIDENCE.md`).
3. Present **LTV/CAC** and **payback** with explicit spend import status (`model.health`).
4. Show **partner margin** separately from Pro SaaS (hybrid revenue story).

---

## Related docs

- `docs/INFRA_UNIT_ECONOMICS.md` — AI/email/Supabase cost guardrails (P16)
- `data/investor/financial-model.json` — 36m scenario model
- `docs/investor/INVESTOR_METRICS_STORY.md` — narrative slides
