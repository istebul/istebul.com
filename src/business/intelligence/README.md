# Business Intelligence Engine (EPIC-510)

AI Business Advisor foundation — mock-only.

## Pipeline

```
Data Provider → Metrics Engine → Insight Engine → Recommendation Engine → Advisor UI
```

| Layer | Path | Output |
|-------|------|--------|
| Data Provider | `providers/MockDataProvider.ts` | `RawBusinessData` |
| Metrics Engine | `metrics/MetricsEngine.ts` | Revenue/Cost/Growth/Risk/Customer Health |
| Insight Engine | `insights/InsightEngine.ts` | Trend / positive / risk / anomaly |
| Recommendation Engine | `recommendations/RecommendationEngine.ts` | AI-style suggestions |
| Orchestrator | `pipeline/BusinessIntelligenceEngine.ts` | `BusinessAdvisorResult` |

No API, DB, auth, or tenant calls.
