/**
 * AI Decision Coach v1 — client entry (Sprint-17).
 */

export {
  COACH_LABELS,
  clearDecisionCoachMemoCache,
  buildDecisionCoachCacheKey,
  buildDecisionCoachInput,
  resolveCoachLabel,
  buildShouldConsider,
  buildShouldAvoidIf,
  computeCoachConfidence,
  runDecisionCoach
} from './decision-coach.js';

export {
  COACH_FORBIDDEN_PHRASES,
  COACH_SAFE_PHRASES,
  containsCoachForbiddenPhrase,
  sanitizeCoachSummaryText,
  buildCoachSummary
} from './coach-summary.js';

export {
  VERIFICATION_QUESTIONS_BY_CATEGORY,
  resolveCategoryForQuestions,
  buildVerificationQuestions
} from './coach-questions.js';

export { buildRedFlags } from './coach-red-flags.js';
export { buildNextSteps } from './coach-next-steps.js';
export { buildComparisonNotes } from './coach-comparison.js';

export {
  buildDecisionCoachPanelHtml,
  buildDecisionCoachShellHtml
} from './coach-card-builder.js';
