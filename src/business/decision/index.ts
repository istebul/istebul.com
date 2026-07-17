/**
 * İSTEBUL Business Decision Engine — dışa aktarım yüzeyi.
 *
 * Architecture Freeze v1.0 — tanım ve port katmanı.
 * LLM, gerçek karar üretimi ve UI yoktur.
 */

export { DECISION_MODEL_COUNT, DECISION_STATUS_LABELS } from './models';
export type {
  DecisionStage,
  DecisionStatus,
  DecisionRequest,
  DecisionContext,
  DecisionPriority,
  DecisionPriorityLevel,
  DecisionRisk,
  DecisionOpportunity,
  DecisionAction,
  DecisionActionKind,
  DecisionRecommendation,
  DecisionScore,
  DecisionSummary,
  DecisionResult
} from './models';

export { DECISION_ENGINE_PORT_COUNT } from './ports';
export type {
  IDecisionEngine,
  IDecisionPipeline,
  IRecommendationBuilder,
  IRiskEvaluator,
  IOpportunityEvaluator,
  IPriorityCalculator
} from './ports';

export type { DecisionPipelineStageDefinition } from './pipeline/DecisionPipeline';
export {
  DECISION_PIPELINE_STAGES,
  DECISION_PIPELINE_STAGE_COUNT,
  getDecisionPipelineStage,
  listDecisionPipelineStages
} from './pipeline/DecisionPipeline';

export {
  DECISION_REGISTRY_STRUCTURE_COUNT,
  DECISION_REGISTRY,
  DECISION_REGISTRY_COUNT,
  RECOMMENDATION_REGISTRY,
  RECOMMENDATION_REGISTRY_COUNT,
  RISK_REGISTRY,
  RISK_REGISTRY_COUNT,
  STRATEGY_REGISTRY,
  STRATEGY_REGISTRY_COUNT,
  listDecisions,
  getDecisionById,
  listRecommendationTemplates,
  getRecommendationTemplateByCode,
  listRiskTemplates,
  getRiskTemplateByCode,
  listStrategies,
  getStrategyById
} from './registry';
export type {
  DecisionDefinitionEntry,
  RecommendationTemplateDefinition,
  RiskTemplateDefinition
} from './registry';

export {
  DECISION_ENGINE_SCHEMA_VERSION,
  DECISION_ENGINE_NAME,
  DECISION_ENGINE_DEFAULT_LOCALE,
  DECISION_PIPELINE_STAGE_IDS,
  DECISION_REGISTRY_KIND
} from './constants/DecisionEngineConstants';
export type { DecisionRegistryKind } from './constants/DecisionEngineConstants';

export type {
  DecisionStrategyDefinition,
  DecisionStrategyStatus,
  DecisionStrategyHandler
} from './strategies/DecisionStrategyContract';
