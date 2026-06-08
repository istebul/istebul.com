/**
 * Decision Outcome Analytics — aggregates decision module outcomes (Sprint-30 / Faz B).
 */

import { safeNumber } from '../engine/score-utils.js';

/** @type {Map<string, unknown>} */
const memoCache = new Map();

/**
 * Clear memoization cache (testing).
 */
export function clearDecisionOutcomeAnalyticsMemoCache() {
  memoCache.clear();
}

/**
 * @param {Array<Record<string, unknown>>} outcomes
 * @returns {string}
 */
export function buildDecisionOutcomeCacheKey(outcomes) {
  return `doa:${Array.isArray(outcomes) ? outcomes.length : 0}`;
}

/**
 * @param {unknown} value
 * @returns {Record<string, unknown>|null}
 */
export function normalizeDecisionOutcome(value) {
  if (!value || typeof value !== 'object') return null;

  const outcome = /** @type {Record<string, unknown>} */ (value);
  const module = String(outcome.module ?? 'unknown');
  const helpful = outcome.helpful === true || outcome.helpful === 'true' || outcome.helpful === 1;

  return {
    module,
    category: String(outcome.category ?? 'general'),
    decision_score: safeNumber(outcome.decision_score ?? outcome.decisionScore),
    helpful,
    viewed: outcome.viewed !== false,
    timestamp: String(outcome.timestamp ?? outcome.created_at ?? new Date().toISOString())
  };
}

/**
 * @param {Array<Record<string, unknown>>} outcomes
 * @returns {Array<Record<string, unknown>>}
 */
export function normalizeDecisionOutcomes(outcomes) {
  if (!Array.isArray(outcomes)) return [];
  return outcomes
    .map((outcome) => normalizeDecisionOutcome(outcome))
    .filter((outcome) => outcome !== null);
}

/**
 * @param {Array<Record<string, unknown>>} outcomes
 * @returns {Record<string, { views: number, helpful: number, avgDecisionScore: number }>}
 */
export function aggregateOutcomesByModule(outcomes) {
  /** @type {Record<string, { views: number, helpful: number, scoreSum: number, scoreCount: number }>} */
  const buckets = {};

  for (const outcome of outcomes) {
    const module = String(outcome.module ?? 'unknown');
    if (!buckets[module]) {
      buckets[module] = { views: 0, helpful: 0, scoreSum: 0, scoreCount: 0 };
    }
    if (outcome.viewed) buckets[module].views += 1;
    if (outcome.helpful) buckets[module].helpful += 1;
    if (safeNumber(outcome.decision_score) > 0) {
      buckets[module].scoreSum += safeNumber(outcome.decision_score);
      buckets[module].scoreCount += 1;
    }
  }

  /** @type {Record<string, { views: number, helpful: number, avgDecisionScore: number }>} */
  const result = {};
  for (const [module, bucket] of Object.entries(buckets)) {
    result[module] = {
      views: bucket.views,
      helpful: bucket.helpful,
      avgDecisionScore:
        bucket.scoreCount > 0 ? Math.round(bucket.scoreSum / bucket.scoreCount) : 0
    };
  }
  return result;
}

/**
 * @param {Array<Record<string, unknown>>} outcomes
 * @param {{ skipCache?: boolean }} [options]
 * @returns {Record<string, unknown>}
 */
export function runDecisionOutcomeAnalytics(outcomes, options = {}) {
  const normalized = normalizeDecisionOutcomes(outcomes ?? []);
  const cacheKey = buildDecisionOutcomeCacheKey(normalized);

  if (!options.skipCache) {
    const cached = memoCache.get(cacheKey);
    if (cached) return /** @type {Record<string, unknown>} */ (cached);
  }

  const byModule = aggregateOutcomesByModule(normalized);
  const totalViews = normalized.filter((outcome) => outcome.viewed).length;
  const totalHelpful = normalized.filter((outcome) => outcome.helpful).length;
  const helpfulRate = totalViews > 0 ? Math.round((totalHelpful / totalViews) * 100) : 0;

  const topModules = Object.entries(byModule)
    .map(([module, stats]) => ({ module, ...stats }))
    .sort((a, b) => b.views - a.views);

  const result = {
    outcomeCount: normalized.length,
    byModule,
    topModules,
    totalViews,
    totalHelpful,
    helpfulRate
  };

  memoCache.set(cacheKey, result);
  if (memoCache.size > 8) {
    const oldest = memoCache.keys().next().value;
    if (oldest) memoCache.delete(oldest);
  }

  return result;
}
