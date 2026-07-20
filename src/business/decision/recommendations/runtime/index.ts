/**
 * Recommendation Builder Runtime — dışa aktarımlar (PR-103C).
 */

export type { RecommendationCategory } from './RecommendationCategory';
export { RECOMMENDATION_CATEGORY_LABELS } from './RecommendationCategory';

export type {
  RecommendationSeverity,
  RecommendationDefinition
} from './RecommendationDefinition';
export { RECOMMENDATION_SEVERITY_RANK } from './RecommendationDefinition';

export type {
  RecommendationMetadata,
  RecommendationRecord
} from './RecommendationRecord';

export type { RecommendationContext } from './RecommendationContext';
export { createRecommendationContext } from './RecommendationContext';

export type {
  RecommendationWarning,
  RecommendationSummary,
  RecommendationTelemetry,
  RecommendationResult
} from './RecommendationResult';
export { PIPELINE_BAG_RECOMMENDATION_RUNTIME_RESULT_KEY } from './RecommendationResult';

export {
  RecommendationRegistryRuntime,
  createRecommendationRegistryRuntime
} from './RecommendationRegistryRuntime';

export {
  RecommendationBuilderRuntime,
  createRecommendationBuilderRuntime
} from './RecommendationBuilderRuntime';

export {
  BUILTIN_RECOMMENDATION_DEFINITIONS,
  BUILTIN_RECOMMENDATION_DEFINITION_COUNT,
  getBuiltinRecommendationDefinition,
  getBuiltinRecommendationDefinitionByPolicyId
} from './builtinDefinitions';

export {
  attachRecommendationToPipelineContext,
  readRecommendationFromPipelineContext,
  attachRecommendationToPipelineResult,
  readRecommendationFromPipelineResult,
  applyRecommendationBuilderToPipelineResult
} from './pipelineBridge';
