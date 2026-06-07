/**
 * Preference Profile Engine — explainable user preferences (Sprint-32 / Faz E).
 * Does not mutate recommendation, decision, or quality scores.
 */

import { clampScore, safeNumber } from '../engine/score-utils.js';

/** @type {Readonly<string[]>} */
export const PREFERENCE_KEYS = Object.freeze([
  'lowRiskPreference',
  'costSensitivity',
  'qualitySensitivity',
  'familyUsagePreference',
  'cityUsagePreference',
  'comfortPreference',
  'performancePreference'
]);

/** @type {Readonly<Record<string, string>>} */
export const PREFERENCE_LABELS = Object.freeze({
  lowRiskPreference: 'Düşük risk eğilimi',
  costSensitivity: 'Maliyet hassasiyeti',
  qualitySensitivity: 'Kalite hassasiyeti',
  familyUsagePreference: 'Aile kullanımı eğilimi',
  cityUsagePreference: 'Şehir içi kullanım eğilimi',
  comfortPreference: 'Konfor eğilimi',
  performancePreference: 'Performans eğilimi'
});

/** @type {Readonly<Record<string, number>>} */
export const DEFAULT_PREFERENCE_PROFILE = Object.freeze({
  lowRiskPreference: 50,
  costSensitivity: 50,
  qualitySensitivity: 50,
  familyUsagePreference: 50,
  cityUsagePreference: 50,
  comfortPreference: 50,
  performancePreference: 50
});

/** @type {Map<string, unknown>} */
const memoCache = new Map();

/**
 * Clear memoization cache (testing).
 */
export function clearPreferenceProfileMemoCache() {
  memoCache.clear();
}

/**
 * @param {Record<string, unknown>} profile
 * @returns {string}
 */
export function buildPreferenceProfileCacheKey(profile) {
  return `pp:${JSON.stringify(profile ?? {})}`;
}

/**
 * @param {unknown} value
 * @returns {Record<string, number>}
 */
export function normalizePreferenceProfile(value) {
  const input = value && typeof value === 'object' ? /** @type {Record<string, unknown>} */ (value) : {};
  /** @type {Record<string, number>} */
  const profile = { ...DEFAULT_PREFERENCE_PROFILE };

  for (const key of PREFERENCE_KEYS) {
    profile[key] = clampScore(safeNumber(input[key] ?? profile[key]));
  }

  return profile;
}

/**
 * @param {Record<string, unknown>} behaviorSignals
 * @returns {Record<string, number>}
 */
export function derivePreferenceProfileFromBehavior(behaviorSignals) {
  const profile = { ...DEFAULT_PREFERENCE_PROFILE };

  profile.lowRiskPreference = clampScore(
    50 + safeNumber(behaviorSignals.lowRiskPreference) - 50
  );
  profile.costSensitivity = clampScore(
    50 + safeNumber(behaviorSignals.costSensitivity) - 50
  );
  profile.qualitySensitivity = clampScore(
    50 + safeNumber(behaviorSignals.qualitySensitivity) - 50
  );
  profile.familyUsagePreference = clampScore(
    50 + (String(behaviorSignals.usage_type ?? '') === 'family' ? 20 : 0)
  );
  profile.cityUsagePreference = clampScore(
    50 + (String(behaviorSignals.usage_type ?? '') === 'city' ? 20 : 0)
  );
  profile.comfortPreference = clampScore(
    50 + safeNumber(behaviorSignals.comfortPriority) - 50
  );
  profile.performancePreference = clampScore(
    50 + safeNumber(behaviorSignals.performancePriority) - 50
  );

  return profile;
}

/**
 * @param {Record<string, number>} profile
 * @returns {Array<{ key: string, label: string, value: number }>}
 */
export function buildPreferenceProfileItems(profile) {
  return PREFERENCE_KEYS.map((key) => ({
    key,
    label: PREFERENCE_LABELS[key],
    value: clampScore(profile[key])
  }));
}

/**
 * @param {Record<string, unknown>} [explicitProfile]
 * @param {Record<string, unknown>} [behaviorSignals]
 * @param {{ skipCache?: boolean }} [options]
 * @returns {Record<string, unknown>}
 */
export function runPreferenceProfileEngine(explicitProfile = {}, behaviorSignals = {}, options = {}) {
  const derived = derivePreferenceProfileFromBehavior(behaviorSignals);
  const merged = normalizePreferenceProfile({ ...derived, ...explicitProfile });
  const cacheKey = buildPreferenceProfileCacheKey(merged);

  if (!options.skipCache) {
    const cached = memoCache.get(cacheKey);
    if (cached) return /** @type {Record<string, unknown>} */ (cached);
  }

  const items = buildPreferenceProfileItems(merged);
  const result = {
    profile: merged,
    items,
    explainable: true,
    disclaimer:
      'Bu tercihler kullanım davranışlarınızdan ve açık seçimlerinizden türetilmiştir. Tercihlerinizi istediğiniz zaman değiştirebilirsiniz.'
  };

  memoCache.set(cacheKey, result);
  if (memoCache.size > 8) {
    const oldest = memoCache.keys().next().value;
    if (oldest) memoCache.delete(oldest);
  }

  return result;
}
