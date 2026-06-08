/**
 * Decision Explainability v1 — shared barrel (Sprint-25).
 */

export {
  clearExplainabilityMemoCache,
  buildExplainabilityCacheKey,
  buildExplainabilityInput,
  computeExplanationScore,
  buildDataGaps,
  runExplainabilityEngine
} from './explainability-engine.js';

export {
  EXPLAINABILITY_FORBIDDEN_PHRASES,
  EXPLANATION_LEVEL_LABELS,
  CONFIDENCE_LEVEL_LABELS,
  CONTRIBUTION_LABELS,
  resolveExplanationLevel,
  resolveConfidenceLevel,
  sanitizeExplainabilityText,
  containsForbiddenExplainabilityPhrase,
  buildReasoningSummary,
  buildUserFriendlyExplanation,
  buildVerificationSteps
} from './explainability-summary.js';

export {
  CONTRIBUTION_KEYS,
  clampContribution,
  resolveContributionDirection,
  buildContributionItem,
  buildScoreContributions
} from './score-contribution-engine.js';

export { buildTopPositiveDrivers, buildTopNegativeDrivers } from './factor-impact-engine.js';
export { resolvePathStatus, resolvePathImpact, buildDecisionPath } from './decision-path-engine.js';
export {
  computeExplainabilityConfidenceScore,
  buildWhyThisConfidence,
  buildWhatWouldIncreaseConfidence,
  buildConfidenceExplanation
} from './confidence-explanation-engine.js';
