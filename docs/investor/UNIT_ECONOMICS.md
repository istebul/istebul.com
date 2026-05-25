# Unit Economics Framework

**Disclaimer:** Placeholder structure for investor models. Replace assumptions with live exports from `scripts/investor-metrics-snapshot.cjs` and Stripe dashboard.

---

## Pro subscription (B2C SaaS)

| Input | Source | Default assumption |
|-------|--------|-------------------|
| Monthly price | `plans.js` | ₺299 / month |
| Annual price | `plans.js` | ₺2,870 / year (≈ ₺239 MRR equiv.) |
| Trial | Stripe checkout | 7 days |
| Active subs | `subscriptions` table | **Live export** |

**Formulas:**

```
MRR_TRY = Σ normalized_monthly_revenue_per_active_subscription
ARR_TRY = MRR_TRY × 12
```

Implementation: `js/features/metrics/investor-kpis.js` → `computeSubscriptionMetrics()`

**Infra cost per Pro user (P16):**

| Component | Guardrail | Doc |
|-----------|-----------|-----|
| Groq `/ai-proxy` | 400 max tokens, 20 req/min/IP, 3 calls/tab/hr | `docs/INFRA_UNIT_ECONOMICS.md` |
| Resend lifecycle | 50 sends/cron run | same |
| Supabase events | 90d retention purge, 50% sample on `page_exit`/`route_change` | `scripts/analytics-retention-purge.cjs` |
| Cloudflare | Pages + immutable assets; no KV/R2 | `_headers`, `wrangler.toml` |

```
infra_usd_per_pro_mau ≈ (groq + resend + supabase_variable) / pro_mau
gross_margin_pct ≈ (pro_arpu - stripe_fees - infra_usd_per_pro_mau) / pro_arpu
```

Snapshot: `node scripts/infra-unit-economics-snapshot.cjs`

**Missing for full SaaS economics:**

- Live Stripe fee % in margin formula
- Churn % (need 3+ months cohort data)
- Trial → paid %

---

## Partner leads (marketplace / CPL)

| Input | Source |
|-------|--------|
| Estimated commission | `auto-intake` → `estimateCommission()` |
| Actual revenue | CRM `actual_revenue` |
| Win rate | `partner_status` in `won` states |

**Placeholder ranges** (`plans.js` `PARTNER_OFFERS` — validate with contracts):

| Partner type | Hint |
|--------------|------|
| Dealer lead | ₺5,000+ hot lead |
| Finance approval | ₺2,000+ |
| Insurance policy | ₺1,500+ |
| Premium report | ₺499+ |

**Formulas:**

```
Pipeline_VALUE = Σ estimated_revenue
Realized_VALUE = Σ actual_revenue
Blended_ARR_signal = Pro_ARR + Realized_VALUE (annualized if recurring)
```

---

## LTV / CAC (model placeholders)

Investors should receive a spreadsheet with:

```
LTV_pro = ARPU_monthly × gross_margin × (1 / churn_monthly)
LTV_lead = avg_actual_revenue_per_won_lead × leads_per_user × retention_factor

CAC = marketing_spend / new_paid_users
Payback_months = CAC / (ARPU_monthly × gross_margin)
```

**Not auto-computed in product** — requires ad spend import (Meta/Google) and finance model.

---

## Sensitivity (deck slide)

| Scenario | Driver |
|----------|--------|
| Bull | Pro conversion 5%+ · 3 partner LOIs · live data |
| Base | Current funnel · modeled CPL |
| Bear | Simulation-only · partner delays · churn >10% |

---

## Data sources for quarterly investor updates

1. `node scripts/investor-metrics-snapshot.cjs`
2. Stripe Dashboard → MRR chart
3. Admin → Investor KPIs
4. CRM export `auto_leads` CSV
