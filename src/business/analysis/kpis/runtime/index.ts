/**
 * KPI Engine Runtime — dışa aktarımlar (PR-102B).
 */

export type {
  KpiCategory,
  KpiCalculationType,
  KpiDefinition
} from './KpiDefinition';
export { KPI_CATEGORY_LABELS } from './KpiDefinition';

export type { KpiValue } from './KpiValue';
export type { KpiCalculation } from './KpiCalculation';

export type { KpiContext } from './KpiContext';
export { createKpiContext } from './KpiContext';

export type {
  KpiWarning,
  KpiDatasetSize,
  KpiExecutionSummary,
  KpiTelemetry,
  KpiResult
} from './KpiResult';
export { PIPELINE_BAG_KPI_RUNTIME_RESULT_KEY } from './KpiResult';

export {
  KpiRegistryRuntime,
  createKpiRegistryRuntime
} from './KpiRegistryRuntime';

export {
  KpiEngineRuntime,
  createKpiEngineRuntime
} from './KpiEngineRuntime';

export {
  BUILTIN_KPI_DEFINITIONS,
  BUILTIN_KPI_DEFINITION_COUNT,
  getBuiltinKpiDefinition
} from './builtinDefinitions';

export {
  computeDatasetFieldStats,
  roundRatio,
  roundAverage
} from './datasetMetrics';
export type { DatasetFieldStats } from './datasetMetrics';

export {
  attachKpiToPipelineContext,
  readKpiFromPipelineContext,
  attachKpiToPipelineResult,
  readKpiFromPipelineResult,
  applyKpiEngineToPipelineResult
} from './pipelineBridge';
