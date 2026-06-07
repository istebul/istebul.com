/**
 * AI Recommendation Engine v1 — client entry (Sprint-16).
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

export {
  PRIORITY_OPTIONS,
  USAGE_TYPE_OPTIONS,
  RISK_TOLERANCE_OPTIONS,
  CATEGORY_OPTIONS,
  parseUserIntent,
  listMissingProfileFields
} from './user-intent-parser.js';

export { filterListingsForRecommendation, filterListingsByCity } from './recommendation-filters.js';

export {
  buildRecommendationCardHtml,
  buildRecommendationCardsGridHtml
} from './recommendation-card-builder.js';
