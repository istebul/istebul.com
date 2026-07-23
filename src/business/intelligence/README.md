/**
 * Business Intelligence Engine (EPIC-510 / EPIC-520)
 *
 * ## Pipeline
 *
 * ```
 * ProviderFactory (mock default)
 *   → MetricsEngine
 *   → InsightEngine
 *   → RecommendationEngine
 *   → Advisor UI
 * ```
 *
 * Canonical provider + service modules:
 * - `src/business/providers/`
 * - `src/business/services/`
 * - `src/business/types/business-provider.ts`
 *
 * This folder keeps mock data, result types, pipeline orchestration,
 * and compatibility shims for EPIC-510 import paths.
 *
 * No API, DB, auth, or tenant calls.
 */
