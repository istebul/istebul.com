/**
 * Decision Feedback — client entry (Sprint-33).
 */

export {
  FEEDBACK_HELPFULNESS_OPTIONS,
  FEEDBACK_FINAL_DECISION_OPTIONS,
  isValidHelpfulness,
  isValidFinalDecision,
  validateFeedbackInput,
  buildDecisionOutcome,
  computeOutcomeAnalytics,
  captureFeedback
} from './feedback-engine.js';

export { buildFeedbackFormHtml, buildOutcomeAnalyticsHtml } from './feedback-builder.js';
