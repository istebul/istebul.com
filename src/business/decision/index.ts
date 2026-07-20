/**
 * İSTEBUL Business Decision Engine — dışa aktarım yüzeyi.
 *
 * Architecture Freeze v1.0 — tanım ve port katmanı.
 * LLM, gerçek karar üretimi ve UI yoktur.
 */

export { DECISION_MODEL_COUNT, DECISION_STATUS_LABELS } from './models/index';
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
} from './models/index';

export { DECISION_ENGINE_PORT_COUNT } from './ports/index';
export type {
  IDecisionEngine,
  IDecisionPipeline,
  IRecommendationBuilder,
  IRiskEvaluator,
  IOpportunityEvaluator,
  IPriorityCalculator
} from './ports/index';

export type { DecisionPipelineStageDefinition } from './pipeline/DecisionPipeline';
export {
  DECISION_PIPELINE_STAGES,
  DECISION_PIPELINE_STAGE_COUNT,
  getDecisionPipelineStage,
  listDecisionPipelineStages
} from './pipeline/DecisionPipeline';
export {
  DECISION_RUNTIME_ERROR_CODES,
  DecisionPipelineRuntime,
  createDecisionPipelineRuntime,
  nowMs,
  startDecisionStageTimer,
  endDecisionStageTimer
} from './pipeline/runtime/index';
export type {
  DecisionTiming,
  DecisionStageTimer,
  DecisionRuntimeIssue,
  DecisionStageExecution,
  DecisionStageExecutionOutcome,
  DecisionPipelineBag,
  DecisionPipelineContext,
  DecisionPipelineSummary,
  DecisionPipelineTelemetry,
  DecisionPipelineResult,
  DecisionRuntimeErrorCode,
  DecisionContextResolver,
  DecisionPipelineRuntimeOptions
} from './pipeline/runtime/index';

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
} from './registry/index';
export type {
  DecisionDefinitionEntry,
  RecommendationTemplateDefinition,
  RiskTemplateDefinition
} from './registry/index';

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

/** Policy Engine Runtime (PR-103B) */
export {
  POLICY_SEVERITY_RANK,
  POLICY_CATEGORY_LABELS,
  POLICY_OUTCOME_LABELS,
  createPolicyContext,
  PIPELINE_BAG_POLICY_RUNTIME_RESULT_KEY,
  PolicyRegistryRuntime,
  createPolicyRegistryRuntime,
  PolicyEngineRuntime,
  createPolicyEngineRuntime,
  BUILTIN_POLICY_DEFINITIONS,
  BUILTIN_POLICY_DEFINITION_COUNT,
  BUILTIN_POLICY_THRESHOLDS,
  getBuiltinPolicyDefinition,
  attachPolicyToPipelineContext,
  readPolicyFromPipelineContext,
  attachPolicyToPipelineResult,
  readPolicyFromPipelineResult,
  applyPolicyEngineToPipelineResult
} from './policies/runtime/index';
export type {
  PolicySeverity,
  PolicyCategory,
  PolicyOperator,
  PolicyDefinition,
  PolicyOutcome,
  PolicyEvaluation,
  PolicyContext,
  PolicyWarning,
  PolicySummary,
  PolicyTelemetry,
  PolicyResult
} from './policies/runtime/index';

/** Recommendation Builder Runtime (PR-103C) */
export {
  RECOMMENDATION_CATEGORY_LABELS,
  RECOMMENDATION_SEVERITY_RANK,
  createRecommendationContext,
  PIPELINE_BAG_RECOMMENDATION_RUNTIME_RESULT_KEY,
  RecommendationRegistryRuntime,
  createRecommendationRegistryRuntime,
  RecommendationBuilderRuntime,
  createRecommendationBuilderRuntime,
  BUILTIN_RECOMMENDATION_DEFINITIONS,
  BUILTIN_RECOMMENDATION_DEFINITION_COUNT,
  getBuiltinRecommendationDefinition,
  getBuiltinRecommendationDefinitionByPolicyId,
  attachRecommendationToPipelineContext,
  readRecommendationFromPipelineContext,
  attachRecommendationToPipelineResult,
  readRecommendationFromPipelineResult,
  applyRecommendationBuilderToPipelineResult
} from './recommendations/runtime/index';
export type {
  RecommendationCategory,
  RecommendationSeverity,
  RecommendationDefinition,
  RecommendationMetadata,
  RecommendationRecord,
  RecommendationContext,
  RecommendationWarning,
  RecommendationSummary,
  RecommendationTelemetry,
  RecommendationResult
} from './recommendations/runtime/index';
