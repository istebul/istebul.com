/**
 * Business Intelligence (EPIC-510 → EPIC-530)
 *
 * ## Pipeline
 *
 * ```
 * Provider (mock default)
 *   → AnalyticsEngine (+ Registry plug-ins)
 *   → MetricsEngine
 *   → InsightEngine
 *   → RecommendationEngine
 *   → Advisor UI
 * ```
 *
 * | Area | Path |
 * |------|------|
 * | Analytics modules | `analytics/` |
 * | Orchestration | `core/AnalyticsEngine.ts`, `core/AnalyticsRegistry.ts` |
 * | Models | `models/analytics.ts` |
 * | Score utils | `utils/analytics-score.ts` |
 * | Providers | `src/business/providers/` |
 * | Downstream engines | `src/business/services/` |
 *
 * No API, DB, auth, or tenant calls.
 */
