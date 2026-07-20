/**
 * Summary Builder Runtime — dışa aktarımlar (PR-102E).
 */

export type { SummarySectionId, SummarySection } from './SummarySection';
export {
  SUMMARY_SECTION_LABELS,
  SUMMARY_SECTION_ORDER
} from './SummarySection';

export type { SummaryMetadata, SummaryRecord } from './SummaryRecord';

export type { SummaryContext } from './SummaryContext';
export { createSummaryContext } from './SummaryContext';

export type {
  SummaryWarning,
  SummaryTelemetry,
  SummaryResult
} from './SummaryResult';
export { PIPELINE_BAG_SUMMARY_RUNTIME_RESULT_KEY } from './SummaryResult';

export type { SummarySectionDefinition } from './SummaryRegistryRuntime';
export {
  SummaryRegistryRuntime,
  createSummaryRegistryRuntime
} from './SummaryRegistryRuntime';

export {
  SummaryBuilderRuntime,
  createSummaryBuilderRuntime
} from './SummaryBuilderRuntime';

export {
  attachSummaryToPipelineContext,
  readSummaryFromPipelineContext,
  attachSummaryToPipelineResult,
  readSummaryFromPipelineResult,
  applySummaryBuilderToPipelineResult
} from './pipelineBridge';
