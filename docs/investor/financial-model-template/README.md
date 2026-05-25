# Financial Model Template (36 months)

**Format:** Excel-compatible CSV (open in Excel / Google Sheets → Save as `.xlsx`)  
**Generator:** `node scripts/generate-financial-model-csv.cjs`  
**Config:** `data/investor/financial-model-36m.json` · Scenarios: `data/investor/financial-model.json`

---

## Sheets (files)

| File | Contents |
|------|----------|
| `assumptions.csv` | Drivers: pricing, subs, leads, CAC, LTV, burn, seed |
| `monthly_model_36m.csv` | 36 rows: MRR, revenue, COGS, opex, EBITDA, cash, runway |
| `annual_summary.csv` | Y1–Y3 ARR run-rate and cash |

---

## Included metrics

- **Revenue / MRR** — Pro + partner monthly  
- **ARR run-rate** — MRR × 12  
- **CAC** — New Pro subs × CAC × paid share  
- **LTV** — ARPU × target months (simplified)  
- **Burn / runway** — Opex-led with cash balance  
- **Gross margin** — Configurable % after Stripe + AI  

---

## Regenerate

```bash
node scripts/generate-financial-model-csv.cjs
```

Import all CSVs into one workbook as separate sheets for investor XLSX deliverable.

---

## Live reconciliation

Replace Y1 actuals with:

```bash
npm run metrics:investor
```

Match `subscription.mrrTry` to `pro_mrr_try` column.
