# isteBul — Investor Data Room Index (Final)

**Purpose:** VC / angel due diligence navigation + outreach operations.  
**Product:** AI decision platform for high-consideration purchases (Auto live; konut/tatil/finance expansion).  
**Production:** https://www.istebul.com · Cloudflare Pages + Supabase.

---

## 01 — Company & narrative

| Document | Path | Status |
|----------|------|--------|
| **Investor narrative** | `docs/investor/INVESTOR_NARRATIVE.md` | Ready |
| **KPI story** | `docs/investor/KPI_STORY.md` | Ready |
| **Moat articulation** | `docs/investor/MOAT_ARTICULATION.md` | Ready |
| **Market sizing** | `docs/investor/MARKET_SIZING.md` | Ready (verify `[FOUNDER_VERIFY]` cells) |
| **Monetization story** | `docs/investor/MONETIZATION_STORY.md` | Ready |
| **Fundraising readiness** | `docs/investor/FUNDRAISING_READINESS.md` | Ready |
| One-pager (executive) | `docs/investor/ONE_PAGER.md` | Ready |
| **Pitch deck outline** | `docs/investor/PITCH_DECK_OUTLINE.md` | Ready (fill brackets before meetings) |
| Investor readiness audit | `docs/investor/INVESTOR_READINESS.md` | Ready |
| Risk register | `docs/investor/RISK_REGISTER.md` | Ready |
| Unit economics framework | `docs/investor/UNIT_ECONOMICS.md` | Ready (assumptions explicit) |

| **Investor deck (PDF-ready)** | `docs/investor/investor-deck.md` |
| **Cap table template** | `docs/investor/cap-table.csv` |
| **Financial model (36 mo CSV)** | `docs/investor/financial-model-template/` |
| **LOI template (TR+EN)** | `docs/investor/loi-template.md` |
| **Stripe MRR evidence** | `docs/investor/STRIPE_MRR_EVIDENCE.md` |
| **Market research (cited)** | `data/investor/market-research.json` |
| **100 investor target list** | `docs/investor/INVESTOR_TARGET_LIST_100.csv` |
| **Outreach playbook** | `docs/investor/OUTREACH_PLAYBOOK.md` |
| **Meeting flow + DD plan** | `docs/investor/MEETING_FLOW_AND_DD.md` |
| **Follow-up discipline** | `docs/investor/FOLLOW_UP_DISCIPLINE.md` |

**Gap:** Signed LOI PDFs, Stripe PNG screenshots, deck PDF export — see `FUNDRAISING_READINESS.md`.

---

## 02 — Product & defensibility

| Document | Path |
|----------|------|
| Architecture | `docs/ARCHITECTURE.md` |
| AI decision engine (moat) | `docs/AI_DECISION_ENGINE.md` |
| Moat summary | `docs/investor/MOAT_AND_DEFENSIBILITY.md` |
| **Competitive moat strategy** | `docs/COMPETITIVE_MOAT_STRATEGY.md` |
| Platform expansion | `docs/PLATFORM_EXPANSION_ROADMAP.md` |
| Global readiness | `docs/GLOBAL_EXPANSION_READINESS.md` |

---

## 03 — Traction & metrics

