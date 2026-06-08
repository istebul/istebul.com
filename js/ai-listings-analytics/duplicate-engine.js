import { computeDuplicateDistribution, classifyDuplicateBucket } from './distribution-engine.js';

export { computeDuplicateDistribution, classifyDuplicateBucket };

/**
 * @param {Array<Record<string, unknown>>} records
 * @returns {number}
 */
export function countNonNewDuplicates(records) {
  return records.filter((record) => {
    const bucket = classifyDuplicateBucket(record.duplicate_status, record.duplicate_similarity);
    return bucket !== 'new';
  }).length;
}
