# Financial Model (Illustrative)

**Disclaimer:** For investor conversations only. Replace assumptions with live exports and signed partner contracts before term sheet.

**Currency:** TRY · **Config:** `data/investor/financial-model.json`

---

## Assumptions (base)

| Input | Value |
|-------|-------|
| Pro monthly | ₺299 |
| Pro annual | ₺2,870 |
| Partner CPL (hot lead) | ₺8,000 |
| Monthly operating burn | ₺450,000 |
| Team FTE end Y1 | 8 |

---

## Revenue build

```
Pro MRR     = subscribers_end × pro_price_monthly
Partner/mo  = monthly_leads × partner_revenue_per_lead
Blended ARR = (pro_mrr + partner_monthly) × 12
```

Projections for **base / bull / bear** × **y1–y3** are computed in:

```bash
npm run metrics:investor:pack
```

See `financialModel.projections` in `dist/investor-readiness-pack.json`.

---

## Use of funds (seed)

| Bucket | % | Focus |
|--------|---|--------|
| Engineering & data | 45 | Live feeds, konut vertical, warehouse |
| GTM & partnerships | 30 | Dealer/finance LOIs, paid tests, AE |
| Legal & compliance | 10 | KVKK, DPA, subscription terms |
| Ops & buffer | 15 | CRM scale, support, runway extension |

---

## Unit economics targets

| Metric | Target |
|--------|--------|
| Pro ARPU (monthly) | ₺299 |
| Target LTV months | 14 |
| Target CAC (Pro) | ₺1,200 |
| Partner gross margin | 70% |

**Detail:** `docs/investor/UNIT_ECONOMICS.md`
