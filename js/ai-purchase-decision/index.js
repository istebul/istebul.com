/**
 * Purchase Decision Intelligence v1 — client entry (Sprint-24).
 */

export {
  clearPurchaseDecisionMemoCache,
  buildPurchaseDecisionCacheKey,
  buildPurchaseDecisionInput,
  runPurchaseDecisionEngine
} from './purchase-decision-engine.js';

export {
  DECISION_WEIGHTS,
  CATEGORY_CRITICAL_FIELDS,
  extractPurchaseSignals,
  detectMissingCriticalFields,
  detectStaleListingRisk,
  detectCategorySpecificRisk,
  computeDecisionScore,
  computeConfidenceScore,
  buildDecisionStrength,
  buildConfidenceMeta
} from './decision-strength-engine.js';

export { buildPositiveFactors, buildRiskFactors } from './action-recommendation-engine.js';
export { buildMissingInfoImpact, resolveImpactLevel, computePotentialDecisionLift } from './missing-info-impact-engine.js';
export {
  NEGOTIATION_DISCOUNT_RATES,
  computeAdjustedPrice,
  estimateDecisionScoreAfterDiscount,
  buildNegotiationScenarios
} from './negotiation-scenario-engine.js';
export { buildWaitScenario, resolveWaitBenefitLevel, resolveWaitRiskLevel } from './wait-scenario-engine.js';

export {
  PURCHASE_DECISION_FORBIDDEN_PHRASES,
  DECISION_LEVEL_LABELS,
  CONFIDENCE_LEVEL_LABELS,
  RISK_LEVEL_LABELS,
  PRIMARY_ACTION_LABELS,
  resolveDecisionLevel,
  resolveConfidenceLevel,
  resolveRiskLevel,
  resolvePrimaryAction,
  sanitizePurchaseDecisionText,
  containsForbiddenPurchasePhrase,
  buildPurchaseDecisionSummary,
  buildCategoryNextSteps
} from './decision-summary.js';

export { buildExecutiveDecisionPanelHtml, buildExecutiveDecisionShellHtml } from './executive-decision-card-builder.js';
