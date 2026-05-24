# isteBul — Investor Data Room Index

**Purpose:** VC / angel due diligence navigation.  
**Product:** AI decision platform for high-consideration purchases (Auto live; konut/tatil/finance expansion).  
**Production:** https://www.istebul.com · Cloudflare Pages + Supabase.

---

## 01 — Company & narrative

| Document | Path | Status |
|----------|------|--------|
| One-pager (executive) | `docs/investor/ONE_PAGER.md` | Ready |
| **Pitch deck outline** | `docs/investor/PITCH_DECK_OUTLINE.md` | Ready (fill brackets before meetings) |
| Investor readiness audit | `docs/investor/INVESTOR_READINESS.md` | Ready |
| Risk register | `docs/investor/RISK_REGISTER.md` | Ready |
| Unit economics framework | `docs/investor/UNIT_ECONOMICS.md` | Ready (assumptions explicit) |

**Gap:** Pitch deck **PDF** (export from outline), cap table, financial model spreadsheet — prepare offline.

---

## 02 — Product & defensibility

| Document | Path |
|----------|------|
| **Enterprise brand system** | `docs/BRAND_SYSTEM.md` |
| Brand consistency checklist | `docs/BRAND_CONSISTENCY_CHECKLIST.md` |
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
| KPI definitions | `js/features/metrics/investor-kpis.js` |
| **Executive metrics (CEO)** | `docs/EXECUTIVE_METRICS.md` · `js/features/metrics/executive-metrics.js` |
| Live export script | `scripts/investor-metrics-snapshot.cjs` |
| Executive export | `npm run metrics:executive` → `dist/executive-metrics-snapshot.json` |
| Admin dashboard | Admin → **Investor KPIs** · **Executive metrics** |
| Analytics audit | `docs/PLATFORM_ANALYTICS_AUDIT.md` |
| Production observability | `docs/PRODUCTION_OBSERVABILITY.md` |
| **Production resilience / BCP** | `docs/PRODUCTION_RESILIENCE_AUDIT.md` |
| Resilience runbook (ops) | `docs/RESILIENCE_RUNBOOK.md` |
| SQL views (optional) | `supabase/migrations/20260528_investor_metrics_views.sql` |

**Export command:**

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/investor-metrics-snapshot.cjs
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

## 05 — Legal & compliance

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

## 06 — Security & ops

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
- [ ] Export `investor-metrics-snapshot.json`
- [ ] Confirm Stripe dashboard MRR vs computed MRR
- [ ] Review `LAUNCH_PRODUCTION_AUDIT.md` verdict
- [ ] Partner LOIs / rate cards (offline)

---

*Last updated with investor-readiness release on `main`.*
