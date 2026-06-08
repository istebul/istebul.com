import { computeScoreDistribution } from './distribution-engine.js';

/**
 * @param {Array<Record<string, unknown>>} records
 * @returns {Array<{ id: string, label: string, count: number }>}
 */
export function computeQualityDistribution(records) {
  return computeScoreDistribution(records, 'quality_score');
}
