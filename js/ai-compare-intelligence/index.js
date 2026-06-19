/**
 * Compare Intelligence v1 — client entry (Sprint-27).
 */

export {
  clearCompareMemoCache,
  buildCompareCacheKey,
  buildCompareInput,
  runCompareEngine,
  COMPARE_LEVEL_LABELS,
  WINNER_GAP_THRESHOLD
} from './compare-engine.js';

export {
  COMPARE_WEIGHTS,
  computeItemCompareScore,
  normalizeCostSignal,
  buildScoreComparison
} from './compare-score-engine.js';

export {
  buildRanking,
  resolveWinner,
  buildWinnerReason
} from './compare-winner-engine.js';

export { buildRiskComparison } from './compare-risk-engine.js';
export { buildCostComparison } from './compare-cost-engine.js';

export {
  COMPARE_FORBIDDEN_PHRASES,
  sanitizeCompareText,
  containsForbiddenComparePhrase,
  computeCompareScore,
  computeDataQuality,
  resolveCompareLabel,
  buildCompareSummary,
  buildTradeoffs,
  buildCategoryNextSteps
} from './compare-summary.js';

export { buildComparePanelHtml, buildCompareShellHtml, buildCompareToolbarHtml } from './compare-card-builder.js';
