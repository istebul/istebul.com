# isteBul AI Listings Engine v1 — Documentation Index

Internal-only listing analysis engine with Supabase edge API, admin test panel, QA workflow, and bulk import. **Public publishing remains disabled.**

## Current status (Sprint-9)

| Area | Status |
|------|--------|
| Module (`src/ai-listings/`) | Feature-complete v1, inactive by default |
| Database migration | `20260701_ai_listings_engine_v1.sql` — new tables only, RLS locked |
| Edge function (`ai-listings`) | Internal API, secret-gated, service_role only |
| Admin panel (`admin/ai-listings.html`) | Internal test + QA + import; localStorage gated |
| Public UI / homepage / categories | **Not integrated** |
| `approved` status | Internal QA only — does not publish listings |

PR: [#177](https://github.com/istebul/istebul.com/pull/177) — AI Listings Engine v1 (Sprints 1–9)

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Module design, DI, feature flags |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Tables, columns, RLS posture |
| [REPOSITORY_ADAPTERS.md](./REPOSITORY_ADAPTERS.md) | In-memory vs Supabase adapters |
| [EDGE_FUNCTION_API.md](./EDGE_FUNCTION_API.md) | Edge endpoints, auth, deployment |
| [ADMIN_TEST_PANEL.md](./ADMIN_TEST_PANEL.md) | Enabling internal admin panel |
| [ADMIN_QA_WORKFLOW.md](./ADMIN_QA_WORKFLOW.md) | Review, approve, reject, archive |
| [SEED_AND_SCORING.md](./SEED_AND_SCORING.md) | Seed data and deterministic scoring |
| [IMPORT_PIPELINE.md](./IMPORT_PIPELINE.md) | CSV/JSON bulk import (admin only) |
| [PR_177_SUMMARY.md](./PR_177_SUMMARY.md) | Merge summary, deployment, rollback |

Additional references: [DEPENDENCY_GRAPH.md](./DEPENDENCY_GRAPH.md), [FUTURE_INTEGRATION_PLAN.md](./FUTURE_INTEGRATION_PLAN.md)

## Activation checklist

Use this before enabling in a non-production or staging Supabase project:

1. **Apply migration**
   ```bash
   supabase db push
   # or apply 20260701_ai_listings_engine_v1.sql via your migration pipeline
   ```

2. **Deploy edge function**
   ```bash
   supabase functions deploy ai-listings
   ```

3. **Set edge secrets** (Supabase dashboard → Edge Functions → `ai-listings`)
   - `AI_LISTINGS_SUPABASE_ENABLED=true`
   - `AI_LISTINGS_EDGE_SECRET=<strong-random-secret>`
   - `SUPABASE_SERVICE_ROLE_KEY` — auto-injected; do not substitute anon key

4. **Enable admin panel locally** (internal testers only)
   ```javascript
   localStorage.setItem('istebul_ai_listings_admin', 'on');
   localStorage.setItem('istebul_ai_listings_secret', '<same AI_LISTINGS_EDGE_SECRET>');
   ```
   Open `/admin/ai-listings.html` directly (no nav link).

5. **Optional seed**
   ```bash
   SUPABASE_URL=... AI_LISTINGS_EDGE_SECRET=... npm run seed:ai-listings
   ```

6. **Smoke test**
   - `GET /listings` with `x-ai-listings-secret` → 200
   - Request without secret → 401
   - `AI_LISTINGS_SUPABASE_ENABLED=false` → 503

## Production safety checklist

Before merging PR #177 or enabling in production:

- [ ] No links to `/admin/ai-listings.html` in public HTML, menus, or sitemap
- [ ] `admin/ai-listings.html` has `noindex,nofollow` robots meta
- [ ] Edge function **not** deployed until migration applied
- [ ] `AI_LISTINGS_SUPABASE_ENABLED` left **unset/false** until deliberate activation
- [ ] `AI_LISTINGS_EDGE_SECRET` stored only in Supabase secrets (never in repo)
- [ ] RLS verified: anon/authenticated denied on `ai_listings*`
- [ ] No homepage/category route changes in this PR
- [ ] `isListingPubliclyVisible()` returns `false` for all statuses
- [ ] Existing verticals (Auto, Konut, Tatil, Finansman, Sigorta, Kasko) unchanged
- [ ] `npm run test:unit`, `npm run type-check`, `npm run build` pass

## Safety posture

- **No anon access** — edge API requires secret; DB RLS denies client roles
- **No public publishing** — `approved` is internal QA only
- **Inactive by default** — module flag + edge env gate return 503 when off
- **Isolated tables** — migration adds `ai_listings`, `ai_listing_analyses`, `ai_listing_events` only
- **No production flow changes** — separate from listing-analysis vertical at `/ilan-analizi/`

## Next sprint recommendation

**Sprint-10: Controlled staging activation**

1. Deploy migration + edge function to staging Supabase only
2. Run seed + import smoke tests against staging
3. Add operational runbook (secret rotation, event audit queries)
4. Define explicit public publishing gate design (separate from `approved`)
5. Partner API import design review (async jobs, scoped tokens) — no implementation until gate exists

Do **not** add homepage integration, category routes, or anonymous listing exposure until a dedicated publish gate sprint is approved.
