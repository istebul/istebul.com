# Security Audit — Production Snapshot

**Date:** 2026-05-25  
**Scope:** isteBul web app + Cloudflare Pages Functions + Supabase edge  
**Reference:** `docs/LAUNCH_PRODUCTION_AUDIT.md`, `docs/COMPLIANCE_READINESS_AUDIT.md`

---

## Summary

| Layer | Rating | Notes |
|-------|--------|-------|
| Transport | **Strong** | HSTS, upgrade-insecure-requests |
| CSP | **Strong** | `_headers` — no third-party script CDNs; Stripe/Supabase allowlisted |
| AuthZ (client) | **Good** | Admin actions via edge functions; no service role in browser |
| AuthZ (DB) | **Good** | RLS migrations; admin service role server-only |
| Webhooks | **Strong** | Stripe HMAC; partner HMAC; idempotency tables |
| Secrets | **Good** | `dist/env.js` build gate blocks forbidden keys |
| Dependencies | **Monitor** | `npm audit` reports moderate/high — no auto `--force` applied |

**Verdict:** **Acceptable for production** with standard secret rotation and quarterly dependency review.

---

## Headers & CSP (`_headers`)

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security` with preload
- `Content-Security-Policy`:
  - `default-src 'self'`
  - `script-src` — self, plausible, cloudflare insights, turnstile
  - `connect-src` — self, `*.supabase.co`, Stripe API, Sentry ingest
  - `frame-ancestors 'none'`
  - No `unsafe-eval` in production CSP (challenge pages excepted by Cloudflare edge)

---

## Authentication & Supabase

| Control | Implementation |
|---------|----------------|
| Public anon key only in browser | `production-build.cjs` → `env.js` whitelist |
| Service role | Edge functions + export scripts only |
| Admin panel | `admin-action` edge function; not raw service role in client |
| Session | Supabase Auth SDK |

**Callback URLs:** Configure in Supabase dashboard for production domain.

**RLS:** Enforced via migrations (e.g. `20260527_launch_security_hardening.sql`). New tables must ship with policies.

---

## Stripe

| Control | Implementation |
|---------|----------------|
| Webhook signature | `stripe.webhooks.constructEvent` |
| Replay protection | `stripe_webhook_events` table |
| Failed payments | Logged to ops analytics |
| Checkout | Server-side `create-checkout.js` |

**Required secrets:** `STRIPE_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY` — never in client bundle.

---

## Partner & webhooks

- Partner callbacks: HMAC verification (`PARTNER_CALLBACK_SECRET`)
- Referral hub: `REFERRAL_WEBHOOK_SECRET` / `LIFECYCLE_WEBHOOK_SECRET`
- Auto intake: verification failures rejected (per launch audit)

---

## AI proxy

- `functions/ai-proxy.js` — same-origin proxy; optional `AI_PROXY_TOKEN`
- Groq/API keys not exposed to browser (CSP blocks direct third-party LLM calls)

---

## Build & supply chain

| Check | Status |
|-------|--------|
| `npm run lint` | Pass |
| No `console.log` in production JS | `check-console.cjs` |
| Git hooks setup | `prepare` script |
| CI runs full test on `main` | `production-deploy.yml` |

**Recommendation:** Enable Dependabot / monthly `npm audit` review.

---

## Known gaps (documented, not regressions)

1. **Bot challenge** — automated `curl` gets 403; browsers pass — normal for Cloudflare.  
2. **Cookie consent** — analytics gated; full GDPR EN pack pending legal (see compliance audit).  
3. **Cohort PII warehouse** — not built; analytics sample-capped.  
4. **npm audit** — dev tooling (LHCI, playwright) inflates advisory count.

---

## Incident response

- Ops events: `record-ops-event.js`, `ops-ingest` edge function  
- Runbook: `docs/RESILIENCE_RUNBOOK.md`  
- Stripe failures: webhook logs + Stripe dashboard  

---

## Checklist for next security review

- [ ] Rotate webhook secrets annually  
- [ ] Review new RLS on every migration  
- [ ] Pen-test checkout + admin before Series A  
- [ ] Confirm Cloudflare WAF rules for production zone  

---

*Static audit; dynamic pen-test not in scope for this run.*
