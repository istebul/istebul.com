/**
 * Business Intelligence (EPIC-510 → EPIC-540)
 *
 * ## Pipeline
 *
 * ```
 * Provider (mock default)
 *   → AnalyticsEngine
 *   → ScoringEngine
 *   → BusinessHealthEngine
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
 * | Orchestration | `core/`, `pipeline/` |
 * | Models | `models/` |
 * | Utils | `utils/` |
 *
 * No API, DB, auth, or tenant calls. Dashboard / Advisor markup unchanged.
 */
