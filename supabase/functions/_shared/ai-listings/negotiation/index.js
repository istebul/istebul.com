/**
 * Negotiation Intelligence v1 — shared exports (Sprint-22).
 */

export {
  clearNegotiationMemoCache,
  buildNegotiationCacheKey,
  buildNegotiationInput,
  computeNegotiationConfidence,
  runNegotiationIntelligence,
  buildNegotiationRiskLabel,
  classifyNegotiationRiskLevel,
  mapNegotiationRiskClass,
  NEGOTIATION_RISK_LEVELS,
  computeOfferRange,
  roundOfferAmount,
  POSITION_DISCOUNT_PROFILES,
  buildNegotiationChecklist,
  resolveNegotiationCategoryKey,
  NEGOTIATION_CHECKLIST_BY_CATEGORY,
  buildNegotiationSummaryText,
  buildNegotiationReasons,
  sanitizeNegotiationSummary,
  NEGOTIATION_FORBIDDEN_PHRASES
} from './negotiation-engine.js';
