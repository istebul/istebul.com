import { computeExecutiveDistribution, classifyExecutiveBucket } from './distribution-engine.js';

export { computeExecutiveDistribution, classifyExecutiveBucket };

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {string} bucketId
 * @returns {number}
 */
export function countExecutiveBucket(records, bucketId) {
  return records.filter((record) => classifyExecutiveBucket(record.executive_label) === bucketId).length;
}
