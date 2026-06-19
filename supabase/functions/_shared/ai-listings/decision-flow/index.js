/**
 * AI Decision Flow — barrel export (Sprint-20 QA).
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
