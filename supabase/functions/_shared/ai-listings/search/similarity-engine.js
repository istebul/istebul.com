/**
 * AI Listings Search — similarity scoring (Sprint-15).
 */

import { clampScore, MIN_SIMILARITY_THRESHOLD, scoreToSimilarityPercent } from './ranking-engine.js';

export { MIN_SIMILARITY_THRESHOLD, scoreToSimilarityPercent };

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
  const threshold = options.threshold ?? MIN_SIMILARITY_THRESHOLD;
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
