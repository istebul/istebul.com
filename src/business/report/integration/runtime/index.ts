/**
 * End-to-End Report Runtime — dışa aktarımlar (PR-104F).
 */

export type {
  ReportExecutionContext,
  CreateReportExecutionContextInput
} from './ReportExecutionContext';
export { createReportExecutionContext } from './ReportExecutionContext';

export type {
  ReportExecutionResult,
  ReportExecutionTelemetry,
  ReportPipelineExecutionSummary
} from './ReportExecutionResult';

export {
  ReportRuntimeFacade,
  createReportRuntimeFacade
} from './ReportRuntimeFacade';

export {
  ReportPipelineRunner,
  createReportPipelineRunner,
  type ReportPipelineRunnerDependencies
} from './ReportPipelineRunner';

export {
  resolveReportContext,
  ensureRequestIds,
  createSkippedStageExecution,
  createStageExecution,
  replaceStageExecution,
  mutateReportModel,
  syncReportModelFromBag,
  buildReportExecutionTelemetry,
  nowMs
} from './helpers';
