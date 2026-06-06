# isteBul AI Listings Engine v1

Isolated architecture module for AI-powered listing analysis.

**Status:** Feature-ready, **inactive by default**.

## Quick Start (dev/test only)

```javascript
import {
  isAiListingsEnabled,
  setAiListingsLocalOverride,
  createAiListingsContainer,
  createEmptyListing
} from './index.js';

// Enable for local testing
setAiListingsLocalOverride(true);

const container = createAiListingsContainer();
const listing = createEmptyListing({
  id: 'test-1',
  category: 'vehicle',
  title: '2020 Toyota Corolla',
  price: 950000,
  location: 'İstanbul'
});

const result = await container.services.aiAnalysisService.analyze(listing);
```

## Documentation

- [Documentation index](../../docs/ai-listings/README.md)
- [Architecture](../../docs/ai-listings/ARCHITECTURE.md)
- [Dependency Graph](../../docs/ai-listings/DEPENDENCY_GRAPH.md)
- [Future Integration Plan](../../docs/ai-listings/FUTURE_INTEGRATION_PLAN.md)

## Rules

- Do **not** import this module from production `js/` code until Phase 5
- Do **not** modify `js/verticals/listing-analysis/` — bridge via adapters instead
- AI models narrate only; scores come from `scoring/scoring-engine.js`
