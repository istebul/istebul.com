# P4.7 — Venture scale readiness audit

Scenarios: **10K MAU**, **100K MAU**, **1M MAU** (order-of-magnitude planning; not capacity guarantees).

## Executive summary

| Layer | 10K | 100K | 1M | Verdict |
|-------|-----|------|-----|---------|
| Frontend (SPA + Auto) | ✅ | ✅ with CDN | ✅ static edge | **Cloudflare/Pages suitable** |
| Supabase Postgres | ✅ | ⚠️ event volume | 🔴 partition + tier | **Primary bottleneck at 1M** |
| Analytics ingest | ✅ | ⚠️ | 🔴 aggregate tables | Rate-limited; batching OK |
| Email (Resend) | ✅ | ⚠️ quotas | 🔴 queue + tiers | Cron batch caps exist |
| Stripe | ✅ | ✅ | ✅ | Checkout is edge; webhooks scale |
| Admin CRM | ✅ | ⚠️ | 🔴 pre-aggregated KPIs | Full event scans risky |
| Partner dispatch | ✅ | ⚠️ | ⚠️ async queue | Retry schedule + indexes |
| AI (Groq proxy) | ✅ | ⚠️ cost | 🔴 hard caps | Optional narration; highest $ risk |

**Venture-ready today** for early growth (≈10K). **100K** needs event retention + admin rollups. **1M** needs warehouse/export path and tier upgrades.

---

## 1. Frontend scalability

**Architecture:** Static `dist/` on Cloudflare Pages / Netlify; hashed JS/CSS; SPA code-splitting (`app.bundle` + chunks); Auto standalone bundle; service worker cache-first for assets.

| Signal | Current | 10K | 100K | 1M |
|--------|---------|-----|------|-----|
| Bundle (~760 KB SPA) | OK | OK | OK | OK (edge cached) |
| Perceived perf (P4.5) | content-visibility, skeletons | OK | OK | OK |
| Client telemetry | Batched analytics + ops | OK | Queue caps added | Sample/throttle |

**Bottleneck:** Not CPU on edge — **API fan-out** (Supabase REST, edge functions) per session.

**Quick wins (shipped):** `SCALE_LIMITS` queue caps; dedupe `page_view` in analytics queue; admin queries time-boxed.

**Next (100K+):** Route-level lazy chunks for admin-only code; optional Plausible-only mode for marketing pages.

---

## 2. Cloudflare suitability

| Workload | Fit |
|----------|-----|
| Static HTML/JS/CSS | Excellent — global cache, immutable assets |
| `/api/*` → Netlify functions | Good — checkout, AI proxy at edge |
| Supabase edge functions | Good — `cf-connecting-ip` used for rate limits |
| WebSocket (Supabase realtime) | Moderate — use sparingly for messaging |
| Long-running jobs | Poor — use Supabase cron + queues |

**Recommendation:** Keep marketing on CDN; keep secrets off client; use Cloudflare Turnstile + WAF rules on origin.

---

## 3. Supabase bottlenecks

### Tables at risk (write-heavy)

- `analytics_events` — every page view, funnel step, CTA
- `operational_events` — client errors/perf (lower volume)
- `auto_events` — duplicate insert for legacy auto_* events
- `auto_leads`, `lifecycle_messages`, `partner_dispatch_log`

### Read patterns at risk

- Admin `loadPlatformAnalytics()` — was unbounded recent scan → **14-day window + 1200 row cap**
- Partner funnel — 30-day filtered query (OK with index)

**10K:** Pro/Team tier sufficient.  
**100K:** Enable connection pooling; add **BRIN** on `analytics_events.created_at`; nightly rollup table.  
**1M:** Partition `analytics_events` by month; archive to cold storage; BigQuery/Snowflake export.

**Quick wins (shipped):** Migration `20260608_p47_scale_analytics_indexes.sql` (BRIN + recent partial index).

---

## 4. Event storage & analytics scaling

