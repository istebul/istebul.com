# Stripe MRR Evidence — Investor Diligence Pack

**Purpose:** Reconcile computed MRR (`investor-kpis.js`) with Stripe Dashboard before investor meetings.

**Product:** isteBul Pro · ₺299/month · ₺2,870/year

---

## 1. Automated export (primary)

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run metrics:investor
```

| Field | Export path | Stripe equivalent |
|-------|-------------|-------------------|
| Pro MRR (TRY) | `subscription.mrrTry` | Dashboard → Revenue → MRR (normalize FX) |
| Active subs | `subscription.activeSubscriptions` | Active subscriptions count |
| Trialing | `subscription.trialingSubscriptions` | Trialing |
| Cancel signal | `subscription.cancelAtPeriodEnd` | Churn risk |

**Pack:** `npm run metrics:investor:pack` → `readiness` + full narrative.

---

## 2. Screenshot placeholders (paste before PDF export)

### 2.1 Stripe Dashboard — MRR overview

```
┌─────────────────────────────────────────────────────────────┐
│  [SCREENSHOT: Stripe Dashboard → Home → MRR chart]         │
│  Date range: Last 90 days · Currency: TRY                    │
│  File name: stripe-mrr-overview-YYYY-MM-DD.png               │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Active subscriptions

```
┌─────────────────────────────────────────────────────────────┐
│  [SCREENSHOT: Billing → Subscriptions → Filter: Active]    │
│  Count should match: subscription.activeSubscriptions        │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Revenue recognition (annual vs monthly)

```
┌─────────────────────────────────────────────────────────────┐
│  [SCREENSHOT: Sample annual vs monthly subs — period end]  │
│  Note: investor-kpis normalizes annual to monthly equiv.    │
└─────────────────────────────────────────────────────────────┘
```

### 2.4 Payouts & fees (gross margin input)

```
┌─────────────────────────────────────────────────────────────┐
│  [SCREENSHOT: Balance / Fees last quarter]                   │
│  Use for gross margin % in financial model                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Reconciliation worksheet

| Check | Computed (JSON) | Stripe UI | Δ | OK? |
|-------|-----------------|-----------|---|-----|
| MRR TRY | | | | ☐ |
| Active count | | | | ☐ |
| Annual plan MRR equiv. | | | | ☐ |
| Churn (cancel at period end) | | | | ☐ |

**Tolerance:** ±%2 for timing (webhook delay vs dashboard).

---

## 4. Payment metrics (fill from export)

| Metric | Value | Period |
|--------|-------|--------|
| New paid subs | [LIVE or manual] | Last 30d |
| Trial → paid % | [ ] | Last 90d |
| Logo churn % | [ ] | Last 90d |
| ARPU (normalized monthly) | ₺[ ] | Current |
| Stripe fee % | ~%2.9 + [ ] | Estimate |

---

## 5. Data room filing

Upload to secure folder:

1. `dist/investor-metrics-snapshot.json` (dated)  
2. `stripe-mrr-overview-*.png`  
3. This reconciliation sheet (signed by founder/CFO)

**Code reference:** `js/features/metrics/investor-kpis.js` · `PRO_PLAN_MRR_TRY`
