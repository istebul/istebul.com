# Platform Analytics — Enterprise Audit

## Before (gaps)

| Requirement | Status |
|-------------|--------|
| Page journeys | Plausible only (3rd party); no first-party session stitch |
| Drop-off points | Manual funnel math on `auto_events` sample (500 rows) |
| CTA clicks | Not tracked |
| Auth conversion | No structured auth funnel events |
| Signup conversion | No register success/fail events |
| Subscription conversion | Stripe DB only; no product analytics events |
| Lead conversion | `auto_leads` table only; weak tie to sessions |
| Auto funnel | `auto_events` via auto-intake; no unified schema |
| Finance funnel | `auto_finance_click` only |
| Partner dispatch success | Dispatch logs table missing on main; no analytics events |
| Admin CRM outcomes | Admin tracking stubbed (`trackAdminAutoEvent` no-op) |
| Revenue attribution | No UTM persistence on checkout/subscription |

## Architecture (this branch)

```
Browser (consent) → js/core/analytics.js → analytics-ingest Edge Function
                                              ↓
                                    analytics_events (+ auto_events mirror for auto_*)
                                    analytics_sessions

Stripe webhook / auto-intake → recordPlatformEvent (server-side)
```

### Tables
- `analytics_sessions` — session + UTM attribution
- `analytics_events` — unified events with `funnel`, `funnel_step`, `revenue_cents`, `attribution`
- View `analytics_funnel_daily` — daily funnel rollups

### Ingest
- `supabase/functions/analytics-ingest` — rate limited, allowlisted events, batch up to 25

### Client SDK
- `js/core/analytics.js` — consent-gated, CTA delegation, page/route tracking, batch flush

### Server emitters
- `auto-intake` — auto events, lead_submit, partner dispatch outcomes
- `stripe-webhook` — checkout, subscription, invoice, revenue_attributed

### Admin
- **Platform Analytics** page — conversion summary, auto drop-off table, UTM revenue, CRM event count

## Deploy
1. Apply `20260526_platform_analytics.sql`
2. Deploy `analytics-ingest`
3. Redeploy `auto-intake` (if using server-side analytics)
4. Redeploy Pages functions: `stripe-webhook`, `create-checkout`
