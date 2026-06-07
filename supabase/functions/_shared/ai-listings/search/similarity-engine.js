/**
 * AI Listings Search — similarity scoring (Sprint-15).
 */

import { clampScore, MIN_SIMILARITY_THRESHOLD, scoreToSimilarityPercent } from './ranking-engine.js';

export { MIN_SIMILARITY_THRESHOLD, scoreToSimilarityPercent };

export const MIN_FILTER_SIMILARITY_THRESHOLD = 10;

/**
 * @param {import('./query-parser.js').ParsedSearchQuery} parsed
 * @returns {boolean}
 */
export function isFilterOnlyQuery(parsed) {
  if (!parsed) return false;
  const hasPrimary = Boolean(parsed.brand || parsed.model || parsed.year);
  if (hasPrimary) return false;
  return Boolean(
    parsed.fuel ||
      parsed.transmission ||
      parsed.body_type ||
      parsed.segment ||
      parsed.category ||
      parsed.attributes.length > 0
  );
}

/**
 * @param {import('./query-parser.js').ParsedSearchQuery} parsed
 * @param {number} [defaultThreshold]
 * @returns {number}
 */
export function resolveSimilarityThreshold(parsed, defaultThreshold = MIN_SIMILARITY_THRESHOLD) {
  if (isFilterOnlyQuery(parsed)) return MIN_FILTER_SIMILARITY_THRESHOLD;
  return defaultThreshold;
}

/**
 * @param {number} score
 * @returns {boolean}
 */
export function passesSimilarityThreshold(score) {
  return clampScore(score) >= MIN_SIMILARITY_THRESHOLD;
}

/**
 * @param {Array<Record<string, unknown>>} results
 * @param {{ threshold?: number, includeBelowThreshold?: boolean }} [options]
 * @returns {Array<Record<string, unknown>>}
 */
export function filterBySimilarityThreshold(results, options = {}) {
  const threshold = options.threshold ?? (options.parsed ? resolveSimilarityThreshold(options.parsed) : MIN_SIMILARITY_THRESHOLD);
  const includeBelow = options.includeBelowThreshold === true;

  return results.filter((result) => {
    const score = Number(result.search_score ?? result.similarity_percent ?? 0);
    return includeBelow || score >= threshold;
  });
}

/**
 * @param {Record<string, unknown>} result
 * @returns {Record<string, unknown>}
 */
export function enrichWithSimilarity(result) {
  const score = Number(result.search_score ?? 0);
  return {
    ...result,
    search_score: clampScore(score),
    similarity_percent: scoreToSimilarityPercent(score)
  };
}
