/**
 * Executive Decision Report v1 — shared entry (Sprint-26).
 */

export {
  clearExecutiveReportMemoCache,
  buildExecutiveReportCacheKey,
  buildExecutiveReportInput,
  runExecutiveReportEngine
} from './executive-report-engine.js';

export {
  REPORT_LEVEL_LABELS,
  EXECUTIVE_REPORT_FORBIDDEN_PHRASES,
  DATA_LIMITATION_LABELS,
  resolveReportLevel,
  computeReportScore,
  sanitizeExecutiveReportText,
  containsForbiddenExecutiveReportPhrase,
  buildExecutiveSummary,
  buildDataLimitations,
  buildVerificationChecklist
} from './report-summary-engine.js';

export {
  buildSection,
  resolveSectionStatus,
  buildRecommendationSection,
  buildOwnershipCostSection,
  buildQualityTrustSection,
  buildNegotiationSection,
  buildPurchaseDecisionSection,
  buildExplainabilitySection,
  buildDecisionSnapshot
} from './report-section-builder.js';

export { buildRiskSummary } from './report-risk-engine.js';
export { CATEGORY_ACTION_PLANS, buildActionPlan } from './report-action-plan-engine.js';
export { PDF_DISCLAIMERS, buildPdfPayload } from './report-pdf-payload-builder.js';
