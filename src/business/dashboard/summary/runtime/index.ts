/**
 * Dashboard Summary Runtime — dışa aktarımlar (PR-105E).
 */

export type { DashboardSummary } from './DashboardSummary';

export type {
  DashboardSummarySectionId,
  DashboardSummarySection
} from './DashboardSummarySection';
export {
  DASHBOARD_SUMMARY_SECTION_LABELS,
  DASHBOARD_SUMMARY_SECTION_ORDER
} from './DashboardSummarySection';

export type {
  DashboardSummaryMetadata,
  DashboardSummaryRecord
} from './DashboardSummaryRecord';

export type { DashboardSummaryContext } from './DashboardSummaryContext';
export { createDashboardSummaryContext } from './DashboardSummaryContext';

export type {
  DashboardSummaryWarning,
  DashboardSummaryTelemetry,
  DashboardSummaryResult
} from './DashboardSummaryResult';
export { PIPELINE_BAG_DASHBOARD_SUMMARY_RUNTIME_RESULT_KEY } from './DashboardSummaryResult';

export type { DashboardSummarySectionDefinition } from './DashboardSummaryRegistryRuntime';
export {
  DashboardSummaryRegistryRuntime,
  createDashboardSummaryRegistryRuntime
} from './DashboardSummaryRegistryRuntime';

export {
  DashboardSummaryRuntime,
  createDashboardSummaryRuntime
} from './DashboardSummaryRuntime';

export {
  attachDashboardSummaryToPipelineContext,
  readDashboardSummaryFromPipelineContext,
  attachDashboardSummaryToPipelineResult,
  readDashboardSummaryFromPipelineResult,
  applyDashboardSummaryToPipelineResult
} from './pipelineBridge';
