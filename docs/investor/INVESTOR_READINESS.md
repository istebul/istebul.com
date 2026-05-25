# Investor Readiness Assessment

**Audience:** VC, angel, strategic corporate  
**Verdict:** **Technically diligence-ready** · **Commercial packaging in progress**

---

## 1. Business defensibility

| Factor | Assessment |
|--------|------------|
| **Category** | High-consideration decision intelligence (not generic classifieds) |
| **Workflow lock-in** | Decision history, comparison basket, CRM follow-up |
| **Data** | Vehicle truth layer + cost profiles; simulation mode until live providers |
| **Brand trust** | Transparent scoring, methodology strips, anti-hallucination AI |

**Investor narrative:** “We own the *decision layer* above listings and bank calculators.”

**Honest limit:** Live market data not fully switched on (`liveProvidersEnabled: false`).

---

## 2. Moat

See `docs/investor/MOAT_AND_DEFENSIBILITY.md`.

**Summary:** Medium moat today (software + ops); path to strong moat via proprietary catalog, partner network effects, and cross-vertical decision graph.

---

## 3. Growth levers

| Lever | Description | Readiness |
|-------|-------------|-----------|
| **SEO / organic** | Auto hubs, rehber landings | Live (TR) |
| **Auto funnel CRO** | Wizard → results → lead | Live, instrumented |
| **Pro conversion** | Paywall, trial, annual plan | Live |
| **Partner supply** | Dealer/finance/insurance endpoints | Live |
| **Vertical expansion** | Konut, tatil, kredi, sigorta | Roadmap (`PLATFORM_EXPANSION_ROADMAP.md`) |
| **Global locales** | en/de/ar routing | Foundation live |
| **B2B white-label** | Not built | Future |

---

## 4. Monetization clarity

| Stream | Code | Investor clarity |
|--------|------|------------------|
| Pro MRR | `subscriptions` + Stripe | **Clear** — compute via `investor-kpis.js` |
| Lead CPL | `auto_leads.estimated_revenue` | **Modeled** — needs partner contracts |
| Actual revenue | `actual_revenue` CRM field | **Manual** until settlement API |

**Action for founders:** Attach Stripe revenue chart + 2–3 signed partner term sheets to data room.

---

## 5. Metrics readiness

**P7 pack:** `npm run metrics:investor:pack` → `dist/investor-readiness-pack.json` with weighted `readiness.verdict`. See `docs/P7_INVESTOR_READINESS.md`.

| Metric | Status |
|--------|--------|
| MRR / ARR (Pro) | Computed in admin + export script |
| Pipeline ARR (leads) | Estimated + actual sums |
| Funnel conversion | Platform analytics (sample-capped) |
| Churn | `cancel_at_period_end` signal only |
| LTV / CAC | **Framework** in `UNIT_ECONOMICS.md` — not auto-tracked |
| Cohort retention | **Not built** |

---

## 6. Analytics maturity

**Strengths:** Event taxonomy, server-side Stripe/lead events, admin funnel views, UTM attribution.

**Gaps:** Consent gating undercounts; 2,500 event cap; dual `auto_events` / `analytics_events`; no warehouse/BI.

**Maturity stage:** **Seed-appropriate** (instrumented) → **Series A needs** warehouse + cohorts.

---

## 7. Operational scalability

| Area | Status |
|------|--------|
| CRM + audit | `admin_audit_logs`, bulk actions |
| Partner delivery | Dispatch, retry workflow, circuit breaker |
| Deploy | CI test → Cloudflare → Supabase edge |
| Support | Telegram lead alerts; no ticketing integration |

**Bottleneck:** Human CRM for lead qualification at scale.

---

## 8. Tech scalability

| Area | Status |
|------|--------|
| Edge + static CDN | Cloudflare Pages |
| Stateful logic | Supabase + edge functions |
| i18n / RTL | Foundation |
| Multi-tenant B2B | Not yet |
| `app.js` monolith | Maintainability debt (documented) |

**Scale path:** Category registry, extract decision services, read replicas / analytics warehouse.

---

## 9. Risk areas

See `docs/investor/RISK_REGISTER.md`.

**Top 5 investor questions:**

1. What is **realized** partner revenue vs `estimated_revenue`?
2. When does **live pricing** replace simulation?
3. **Churn** and trial-to-paid conversion?
4. **Regulatory** exposure (financial advice, KVKK/GDPR)?
5. **Competition** (Sahibinden, banks, OEM captives)?

---

## Diligence readiness scorecard

| Dimension | Score (1–5) | Notes |
|-----------|-------------|-------|
| Product / tech | 4 | Audits, tests, deploy automation |
| Monetization architecture | 4 | Stripe + leads wired |
| Metrics / data room | 3 | KPI layer added; needs live exports |
| Legal | 2 | Pages thin; no DPA/cookie policy |
| GTM proof | 2–3 | Founder-dependent traction proof |
| Defensibility story | 3 | Strong IP narrative; data depth growing |

---

## Recommended next 30 days (founder)

1. Export weekly `investor-metrics-snapshot.json`
2. Legal: cookie policy + subscription terms + subprocessor sign-off
3. Close 1–2 partner LOIs with rate cards
4. Deck + 3-year model (offline)
5. Enable or roadmap live data providers (honest moat slide)

---

*Related: `DATA_ROOM_INDEX.md`*
