# PR #177 — AI Listings Engine v1 Summary

**Branch:** `cursor/ai-listings-engine-v1-c47e`  
**Title:** feat(ai-listings): AI Listings Engine v1 — Sprints 1–9

## What changed

### New module (`src/ai-listings/`)
- Listing and analysis models, DI container, in-memory repositories
- Deterministic scoring engine (vehicle/housing)
- Supabase adapter stubs (inactive by default)
- Seed data (10 listings) and seed script

### Database
- Migration `20260701_ai_listings_engine_v1.sql`
- Tables: `ai_listings`, `ai_listing_analyses`, `ai_listing_events`
- RLS: deny `anon`/`authenticated`, allow `service_role` only
- Idempotent DDL (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`)

### Edge function (`supabase/functions/ai-listings/`)
- Internal CRUD + analyze + QA workflow + bulk import
- Auth: `AI_LISTINGS_SUPABASE_ENABLED=true` + `x-ai-listings-secret`
- Uses `SUPABASE_SERVICE_ROLE_KEY` only (never anon key)
- Events: `listing_created`, `listing_imported`, `listing_analyzed`, QA events

### Admin panel (internal only)
- `admin/ai-listings.html` — create, list, detail, QA workflow, bulk import
- Gated by `localStorage.istebul_ai_listings_admin=on` + edge secret
- `noindex,nofollow`; no public navigation links

### Tests
- 984 unit tests passing (includes ai-listings + stability suite)
- Coverage: validation, handler, QA workflow, import parser, admin core, migration, scoring

### Documentation
- Full `docs/ai-listings/` index (this folder)
- Sprint guides: admin panel, QA workflow, import pipeline

## What did not change

- Homepage, category pages, public menus — **no AI Listings links**
- Existing verticals: Auto, Konut, Tatil, Finansman, Sigorta, Kasko
- Main admin panel navigation
- Partner dispatch flows
- Public listing-analysis vertical (`/ilan-analizi/`) — separate feature
- Anon/authenticated Supabase client access to new tables

## Safety posture

| Control | Implementation |
|---------|----------------|
| Public UI | Disabled — no routes or nav integration |
| Anon edge access | Blocked — secret required (401) |
| Module off by default | `AI_LISTINGS_SUPABASE_ENABLED` must be `true` (else 503) |
| DB client access | RLS deny + REVOKE for anon/authenticated |
| Approved listings | Internal QA only; `isListingPubliclyVisible()` always `false` |
| Admin secret | Never hardcoded; localStorage + env only |
| Import limits | 100 rows, 512 KB max per request |

## Test results (Sprint-9 verification)

```
npm run test:unit   → 984/984 pass
npm run type-check  → 465 JS files OK
npm run build       → 583 files OK
```

Stability tests (`tests/unit/ai-listings-stability.test.mjs`):
- Migration order and idempotency
- RLS deny/grant patterns
- Edge service_role-only config
- Auth gate (enabled + secret)
- Admin noindex and no public HTML links

## Deployment steps

### 1. Merge PR #177
Merge to `main` after review. No runtime activation occurs automatically.

### 2. Apply database migration
```bash
supabase db push
# Verify: ai_listings, ai_listing_analyses, ai_listing_events exist
# Verify: RLS policies deny anon/authenticated
```

### 3. Deploy edge function (when ready to activate)
```bash
supabase functions deploy ai-listings
```

### 4. Configure secrets (Supabase dashboard)
```
AI_LISTINGS_SUPABASE_ENABLED=true
AI_LISTINGS_EDGE_SECRET=<generate-strong-secret>
```
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected.

### 5. Internal smoke test
```bash
curl -s -H "x-ai-listings-secret: $AI_LISTINGS_EDGE_SECRET" \
  "$SUPABASE_URL/functions/v1/ai-listings/listings"
```

### 6. Optional seed
```bash
SUPABASE_URL=... AI_LISTINGS_EDGE_SECRET=... npm run seed:ai-listings
```

**Leave `AI_LISTINGS_SUPABASE_ENABLED` unset/false in production until deliberately activating.**

## Rollback notes

### Disable without code rollback
1. Set `AI_LISTINGS_SUPABASE_ENABLED=false` (or remove) → all edge requests return 503
2. Remove edge secret from admin localStorage
3. No public UI to disable — panel is already unlinked

### Code rollback (if needed)
1. Revert PR #177 merge commit on `main`
2. Redeploy site static assets (admin page removed from dist)
3. Edge function: redeploy previous version or delete `ai-listings` function

### Database rollback
- Migration only **adds** tables — safe to leave in place when module is disabled
- To fully remove: drop tables in reverse dependency order (events → analyses → listings)
- **Do not drop** if any internal data should be retained

```sql
-- Only if full removal required:
DROP TABLE IF EXISTS public.ai_listing_events;
DROP TABLE IF EXISTS public.ai_listing_analyses;
DROP TABLE IF EXISTS public.ai_listings;
DROP FUNCTION IF EXISTS public.set_ai_listings_updated_at();
```

## Next sprint

**Sprint-10: Staging activation and operations**

- Staging-only deploy with runbook
- Secret rotation procedure
- Event audit queries for QA/import tracking
- Public publishing gate design (separate status/flag — not `approved`)
- Partner import API RFC (no public exposure until gate exists)

Public publishing remains disabled until a future approved sprint.
