/**
 * Preference Intelligence — client entry (Sprint-32).
 */

export {
  PREFERENCE_SIGNAL_KEYS,
  PREFERENCE_WARNING,
  isValidPreferenceSignal,
  normalizePreferenceSignal,
  clampPreferenceValue,
  deriveSignalsFromEvent,
  aggregatePreferenceProfile,
  buildPreferenceLabels,
  createSignalsFromEvent,
  buildPersonalizedInsights
} from './preference-engine.js';

export { buildPreferenceProfileHtml } from './preference-profile-builder.js';
