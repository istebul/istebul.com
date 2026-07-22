# services

Business Intelligence pipeline engines.

| Service | Consumes | Produces |
|---------|----------|----------|
| `MetricsEngine` | `AnalyticsEngine` (provider via analytics) | Metrics + signals |
| `InsightEngine` | `MetricsEngine` only | Insights (+ signals pass-through) |
| `RecommendationEngine` | `InsightEngine` only | AI-style recommendations |

Analytics modules live under `src/business/intelligence/analytics/`.
Mock provider remains the default upstream source.
