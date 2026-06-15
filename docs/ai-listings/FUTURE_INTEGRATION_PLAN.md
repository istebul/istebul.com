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

## Phase 4 — Persistence (complete)

### 4.1 Database Tables

**Migrations:** `20260701_ai_listings_engine_v1.sql` through `20260705_legacy_bridge_and_published_seed.sql`

Tables: `ai_listings`, `ai_listing_analyses`, `ai_listing_events`, `ai_learning_events`

RLS evolution:

- Base: service_role writes; client denied
- `20260702`: public `SELECT` on `status = 'published'` + owner read policies
- `20260704`: authenticated owner read for intake drafts

See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md).

**Sprint-3 (complete):** Supabase CRUD adapters — [REPOSITORY_ADAPTERS.md](./REPOSITORY_ADAPTERS.md).

**Sprint-4 (complete):** Edge Function API — [EDGE_FUNCTION_API.md](./EDGE_FUNCTION_API.md).

**Sprint-5 (complete):** Admin test panel — [ADMIN_TEST_PANEL.md](./ADMIN_TEST_PANEL.md).

**Sprint-7–10 (complete):** QA workflow, `published` status, site toggle, `/secenekler/` client integration.

**Remaining (Phase 4.x):**
1. Server-side admin proxy (reduce secret in browser localStorage)
2. Live EVDS/AI adapters in production scoring path
3. Finansman / sigorta / kasko `ai_listings` category model (or document vertical-only scope)

## Phase 5 — Public catalog activation (partially complete)

### 5.1 Feature flags (complete)

- Edge: `AI_LISTINGS_SUPABASE_ENABLED`, `AI_LISTINGS_PUBLIC_PUBLISH_ENABLED`
- Site: `site_settings.ai_listings_public_enabled` (admin panel toggle)
- Client bootstrap: `js/runtime/ai-listings-integrations.js`

### 5.2 Route integration (complete)

- [x] `/secenekler/` and `/ilanlar/` → SPA `ilanlar` section (`js/core/router.js`)
- [x] `loadDecisionOptions()` → `ai_listings` published rows (`js/core/decision-options-api.js`)
- [x] User intake `/ilan-ekle` → `ai-listings-intake` edge (`js/core/ai-listings-bridge.js`)
- `/ilan-analizi/` vertical unchanged

### 5.3 Public UI (MVP+ — trust layer pending)

- [x] `listings-ui.js` cards, empty states, favori/karşılaştırma wiring
- [ ] Trust badges (source, QA label, image confidence) on public cards
- [ ] Vehicle image resolver on public catalog
- [ ] Finansman / sigorta / kasko catalog parity

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
