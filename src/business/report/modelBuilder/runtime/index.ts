/**
 * Report Model Builder Runtime — dışa aktarımlar (PR-104B).
 */

export type { ReportPartId } from './ReportPart';
export { REPORT_PART_LABELS, REPORT_PART_ORDER } from './ReportPart';

export type { ReportMetadata } from './ReportMetadata';
export type { ReportDataset } from './ReportDataset';
export type { ReportDecision } from './ReportDecision';
export type { ReportPolicyInformation } from './ReportPolicyInformation';
export type {
  ReportMappedRecommendation,
  ReportRecommendationInformation
} from './ReportRecommendationInformation';
export type {
  ReportMappedAction,
  ReportActionPlanInformation
} from './ReportActionPlanInformation';
export type { ReportSummaryInformation } from './ReportSummaryInformation';
export type { ReportModel } from './ReportModel';

export type { ReportModelContext } from './ReportModelContext';
export { createReportModelContext } from './ReportModelContext';

export type {
  ReportModelWarning,
  ReportModelTelemetry,
  ReportModelResult
} from './ReportModelResult';
export { PIPELINE_BAG_REPORT_MODEL_RUNTIME_RESULT_KEY } from './ReportModelResult';

export type { ReportPartDefinition } from './ReportRegistryRuntime';
export {
  ReportRegistryRuntime,
  createReportRegistryRuntime
} from './ReportRegistryRuntime';

export {
  ReportModelBuilderRuntime,
  createReportModelBuilderRuntime
} from './ReportModelBuilderRuntime';

export {
  attachReportModelToPipelineContext,
  readReportModelFromPipelineContext,
  attachReportModelToPipelineResult,
  readReportModelFromPipelineResult,
  applyReportModelBuilderToPipelineResult
} from './pipelineBridge';
