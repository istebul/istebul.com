# Scale Phase A Runbook (10k readiness)

Implements **Phase A** from `docs/SCALE_ARCHITECTURE_ROADMAP.md`.  
Target: stabilize current stack before 100k optimizations.

---

## A1 — Load / smoke tests

| Command | When |
|---------|------|
| `npm run build && npm run load:smoke` | CI + every release (static dist) |
| `SMOKE_LIVE=1 SMOKE_START_SERVER=1 npm run load:smoke` | Local pre-deploy |
| `k6 run scripts/load/k6-smoke.js -e BASE_URL=https://www.istebul.com` | Staging/prod (weekly) |

Optional k6 edge probes:

```bash
export ANALYTICS_INGEST_URL="${SUPABASE_URL}/functions/v1/analytics-ingest"
k6 run scripts/load/k6-smoke.js \
  -e BASE_URL=https://www.istebul.com \
  -e SUPABASE_ANON_KEY=...
```

**Checkout** is not hammered in smoke (Stripe + auth). Manual: one checkout in staging after deploy.

---

## A2 — Supabase PITR + connection pooler

**Owner:** Ops / founder — Dashboard actions.

1. Supabase project → **Settings → Database → Backups**  
   - Confirm **PITR** enabled (Pro plan).  
   - Note earliest restore time in data room.

2. **Settings → Database → Connection pooling**  
   - Enable **Supavisor** (transaction mode for Edge Functions).  
   - Document pooler URL in secrets (if app ever uses direct Postgres).

3. Add to investor/resilience notes: last verified date.

---

## A3 — SLO checks (24h)

Thresholds: `data/scale/slo-thresholds.json`

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run metrics:slo
```

Fails exit code 1 when:

- Critical/error `operational_events` exceed caps  
- Partner webhook failures high  
- `api_auto_intake_rate_limited` spike  

**Wire alerting (manual until PagerDuty):**

- Weekly GitHub Action with secrets → Slack webhook (optional future workflow)  
- Admin → Observability page daily review  

**Supabase slow queries:** Dashboard → Reports → Query performance → export top 10 monthly.

---

## A4 — Bundle budget (CI)

`npm run test` runs `analyze:bundle` after build.

Limits (`scripts/analyze-bundle.cjs`):

- Per chunk: 320 KB  
- Critical path (app + auto + style hash): 750 KB  
- Full dist total is reported but not gated (admin + duplicate hashed assets excluded from gate)  

Report: `dist/bundle-report.json`

---

## A5 — Edge function deploy manifest

Canonical list: `data/deploy/edge-functions.json`  
CI: `scripts/deploy-manifest-check.cjs` (also in `phase-a-check.cjs`)

After adding a function:

1. Create `supabase/functions/<name>/`  
2. Append to `edge-functions.json`  
3. Append to `.github/workflows/production-deploy.yml` `FUNCTIONS=(...)`  
4. Set secrets if cron (see A6)

---

## A6 — Data retention (90d hot analytics)

**Purpose:** Control `analytics_events` / `operational_events` growth (scale).  
**Legal:** Long-term analytics may still require aggregated export — see `data/compliance/retention-schedule.json` (counsel).

| Component | Path |
|-----------|------|
| SQL functions | `purge_analytics_events_older_than`, `purge_operational_events_older_than` |
| Edge cron | `data-retention-cron` |
| Audit | `data_retention_runs` table |
| Schedule | `.github/workflows/data-retention.yml` (weekly Sun 03:00 UTC) |

### Secrets

| Secret | Value |
|--------|--------|
| `DATA_RETENTION_CRON_SECRET` | Random 32+ chars |
| `DATA_RETENTION_URL` | `https://<ref>.supabase.co/functions/v1/data-retention-cron` |

Set Supabase function env:

- `DATA_RETENTION_CRON_SECRET` (same)  
- `ANALYTICS_HOT_RETENTION_DAYS` (default 90)  
- `OPS_EVENTS_RETENTION_DAYS` (default 90)  

### Manual trigger

```bash
curl -X POST "$DATA_RETENTION_URL" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "x-data-retention-secret: $DATA_RETENTION_CRON_SECRET"
```

---

## Phase A completion checklist

- [ ] PITR verified (date: ______)  
- [ ] Supavisor enabled  
- [ ] `npm run test` green (bundle + phase-a + deploy manifest)  
- [ ] k6 smoke once on production  
- [ ] `metrics:slo` baseline captured  
- [ ] Data retention cron secrets + first successful run  
- [ ] Migration `20260531_scale_phase_a_retention` applied  

---

## Related

- `docs/SCALE_ARCHITECTURE_ROADMAP.md`  
- `docs/PRODUCTION_RESILIENCE_AUDIT.md`  
- `docs/RESILIENCE_RUNBOOK.md`
