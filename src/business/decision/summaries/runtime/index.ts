/**
 * Decision Summary Runtime — dışa aktarımlar (PR-103E).
 */

export type {
  DecisionSummarySectionId,
  DecisionSummarySection
} from './DecisionSummarySection';
export {
  DECISION_SUMMARY_SECTION_LABELS,
  DECISION_SUMMARY_SECTION_ORDER
} from './DecisionSummarySection';

export type {
  DecisionSummaryMetadata,
  DecisionSummaryRecord
} from './DecisionSummaryRecord';

export type { DecisionSummaryContext } from './DecisionSummaryContext';
export { createDecisionSummaryContext } from './DecisionSummaryContext';

export type {
  DecisionSummaryWarning,
  DecisionSummaryTelemetry,
  DecisionSummaryResult
} from './DecisionSummaryResult';
export { PIPELINE_BAG_DECISION_SUMMARY_RUNTIME_RESULT_KEY } from './DecisionSummaryResult';

export type { DecisionSummarySectionDefinition } from './DecisionSummaryRegistryRuntime';
export {
  DecisionSummaryRegistryRuntime,
  createDecisionSummaryRegistryRuntime
} from './DecisionSummaryRegistryRuntime';

export {
  DecisionSummaryRuntime,
  createDecisionSummaryRuntime
} from './DecisionSummaryRuntime';

export {
  attachDecisionSummaryToPipelineContext,
  readDecisionSummaryFromPipelineContext,
  attachDecisionSummaryToPipelineResult,
  readDecisionSummaryFromPipelineResult,
  applyDecisionSummaryToPipelineResult
} from './pipelineBridge';
