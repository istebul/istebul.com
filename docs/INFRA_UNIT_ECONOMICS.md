# Infra & AI unit economics (P16)

Cost guardrails across inference, email, Supabase, storage, events, bandwidth, and Cloudflare Pages.

## Vendor map

| Layer | Provider | Control surface |
|-------|----------|-----------------|
| LLM inference | Groq via `functions/ai-proxy.js` | `max_tokens`, IP rate limit, client session budget |
| Transactional email | Resend via `lifecycle-cron` | Max sends/run, enrollment caps |
| Auth email | Supabase Auth | Built-in; `max_frequency` in `supabase/config.toml` |
| DB + edge | Supabase | `analytics-ingest`, RLS, retention purge script |
| Static + API | Cloudflare Pages | `_headers` cache, Pages Functions |
| Marketing analytics | Plausible | Consent-gated in `js/app.js` |
| Storage | Supabase `images` bucket | RLS path `{user_id}/` |

Config: `data/ops/infra-unit-economics.json`  
Client helpers: `js/core/unit-economics.js`  
CLI snapshot: `node scripts/infra-unit-economics-snapshot.cjs`

## Unit economics formulas

```
infra_cost_per_pro_mau = (groq_usd + resend_usd + supabase_variable) / pro_mau
gross_margin_pct = (pro_arpu - stripe_fees - infra_cost_per_user) / pro_arpu
```

Target (config): **≤ $2.50 infra / Pro MAU / month** at base scale.

## Inference (Groq)

| Guardrail | Value |
|-----------|-------|
| Model | `llama-3.1-8b-instant` |
| `max_tokens` | **400** |
| Server rate limit | **20** req/min/IP |
| Client budget | **3** calls/tab/hour (`canCallAiNarration`) |
| Karar asistanı | Skips LLM when budget exhausted |
| Identical prompt cache | 10 min, max 48 entries (edge memory) |

## Email (Resend)

| Guardrail | Value |
|-----------|-------|
| Sends per cron run | **50** (was 80) |
| Default enroll caps | **30**/audience (was 15–40 mixed) |

## Supabase (events + storage)

| Guardrail | Value |
|-----------|-------|
| Analytics retention | **90 days** (`scripts/analytics-retention-purge.cjs`) |
| Ingest rate limit | **100**/min/IP (was 120) |
| Client queue | **40** events max |
| Low-priority sample | **50%** for `page_exit`, `route_change` |
| Dedupe | `page_view`, `route_change`, `page_exit` per session |

Est. events/MAU/month: **40** (scale doc); BRIN indexes in `20260608_p47_scale_analytics_indexes.sql`.

## Bandwidth (Cloudflare)

- HTML: `no-cache` — minimal stale shell risk
- `/assets/*`, `*.js`, `*.css`: `max-age=31536000, immutable`
- `/functions/*`, `/api/*`: `no-store`
- No R2/KV billable bindings in `wrangler.toml`

## Ops

- Run retention monthly: `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/analytics-retention-purge.cjs`
- CEO alert `analytics_sample_cap` when admin hits row limits

## Related docs

- `docs/investor/UNIT_ECONOMICS.md` — Pro ARPU / LTV framework
- `docs/P4_7_SCALE_READINESS.md` — MAU scaling scenarios
