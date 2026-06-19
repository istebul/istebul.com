/**
 * Listing Quality & Trust Score v1 — deterministic orchestrator (Sprint-23).
 */

import { clampScore } from '../engine/score-utils.js';
import {
  computeQualitySignals,
  aggregateQualityScore,
  mapQualityLevel,
  buildQualityLevelLabelTr,
  resolveQualityCategoryKey
} from './quality-signal-engine.js';
import {
  computeTrustSignals,
  aggregateTrustScore,
  mapTrustLevel,
  buildTrustLevelLabelTr,
  classifyListingRiskLevel,
  buildRiskLevelLabelTr
} from './trust-signal-engine.js';
import {
  buildQualitySummaryText,
  partitionQualityTrustSignals,
  sanitizeQualitySummary
} from './quality-summary.js';
import { buildQualityChecklist } from './quality-checklist.js';

/** @type {Map<string, unknown>} */
const memoCache = new Map();

/**
 * Clear memoization cache (testing).
 */
export function clearListingQualityMemoCache() {
  memoCache.clear();
}

/**
 * @param {Record<string, unknown>} recommendation
 * @param {Record<string, unknown>} userIntent
 * @returns {string}
 */
export function buildListingQualityCacheKey(recommendation, userIntent) {
  const id = String(recommendation?.id ?? '');
  return `${id}:${JSON.stringify(userIntent ?? {})}`;
}

/**
 * @param {Record<string, unknown>} recommendation
 * @param {Record<string, unknown>} [userIntent]
 * @returns {Record<string, unknown>}
 */
export function buildListingQualityInput(recommendation, userIntent = {}) {
  const listing = /** @type {Record<string, unknown>} */ (recommendation?.listing ?? recommendation ?? {});
  const category = String(recommendation?.category ?? listing.category ?? userIntent.category ?? 'vehicle');

  return {
    recommendation,
    listing,
    user_intent: userIntent,
    category,
    category_key: resolveQualityCategoryKey(category),
    duplicate_status: String(recommendation?.duplicate_status ?? listing.duplicate_status ?? 'new'),
    price_intelligence: recommendation?.price_intelligence ?? listing.price_intelligence ?? null
  };
}

/**
 * @param {Record<string, unknown>} input
 * @param {{ skipCache?: boolean }} [options]
 * @returns {{
 *   quality_score: number,
 *   quality_level: 'excellent'|'good'|'fair'|'weak',
 *   quality_label: string,
 *   trust_score: number,
 *   trust_level: 'high'|'medium'|'low',
 *   trust_label: string,
 *   risk_level: 'low'|'medium'|'high',
 *   risk_label: string,
 *   quality_signals: Array<{ key: string, label: string, score: number, passed: boolean }>,
 *   trust_signals: Array<{ key: string, label: string, triggered: boolean, description: string, penalty: number }>,
 *   strong_signals: string[],
 *   weak_signals: string[],
 *   checklist: string[],
 *   quality_summary: string,
 *   category: string,
 *   empty: boolean
 * }}
 */
export function runListingQualityTrust(input, options = {}) {
  const cacheKey = buildListingQualityCacheKey(
    /** @type {Record<string, unknown>} */ (input.recommendation ?? {}),
    input.user_intent ?? {}
  );

  if (!options.skipCache) {
    const cached = memoCache.get(cacheKey);
    if (cached) return /** @type {ReturnType<typeof runListingQualityTrust>} */ (cached);
  }

  if (!input?.recommendation?.id) {
    const empty = {
      quality_score: 0,
      quality_level: /** @type {'weak'} */ ('weak'),
      quality_label: buildQualityLevelLabelTr('weak'),
      trust_score: 0,
      trust_level: /** @type {'low'} */ ('low'),
      trust_label: buildTrustLevelLabelTr('low'),
      risk_level: /** @type {'high'} */ ('high'),
      risk_label: buildRiskLevelLabelTr('high'),
      quality_signals: [],
      trust_signals: [],
      strong_signals: [],
      weak_signals: [],
      checklist: [],
      quality_summary: sanitizeQualitySummary(
        'Bu öneri için kalite ve güven analizi üretilemedi.'
      ),
      category: String(input.category_key ?? 'vehicle'),
      empty: true
    };
    memoCache.set(cacheKey, empty);
    return empty;
  }

  const listing = /** @type {Record<string, unknown>} */ (input.listing ?? input.recommendation ?? {});
  const context = {
    category: input.category_key ?? input.category,
    duplicate_status: input.duplicate_status,
    price_intelligence: input.price_intelligence
  };

  const qualitySignals = computeQualitySignals(listing, context);
  const qualityScore = clampScore(aggregateQualityScore(qualitySignals));
  const qualityLevel = mapQualityLevel(qualityScore);

  const trustSignals = computeTrustSignals(listing, context);
  const trustScore = clampScore(aggregateTrustScore(trustSignals));
  const trustLevel = mapTrustLevel(trustScore);
  const riskLevel = classifyListingRiskLevel(trustScore, trustSignals, qualityScore);

  const { strong, weak } = partitionQualityTrustSignals(qualitySignals, trustSignals);
  const checklist = buildQualityChecklist(input.category_key ?? input.category, context);
  const qualitySummary = buildQualitySummaryText(
    qualityScore,
    qualityLevel,
    trustScore,
    trustLevel,
    strong,
    weak
  );

  const result = {
    quality_score: qualityScore,
    quality_level: qualityLevel,
    quality_label: buildQualityLevelLabelTr(qualityLevel),
    trust_score: trustScore,
    trust_level: trustLevel,
    trust_label: buildTrustLevelLabelTr(trustLevel),
    risk_level: riskLevel,
    risk_label: buildRiskLevelLabelTr(riskLevel),
    quality_signals: qualitySignals,
    trust_signals: trustSignals,
    strong_signals: strong,
    weak_signals: weak,
    checklist,
    quality_summary: qualitySummary,
    category: String(input.category_key ?? resolveQualityCategoryKey(String(input.category ?? 'vehicle'))),
    empty: false
  };

  memoCache.set(cacheKey, result);
  if (memoCache.size > 25) {
    const oldest = memoCache.keys().next().value;
    if (oldest) memoCache.delete(oldest);
  }

  return result;
}

export {
  computeQualitySignals,
  aggregateQualityScore,
  mapQualityLevel,
  buildQualityLevelLabelTr,
  resolveQualityCategoryKey
} from './quality-signal-engine.js';
export {
  computeTrustSignals,
  aggregateTrustScore,
  mapTrustLevel,
  buildTrustLevelLabelTr,
  classifyListingRiskLevel,
  buildRiskLevelLabelTr,
  mapRiskLevelClass
} from './trust-signal-engine.js';
export {
  buildQualityChecklist,
  QUALITY_CHECKLIST_BY_CATEGORY
} from './quality-checklist.js';
export {
  buildQualitySummaryText,
  partitionQualityTrustSignals,
  sanitizeQualitySummary,
  QUALITY_FORBIDDEN_PHRASES
} from './quality-summary.js';
