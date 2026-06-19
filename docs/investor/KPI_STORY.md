# KPI Story

**Headline:** Every traction number in the deck maps to a production query or export — no static placeholders in slide 7.

**Config:** `data/investor/kpi-story.json` · **Bindings:** `data/investor/metrics-story.json`

---

## North star

| Priority | Metric | Owner |
|----------|--------|-------|
| **Primary** | Qualified leads / week | Growth |
| Secondary | Pro MRR (TRY) | Revenue |
| Secondary | Partner realized revenue (TRY) | Partnerships |
| Secondary | Blended ARR signal | CEO |

**Formula:** Blended ARR ≈ Pro ARR + realized partner pipeline (`auto_leads.actual_revenue`).

---

## Chapter 1 — Revenue quality

**Talk track:** We report Pro MRR from Stripe normalization and partner **actuals** from CRM — not estimates alone.

| Metric | Export key |
|--------|------------|
| Pro MRR | `subscription.mrrTry` |
| Pro ARR | `subscription.arrTry` |
| Active Pro subs | `subscription.activeSubscriptions` |
| Partner actuals | `pipeline.pipelineActualTry` |
| Blended ARR | `blendedArrTry` |

---

## Chapter 2 — Partner supply

**Talk track:** Dispatch and win rate prove monetization is operational.

| Metric | Export key |
|--------|------------|
| Leads in CRM | `pipeline.leadCount` |
| Dispatched | `pipeline.partnerDispatchCount` |
| Wins | `pipeline.partnerWinCount` |
| Win rate | `pipeline.winRate` |
| Actual / estimated | `pipeline.realizationRate` |

---

## Chapter 3 — Product demand

**Talk track:** Funnel metrics are sample-capped (5k events) — disclose in diligence; Series A needs a warehouse.

| Metric | Export key |
|--------|------------|
| Page views | `funnel.pageViews` |
| Lead submits | `funnel.leads` |
| Checkout completion % | `funnel.checkoutConversionPct` |
| View → lead % | `funnel.leadConversionPct` |

---

## Board cadence

| Cadence | KPIs |
|---------|------|
| Weekly | Qualified leads/wk, Pro MRR, partner actuals |
| Monthly | Checkout CR%, partner win rate, churn signal |
| Quarterly | Blended ARR, LOI count (offline), vertical roadmap % |

---

## Export before every meeting

```bash
npm run metrics:investor:pack
```

Use `dist/investor-readiness-pack.json` → `metricsStory.slides[].resolvedMetrics`.

**Implementation:** `js/features/metrics/investor-kpis.js` · Admin → **Investor KPIs**
