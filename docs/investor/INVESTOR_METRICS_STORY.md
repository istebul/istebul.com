# Investor Metrics Story

**Headline:** Instrumented hybrid revenue — every traction slide ties to a production query.

---

## North star

| Priority | Metric |
|----------|--------|
| Primary | Qualified leads per week |
| Secondary | Pro MRR (TRY), partner actual revenue (TRY), blended ARR signal |

**Formula:** Blended ARR ≈ Pro ARR + realized partner pipeline (`auto_leads.actual_revenue`).

---

## Slide bindings (live export)

Run before any investor meeting:

```bash
npm run metrics:investor:pack
```

Use `dist/investor-readiness-pack.json` → `metricsStory.slides[].resolvedMetrics` for copy-paste into deck slide 7.

| Slide | Keys |
|-------|------|
| Traction hero | `subscription.mrrTry`, `subscription.arrTry`, `pipeline.leadCount`, `pipeline.pipelineActualTry`, `blendedArrTry` |
| Product funnel | `funnel.pageViews`, `funnel.leads`, `funnel.checkoutConversionPct` |
| Partner supply | `pipeline.partnerDispatchCount`, `pipeline.winRate`, `pipeline.realizationRate` |

**Talk track:** We do not quote static deck numbers — attach weekly `investor-metrics-snapshot.json` from production.

---

## Data sources

- `subscriptions` (Stripe)
- `auto_leads` (CRM)
- `analytics_events` (sample-capped in export)
- Admin → **Investor KPIs** / **Executive KPIs**

---

## Maturity & Series A gaps

- Cohort retention warehouse
- Automated partner settlement
- Live market data feeds

**Config:** `data/investor/metrics-story.json`
