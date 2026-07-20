/**
 * KPI Board Runtime — dışa aktarımlar (PR-105D).
 */

export type { KpiId } from './KpiId';
export {
  KPI_LABELS,
  KPI_ORDER,
  KPI_UNIT_BY_ID,
  KPI_SOURCE_PART_BY_ID
} from './KpiId';

export type { KpiDefinition } from './KpiDefinition';
export type { KpiRecord } from './KpiRecord';

export type { KpiBoardContext } from './KpiBoardContext';
export { createKpiBoardContext } from './KpiBoardContext';

export type {
  KpiBoardWarning,
  KpiBoardTelemetry,
  KpiBoardMetadata,
  KpiBoardResult
} from './KpiBoardResult';
export { PIPELINE_BAG_DASHBOARD_KPI_BOARD_RUNTIME_RESULT_KEY } from './KpiBoardResult';

export {
  KpiRegistryRuntime,
  createKpiRegistryRuntime
} from './KpiRegistryRuntime';

export {
  KpiBoardRuntime,
  createKpiBoardRuntime
} from './KpiBoardRuntime';

export {
  BUILTIN_KPI_DEFINITIONS,
  BUILTIN_KPI_DEFINITION_COUNT,
  getBuiltinKpiDefinition,
  getBuiltinKpiDefinitionByCode
} from './builtinDefinitions';

export {
  attachKpiBoardToPipelineContext,
  readKpiBoardFromPipelineContext,
  attachKpiBoardToPipelineResult,
  readKpiBoardFromPipelineResult,
  applyKpiBoardToPipelineResult
} from './pipelineBridge';
