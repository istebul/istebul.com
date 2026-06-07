/**
 * Feedback Learning Engine — derives explainable preference signals from feedback (Sprint-30 / Faz B).
 * Does not mutate core scores.
 */

import { clampScore, safeNumber } from '../engine/score-utils.js';

/** @type {Readonly<string[]>} */
export const FEEDBACK_REASON_CODES = Object.freeze([
  'helpful_explanation',
  'missing_info',
  'too_risky',
  'too_expensive',
  'wrong_recommendation',
  'good_comparison',
  'scenario_useful'
]);

/** @type {Map<string, unknown>} */
const memoCache = new Map();

/**
 * Clear memoization cache (testing).
 */
export function clearFeedbackLearningMemoCache() {
  memoCache.clear();
}

/**
 * @param {Array<Record<string, unknown>>} feedbackEvents
 * @returns {string}
 */
export function buildFeedbackLearningCacheKey(feedbackEvents) {
  return `fl:${Array.isArray(feedbackEvents) ? feedbackEvents.length : 0}`;
}

/**
 * @param {unknown} value
 * @returns {Record<string, unknown>|null}
 */
export function normalizeFeedbackEvent(value) {
  if (!value || typeof value !== 'object') return null;

  const event = /** @type {Record<string, unknown>} */ (value);
  const helpful = event.helpful === true || event.helpful === 'true' || event.helpful === 1;
  const reasons = Array.isArray(event.reasons)
    ? event.reasons.map(String).filter((code) => FEEDBACK_REASON_CODES.includes(code))
    : [];

  return {
    helpful,
    reasons,
    module: String(event.module ?? 'unknown'),
    category: String(event.category ?? 'general'),
    timestamp: String(event.timestamp ?? event.created_at ?? new Date().toISOString())
  };
}

/**
 * @param {Array<Record<string, unknown>>} feedbackEvents
 * @returns {Array<Record<string, unknown>>}
 */
export function normalizeFeedbackEvents(feedbackEvents) {
  if (!Array.isArray(feedbackEvents)) return [];
  return feedbackEvents
    .map((event) => normalizeFeedbackEvent(event))
    .filter((event) => event !== null);
}

/**
 * @param {Array<Record<string, unknown>>} events
 * @returns {Record<string, number>}
 */
export function countFeedbackReasons(events) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const event of events) {
    for (const reason of /** @type {string[]} */ (event.reasons ?? [])) {
      counts[reason] = (counts[reason] ?? 0) + 1;
    }
  }
  return counts;
}

/**
 * @param {Record<string, number>} reasonCounts
 * @returns {Array<{ code: string, count: number, label: string }>}
 */
export function rankFeedbackReasons(reasonCounts) {
  /** @type {Record<string, string>} */
  const labels = {
    helpful_explanation: 'Açıklama faydalı',
    missing_info: 'Eksik bilgi',
    too_risky: 'Çok riskli',
    too_expensive: 'Çok pahalı',
    wrong_recommendation: 'Yanlış öneri',
    good_comparison: 'Karşılaştırma iyi',
    scenario_useful: 'Senaryo faydalı'
  };

  return Object.entries(reasonCounts)
    .map(([code, count]) => ({ code, count, label: labels[code] ?? code }))
    .sort((a, b) => b.count - a.count);
}

/**
 * @param {Array<Record<string, unknown>>} events
 * @returns {Record<string, number>}
 */
export function deriveExplainablePreferenceSignals(events) {
  const reasonCounts = countFeedbackReasons(events);
  const helpfulCount = events.filter((event) => event.helpful).length;
  const total = events.length || 1;

  return {
    lowRiskPreference: clampScore(
      50 +
        safeNumber(reasonCounts.too_risky) * 8 -
        safeNumber(reasonCounts.helpful_explanation) * 2
    ),
    costSensitivity: clampScore(50 + safeNumber(reasonCounts.too_expensive) * 10),
    qualitySensitivity: clampScore(50 + safeNumber(reasonCounts.missing_info) * 6),
    comparisonAffinity: clampScore(50 + safeNumber(reasonCounts.good_comparison) * 8),
    scenarioAffinity: clampScore(50 + safeNumber(reasonCounts.scenario_useful) * 8),
    helpfulnessRate: clampScore((helpfulCount / total) * 100)
  };
}

/**
 * @param {Array<Record<string, unknown>>} feedbackEvents
 * @param {{ skipCache?: boolean }} [options]
 * @returns {Record<string, unknown>}
 */
export function runFeedbackLearningEngine(feedbackEvents, options = {}) {
  const normalized = normalizeFeedbackEvents(feedbackEvents ?? []);
  const cacheKey = buildFeedbackLearningCacheKey(normalized);

  if (!options.skipCache) {
    const cached = memoCache.get(cacheKey);
    if (cached) return /** @type {Record<string, unknown>} */ (cached);
  }

  const reasonCounts = countFeedbackReasons(normalized);
  const topReasons = rankFeedbackReasons(reasonCounts).slice(0, 5);
  const preferenceSignals = deriveExplainablePreferenceSignals(normalized);

  const result = {
    feedbackCount: normalized.length,
    reasonCounts,
    topReasons,
    preferenceSignals,
    explainable: true,
    source: 'feedback_learning'
  };

  memoCache.set(cacheKey, result);
  if (memoCache.size > 8) {
    const oldest = memoCache.keys().next().value;
    if (oldest) memoCache.delete(oldest);
  }

  return result;
}
