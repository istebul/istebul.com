# Fundraising Readiness Assets

**Version:** p7.2 · **Config:** `data/investor/fundraising-readiness.json`  
**Score:** `npm run metrics:investor:pack` → `readiness.verdict`

---

## Ready in repository

| Asset | Path | Format |
|-------|------|--------|
| **Investor deck (PDF-ready)** | `investor-deck.md` | MD → PDF |
| Investor narrative | `INVESTOR_NARRATIVE.md` | MD |
| KPI story | `KPI_STORY.md` | MD |
| Moat articulation | `MOAT_ARTICULATION.md` | MD |
| **Market sizing (verified)** | `MARKET_SIZING.md` | MD + JSON |
| Market research data | `data/investor/market-research.json` | JSON |
| Monetization story | `MONETIZATION_STORY.md` | MD |
| **Cap table template** | `cap-table.csv` | CSV / Excel |
| **Financial model (36 mo)** | `financial-model-template/*.csv` | CSV → XLSX |
| **LOI template (TR + EN)** | `loi-template.md` | MD |
| **Stripe MRR evidence** | `STRIPE_MRR_EVIDENCE.md` | MD + screenshot slots |
| Data room index | `DATA_ROOM_INDEX.md` | MD |
| **Exit / M&A optionality (P11)** | `EXIT_OPTIONALITY_REPORT.md` · `../ACQUISITION_EXIT_OPTIONALITY.md` | MD |
| Exit config | `data/ops/acquisition-exit-optionality.json` | JSON |

---

## Generate / export

```bash
node scripts/generate-financial-model-csv.cjs   # 36-month CSV model
npm run metrics:investor:pack                  # Live diligence JSON
npm run metrics:investor                         # KPI snapshot only
```

---

## Founder actions (before meetings)

| Task | Asset |
|------|--------|
| Export deck PDF | `investor-deck.md` → Marp / Slides |
| Import CSVs to one XLSX | `financial-model-template/` |
| Customize cap table + SHA | `cap-table.csv` + counsel |
| Sign 1–2 partner LOIs | `loi-template.md` |
| Paste Stripe PNGs | `STRIPE_MRR_EVIDENCE.md` |

---

## Accelerator & public grants

### TÜBİTAK (1512 / 1812)

- Ekler: `investor-deck.md` (PDF), `financial-model-template`, ekip CV  
- Pazar: `MARKET_SIZING.md` (TÜİK / ODMD kaynaklı)  
- Teknik: `docs/ARCHITECTURE.md`, `npm run test` çıktısı  

### KOSGEB

- İş planı TR: narrative + monetization + 36 ay CSV  
- Ortaklık: `cap-table.csv`  

### VC / melek / accelerator

- Data room: `DATA_ROOM_INDEX.md`  
- Canlı metrik: `investor-readiness-pack.json` (7 gün içinde)  
- LOI + Stripe reconciliation  

---

## Technical diligence

- [ ] `npm run test` green  
- [ ] Stripe MRR = `subscription.mrrTry`  
- [ ] Partner webhook HMAC örneği  

---

## Remaining gaps (tracked in pack)

`fundraisingGaps` in `investor-readiness-pack.json`:

- Signed LOI PDFs  
- Stripe dashboard screenshots  
- Exported deck PDF  
