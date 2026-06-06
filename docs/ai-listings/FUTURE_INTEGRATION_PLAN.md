# isteBul AI Listings Engine v1 — Future Integration Plan

## Phase 0 — Current State (Complete)

- [x] Architecture scaffold at `src/ai-listings/`
- [x] Domain interfaces (`Listing`, `AIAnalysis`)
- [x] Service placeholders with DI container
- [x] Repository port interfaces + in-memory/stub adapters
- [x] Feature flag (inactive by default)
- [x] Unit tests
- [x] Documentation

## Phase 1 — Data Source Adapters

### 1.1 User Listings (`user_listings`)

**Target:** `js/features/ilan/ilan.js`, `js/core/api.js`

**Action:**
1. Create `src/ai-listings/repository/adapters/user-listings-repository.js`
2. Implement `ListingRepository` by mapping Supabase listing rows → `Listing` model
3. Register in `createAiListingsContainer({ listingRepository })`

**TODO markers:** `listing-service.js` — auth/ownership checks

### 1.2 Partner APIs (`partner_api`)

**Target:** Partner webhook / dispatch infrastructure

**Action:**
1. Create `src/ai-listings/repository/adapters/partner-listing-adapter.js`
2. Normalize partner payload schemas to `Listing` interface
3. Add `partner_api` source tag to `attributes`

### 1.3 Open Data (`open_data`)

**Target:** `js/data/market-data.js`, external benchmark feeds

**Action:**
1. Extend `stub-pricing-data-adapter.js` → `open-data-pricing-adapter.js`
2. Populate `PricingBenchmark.median_price` from open datasets
3. Wire category-specific benchmarks (vehicle sqm, housing sqm)

### 1.4 EVDS (`evds`)

**Target:** `js/services/evds-service.js`, `js/features/evds/evds-market-engine.js`

**Action:**
1. Create `src/ai-listings/repository/adapters/evds-market-data-adapter.js`
2. Server-side: call EVDS service for policy rate, CPI, FX, housing loan
3. Client-side: reuse `evds-market-engine.js` scoring thresholds
4. Set `MarketSnapshot.has_data = true` when live data available
5. Respect `EVDS_MAX_DECISION_IMPACT_RATIO` (scores capped at 12% EVDS influence)

### 1.5 TÜİK (`tuik`)

**Target:** TÜİK open data API (regional price indices)

**Action:**
1. Create `src/ai-listings/repository/adapters/tuik-market-data-adapter.js`
2. Compose with EVDS adapter in a `CompositeMarketDataAdapter`
3. Feed regional CPI / housing price indices into `market_score`

## Phase 2 — AI Provider Integration

### 2.1 AI Proxy (`ai_model`)

**Target:** `functions/ai-proxy.js`

**Action:**
1. Create `src/ai-listings/repository/adapters/ai-proxy-provider-adapter.js`
2. Send listing context; receive narration (summary, pros, cons, tags)
3. **Critical rule:** AI response must NOT override `ai_score`, `risk_score`, `market_score`, `price_score`
4. Merge narration fields only in `AIAnalysisService.analyze()`

### 2.2 Future Models

- Support `model_version` in `AIAnalysisRecord`
- A/B test models via adapter registry pattern (similar to `js/auto/providers/index.js`)

## Phase 3 — Scoring Alignment

### 3.1 Category Engines

**Target:** `js/verticals/listing-analysis/listing-analysis-engine.js`

**Action:**
1. Extract shared scoring utilities into `scoring/` category modules:
   - `scoring/vehicle-scoring.js`
   - `scoring/housing-scoring.js`
2. Bridge existing deterministic rules without modifying listing-analysis vertical
3. Align score labels and risk levels with production UX

### 3.2 Cost Engine Bridge

**Target:** `js/engines/cost-engine.js`

**Action:**
1. Add total-cost-of-ownership to `PricingService.analyzeListing()`
2. Surface in `AIAnalysis.cons` when ownership cost exceeds benchmark

## Phase 4 — Persistence (Sprint-2 complete)

### 4.1 Database Tables (new, independent)

**Migration:** `supabase/migrations/20260701_ai_listings_engine_v1.sql`

Tables: `ai_listings`, `ai_listing_analyses`, `ai_listing_events`

RLS: service_role only (anon/authenticated denied). See `docs/ai-listings/DATABASE_SCHEMA.md`.

**Sprint-3 (complete):** Supabase CRUD adapters implemented — see `REPOSITORY_ADAPTERS.md`.

**Sprint-4 (complete):** Edge Function API at `supabase/functions/ai-listings/` — see `EDGE_FUNCTION_API.md`.

**Action (Sprint-5):**
1. Admin proxy route calling Edge Function with rotated secret
2. Wire `src/ai-listings` DI container to Edge Function responses
3. Replace placeholder pipeline with live EVDS/AI adapters

## Phase 5 — Activation

### 5.1 Feature Flag Rollout

1. Set `AI_LISTINGS_ENABLED=true` in staging environment
2. Enable via `?ai_listings=1` for internal QA
3. Gradual rollout: 1% → 10% → 100% via env config

### 5.2 Route Integration (optional, separate PR)

- New route: `/ai-listings/` (do NOT modify `/ilan-analizi/`)
- Lazy-load `src/ai-listings/index.js` via dynamic import
- Register esbuild entry in `scripts/production-build.cjs`

### 5.3 UI Integration (optional, separate PR)

- New results component consuming `AIAnalysis` interface
- No changes to existing `listing-analysis-results-v2.js`

## Phase 6 — Recommendations & Personalization

1. Connect user history from `js/features/account/account.js`
2. Implement collaborative filtering in `recommendation-engine.js`
3. Partner inventory prioritization via `partner_api` adapter

## Integration Checklist

| Step | Risk | Requires Production Change |
|------|------|---------------------------|
| Adapter: User listings | Low | No (new adapter file only) |
| Adapter: EVDS | Low | No (reads existing service) |
| Adapter: AI proxy | Medium | No (calls existing proxy) |
| DB migration | Medium | Yes (new table only) |
| Feature flag on | Low | Yes (env var) |
| New route/page | Medium | Yes (additive only) |
| Modify listing-analysis | **Forbidden** | — |

## Testing Strategy

| Layer | Test File |
|-------|-----------|
| Models | `tests/unit/ai-listings-engine.test.mjs` |
| Scoring | Extend with category fixtures |
| Adapters | `tests/unit/ai-listings-adapters.test.mjs` (Phase 1) |
| Integration | `tests/integration/ai-listings-pipeline.test.mjs` (Phase 3) |

## Rollback Plan

1. Set `AI_LISTINGS_ENABLED=false` — immediate deactivation
2. No production code depends on the module; rollback is zero-risk
3. Database table is independent; can be dropped without affecting existing tables
