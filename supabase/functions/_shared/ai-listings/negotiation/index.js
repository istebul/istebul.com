/**
 * Negotiation Intelligence v1 — shared barrel (Faz N-1).
 */

export {
  buildNegotiationInput,
  runNegotiationIntelligenceEngine
} from './negotiation-engine.js';

export { buildOfferRange } from './offer-range-engine.js';
export { assessNegotiationRisk } from './negotiation-risk-engine.js';
export { buildNegotiationChecklist } from './negotiation-checklist.js';
export {
  NEGOTIATION_FORBIDDEN_PHRASES,
  sanitizeNegotiationText,
  buildNegotiationSummary
} from './negotiation-summary.js';
