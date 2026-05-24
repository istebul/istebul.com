# Production Observability

**Goal:** Real operational visibility — errors, API/webhook failures, lead delivery, auth, payments, performance, abuse, and admin audit in one place.

---

## Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Client errors | Sentry (optional) + `operational_events` | Stack traces + structured ops |
| Client signals | `js/core/operational-telemetry.js` → `ops-ingest` | Auth, checkout, perf, API failures |
| Server | Edge functions → `recordOperationalEvent` | Intake, partner dispatch, lifecycle |
| Payments | `stripe-webhook.js`, `create-checkout.js` | Webhook + checkout failures |
| Admin | **Observability** page | 24h rollup + logs + audit |
| Export | `npm run metrics:ops` | JSON snapshot (service role) |

---

## Event catalog

### Client (`ops-ingest`)

| Event | Category | Severity |
|-------|----------|----------|
| `client_unhandled_error` | error | error |
| `client_unhandled_rejection` | error | error |
| `client_api_failure` | api | error |
| `auth_login_failed` | auth | warning |
| `auth_register_failed` | auth | warning |
| `payment_checkout_failed` | payment | error |
| `performance_lcp_slow` | performance | warning |
| `performance_long_task` | performance | warning |

### Server (edge / Pages)

| Event | When |
|-------|------|
| `abuse_rate_limit_exceeded` | auto-intake rate limit |
| `abuse_turnstile_failed` | Turnstile fail |
| `abuse_spam_honeypot` | Honeypot trip |
| `lead_delivery_failed` | Lead insert error |
| `webhook_partner_dispatch_failed` | Partner HTTP/network fail |
| `webhook_partner_dispatch_exhausted` | All endpoints failed |
| `webhook_stripe_signature_invalid` | Stripe signature |
| `webhook_stripe_processing_failed` | Stripe handler / invoice failed |
| `payment_checkout_failed` | create-checkout Stripe error |

---

## Database

Migration: `supabase/migrations/20260530_operational_observability.sql`

- `operational_events` — structured log (RLS: admin read only)
- Views: `ops_health_24h`, `ops_severity_24h`

Existing tables still used:

- `partner_lead_dispatch_logs` — per-attempt webhook detail
- `admin_audit_logs` — admin mutations
- `analytics_events` — product funnel (not ops)

---

## Admin UI

**Admin → Observability** (`admin-panel.html`)

- Severity counts (24h)
- Top signals rollup
- Recent critical/error events
- `dispatch_failed` leads
- Partner webhook failure log
- Admin audit tail

---

## Sentry

Configure `SENTRY_DSN` in runtime env (`config.monitoring.sentryDsn`). Initialized after cookie consent. Ops events still record for users who decline marketing analytics.

---

## Alerts (recommended)

| Signal | Action |
|--------|--------|
| `critical` > 0 in 1h | Page on-call |
| `webhook_partner_dispatch_exhausted` spike | Check partner endpoints |
| `payment_checkout_failed` | Stripe dashboard + ops log |
| `performance_lcp_slow` p75 | Performance regression |
| `abuse_rate_limit_exceeded` | WAF / Cloudflare rules |

Wire Sentry alerts + weekly `npm run metrics:ops` in CI.

---

## Deploy

```bash
supabase db push
# Deploy: ops-ingest, auto-intake, partner-dispatch (shared module)
```

---

## Related

- `docs/LAUNCH_PRODUCTION_AUDIT.md`
- `docs/PARTNER_DELIVERY_AUDIT.md`
- `docs/PLATFORM_ANALYTICS_AUDIT.md`
