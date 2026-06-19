# P13 — CEO alerting (early intervention)

**Goal:** Surface revenue, conversion, partner, and data-health regressions before they compound — via hourly Telegram digest.

## Alert types

| Alert | Signal |
|-------|--------|
| **Conversion crash** | Funnel CR (landing → lead) drops ≥35% vs prior 24h with minimum traffic |
| **Checkout failures** | High abandon / incomplete checkout rate or payment failures in 24h |
| **Stripe webhook failures** | `webhook_stripe_*` operational events (signature, processing errors) |
| **Partner dispatch failures** | Failed rows in `partner_lead_dispatch_logs` (24h) |
| **Unusual churn** | Multiple `cancel_at_period_end` subs or churn/cancel ops event spike |
| **Lead drop anomalies** | Lead volume down ≥45% vs prior 24h (analytics + CRM) |
| **Analytics anomalies** | Ingested event volume down ≥40% vs prior 24h (broken pipeline or traffic collapse) |

## Architecture

```
ceo-alert-engine.js  → comparative metrics (24h vs prior 24h)
ceo-alert-snapshot.cjs → dist/ceo-alerts-snapshot.json
ceo-alert-run.cjs → ops-alert-digest (channel: ceo) → Telegram
.github/workflows/ceo-alerts.yml → hourly at :15
```

## Commands

```bash
npm run metrics:ceo:alerts   # snapshot only
npm run ceo:alerts:run       # snapshot + Telegram when rules fire
```

## Configuration

- Thresholds: `data/ops/ceo-alerts.json`
- Rules: `data/ops/ceo-alert-rules.json`
- Digest: `supabase/functions/ops-alert-digest` (same secrets as P9 ops automation)

## Secrets (GitHub / Supabase)

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `OPS_ALERT_DIGEST_URL`, `OPS_ALERT_WEBHOOK_SECRET`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (on edge function)

## Related

- Ops Command Center: `npm run metrics:ops:center`
- Partner ops: `docs/PARTNER_OPS_AUTOMATION.md`
- Executive KPIs: `docs/P5_3_EXECUTIVE_KPI_DASHBOARD.md`
