/**
 * Business Intelligence (EPIC-510 → EPIC-550)
 *
 * ## Pipeline
 *
 * ```
 * Provider (mock default)
 *   → AnalyticsEngine
 *   → ScoringEngine
 *   → BusinessHealthEngine
 *   → KPIEngine
 *   → Event Intelligence (EventBus / EventProcessor)
 *   → MetricsEngine
 *   → InsightEngine
 *   → RecommendationEngine
 *   → Advisor UI
 * ```
 *
 * | Area | Path |
 * |------|------|
 * | Analytics modules | `analytics/` |
 * | Scoring modules | `scoring/` |
 * | Health engine | `health/` |
 * | KPI engine | `kpi/` |
 * | Event intelligence | `events/` |
 * | Orchestration | `core/`, `pipeline/` |
 * | Models | `models/` |
 * | Utils | `utils/` |
 *
 * No API, DB, auth, or tenant calls. Dashboard / Advisor markup unchanged.
 */
