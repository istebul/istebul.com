/**
 * AI Recommendation Engine v1 — shared entry (Sprint-16).
 */

export {
  FIT_WEIGHTS,
  clampFitScore,
  applyProfileFallbacks,
  computeBudgetFit,
  computeRiskFit,
  computeQualityFit,
  computeExecutiveFit,
  computePriceFit,
  computeMarketFit,
  computeUsageFit,
  computeFamilyFit,
  computeAnnualKmFit,
  computePriorityFit,
  getRecommendationLabel,
  computeFitScore
} from './fit-score-engine.js';

export {
  rankTopRecommendations,
  assignAlternativeTags,
  resolveItemAlternativeTags,
  ALTERNATIVE_TAG_LABELS_TR
} from './alternative-ranker.js';

export {
  buildPositiveReasons,
  buildRiskWarnings,
  buildRecommendationExplanation
} from './recommendation-explainer.js';

export {
  FORBIDDEN_PHRASES,
  SAFE_PHRASES,
  containsForbiddenPhrase,
  sanitizeSummaryText,
  buildRecommendationSummary
} from './recommendation-summary.js';

export {
  buildRecommendationCacheKey,
  clearRecommendationMemoCache,
  runRecommendationEngine
} from './recommendation-engine.js';
