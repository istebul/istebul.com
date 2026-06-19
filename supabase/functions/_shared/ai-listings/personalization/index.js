/**
 * Personalization v2 — shared barrel (Sprint-32 / Faz E).
 */

import { runPersonalizationEngine } from './personalization-engine.js';
import { runPreferenceProfileEngine } from './preference-profile-engine.js';
import { runDecisionStyleEngine } from './decision-style-engine.js';

export {
  clearPersonalizationMemoCache,
  buildPersonalizationCacheKey,
  prioritizeFactorsForDisplay,
  runPersonalizationEngine
} from './personalization-engine.js';

export {
  PREFERENCE_KEYS,
  PREFERENCE_LABELS,
  DEFAULT_PREFERENCE_PROFILE,
  clearPreferenceProfileMemoCache,
  buildPreferenceProfileCacheKey,
  normalizePreferenceProfile,
  derivePreferenceProfileFromBehavior,
  buildPreferenceProfileItems,
  runPreferenceProfileEngine
} from './preference-profile-engine.js';

export {
  DECISION_STYLE_KEYS,
  DECISION_STYLE_LABELS,
  clearDecisionStyleMemoCache,
  buildDecisionStyleCacheKey,
  computeDecisionStyleWeights,
  resolvePrimaryDecisionStyle,
  runDecisionStyleEngine
} from './decision-style-engine.js';

export {
  PERSONALIZATION_FORBIDDEN_PHRASES,
  sanitizePersonalizationText,
  containsForbiddenPersonalizationPhrase,
  buildPersonalizedDecisionSummary
} from './personalization-summary.js';

/**
 * @param {Record<string, unknown>} recommendation
 * @param {Record<string, unknown>} decisionResult
 * @param {Record<string, unknown>} [explicitProfile]
 * @param {Record<string, unknown>} [behaviorSignals]
 * @param {{ skipCache?: boolean }} [options]
 * @returns {Record<string, unknown>|null}
 */
export function runPersonalizationSuite(
  recommendation,
  decisionResult,
  explicitProfile = {},
  behaviorSignals = {},
  options = {}
) {
  const personalization = runPersonalizationEngine(
    recommendation,
    decisionResult,
    explicitProfile,
    behaviorSignals,
    options
  );
  const profile = runPreferenceProfileEngine(explicitProfile, behaviorSignals, options);
  const style = runDecisionStyleEngine(/** @type {Record<string, number>} */ (profile.profile ?? {}), options);

  return {
    personalization,
    profile,
    style
  };
}
