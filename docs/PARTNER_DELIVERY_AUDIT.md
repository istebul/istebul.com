# Partner / Dealer Lead Distribution — Enterprise Audit

## Executive summary

The platform had a working hot-lead webhook pipeline (routing, HMAC signing, cron retry, admin endpoints) but lacked unified dispatch logic, delivery observability, failover, circuit breaking, callback idempotency, and operator UX for onboarding. This branch closes those gaps.

## Findings (before)

| Area | Severity | Finding |
|------|----------|---------|
| Routing | High | Dispatch duplicated across `auto-intake`, `partner-retry`, `partner-dispatch` with inconsistent failover (manual dispatch used single endpoint only). |
| Retry | Medium | Retry worker worked but wrote no attempt logs; `auto-intake` updated leads by `phone` (duplicate-phone risk). |
| Observability | High | No `partner_lead_dispatch_logs`; RPCs `increment_partner_endpoint_*` missing from migrations. |
| Webhooks | Medium | Global secret only; no per-endpoint secret; no `x-istebul-dispatch-id`. |
| Callback | Medium | No rate limit, no idempotency, no `accepted` status. |
| Abuse | Medium | Partner application had honeypot only. |
| Failover | High | No structured route fallback when primary route exhausted. |
| Health | Medium | No circuit breaker / endpoint health on failures. |
| Onboarding UX | Medium | `partner-olun.html` was WhatsApp-only; no admin view for `partner_applications`. |

## Implemented (this branch)

1. **Migration** `20260525_partner_delivery_enterprise.sql` — dispatch logs, callback events, endpoint health/circuit, RPCs, `auto_leads.partner_endpoint_id`.
2. **Shared module** `supabase/functions/_shared/partner-dispatch.ts` — weighted endpoints, failover chain, signing, logging, `applyDispatchResult`.
3. **Edge functions** — `auto-intake`, `partner-retry`, `partner-dispatch`, `partner-callback`, `partner-application` hardened.
4. **Admin** — Partner applications pipeline, delivery log viewer, manual dispatch via `partner-dispatch`, health columns.
5. **Partner UX** — Application form on `partner-olun.html` with env-based API URL.

## Deploy checklist

- Apply migration on Supabase.
- Redeploy: `auto-intake`, `partner-retry`, `partner-dispatch`, `partner-callback`, `partner-application`.
- Secrets: `PARTNER_WEBHOOK_SIGNING_SECRET`, `PARTNER_CALLBACK_SECRET`, `RETRY_WORKER_SECRET` (unchanged).
