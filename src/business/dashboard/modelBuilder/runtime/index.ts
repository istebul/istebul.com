/**
 * Dashboard Model Builder Runtime — dışa aktarımlar (PR-105B).
 */

export type { DashboardPartId } from './DashboardPart';
export { DASHBOARD_PART_LABELS, DASHBOARD_PART_ORDER } from './DashboardPart';

export type { DashboardMetadata } from './DashboardMetadata';
export type { DashboardDataset } from './DashboardDataset';
export type { DashboardReportSummaryInformation } from './DashboardReportSummaryInformation';
export type {
  DashboardSectionReference,
  DashboardSectionReferences
} from './DashboardSectionReferences';
export type {
  DashboardNarrativeReferenceKind,
  DashboardNarrativeReference,
  DashboardNarrativeReferences
} from './DashboardNarrativeReferences';
export type {
  DashboardRecommendationReference,
  DashboardRecommendationReferences
} from './DashboardRecommendationReferences';
export type {
  DashboardActionPlanReference,
  DashboardActionPlanReferences
} from './DashboardActionPlanReferences';
export type { DashboardModel } from './DashboardModel';

export type { DashboardModelContext } from './DashboardModelContext';
export { createDashboardModelContext } from './DashboardModelContext';

export type {
  DashboardModelWarning,
  DashboardModelTelemetry,
  DashboardModelResult
} from './DashboardModelResult';
export { PIPELINE_BAG_DASHBOARD_MODEL_RUNTIME_RESULT_KEY } from './DashboardModelResult';

export type { DashboardPartDefinition } from './DashboardRegistryRuntime';
export {
  DashboardRegistryRuntime,
  createDashboardRegistryRuntime
} from './DashboardRegistryRuntime';

export {
  DashboardModelBuilderRuntime,
  createDashboardModelBuilderRuntime
} from './DashboardModelBuilderRuntime';

export {
  attachDashboardModelToPipelineContext,
  readDashboardModelFromPipelineContext,
  attachDashboardModelToPipelineResult,
  readDashboardModelFromPipelineResult,
  applyDashboardModelBuilderToPipelineResult
} from './pipelineBridge';
