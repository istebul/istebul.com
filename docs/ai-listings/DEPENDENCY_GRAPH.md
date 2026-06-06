# isteBul AI Listings Engine v1 — Dependency Graph

## Layer Diagram

```mermaid
flowchart TB
    subgraph entry [Entry — inactive]
        INDEX[index.js]
        ENGINE[engine/listing-engine.js]
        FLAG[core/config.js]
    end

    subgraph services [Services]
        LS[ListingService]
        AS[AIAnalysisService]
        MS[MarketAnalysisService]
        PS[PricingService]
        RS[RecommendationService]
    end

    subgraph pipeline [Pipeline]
        AP[analysis/analysis-pipeline.js]
        SE[scoring/scoring-engine.js]
        MC[market/market-context.js]
        PC[pricing/pricing-context.js]
        PE[pricing/pricing-engine.js]
        RE[recommendation/recommendation-engine.js]
    end

    subgraph ports [Repository Ports]
        LR[(ListingRepository)]
        AR[(AIAnalysisRepository)]
        MD[(MarketDataAdapter)]
        PD[(PricingDataAdapter)]
        AI[(AIProviderAdapter)]
    end

    subgraph stubs [Stub Implementations — active in scaffold]
        IMR[in-memory-listing-repository]
        IMA[in-memory-ai-analysis-repository]
        SMD[stub-market-data-adapter]
        SPD[stub-pricing-data-adapter]
        SAP[stub-ai-provider-adapter]
    end

    subgraph future [Future Adapters — not wired]
        UL[user-listings → js/features/ilan]
        PA[partner-api-adapter]
        OD[open-data-adapter]
        EVDS[evds-adapter → js/services/evds-service]
        TUIK[tuik-adapter]
        AIP[ai-proxy → functions/ai-proxy.js]
    end

    INDEX --> ENGINE
    ENGINE --> FLAG
    ENGINE --> DI[core/di-container.js]
    DI --> services

    LS --> LR
    AS --> AR
    AS --> AI
    AS --> AP
    MS --> MD
    PS --> PD
    PS --> MD
    RS --> LS
    RS --> AS
    RS --> MS
    RS --> PS
    RS --> RE

    AP --> SE
    AP --> MC
    AP --> PC
    AP --> PE
    AP --> SMD
    AP --> SPD

    LR -.-> IMR
    AR -.-> IMA
    MD -.-> SMD
    PD -.-> SPD
    AI -.-> SAP

    IMR -.-> UL
    SMD -.-> EVDS
    SMD -.-> TUIK
    SPD -.-> OD
    SPD -.-> PA
    SAP -.-> AIP
```

## Service Dependency Matrix

| Service | Depends On | Produces |
|---------|-----------|----------|
| `ListingService` | `ListingRepository` | CRUD operations |
| `AIAnalysisService` | `AIAnalysisRepository`, `AIProviderAdapter`, `AnalysisPipeline` | `AIAnalysis` |
| `MarketAnalysisService` | `MarketDataAdapter` | `market_score`, `MarketContext` |
| `PricingService` | `PricingDataAdapter`, `MarketDataAdapter` | `price_score`, `PricingContext` |
| `RecommendationService` | All above services | Ranked `ListingRecommendation[]` |

## Adapter Port Contracts

### ListingRepository

```
findById(id) → Listing | null
findMany(query) → Listing[]
save(listing) → Listing
deleteById(id) → boolean
```

### AIAnalysisRepository

```
findByListingId(listingId) → AIAnalysisRecord | null
save(record) → AIAnalysisRecord
deleteByListingId(listingId) → boolean
```

### MarketDataAdapter

```
fetchSnapshot({ category, location, currency }) → MarketSnapshot
getSourceId() → string
```

### PricingDataAdapter

```
fetchBenchmark({ category, location, attributes }) → PricingBenchmark | null
getSourceId() → string
```

### AIProviderAdapter

```
generateAnalysis({ listing, context }) → AIProviderResponse | null
getProviderId() → string
```

## Internal Module Dependencies (no external production imports)

```
core/config.js          → (standalone)
core/constants.js       → (standalone)
core/di-container.js    → services, repository stubs
models/listing.js       → core/constants
models/ai-analysis.js   → core/constants
services/*              → models, core/config, repository interfaces
analysis-pipeline.js    → scoring, market, pricing, stub adapters
engine/listing-engine.js → di-container, core/config
index.js                → re-exports only
```

## Isolation Guarantee

- **No file in `js/` imports from `src/ai-listings/`**
- **No file in `src/ai-listings/` imports from `js/`** (stubs only; TODO markers for future bridges)
- **No route or HTML references the module**
- **No global CSS or database schema changes**
