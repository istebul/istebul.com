/**
 * AI Listings Repository — summary metrics (Sprint-11).
 */

import { groupDuplicatesByFingerprint } from './repository-engine.js';

/**
 * @param {Array<Record<string, unknown>>} records
 * @returns {{
 *   total_records: number,
 *   last_24h: number,
 *   top_brand: string|null,
 *   top_duplicate: string|null,
 *   average_ai: number|null,
 *   average_quality: number|null
 * }}
 */
export function buildRepositorySummary(records) {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;

  let last24h = 0;
  /** @type {Map<string, number>} */
  const brandCounts = new Map();
  /** @type {number[]} */
  const aiScores = [];
  /** @type {number[]} */
  const qualityScores = [];

  for (const record of records) {
    const createdTs = Date.parse(String(record.created_at ?? ''));
    if (Number.isFinite(createdTs) && createdTs >= dayAgo) last24h += 1;

    const brand = String(record.brand ?? '').trim();
    if (brand) brandCounts.set(brand, (brandCounts.get(brand) ?? 0) + 1);

    const ai = Number(record.decision_score);
    if (Number.isFinite(ai)) aiScores.push(ai);

    const quality = Number(record.quality_score);
    if (Number.isFinite(quality)) qualityScores.push(quality);
  }

  const duplicateGroups = groupDuplicatesByFingerprint(records);
  let topDuplicateFp = null;
  let topDuplicateCount = 0;
  for (const [fp, group] of duplicateGroups) {
    if (group.length > 1 && group.length > topDuplicateCount) {
      topDuplicateCount = group.length;
      topDuplicateFp = fp;
    }
  }

  return {
    total_records: records.length,
    last_24h: last24h,
    top_brand: pickTopKey(brandCounts),
    top_duplicate: topDuplicateFp,
    average_ai: roundAverage(aiScores),
    average_quality: roundAverage(qualityScores)
  };
}

/**
 * @param {Map<string, number>} counts
 * @returns {string|null}
 */
function pickTopKey(counts) {
  let topKey = null;
  let topCount = 0;
  for (const [key, count] of counts) {
    if (count > topCount) {
      topCount = count;
      topKey = key;
    }
  }
  return topKey;
}

/**
 * @param {number[]} values
 * @returns {number|null}
 */
function roundAverage(values) {
  if (!values.length) return null;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return Math.round((sum / values.length) * 10) / 10;
}
