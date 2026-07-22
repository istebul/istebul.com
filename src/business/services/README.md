# services

Business Intelligence pipeline engines (EPIC-520).

| Service | Consumes | Produces |
|---------|----------|----------|
| `MetricsEngine` | `BusinessDataProvider` | Metrics + derived signals |
| `InsightEngine` | `MetricsEngine` only | Insights (+ signals pass-through) |
| `RecommendationEngine` | `InsightEngine` only | AI-style recommendations |

No API, DB, auth, or tenant calls. Mock provider is the default upstream.
