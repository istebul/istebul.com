/**
 * User Learning — shared barrel (Sprint-30 / Faz B).
 */

import { runUserLearningEngine } from './user-learning-engine.js';
import { runFeedbackLearningEngine } from './feedback-learning-engine.js';
import { runDecisionOutcomeAnalytics } from './decision-outcome-analytics.js';
import { buildLearningInsightsSummary } from './learning-summary.js';

export {
  LEARNING_EVENT_TYPES,
  LEARNING_MODULE_LABELS,
  clearUserLearningMemoCache,
  buildUserLearningCacheKey,
  normalizeLearningEvent,
  normalizeLearningEvents,
  resolveModuleFromEventType,
  countEventsByModule,
  rankReportViews,
  rankScenarioRuns,
  computeHelpfulDecisionRate,
  runUserLearningEngine
} from './user-learning-engine.js';

export {
  FEEDBACK_REASON_CODES,
  clearFeedbackLearningMemoCache,
  buildFeedbackLearningCacheKey,
  normalizeFeedbackEvent,
  normalizeFeedbackEvents,
  countFeedbackReasons,
  rankFeedbackReasons,
  deriveExplainablePreferenceSignals,
  runFeedbackLearningEngine
} from './feedback-learning-engine.js';

export {
  clearDecisionOutcomeAnalyticsMemoCache,
  buildDecisionOutcomeCacheKey,
  normalizeDecisionOutcome,
  normalizeDecisionOutcomes,
  aggregateOutcomesByModule,
  runDecisionOutcomeAnalytics
} from './decision-outcome-analytics.js';

export {
  LEARNING_FORBIDDEN_PHRASES,
  sanitizeLearningText,
  containsForbiddenLearningPhrase,
  buildLearningInsightsSummary
} from './learning-summary.js';

/**
 * @param {Array<Record<string, unknown>>} events
 * @param {Array<Record<string, unknown>>} [feedbackEvents]
 * @param {Array<Record<string, unknown>>} [outcomes]
 * @param {{ skipCache?: boolean }} [options]
 * @returns {Record<string, unknown>}
 */
export function runLearningInsightsEngine(events, feedbackEvents = [], outcomes = [], options = {}) {
  const learning = runUserLearningEngine(events, options);
  const feedback = runFeedbackLearningEngine(
    feedbackEvents.length ? feedbackEvents : events.filter((e) => e.event_type === 'feedback_submitted'),
    options
  );
  const outcomeAnalytics = runDecisionOutcomeAnalytics(outcomes, options);
  const summary = buildLearningInsightsSummary(learning, feedback, outcomeAnalytics);

  return {
    learning,
    feedback,
    outcomeAnalytics,
    summary
  };
}
