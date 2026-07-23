/**
 * Finding Builder Runtime — dışa aktarımlar (PR-102D).
 */

export type { FindingCategory } from './FindingCategory';
export { FINDING_CATEGORY_LABELS } from './FindingCategory';

export type { FindingSeverity, FindingDefinition } from './FindingDefinition';
export { FINDING_SEVERITY_RANK } from './FindingDefinition';

export type { FindingMetadata, FindingRecord } from './FindingRecord';

export type { FindingContext } from './FindingContext';
export { createFindingContext } from './FindingContext';

export type {
  FindingWarning,
  FindingSummary,
  FindingTelemetry,
  FindingResult
} from './FindingResult';
export { PIPELINE_BAG_FINDING_RUNTIME_RESULT_KEY } from './FindingResult';

export {
  FindingRegistryRuntime,
  createFindingRegistryRuntime
} from './FindingRegistryRuntime';

export {
  FindingBuilderRuntime,
  createFindingBuilderRuntime
} from './FindingBuilderRuntime';

export {
  BUILTIN_FINDING_DEFINITIONS,
  BUILTIN_FINDING_DEFINITION_COUNT,
  getBuiltinFindingDefinition,
  getBuiltinFindingDefinitionByRuleId
} from './builtinDefinitions';

export {
  attachFindingToPipelineContext,
  readFindingFromPipelineContext,
  attachFindingToPipelineResult,
  readFindingFromPipelineResult,
  applyFindingBuilderToPipelineResult
} from './pipelineBridge';
