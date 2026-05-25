# Fundraising Readiness Assets

**Goal:** Seed-round data room complete enough for first partner meetings and IC prep.

**Config:** `data/investor/fundraising-readiness.json` · **Score:** `npm run metrics:investor:pack` → `readiness.verdict`

---

## Ready in repo (no founder action)

| Asset | Path |
|-------|------|
| Investor narrative | `INVESTOR_NARRATIVE.md` |
| KPI story | `KPI_STORY.md` |
| Moat articulation | `MOAT_ARTICULATION.md` |
| Market sizing | `MARKET_SIZING.md` |
| Monetization story | `MONETIZATION_STORY.md` |
| One-pager | `ONE_PAGER.md` |
| Pitch outline (14 slides) | `PITCH_DECK_OUTLINE.md` |
| Financial model (illustrative) | `FINANCIAL_MODEL.md` |
| Data room index | `DATA_ROOM_INDEX.md` |
| Risk register | `RISK_REGISTER.md` |
| Unit economics framework | `UNIT_ECONOMICS.md` |
| P7 guide | `docs/P7_INVESTOR_READINESS.md` |

---

## Generated exports (run before meetings)

```bash
npm run metrics:investor:pack    # dist/investor-readiness-pack.json
npm run metrics:investor         # dist/investor-metrics-snapshot.json (optional split)
```

---

## Founder gaps (offline — upload to secure data room)

| Asset | Format | Owner |
|-------|--------|-------|
| Pitch deck PDF | PDF | Founder |
| Cap table | XLSX | Founder |
| Financial model spreadsheet | XLSX | Founder |
| Partner LOI / CPL schedules | PDF | Founder |
| Stripe MRR chart screenshot | PNG | Founder |
| TAM source citations | Replace `[FOUNDER_VERIFY]` in `MARKET_SIZING.md` | Founder |

---

## Pre-meeting checklist

- [ ] `metrics:investor:pack` within 7 days  
- [ ] Slide 7 = resolved metrics (no brackets)  
- [ ] TAM/SAM verified with citations  
- [ ] 2+ partner LOIs in folder  
- [ ] Cap table + deck PDF uploaded  
- [ ] Legal: `gizlilik.html`, `kvkk.html`, `SUBPROCESSORS.md` linked  

---

## Technical diligence

- [ ] `npm run test` green on `main`  
- [ ] `LAUNCH_PRODUCTION_AUDIT.md` reviewed  
- [ ] Stripe MRR vs `investor-kpis` MRR reconciled  
- [ ] Sample partner dispatch + webhook logs  

---

## Manifest in JSON pack

`fundraising-readiness.json#assetManifest` is included in `investor-readiness-pack.json` for automated gap tracking.
