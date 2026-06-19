/**
 * AI Decision Report v1 — barrel export (Sprint-19).
 */

export {
  clearDecisionReportMemoCache,
  buildReportCacheKey,
  buildReportInput,
  runDecisionReport,
  computeFinalConfidence
} from './report-engine.js';

export {
  REPORT_FORBIDDEN_PHRASES,
  sanitizeReportText,
  buildExecutiveSummary
} from './executive-summary.js';

export { buildRecommendationSection } from './recommendation-section.js';
export { buildCoachSection } from './coach-section.js';
export { buildSimulatorSection } from './simulator-section.js';
export { buildStrengthsSection } from './strengths-section.js';
export { buildWeaknessesSection } from './weaknesses-section.js';
export { resolveRiskLevel, RISK_LEVELS, buildRiskSection } from './risk-section.js';
export {
  VERIFICATION_CHECKLIST_BY_CATEGORY,
  resolveChecklistCategory,
  buildVerificationSection
} from './verification-section.js';
export { buildAlternativesSection } from './alternatives-section.js';
export {
  FINAL_DECISION_LABELS,
  resolveFinalDecisionLabel,
  buildFinalDecisionExplanation,
  buildFinalDecisionSection
} from './final-decision-section.js';
