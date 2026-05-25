# Scale Architecture Execution (P19)

Technical scale confidence for **10,000**, **100,000**, and **1,000,000** MAU scenarios.

Machine-readable matrix: `data/ops/scale-architecture-scenarios.json`  
Admin: **Scale Architecture** page · CLI: `npm run metrics:scale:architecture`

Planning assumptions: **40 events/MAU/month**, **8% Pro penetration**, **10% MAU** optional AI narration.

---

## Executive confidence

| MAU | Confidence (model) | Verdict |
|-----|------------------|---------|
| **10K** | High (~85%+) | Production-ready today with shipped guardrails |
| **100K** | Medium | Requires rollups, retention cron, pooler, snapshot-first admin |
| **1M** | Low without upgrades | Partitioned analytics, warehouse, queue workers, AI quotas |

**Primary bottleneck at scale:** `analytics_events` write volume and admin/BI full-table scans.  
**Secondary:** lifecycle email throughput, partner dispatch async queue, AI cost.

---

## Volume planning

| Tier | Events/month | Events/day | AI calls/mo | Lifecycle emails/mo |
|------|--------------|------------|-------------|---------------------|
| 10K | 400K | 13K | 1K | 1.5K |
| 100K | 4M | 133K | 10K | 15K |
| 1M | 40M | 1.3M | 100K | 150K |

---

## Dimension matrix

### 1. Frontend load

| MAU | Risk | Bottleneck | Mitigation | Quick implementation |
|-----|------|------------|------------|----------------------|
| 10K | Low | API fan-out; ~760KB SPA | CDN + batching | `SCALE_LIMITS` (shipped) |
| 100K | Low | Uncached HTML | Edge cache; lazy admin chunks | Plausible-only marketing (next) |
| 1M | Low | API concurrency | Sample telemetry | Lower analytics sample rate flag |

### 2. Cloudflare Pages suitability

| MAU | Risk | Bottleneck | Mitigation | Quick implementation |
|-----|------|------------|------------|----------------------|
| 10K | Low | Function cold start | Stateless functions | `_headers` immutable (shipped) |
| 100K | Low | Per-isolate rate limit map | DB-backed limits | Document KV path |
| 1M | Medium | Webhook + AI at edge scale | Workers Queues | WAF + dedicated webhook worker |

**Verdict:** Pages is **excellent** for static + light API; **poor** for long-running batch — use Supabase cron/queues.

### 3. Supabase DB

| MAU | Risk | Bottleneck | Mitigation | Quick implementation |
|-----|------|------------|------------|----------------------|
| 10K | Low | Write amplification | BRIN + retention | `20260608_p47_scale_analytics_indexes.sql` |
| 100K | High | ~4M rows/mo | Rollup MV, pooler | Weekly `analytics-retention.yml` (P19) |
| 1M | Critical | ~40M rows/mo | Partition + archive | Warehouse export; drop low-priority hot writes |

### 4. Auth scaling

| MAU | Risk | Bottleneck | Mitigation | Quick implementation |
|-----|------|------------|------------|----------------------|
| 10K | Low | OTP/email limits | Supabase Auth HA | Document `auth.rate_limit` |
| 100K | Medium | SMTP throughput | Custom SMTP domain | Captcha on auth |
| 1M | Medium | Profile reads | Replicas | `admin-action` 120/min (shipped) |

### 5. Storage scaling

| MAU | Risk | Bottleneck | Mitigation | Quick implementation |
|-----|------|------------|------------|----------------------|
| 10K | Low | Public bucket egress | RLS `user_id/*` | Upload size docs |
| 100K | Medium | Image egress | R2 + CDN | Storage quota alert (future) |
| 1M | High | Supabase egress bill | R2 migration | wrangler R2 binding (P18.2) |

### 6. Analytics volume

| MAU | Risk | Bottleneck | Mitigation | Quick implementation |
|-----|------|------------|------------|----------------------|
| 10K | Low | 400K rows/mo | Dedupe + sample + 90d purge | Weekly retention cron |
| 100K | High | Admin row caps | Snapshot-first KPIs | `analytics_sample_cap` alert |
| 1M | Critical | TB-scale hot table | Warehouse + 30d hot | Event taxonomy audit |

### 7. Event ingestion

