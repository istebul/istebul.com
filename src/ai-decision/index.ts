/**
 * GarsonAI — P8-F AI Restaurant Brain (Decision Engine)
 *
 * Central decision layer for table / reservation / menu / campaign / guarantee
 * recommendations and density / wait / kitchen predictions.
 *
 * Adapter-only integration with P8-A AI Core, P8-B Knowledge Graph,
 * P8-C Concierge (duck-typed turns), P8-D Action Engine (hints only).
 *
 * Mock default. No live LLM. No SQL / migrations / UI.
 * Additive: does not modify P6 production or P7/P8-A…E behavior.
 */

export type {
  DecisionKind,
  DecisionProviderCode,
  DecisionScore,
  DecisionInput,
  DecisionResult,
  ConciergeTurnLike,
} from './types.ts';

export { DECISION_KINDS } from './types.ts';

export { DecisionContext } from './context/DecisionContext.ts';

export {
  clampScore,
  rankScores,
  bandFromPct,
  timeOfDayFactor,
  weekendFactor,
  buildScore,
  DecisionScorer,
} from './scoring/DecisionScorer.ts';

export { RecommendationEngine } from './engines/RecommendationEngine.ts';
export { PredictionEngine } from './engines/PredictionEngine.ts';
export { GuaranteeEngine } from './engines/GuaranteeEngine.ts';
export { CampaignEngine } from './engines/CampaignEngine.ts';
export {
  createAIDecisionEngine,
  type CreateAIDecisionEngineOptions,
  type AIDecisionEngine,
} from './engines/DecisionEngine.ts';

export { DecisionAudit } from './services/DecisionAudit.ts';

export { KnowledgeAdapter } from './adapters/KnowledgeAdapter.ts';
export { ConciergeAdapter } from './adapters/ConciergeAdapter.ts';
export { ActionHintsAdapter } from './adapters/ActionHintsAdapter.ts';
export { CoreProviderAdapter } from './adapters/CoreProviderAdapter.ts';
