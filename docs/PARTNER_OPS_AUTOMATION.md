# P12 — Partner ops automation

**Goal:** Ops reliability for B2B lead delivery (HMAC webhooks, retry worker, endpoint health).

## Automations

| Capability | Implementation |
|------------|----------------|
| Lead dispatch monitoring | `partner-ops-monitor.js` → 24h success/fail counts, p50/p95 `latency_ms` from `partner_lead_dispatch_logs` |
| Retry automation | Existing `partner-retry` edge function + `.github/workflows/partner-retry.yml` (every 15m) |
| Failure alerting | P12 rules in `data/ops/alert-rules.json` + `partner:ops:run` → `ops-alert-digest` (Telegram) |
| Partner SLA monitoring | p95 dispatch latency vs **15m** (`900000` ms) — aligns with `data/investor/growth-story.json` |
| Partner inactivity alerts | Active endpoints with no `last_success_at` in 7 days |
| Webhook health monitoring | `health_status` (`healthy` / `degraded` / `unhealthy`), `circuit_open_until`, consecutive failures |

## Commands

```bash
npm run metrics:partner:ops    # dist/partner-ops-snapshot.json
npm run partner:ops:run        # snapshot + partner-domain alert digest
npm run metrics:ops:center     # unified ops command center (includes partner rollup when DB present)
```

## Scheduled jobs

- **Every 15m:** `partner-retry.yml` — retries `dispatch_failed` leads (`next_retry_at`, max 5 attempts)
- **Every 15m:** `partner-ops-monitor.yml` — monitoring snapshot + threshold alerts
- **Daily 06:00 UTC:** `ops-automation.yml` — full company ops rollup

## Alert rules (partner domain)

See `data/ops/alert-rules.json` for thresholds: dispatch fail volume, low success rate, SLA p95 breach, retry backlog, unhealthy endpoints, circuit open, inactive partners.

## Admin

- **Ops Command Center** — partner domain highlights + P12 metrics when loaded with endpoint/retry data
- **Partner dispatch logs** — per-lead attempt history
- **Partner ops KPI** — existing admin partner section (`js/features/admin/partner-ops.js`)

## Related docs

- `docs/partner-webhook-integration.md`
- `docs/PARTNER_DELIVERY_AUDIT.md`
- `docs/OPS_AUTOMATION_ROADMAP.md`