| Asset | Path |
|-------|------|
| **P7.1 investor pack (manifest)** | `data/investor/investor-readiness.json` |
| Investor narrative | `data/investor/investor-narrative.json` |
| KPI story | `data/investor/kpi-story.json` |
| Metrics story | `data/investor/metrics-story.json` · `docs/investor/INVESTOR_METRICS_STORY.md` |
| Market sizing | `data/investor/market-sizing.json` |
| Monetization story | `data/investor/monetization-story.json` |
| Fundraising manifest | `data/investor/fundraising-readiness.json` |
| Moat story | `data/investor/moat-story.json` |
| Financial model | `data/investor/financial-model.json` · `docs/investor/FINANCIAL_MODEL.md` |
| Growth & GTM | `data/investor/growth-story.json` · `gtm-narrative.json` · `GROWTH_AND_GTM_NARRATIVE.md` |
| Deck readiness | `data/investor/deck-readiness.json` |
| P7 implementation guide | `docs/P7_INVESTOR_READINESS.md` |
| KPI definitions | `js/features/metrics/investor-kpis.js` |
| Narrative composer | `js/features/investor/investor-narrative.js` |
| Readiness scoring | `js/features/investor/investor-readiness.js` |
| Live export script | `scripts/investor-metrics-snapshot.cjs` |
| **Readiness pack export** | `scripts/investor-readiness-pack.cjs` → `dist/investor-readiness-pack.json` |
| Admin dashboard | Admin → **Investor KPIs** |
| Analytics audit | `docs/PLATFORM_ANALYTICS_AUDIT.md` |
| Production observability | `docs/PRODUCTION_OBSERVABILITY.md` |
| **Production resilience / BCP** | `docs/PRODUCTION_RESILIENCE_AUDIT.md` |
| Resilience runbook (ops) | `docs/RESILIENCE_RUNBOOK.md` |
| SQL views (optional) | `supabase/migrations/20260528_investor_metrics_views.sql` |

**Export commands:**

```bash
# Live KPIs only
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run metrics:investor

# Full P7 pack (narrative + diligence score + live metrics if snapshot/env set)
npm run metrics:investor:pack
```

---

## 04 — Monetization

| Asset | Path |
|-------|------|
| Plans & gates | `js/features/monetization/plans.js` |
| Stripe checkout | `functions/api/create-checkout.js` |
| Webhook / subscriptions | `functions/api/stripe-webhook.js` |
| Partner economics | `docs/investor/UNIT_ECONOMICS.md` § Partner |
| Lead commission logic | `supabase/functions/auto-intake/index.ts` |

---

## 05 — Exit & optionality (P11)

| Asset | Path |
|-------|------|
| **Exit / M&A playbook** | `docs/ACQUISITION_EXIT_OPTIONALITY.md` |
| **Investor exit report** | `docs/investor/EXIT_OPTIONALITY_REPORT.md` |
| Config | `data/ops/acquisition-exit-optionality.json` |
| Snapshot export | `npm run metrics:exit:optionality` → `dist/acquisition-exit-snapshot.json` |
| Admin | Admin → **Exit / M&A (P11)** |

---

## 06 — Legal & compliance

| Asset | Path |
|-------|------|
| Privacy | `gizlilik.html` |
| KVKK | `kvkk.html` |
| Cookie policy | `cerez-politikasi.html` |
| Terms | `kullanim-sartlari.html` |
| **Compliance readiness audit** | `docs/COMPLIANCE_READINESS_AUDIT.md` |
| Compliance runbook | `docs/COMPLIANCE_RUNBOOK.md` |
| Data retention schedule | `data/compliance/retention-schedule.json` |
| Subprocessors | `docs/investor/SUBPROCESSORS.md` |

**Gap:** Cookie policy, GDPR EN, DPA template, subscription terms — legal counsel.

---

## 07 — Security & ops

| Asset | Path |
|-------|------|
| Launch security audit | `docs/LAUNCH_PRODUCTION_AUDIT.md` |
| Production hardening | `docs/production-hardening-summary.md` |
| Partner delivery | `docs/PARTNER_DELIVERY_AUDIT.md` |
| Deploy pipeline | `.github/workflows/production-deploy.yml` |
| Deploy guide | `docs/CLOUDFLARE_PAGES_DEPLOY.md` |

---

## 07 — Technical diligence checklist

- [ ] Run `npm run test` on `main`
- [ ] Export `npm run metrics:investor:pack` → `investor-readiness-pack.json`
- [ ] Confirm Stripe dashboard MRR vs computed MRR
- [ ] Review `LAUNCH_PRODUCTION_AUDIT.md` verdict
- [ ] Partner LOIs / rate cards (offline)

---

## 08 — Fundraising execution cadence

- [ ] Intro-first outreach sent to Tier-1 targets each week
- [ ] Cold outreach batch includes 60 sn demo + one-pager link
- [ ] Each investor receives 48-hour follow-up after interaction
- [ ] Weekly investor update mail sent (single source of truth)
- [ ] Every open thread has a visible **next milestone date**

---

*Last updated for final fundraising operating pack on `main`.*
