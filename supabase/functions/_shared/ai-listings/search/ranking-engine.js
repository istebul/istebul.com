/**
 * AI Listings Search — deterministic ranking engine (Sprint-16 v2).
 * Delegates semantic scoring and boosts to dedicated engines.
 */

import { computeSemanticScores } from './semantic-engine.js';
import { computeBoosts } from './boost-engine.js';
import { buildMatchExplanation } from './explain-engine.js';

/** @type {Readonly<Record<string, number>>} */
export const RANKING_WEIGHTS = Object.freeze({
  brand: 25,
  model: 20,
  year: 15,
  attributes: 10,
  description: 10,
  tags: 10,
  fuel: 5,
  transmission: 5,
  duplicate_penalty: -10
});

export const MIN_SIMILARITY_THRESHOLD = 40;

/**
 * @param {number} value
 * @returns {number}
 */
export function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * @param {number} score
 * @returns {number}
 */
export function scoreToSimilarityPercent(score) {
  return clampScore(score);
}

/**
 * @param {Record<string, unknown>} doc
 * @param {import('./query-parser.js').ParsedSearchQuery} parsed
 * @param {string} [rawQuery]
 * @returns {{ score: number, breakdown: Record<string, number>, boosts: Record<string, number>, match_reasons: string[] }}
 */
export function rankDocument(doc, parsed, rawQuery = '') {
  const { breakdown } = computeSemanticScores(doc, parsed);
  const { boosts, total: boostTotal } = computeBoosts(doc, parsed, rawQuery);

  if (doc.duplicate_status === 'exact' || doc.duplicate_status === 'similar') {
    breakdown.duplicate_penalty = RANKING_WEIGHTS.duplicate_penalty;
  }

  let score = Object.values(breakdown).reduce((sum, value) => sum + value, 0) + boostTotal;

  const hasPrimaryMatch = breakdown.brand > 0 || breakdown.model > 0 || breakdown.year > 0;
  if (hasPrimaryMatch && score > 0 && score < MIN_SIMILARITY_THRESHOLD) {
    score += 15;
  }

  const match_reasons = buildMatchExplanation(doc, parsed, breakdown, boosts);

  return {
    score: clampScore(score),
    breakdown,
    boosts,
    match_reasons
  };
}

/**
 * @param {Array<Record<string, unknown>>} results
 * @param {string} [sortBy]
 * @returns {Array<Record<string, unknown>>}
 */
export function sortSearchResults(results, sortBy = 'best_match') {
  const sort = String(sortBy ?? 'best_match').trim().toLowerCase();
  const sorted = [...results];

  switch (sort) {
    case 'newest':
      sorted.sort((a, b) => String(b.updated_at ?? b.created_at ?? '').localeCompare(String(a.updated_at ?? a.created_at ?? '')));
      break;
    case 'highest_ai':
      sorted.sort((a, b) => Number(b.decision_score ?? 0) - Number(a.decision_score ?? 0));
      break;
    case 'lowest_risk':
      sorted.sort((a, b) => Number(a.risk_score ?? 999) - Number(b.risk_score ?? 999));
      break;
    case 'highest_quality':
      sorted.sort((a, b) => Number(b.quality_score ?? 0) - Number(a.quality_score ?? 0));
      break;
    case 'best_match':
    default:
      sorted.sort((a, b) => Number(b.search_score ?? 0) - Number(a.search_score ?? 0));
      break;
  }

  return sorted;
}
