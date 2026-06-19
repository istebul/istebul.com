# Growth Execution Plan — isteBul

**Mode:** Head of Growth + Performance Marketing + CRO + Retention  
**North star:** Qualified leads / week → paid conversion with measurable channel ROI.

---

## 1. Acquisition channels

| Channel | Instrumentation | Weekly action |
|---------|-----------------|---------------|
| SEO | `utm_medium=organic`, rehber landings | 1 hub page, internal links |
| Paid | `gclid`, `msclkid`, `paid_click_capture` | Launch Google brand + Meta `/auto/` |
| Referral | `?ref=`, share panel on Auto success | Monitor `referral_conversion` |
| Partner | B2B funnel events | 2 pilot onboardings |
| Lifecycle email | `growth_email_click` | Review open→click→lead |
| Retargeting | `utm_medium=display` | Export checkout abandon audience |
| Viral | `growth_viral_share` | WhatsApp share CTR |

**Tracked URLs:** `buildChannelCampaignUrl('paid'|'seo'|…)` in `growth-engine.js`.

---

## 2. Paid growth readiness

| Ready | Item |
|-------|------|
| ✅ | First-touch UTM + click IDs in `analytics.captureAttribution` |
| ✅ | Stripe metadata: `gclid`, `fbclid`, `msclkid`, `growth_channel` |
| ✅ | Events: `paid_click_capture`, `paid_conversion_signal` |
| ⏳ | Google/Meta ad accounts + creatives (ops) |
| ⏳ | Offline CAC sheet: spend / qualified leads |
| ⏳ | Server-side CAPI (phase 2) |

**Launch UTM template (Google):**
`https://www.istebul.com/auto/?utm_source=google&utm_medium=cpc&utm_campaign=auto_tco_brand`

---

## 3. Conversion funnel optimization (CRO)

**Canonical funnel** (`growth-funnel.js`):

`landing_visit` → `hero_cta_click` → `auto_start` → `wizard_complete` → `results_view` → `lead_submit` → `pricing_view` → `checkout_start` → `checkout_complete` → `paid_conversion`

| Lever | Status |
|-------|--------|
| Hero/pricing copy experiments | ✅ `data/growth/experiments.json` + `growth-experiments.js` |
| Checkout abandon recovery | ✅ lifecycle `checkout_abandon_recovery` |
| Conversion micro-UX (P4.4) | ✅ loading, trust, copy |
| Post-lead referral share | ✅ Auto success panel |

**Admin:** Platform Analytics → **Growth Command Center** (north star + channel table).

---

## 4. Retention engine

| Trigger | Action |
|---------|--------|
| Return visit ≥1d | `retention_return_visit` |
| Route change / engagement | `retention_engagement` |
| Checkout cancel | `enrollCheckoutAbandonRecovery` |
| Inactive (server) | `lifecycle-cron` → `inactive_users` |
| Churn risk | `retention_campaigns` |

**KPI:** Recovery rate = `growth_lead_recovery_click` / `growth_lead_abandon`.

---

## 5. Growth experimentation framework

| Component | Path |
|-----------|------|
| Registry | `data/growth/experiments.json` |
| Assignment | Deterministic bucket by `anonymous_id` |
| Exposure | `growth_experiment_exposure` |
| Conversion | `growth_experiment_conversion` (CTA/checkout clicks) |

**Active experiments (Q2):**

1. `hero_cta_copy_q2` — control vs urgency on homepage + Auto hero  
2. `pricing_cta_q2` — control vs trial-first on Pro CTA  

**Process:** Hypothesis → add variant in JSON → deploy → read Command Center / export → winner → promote to default copy.

---

## 6. KPI dashboard

| Surface | Command |
|---------|---------|
| Admin UI | Admin → Platform Analytics → Growth Command Center |
| Weekly JSON | `npm run metrics:growth` |
| Command center export | `npm run metrics:growth:command` |
| Investor snapshot | `npm run metrics:investor` |

**Primary KPIs:**

- Landing → lead %
- Landing → paid %
- Checkout start → complete %
- Channel leads / paid / revenue
- Experiment exposure → conversion %
- Paid click capture count

---

## Weekly growth cadence (60 min)

1. Run `npm run metrics:growth:command` (or read admin Command Center).  
2. Compare executive funnel step CR vs prior week.  
3. Update experiment log (winner/loser).  
4. One channel action (SEO publish, paid creative, partner outreach).  
5. Review lifecycle enroll failures in observability.

---

## Code map

```
js/runtime/growth-ops.js          — bootstrap experiments + retention + paid
js/features/growth/growth-kpis.js — funnel CR math
js/features/growth/growth-experiments.js
js/features/growth/paid-growth.js
js/features/growth/retention-engine.js
scripts/growth-command-center.cjs
scripts/growth-execution-audit.cjs
```

**Related:** `docs/GROWTH_ENGINE.md`, `docs/CRO_AUDIT.md`, `docs/LIFECYCLE_CRM.md`
