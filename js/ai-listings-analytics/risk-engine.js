import { computeRiskTierDistribution, classifyRiskTier } from './distribution-engine.js';

export { computeRiskTierDistribution, classifyRiskTier };

/**
 * @param {Array<Record<string, unknown>>} records
 * @returns {number}
 */
export function countHighRiskRecords(records) {
  return records.filter((record) => classifyRiskTier(record.risk_score) === 'high').length;
}
