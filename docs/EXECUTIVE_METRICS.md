# Executive Metrics Dashboard

CEO-level visibility for engagement, pipeline, revenue, unit economics, funnel, churn, and growth.

## Where to view

| Surface | Path |
|---------|------|
| Admin UI | **Admin → Executive metrics** (`admin-panel.html`) |
| JSON export | `npm run metrics:executive` → `dist/executive-metrics-snapshot.json` |
| Logic | `js/features/metrics/executive-metrics.js` |

## Metrics tracked

| Metric | Definition | Primary source |
|--------|------------|----------------|
| **DAU** | Distinct identities active in last 1 day | `analytics_events`, `analytics_sessions` |
| **WAU** | Last 7 days | Same |
| **MAU** | Last 30 days | Same |
| **Lead volume** | Count of `auto_leads` | CRM |
| **Qualified leads** | `priority` ∈ warm/hot/very_hot or `lead_score` ≥ 50 | `auto-intake` scoring |
| **Close rate** | Won ÷ qualified | `partner_status` |
| **CAC** | Marketing spend (30d) ÷ `checkout_completed` (30d proxy) | Env + analytics |
| **LTV** | Modeled Pro ARPU × lifetime × margin + partner win avg | Subscriptions + CRM |
| **Subscription revenue** | Normalized MRR/ARR | `investor-kpis.js` / Stripe |
| **Partner revenue** | Σ `actual_revenue` (CRM) | `auto_leads` |
| **Conversion funnel** | Visit → Engage → Lead → Qualified → Won → Subscribe | Analytics + leads |
| **Churn** | Cancel-at-period-end / billable (logo signal) | `subscriptions` |
| **Growth rate** | MAU and lead volume vs prior 30d window | Analytics + leads |

Identity for active users: `user_id` → `anonymous_id` → `session_id` (consent-gated samples).

## Export

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run metrics:executive
```

Optional CAC input:

```bash
EXECUTIVE_MARKETING_SPEND_TRY_30D=50000 npm run metrics:executive
```

## Limitations (board-ready honesty)

1. **Sample caps** — Admin loads capped rows; export uses larger limits but is not a warehouse rollup.
2. **CAC** — Requires marketing spend import; paid-user proxy uses checkout events until finance feed exists.
3. **LTV** — Uses assumed lifetime months when cohort churn history is short.
4. **Partner revenue** — Operator-entered `actual_revenue` until automated settlement.
5. **Consent** — Analytics under-reports users who decline cookies.

## Related docs

- `docs/investor/DATA_ROOM_INDEX.md`
- `docs/investor/UNIT_ECONOMICS.md`
- `js/features/metrics/investor-kpis.js`
