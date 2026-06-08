/**
 * AI Decision Flow — client entry (Sprint-20 QA).
 */

export {
  containsForbiddenCalibrationText,
  checkDecisionFlowConsistency,
  computeConsistencyScore
} from './consistency-checker.js';

export {
  CALIBRATION_FORBIDDEN_PHRASES,
  resolveConsistencyStatus,
  buildCalibrationSummaryText,
  buildCalibrationSummary
} from './calibration-summary.js';

export {
  clearDecisionFlowMemoCache,
  buildDecisionFlowCacheKey,
  runDecisionFlow,
  buildCalibrationBlockHtml
} from './decision-flow-runner.js';