**Flow:** Browser → `analytics-ingest` (max 25 events/batch, 120 req/min/IP) → `analytics_events` + `analytics_sessions`.

| Volume estimate (MAU) | Events/user/mo | Rows/mo |
|----------------------|----------------|---------|
| 10K | ~40 | ~400K |
| 100K | ~40 | ~4M |
| 1M | ~40 | ~40M |

**Mitigations in repo:**

- Allowlist + property clamp (30 keys, 500 char strings)
- Idempotency key unique index
- Client batching + queue dedupe + max queue 48

**Gaps for 1M:** No rollup MV for funnels; admin aggregates in browser.

**Quick wins:** See admin window; add `investor_funnel_daily` materialized view (future migration).

---

## 5. Email scaling (Resend + lifecycle-cron)

**Cron caps (per run):** 80 messages sent, enrollments 20–40 per audience.

| Tier | Risk |
|------|------|
| 10K | Low |
| 100K | Resend daily send limits — monitor bounce rate |
| 1M | Requires dedicated IP + queue workers |

**Quick win:** Already batched; document `RESEND` tier in ops runbook.

---

## 6. Stripe scaling

Checkout via Netlify `create-checkout.js`; billing portal; webhooks to Supabase (assumed).

| Scale | Notes |
|-------|------|
| 10K–1M | Stripe scales; bottleneck is app webhook handler idempotency |

**Quick win:** Ensure webhook idempotency keys on `subscription_*` events (verify in stripe webhook handler if present).

---

## 7. Admin scaling

| Panel | Pattern | 100K+ risk |
|-------|---------|------------|
| Ops health | 24h views + limits | Low |
| Platform analytics | Client-side aggregation | **High** without rollups |
| CRM leads | limit 200 | Medium |
| Listings/users | limit 100 | Low |

**Quick wins (shipped):** 14-day analytics window; partner funnel keeps `gte(created_at)`.

---

## 8. Partner scaling

- Dispatch with retry schedule (15m → 1d)
- `partner_dispatch_log` indexed
- Rate limits on intake/dispatch functions

**100K:** Horizontal edge functions OK; partner webhook timeouts need circuit breaker (partial via failover routes).

---

## 9. AI inference cost risk

| Path | Cost driver |
|------|-------------|
| `/ai-proxy` (Groq llama-3.1-8b) | Optional Auto narration; 700 max tokens; 25 req/min/IP |
| Decision intelligence | Mostly deterministic; no LLM on hot path |

**Risk model (illustrative):**

- 10% MAU trigger AI × 1 call = 1K calls/mo @ 10K MAU → low $
- 100K MAU same rate → 10K calls/mo → **monitor Groq bill**
- 1M → **must** enforce per-user/session caps

**Quick wins (shipped):** `SCALE_LIMITS.aiProxy.sessionCallsPerHour`; AI proxy in-memory rate limit cleanup.

---

## 10. Action roadmap

### Shipped in P4.7 (quick wins)

1. `js/core/scale-limits.js` — client guardrails  
2. Analytics queue cap + page_view dedupe  
3. Ops telemetry queue trim  
4. Admin analytics 14d / 1200 rows  
5. SQL BRIN + recent index on `analytics_events`  
6. Unit test `scale-limits.test.mjs`  
7. CI audit `p4-7-scale-readiness-audit.cjs`

### 100K checklist (next sprint)

- [ ] Materialized view `funnel_daily` + admin reads view only  
- [ ] `analytics_events` retention job (90d hot, archive cold)  
- [ ] Supabase Pro + read replicas for reporting  
- [ ] Move admin analytics to server-side aggregate endpoint  

### 1M checklist (venture scale)

- [ ] Partitioned `analytics_events`  
- [ ] Event export → warehouse  
- [ ] Dedicated worker for lifecycle + partner dispatch  
- [ ] AI narration off by default; premium-only with quota  

---

## Verify

```bash
npm test
node scripts/p4-7-scale-readiness-audit.cjs
```
