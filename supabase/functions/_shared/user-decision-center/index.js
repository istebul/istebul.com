/**
 * User Decision Center — shared entry (Sprint-30).
 */

export {
  USER_DECISION_EMPTY_MESSAGE,
  USER_DECISION_FORBIDDEN_PHRASES,
  clearUserDecisionMemoCache,
  buildListingRecommendationInput,
  buildUserDecisionCacheKey,
  sanitizeUserDecisionText,
  resolveUserDecisionContext,
  resolveUserDecisionScenario,
  buildDecisionChecklistItems,
  snapshotPrimaryScores
} from './user-decision-engine.js';
