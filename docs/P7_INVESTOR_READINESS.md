# P7 — Investor Readiness

**Goal:** Package isteBul for VC / angel diligence across six pillars: metrics story, moat story, deck readiness, financial model, growth story, GTM narrative.

**Version:** `p7.0`

---

## Assets

| Pillar | Data | Narrative doc |
|--------|------|----------------|
| Metrics story | `data/investor/metrics-story.json` | `docs/investor/INVESTOR_METRICS_STORY.md` |
| Moat story | `data/investor/moat-story.json` | `docs/investor/MOAT_AND_DEFENSIBILITY.md` |
| Financial model | `data/investor/financial-model.json` | `docs/investor/FINANCIAL_MODEL.md` |
| Growth story | `data/investor/growth-story.json` | `docs/investor/GROWTH_AND_GTM_NARRATIVE.md` |
| GTM narrative | `data/investor/gtm-narrative.json` | `docs/investor/GROWTH_AND_GTM_NARRATIVE.md` |
| Deck readiness | `data/investor/deck-readiness.json` | `docs/investor/PITCH_DECK_OUTLINE.md` |

**Manifest:** `data/investor/investor-readiness.json`

---

## Code

| Module | Role |
|--------|------|
| `js/features/investor/investor-narrative.js` | Compose pack, resolve live metrics into slide bindings, financial projections |
| `js/features/investor/investor-readiness.js` | Weighted diligence score + deck gap summary |
| `js/features/metrics/investor-kpis.js` | Live MRR / pipeline / funnel (`buildInvestorSnapshot`) |

---

## Commands

```bash
# Live traction only
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run metrics:investor

# Full investor pack (narrative + score + optional live snapshot)
npm run metrics:investor:pack
# or with Supabase env to refresh snapshot inline
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run metrics:investor:pack
```

**Outputs:**

- `dist/investor-metrics-snapshot.json` — live KPIs
- `dist/investor-readiness-pack.json` — full P7 pack + `readiness.verdict` + `readiness.overallPct`

---

## Pre-meeting workflow

1. Run `metrics:investor:pack` within 7 days of the meeting.
2. Paste resolved traction metrics into deck slide 7 (no bracket placeholders).
3. Attach 1–2 partner LOIs or CPL term sheets (offline).
4. Export deck PDF from `PITCH_DECK_OUTLINE.md`.
5. Link legal: privacy, KVKK, `SUBPROCESSORS.md`.

---

## Audit & tests

```bash
node scripts/p7-investor-readiness-audit.cjs
```

Unit tests: `tests/unit/investor-readiness.test.mjs` (included in `npm run test:router`).

---

## Investor narrative (CEO framing)

**One line:** Decision infrastructure for high-consideration purchases — we own the layer above listings and bank calculators.

**Metrics:** Hybrid revenue — Pro MRR (Stripe) + partner actuals (CRM). Every traction slide maps to `investor-kpis.js` exports.

**Moat:** Deterministic scoring + explainability; partner flywheel; path to proprietary outcome graph. Honest gap: live market feeds until exclusive contracts.

**Growth:** Auto beachhead → supply density → vertical expansion → locale/API platform.

**GTM:** PLG/SEO + paid tests + partner AE (P6) + lifecycle retention (P5.4).

**Ask:** Use `financial-model.json` scenarios + `useOfFunds` for round conversation; replace illustrative numbers with signed contracts and live exports before term sheet.

---

*See also `docs/investor/DATA_ROOM_INDEX.md` and `docs/investor/INVESTOR_READINESS.md`.*
