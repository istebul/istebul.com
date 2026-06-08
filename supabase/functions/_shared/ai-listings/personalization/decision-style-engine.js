/**
 * Decision Style Engine — presentation style from preferences (Sprint-32 / Faz E).
 */

import { clampScore } from '../engine/score-utils.js';

/** @type {Readonly<string[]>} */
export const DECISION_STYLE_KEYS = Object.freeze([
  'riskFirst',
  'costFirst',
  'qualityFirst',
  'familyFirst',
  'comfortFirst'
]);

/** @type {Map<string, unknown>} */
const memoCache = new Map();

/**
 * Clear memoization cache (testing).
 */
export function clearDecisionStyleMemoCache() {
  memoCache.clear();
}

/**
 * @param {Record<string, number>} profile
 * @returns {string}
 */
export function buildDecisionStyleCacheKey(profile) {
  return `ds:${JSON.stringify(profile ?? {})}`;
}

/**
 * @param {Record<string, number>} profile
 * @returns {Record<string, number>}
 */
export function computeDecisionStyleWeights(profile) {
  return {
    riskFirst: clampScore(profile.lowRiskPreference ?? 50),
    costFirst: clampScore(profile.costSensitivity ?? 50),
    qualityFirst: clampScore(profile.qualitySensitivity ?? 50),
    familyFirst: clampScore(profile.familyUsagePreference ?? 50),
    comfortFirst: clampScore(profile.comfortPreference ?? 50)
  };
}

/**
 * @param {Record<string, number>} weights
 * @returns {string}
 */
export function resolvePrimaryDecisionStyle(weights) {
  const entries = Object.entries(weights).sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? 'qualityFirst';
}

/** @type {Readonly<Record<string, string>>} */
export const DECISION_STYLE_LABELS = Object.freeze({
  riskFirst: 'Risk odaklı karar stili',
  costFirst: 'Maliyet odaklı karar stili',
  qualityFirst: 'Kalite odaklı karar stili',
  familyFirst: 'Aile odaklı karar stili',
  comfortFirst: 'Konfor odaklı karar stili'
});

/**
 * @param {Record<string, number>} profile
 * @param {{ skipCache?: boolean }} [options]
 * @returns {Record<string, unknown>}
 */
export function runDecisionStyleEngine(profile, options = {}) {
  const cacheKey = buildDecisionStyleCacheKey(profile);

  if (!options.skipCache) {
    const cached = memoCache.get(cacheKey);
    if (cached) return /** @type {Record<string, unknown>} */ (cached);
  }

  const weights = computeDecisionStyleWeights(profile);
  const primaryStyle = resolvePrimaryDecisionStyle(weights);

  const result = {
    weights,
    primaryStyle,
    primaryStyleLabel: DECISION_STYLE_LABELS[primaryStyle] ?? primaryStyle,
    explainable: true
  };

  memoCache.set(cacheKey, result);
  if (memoCache.size > 8) {
    const oldest = memoCache.keys().next().value;
    if (oldest) memoCache.delete(oldest);
  }

  return result;
}
