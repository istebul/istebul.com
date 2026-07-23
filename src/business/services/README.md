# services

Business Intelligence pipeline engines.

| Service | Consumes | Produces |
|---------|----------|----------|
| `MetricsEngine` | Analytics → Scoring → Health → KPI → Events | Metrics + signals + health + kpi + events |
| `InsightEngine` | `MetricsEngine` only (may use KPI trends) | Insights (+ signals/trends pass-through) |
| `RecommendationEngine` | `InsightEngine` only (may use trend-aware insights) | AI-style recommendations |

KPI / event modules live under `src/business/intelligence/kpi/` and `events/`.
Mock provider remains the default upstream source.
