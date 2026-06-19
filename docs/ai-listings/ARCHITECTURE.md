# isteBul AI Listings Engine v1 — Architecture

## Overview

The AI Listings Engine is an **isolated, feature-ready module** at `src/ai-listings/`. It provides a clean architecture for AI-powered listing analysis without modifying existing production routes, components, or business logic.

**Status:** Inactive by default (`AI_LISTINGS_ENABLED` defaults to `false`).

## Design Principles

| Principle | Implementation |
|-----------|----------------|
| No breaking changes | Zero imports from production `js/` code into live routes |
| Dependency inversion | Services depend on repository/adapter interfaces, not concrete sources |
| Deterministic scoring | Canonical scores produced in `scoring/`; AI narrates only |
| Feature flag | `isAiListingsEnabled()` gates all service operations |
| Progressive integration | Stub adapters swap for real EVDS, TÜİK, partner, and AI providers |

## Directory Structure

```
src/ai-listings/
├── index.js                 # Public module surface (not wired to production)
├── core/
│   ├── config.js            # Feature flag (inactive by default)
│   ├── constants.js         # Categories, score bounds, data source IDs
│   └── di-container.js        # Dependency wiring
├── models/
│   ├── listing.js           # Listing interface + validation
│   └── ai-analysis.js       # AIAnalysis interface + validation
├── repository/
│   ├── listing-repository.interface.js
│   ├── ai-analysis-repository.interface.js
│   ├── in-memory/           # Dev/test implementations
│   └── adapters/            # Port interfaces + stub implementations
├── services/
│   ├── listing-service.js
│   ├── ai-analysis-service.js
│   ├── market-analysis-service.js
│   ├── pricing-service.js
│   └── recommendation-service.js
├── engine/
│   └── listing-engine.js    # Top-level facade
├── scoring/
│   └── scoring-engine.js    # Deterministic score computation
├── analysis/
│   └── analysis-pipeline.js # Orchestration pipeline
├── market/
│   └── market-context.js
├── pricing/
│   ├── pricing-context.js
│   └── pricing-engine.js
├── recommendation/
│   └── recommendation-engine.js
└── utils/
    └── guards.js
```

## Domain Models

### Listing

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier |
| `category` | `string` | `vehicle`, `housing`, `vacation`, `general` |
| `title` | `string` | Listing headline |
| `description` | `string` | Full description |
| `location` | `string` | Geographic location |
| `price` | `number` | Numeric price |
| `currency` | `string` | ISO currency (default `TRY`) |
| `images` | `string[]` | Image URLs |
| `attributes` | `Record<string, …>` | Category-specific attributes |
| `created_at` | `string` | ISO-8601 timestamp |
| `updated_at` | `string` | ISO-8601 timestamp |

### AIAnalysis

| Field | Type | Description |
|-------|------|-------------|
| `ai_score` | `number` | Overall quality (0–100) |
| `risk_score` | `number` | Risk exposure (0–100) |
| `market_score` | `number` | Market fit (0–100) |
| `price_score` | `number` | Price competitiveness (0–100) |
| `confidence` | `number` | Model confidence (0–1) |
| `summary` | `string` | Executive summary |
| `pros` | `string[]` | Strengths |
| `cons` | `string[]` | Weaknesses |
| `tags` | `string[]` | Classification tags |

## Service Layer

All services are factory functions accepting a `deps` object:

```javascript
const container = createAiListingsContainer();
const { listingService, aiAnalysisService } = container.services;
```

When `isAiListingsEnabled()` returns `false` (default), services return empty/null results without throwing.

## Data Flow

```
Listing Input
    │
    ▼
ListingService.upsert()          ──► ListingRepository
    │
    ▼
AnalysisPipeline
    ├── MarketDataAdapter        ──► EVDS / TÜİK (future)
    ├── PricingDataAdapter       ──► Open data / partners (future)
    └── ScoringEngine            ──► Deterministic scores
    │
    ▼
AIProviderAdapter                ──► ai-proxy / LLM (future, narration only)
    │
    ▼
AIAnalysisService.save()         ──► AIAnalysisRepository
    │
    ▼
RecommendationService          ──► Ranked recommendations
```

## Feature Flag

Enable only during integration testing:

| Method | Value |
|--------|-------|
| Env `AI_LISTINGS_ENABLED` | `true` / `1` |
| URL `?ai_listings=1` | Dev/QA override |
| `localStorage` key `istebul_ai_listings_v1` | `on` / `off` |

## Relationship to Existing Code

| Existing Module | Relationship |
|-----------------|--------------|
| `js/verticals/listing-analysis/` | Parallel vertical; do not modify. Future bridge via adapter. |
| `js/app.js` + `js/core/api.js` | Active listing runtime; future `UserListingsRepository` adapter target (P0-3 split) |
| `js/services/evds-service.js` | Future `EvdsMarketDataAdapter` target |
| `functions/ai-proxy.js` | Future `AIProviderAdapter` target |

## Build Impact

- Module lives under `src/ai-listings/` — not bundled into production SPA
- Syntax-checked by `scripts/check-syntax.cjs`
- Unit-tested in `tests/unit/ai-listings-engine.test.mjs`
- No changes to `importmap.json`, routes, CSS, or database tables
