/**
 * Personalization Engine v2 — presentation layer only (Sprint-32 / Faz E).
 * Does NOT mutate recommendation, decision, quality, or fit scores.
 */

import { runPreferenceProfileEngine } from './preference-profile-engine.js';
import { runDecisionStyleEngine } from './decision-style-engine.js';
import { buildPersonalizedDecisionSummary } from './personalization-summary.js';

/** @type {Map<string, unknown>} */
const memoCache = new Map();

/**
 * Clear memoization cache (testing).
 */
export function clearPersonalizationMemoCache() {
  memoCache.clear();
}

/**
 * @param {Record<string, unknown>} recommendation
 * @param {Record<string, unknown>} profile
 * @returns {string}
 */
export function buildPersonalizationCacheKey(recommendation, profile) {
  const id = String(recommendation?.id ?? '');
  return `pz:${id}:${JSON.stringify(profile ?? {})}`;
}

/**
 * @param {Array<Record<string, unknown>>} factors
 * @param {Record<string, number>} weights
 * @returns {Array<Record<string, unknown>>}
 */
export function prioritizeFactorsForDisplay(factors, weights) {
  if (!Array.isArray(factors)) return [];

  const styleBoost = {
    risk: weights.riskFirst ?? 50,
    cost: weights.costFirst ?? 50,
    quality: weights.qualityFirst ?? 50,
    family: weights.familyFirst ?? 50,
    comfort: weights.comfortFirst ?? 50
  };

  return factors
    .map((factor, index) => {
      const text = String(factor?.text ?? factor ?? '').toLocaleLowerCase('tr-TR');
      let boost = 0;
      if (text.includes('risk') || text.includes('risk')) boost += styleBoost.risk;
      if (text.includes('maliyet') || text.includes('fiyat')) boost += styleBoost.cost;
      if (text.includes('kalite')) boost += styleBoost.quality;
      if (text.includes('aile')) boost += styleBoost.family;
      if (text.includes('konfor')) boost += styleBoost.comfort;

      return {
        factor,
        displayPriority: boost + (factors.length - index),
        originalIndex: index
      };
    })
    .sort((a, b) => b.displayPriority - a.displayPriority)
    .map((item) => ({
      ...(typeof item.factor === 'object' ? item.factor : { text: String(item.factor) }),
      displayPriority: item.displayPriority,
      originalIndex: item.originalIndex
    }));
}

/**
 * @param {Record<string, unknown>} recommendation
 * @param {Record<string, unknown>} decisionResult
 * @param {Record<string, unknown>} [explicitProfile]
 * @param {Record<string, unknown>} [behaviorSignals]
 * @param {{ skipCache?: boolean }} [options]
 * @returns {Record<string, unknown>|null}
 */
export function runPersonalizationEngine(
  recommendation,
  decisionResult,
  explicitProfile = {},
  behaviorSignals = {},
  options = {}
) {
  if (!recommendation || !decisionResult) return null;

  const profileResult = runPreferenceProfileEngine(explicitProfile, behaviorSignals, options);
  const profile = /** @type {Record<string, number>} */ (profileResult.profile ?? {});
  const cacheKey = buildPersonalizationCacheKey(recommendation, profile);

  if (!options.skipCache) {
    const cached = memoCache.get(cacheKey);
    if (cached) return /** @type {Record<string, unknown>} */ (cached);
  }

  const styleResult = runDecisionStyleEngine(profile, options);
  const weights = /** @type {Record<string, number>} */ (styleResult.weights ?? {});

  const positiveFactors = prioritizeFactorsForDisplay(
    /** @type {Array<Record<string, unknown>>} */ (decisionResult.positiveFactors ?? []),
    weights
  );
  const riskFactors = prioritizeFactorsForDisplay(
    /** @type {Array<Record<string, unknown>>} */ (decisionResult.riskFactors ?? []),
    weights
  );

  const personalizedSummary = buildPersonalizedDecisionSummary(decisionResult, styleResult, profileResult);

  const result = {
    scoresUnchanged: true,
    originalScores: {
      decisionScore: decisionResult.decisionScore,
      confidenceScore: decisionResult.confidenceScore,
      qualityScore: recommendation.quality_score ?? recommendation.listing_quality?.score,
      fitScore: recommendation.fit_score ?? recommendation.score
    },
    profile: profileResult,
    style: styleResult,
    display: {
      prioritizedPositiveFactors: positiveFactors,
      prioritizedRiskFactors: riskFactors,
      summary: personalizedSummary
    },
    explainable: true
  };

  memoCache.set(cacheKey, result);
  if (memoCache.size > 8) {
    const oldest = memoCache.keys().next().value;
    if (oldest) memoCache.delete(oldest);
  }

  return result;
}
