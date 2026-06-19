/**
 * Admin Karar Merkezi — single deterministic analytics helper (Sprint-14 + production hardening).
 * Derives KPI, duplicate rate, and distribution counts from normalized listing data only.
 */

import { computeRepositoryAnalytics, clearAnalyticsMemoCache } from '../ai-listings-analytics/index.js';
import {
  deriveSharedAdminCounts,
  formatDuplicateRateValue,
  normalizeAdminDataset
} from './ai-listings-dataset.js';
import {
  computeNormalizedKpiStats,
  filterListingsForDisplay,
  HIGH_RISK_THRESHOLD
} from './ai-listings-admin-kpi.js';

/**
 * @param {unknown} duplicateCount
 * @param {number} total
 * @returns {number}
 */
export function computeDuplicateRatePercent(duplicateCount, total) {
  const dup = Number(duplicateCount);
  const count = Number(total);
  if (!Number.isFinite(dup) || !Number.isFinite(count) || count <= 0) return 0;
  return Math.round((dup / count) * 100);
}

/**
 * @param {Array<{ count?: number }>} buckets
 * @returns {number}
 */
export function sumDistributionCounts(buckets) {
  if (!Array.isArray(buckets)) return 0;
  return buckets.reduce((sum, bucket) => sum + (Number(bucket?.count) > 0 ? Number(bucket.count) : 0), 0);
}

/**
 * @param {Array<Record<string, unknown>>} listings
 * @param {{ searchQuery?: string, force?: boolean, nowMs?: number }} [options]
 * @returns {Record<string, unknown>}
 */
export function computeAdminDecisionAnalytics(listings, options = {}) {
  const dataset = normalizeAdminDataset(listings);
  const filtered = filterListingsForDisplay(dataset, options.searchQuery);
  const analytics = computeRepositoryAnalytics(filtered, {
    force: options.force,
    nowMs: options.nowMs
  });
  const decisionKpi = computeNormalizedKpiStats(filtered, { searchQuery: options.searchQuery });
  const { total } = deriveSharedAdminCounts(filtered);
  const duplicate = Number(analytics.kpi?.duplicate ?? decisionKpi.duplicate ?? 0);

  const distributions = /** @type {Record<string, Array<{ label: string, count: number }>>} */ (
    analytics.distributions ?? {}
  );

  return {
    dataset: filtered,
    total,
    analytics,
    decisionKpi,
    duplicate,
    duplicateRate: formatDuplicateRateValue(filtered, duplicate),
    duplicateRatePercent: computeDuplicateRatePercent(duplicate, total),
    highRisk: Number(analytics.kpi?.high_risk ?? decisionKpi.highRisk ?? 0),
    highRiskThreshold: HIGH_RISK_THRESHOLD,
    pendingReview: Number(decisionKpi.pendingReview ?? 0),
    averageAi: Number(analytics.kpi?.average_ai ?? decisionKpi.averageAi ?? 0),
    averageQuality: Number(analytics.kpi?.average_quality ?? decisionKpi.averageQuality ?? 0),
    averageRisk: Number(decisionKpi.averageRisk ?? 0),
    distributionTotals: {
      ai_score: sumDistributionCounts(distributions.ai_score),
      quality: sumDistributionCounts(distributions.quality),
      risk: sumDistributionCounts(distributions.risk),
      duplicate: sumDistributionCounts(distributions.duplicate)
    },
    distributions
  };
}

export { clearAnalyticsMemoCache };
