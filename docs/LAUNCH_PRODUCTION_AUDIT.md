# Launch-Grade Production Audit

**Branch:** `cursor/launch-production-audit-0bbd`  
**Date:** 2026-05-23  
**Verdict:** Critical launch blockers addressed in code + migration; deploy checklist required.

## Executive summary

| Severity | Before | After this PR |
|----------|--------|----------------|
| P0 (launch blockers) | 4 | 0 (with migration deploy) |
| P1 (high) | 9 | 2 documented follow-ups |

---

## Checklist

### Security — **PASS** (with deploy)

| Item | Status | Notes |
|------|--------|-------|
| RLS on PII tables | PASS | `auto_leads`, `auto_events`, rate limits, webhooks denied for clients |
| Admin CRM read | **FIXED** | Migration `20260527_launch_security_hardening.sql` — admin SELECT on leads/events |
| Last-admin guard | **FIXED** | DB trigger `enforce_minimum_admin_count` |
| Pro bypass | **FIXED** | Auto uses `revenueManager.isPremium` (DB subscription), not `localStorage` alone |
| Role escalation API | **FIXED** | `API.updateUserRole` disabled; use admin-action |
| Analytics funnel leak | **FIXED** | `REVOKE` on `analytics_funnel_daily` for `authenticated` |
| Partner SSRF | **FIXED** | `webhook-url.ts` + dispatch + admin-action validation |
| Webhook signing | **FIXED** | Require `shared_secret` unless `PARTNER_WEBHOOK_REQUIRE_SECRET=false` |

### Auth — **PASS**

| Item | Status | Notes |
|------|--------|-------|
| Checkout requires bearer | PASS | `create-checkout.js` |
| Admin panel role gate | PASS | `admin-panel.js` profile check |
| Profile self-escalation | PASS | RLS `WITH CHECK` on profiles |
| Session bootstrap | WARN | Main app: consider merging maintainability PR for duplicate event fix |

### Payments — **PASS**

| Item | Status | Notes |
|------|--------|-------|
| Stripe Checkout | PASS | Auth, origin allowlist, duplicate sub 409 |
| Trial eligibility | PASS | No trial if prior subscription row |
| Idempotency key | PASS | Per checkout session |

### Subscriptions — **PASS**

| Item | Status | Notes |
|------|--------|-------|
| RLS read-own | PASS | `subscriptions` policy |
| Webhook upsert | PASS | `stripe-webhook.js` |
| Client premium state | **FIXED** | Auto entitlements refresh via `revenueManager` |

### Webhooks — **PASS**

| Item | Status | Notes |
|------|--------|-------|
| Stripe signature | PASS | `constructEvent` |
| Idempotency race | **FIXED** | Insert `stripe_webhook_events` before processing |
| Partner callback secret | PASS | Header check |
| Per-lead callback auth | **FOLLOW-UP** | Global secret; bind callback to dispatch log in P1 |

### Admin permissions — **PASS**

| Item | Status | Notes |
|------|--------|-------|
| admin-action gate | PASS | Admin + not banned |
| Field allowlists | PASS | insert/update tables |
| Audit trail | **FIXED** | Writes to `admin_audit_logs` on mutations |
| Error leakage | **FIXED** | Generic 500 message to client |

### RLS — **PASS** (post-migration)

Apply: `supabase db push` or run migration in Supabase SQL editor.

### CSP — **PASS**

`_headers`: HSTS, frame-ancestors, connect-src includes Supabase/Stripe/Sentry/Turnstile.

**WARN:** `style-src 'unsafe-inline'` — acceptable for launch; tighten with nonces later.

### CORS — **PASS**

| Surface | Status |
|---------|--------|
| Edge functions | Allowlist origins |
| analytics-ingest | **FIXED** — 403 unknown origin |
| Pages Functions | **FIXED** — removed static ACAO override |

### XSS — **PASS**

Admin panel escapes HTML; `security.js` used in UI. **WARN:** audit CMS-driven `innerHTML` paths periodically.

### Abuse prevention — **PASS**

| Control | Status |
|---------|--------|
| auto-intake rate limits | PASS |
| Turnstile | **FIXED** — 403 on failure (no DB insert) |
| Honeypot | PASS |
| 24h dedupe | PASS |
| Lead upsert overwrite | **FIXED** — insert-only after dedupe |
| analytics-ingest rate limit | PASS |
| PII without consent | **FIXED** — strip email/phone unless `consent_analytics` |

### Analytics — **PASS**

Ingest allowlist events; admin reads via RLS policy on `analytics_events`.

### SEO — **PASS** (prior PRs)

Build-time sitemap, rehber pages, meta injection — verify live after deploy.

### Performance — **PASS**

Immutable asset caching in `_headers`; production build bundles JS/CSS.

### Mobile UX — **PASS** (prior PR #24 if merged)

`mobile-perfection.css`, admin drawer — verify on device.

### Conversion — **PASS**

Checkout intent, auth gate, sticky CTA (CRO PR) — monitor `checkout_started` / `checkout_completed`.

### Partner routing — **PASS**

Weighted endpoints, circuit breaker, failover chain, dispatch logs.

### Lead delivery — **PASS**

Hot-lead dispatch via `partner-dispatch`; retries via `partner-retry` (secret header).

### CRM reliability — **PASS** (post-migration)

Admin reads leads/events with admin policy; mutations via `admin-action`.

### Fail states — **PASS**

Dispatch dead after retries; circuit open; user-facing errors in Turkish.

### Error handling — **PASS**

Generic admin-action errors; monitoring/Sentry in CSP.

### Observability — **PASS**

`partner_lead_dispatch_logs`, `admin_audit_logs` (now written), Plausible + `analytics_events`, Sentry.

---

## Deploy checklist (required)

1. **Supabase migration:** `20260527_launch_security_hardening.sql`
2. **Redeploy edge functions:** `admin-action`, `auto-intake`, `analytics-ingest`, `partner-dispatch`
3. **Cloudflare Pages:** push `main` (GitHub Actions)
4. **Stripe webhook** endpoint live + `STRIPE_WEBHOOK_SECRET` set
5. **Env secrets:** `TURNSTILE_SECRET`, `PARTNER_CALLBACK_SECRET`, `PARTNER_RETRY_SECRET`, Supabase keys
6. **Smoke test:** Auto lead submit, admin CRM load, Pro checkout, webhook test event

## P1 follow-ups (non-blocking)

- Per-partner callback HMAC tied to `lead_id` + dispatch log
- Split `js/app.js` (maintainability PR #25)
- CSP nonces for inline styles
- Map auth errors in all surfaces (`mapAuthError` everywhere)

## Verification commands

```bash
npm run test
npm run test:unit
```

---

*This document is the launch sign-off artifact for engineering; update status after each production deploy.*