| MAU | Risk | Bottleneck | Mitigation | Quick implementation |
|-----|------|------------|------------|----------------------|
| 10K | Low | 100/min/IP sufficient | `auto_rate_limits` | 25 batch max (shipped) |
| 100K | Medium | Rate limit row contention | Edge queue | Monitor 429 ops events |
| 1M | High | 1.3M events/day | Bulk worker | Plausible primary for marketing |

### 8. Cron jobs

| MAU | Risk | Bottleneck | Mitigation | Quick implementation |
|-----|------|------------|------------|----------------------|
| 10K | Low | GitHub Actions SPOF | Documented schedules | pg_cron mirror (P18.1) |
| 100K | Medium | Enroll scans analytics | Tighter indexes | Verify enroll query indexes |
| 1M | High | Message backlog | Horizontal workers | `LIFECYCLE_SEND_BATCH` env |

### 9. Email throughput

| MAU | Risk | Bottleneck | Mitigation | Quick implementation |
|-----|------|------------|------------|----------------------|
| 10K | Low | 50 sends/run | Resend batch | P16 caps (shipped) |
| 100K | Medium | 15K emails/mo | Dedicated domain | Resend tier upgrade |
| 1M | High | 150K emails/mo | Worker fleet | Env batch 200+ (P18.2) |

### 10. AI inference load

| MAU | Risk | Bottleneck | Mitigation | Quick implementation |
|-----|------|------------|------------|----------------------|
| 10K | Low | ~1K calls/mo | Deterministic first | 3 calls/session/h (shipped) |
| 100K | Medium | ~10K calls/mo | Pro-only LLM | Free tier 0 LLM |
| 1M | Critical | ~100K calls/mo | Hard quota | `AI_NARRATION_ENABLED=false` until quota service |

### 11. Stripe operational scaling

| MAU | Risk | Bottleneck | Mitigation | Quick implementation |
|-----|------|------------|------------|----------------------|
| 10K | Low | Webhook idempotency | Edge handler | stripe-webhook (shipped) |
| 100K | Low | Retry storms | Async queue | Webhook dedupe verify |
| 1M | Low | App reconcile | Sigma / nightly sync | STRIPE_MRR_EVIDENCE windows |

### 12. Admin CRM limits

| MAU | Risk | Bottleneck | Mitigation | Quick implementation |
|-----|------|------------|------------|----------------------|
| 10K | Low | Client aggregation | Row caps | `SCALE_LIMITS.admin` |
| 100K | High | 1200-row analytics | Server aggregates | Read `dist/*.json` first |
| 1M | Critical | Browser BI impossible | Warehouse only | Disable live scan flag |

### 13. Partner routing capacity

| MAU | Risk | Bottleneck | Mitigation | Quick implementation |
|-----|------|------------|------------|----------------------|
| 10K | Low | ~250 leads/mo | Retry + circuit | partner-ops-monitor (shipped) |
| 100K | Medium | ~2.5K leads/mo | Async queue | Env retry batch |
| 1M | High | ~25K leads/mo | Dispatch queue table | P18.2 worker |

---

## Shipped quick wins (P19)

1. `data/ops/scale-architecture-scenarios.json` — full matrix  
2. Admin **Scale Architecture** page + confidence scores  
3. `npm run metrics:scale:architecture` → `dist/scale-architecture-report.json`  
4. Weekly `.github/workflows/analytics-retention.yml` (90d purge)  
5. `js/core/scale-tier-recommendations.js` — tier guardrail targets  
6. P19 audit + unit tests  

---

## 100K checklist

- [ ] Materialized view `funnel_daily`  
- [ ] Supabase pooler enabled (transaction mode)  
- [ ] Admin analytics reads snapshots only  
- [ ] Resend tier + bounce monitoring  

## 1M checklist

- [ ] Partitioned `analytics_events`  
- [ ] ClickHouse/BigQuery export  
- [ ] Partner dispatch queue worker  
- [ ] AI narration premium-only with DB quota  
- [ ] R2 for media  

---

## Verify

```bash
npm test
node scripts/p19-scale-architecture-audit.cjs
npm run metrics:scale:architecture
```

Related: `docs/P4_7_SCALE_READINESS.md`, `docs/INFRA_UNIT_ECONOMICS.md`, `docs/STARTUP_OPERATING_MODE.md`
