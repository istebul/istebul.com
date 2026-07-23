/**
 * Action Plan Builder Runtime — dışa aktarımlar (PR-103D).
 */

export type { ActionStep } from './ActionStep';

export type {
  ActionStepTemplate,
  ActionPlanDefinition
} from './ActionPlanDefinition';

export type {
  ActionPlanMetadata,
  ActionPlanRecord
} from './ActionPlanRecord';

export type { ActionPlanContext } from './ActionPlanContext';
export { createActionPlanContext } from './ActionPlanContext';

export type {
  ActionPlanWarning,
  ActionPlanSummary,
  ActionPlanTelemetry,
  ActionPlanResult
} from './ActionPlanResult';
export { PIPELINE_BAG_ACTION_PLAN_RUNTIME_RESULT_KEY } from './ActionPlanResult';

export {
  ActionPlanRegistryRuntime,
  createActionPlanRegistryRuntime
} from './ActionPlanRegistryRuntime';

export {
  ActionPlanBuilderRuntime,
  createActionPlanBuilderRuntime
} from './ActionPlanBuilderRuntime';

export {
  BUILTIN_ACTION_PLAN_DEFINITIONS,
  BUILTIN_ACTION_PLAN_DEFINITION_COUNT,
  getBuiltinActionPlanDefinition,
  getBuiltinActionPlanDefinitionByRecommendationId
} from './builtinDefinitions';

export {
  attachActionPlanToPipelineContext,
  readActionPlanFromPipelineContext,
  attachActionPlanToPipelineResult,
  readActionPlanFromPipelineResult,
  applyActionPlanBuilderToPipelineResult
} from './pipelineBridge';
