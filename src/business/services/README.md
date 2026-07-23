# services

Business Intelligence pipeline engines.

| Service | Consumes | Produces |
|---------|----------|----------|
| `MetricsEngine` | Analytics → Scoring → Health | Metrics + signals + health |
| `InsightEngine` | `MetricsEngine` only | Insights (+ signals pass-through) |
| `RecommendationEngine` | `InsightEngine` only | AI-style recommendations |

Scoring / health modules live under `src/business/intelligence/scoring/` and `health/`.
Mock provider remains the default upstream source.
