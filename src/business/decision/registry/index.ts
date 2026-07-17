/**
 * Registry dışa aktarımları.
 */

export type { DecisionDefinitionEntry } from './DecisionRegistryTypes';
export {
  DECISION_REGISTRY,
  DECISION_REGISTRY_COUNT,
  getDecisionById,
  listDecisions
} from './DecisionRegistry';

export type { RecommendationTemplateDefinition } from './RecommendationRegistryTypes';
export {
  RECOMMENDATION_REGISTRY,
  RECOMMENDATION_REGISTRY_COUNT,
  getRecommendationTemplateByCode,
  listRecommendationTemplates
} from './RecommendationRegistry';

export type { RiskTemplateDefinition } from './RiskRegistryTypes';
export {
  RISK_REGISTRY,
  RISK_REGISTRY_COUNT,
  getRiskTemplateByCode,
  listRiskTemplates
} from './RiskRegistry';

export {
  STRATEGY_REGISTRY,
  STRATEGY_REGISTRY_COUNT,
  getStrategyById,
  listStrategies
} from './StrategyRegistry';

export const DECISION_REGISTRY_STRUCTURE_COUNT = 4;
