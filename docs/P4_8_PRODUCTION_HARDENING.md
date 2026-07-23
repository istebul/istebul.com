# P4.8 — Production hardening

Final security pass before deploy confidence. Scope: CSP, auth, RLS, payments, secrets, admin escalation, XSS, routes, edge functions, webhooks, abuse.

## Checklist (status)

| Area | Control | Status |
|------|---------|--------|
| **CSP** | `_headers`; no third-party script CDNs; Groq only via same-origin `/ai-proxy` | Hardened |
| **Auth** | Supabase JWT on edge functions; `create-checkout` origin allowlist + bearer | Existing |
| **RLS** | User tables locked; admin writes via service role + `admin-action` | Existing + migration `20260527_launch_security_hardening.sql` |
| **Payment integrity** | Stripe signature verify; `stripe_webhook_events` idempotency | Existing |
| **Secrets exposure** | `env.js` public keys only; build audit blocks `SERVICE_ROLE` in client | Existing + P4.8 audit |
| **Admin escalation** | Panel cannot grant `role=admin`; demote/ban only; last-admin DB trigger | **P4.8** |
| **XSS** | `escapeHtml` / `safeUrl` in `js/core/security.js`; admin text sanitize in edge | Existing |
| **Route hardening** | Fixed internal redirects in `route-surface.js`; SPA shells from build | Existing |
| **Edge function security** | JWT + role checks; table/column allowlists; partner webhook SSRF guard | Existing |
| **Webhook validation** | Stripe HMAC; partner `x-partner-callback-secret`; referral dedicated secret | **P4.8** (no service-role fallback) |
| **Abuse protection** | Turnstile + IP limits on `auto-intake`; `admin-action` 120 req/min per actor | **P4.8** |

## Admin role policy

- **Grant admin:** Supabase dashboard, SQL bootstrap, or controlled ops runbook — not the CRM UI.
- **Revoke admin:** Allowed from admin panel when more than one active admin remains (matches DB trigger).

## Lucide icons

Icons load from `/assets/lucide.min.js` (copied from `node_modules/lucide` at build). Avoids `unpkg.com` and keeps CSP `script-src 'self'`.

## Referral webhook secret

`processReferralSubscriptionConversion` in `functions/api/stripe-webhook.js` requires `REFERRAL_WEBHOOK_SECRET` or `LIFECYCLE_WEBHOOK_SECRET`. It does not use `SUPABASE_SERVICE_ROLE_KEY` as a bearer fallback.

## CI

```bash
node scripts/p4-8-production-hardening-audit.cjs
```

Included in `npm test`.

## Operational notes

- Rotate `SUPABASE_SERVICE_ROLE_KEY` if ever exposed in logs or chat.
- Set `REFERRAL_WEBHOOK_SECRET` in Cloudflare Pages env when referral conversions from Stripe are required.
- Re-run `npm test` before `git push origin main`.

## Related docs

- `docs/LAUNCH_PRODUCTION_AUDIT.md`
- `docs/PRODUCTION_RESILIENCE_AUDIT.md`
- `docs/quality-security-checklist.md`
- `GO_LIVE_CHECKLIST.md`
