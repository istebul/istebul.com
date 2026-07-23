/**
 * İSTEBUL Core — Shared Pipeline Utilities (EPIC-302.5 / PR-901B).
 *
 * Type-preserving helper implementations shared by Identity Access,
 * Auth Integration, Tenant Integration, Business Admin, and Platform Admin.
 *
 * Domain packages keep public helper export names via thin wrappers.
 * PipelineRunner / Facade / engine behavior is unchanged.
 */

export type { StageTimer } from './timing/index';
export { nowMs, startStageTimer, endStageTimer } from './timing/index';

export type { StageExecutionTimingInput } from './helpers/index';
export {
  createSkippedStageExecution,
  createStageExecution
} from './helpers/index';

export type { StageOutcomeCounts, PipelineSuccessMode } from './telemetry/index';
export {
  collectStageTelemetryMaps,
  buildAdminStyleExecutionTelemetry,
  buildIntegrationStyleExecutionTelemetry,
  buildCountedAdminExecutionTelemetry
} from './telemetry/index';

export { buildPipelineExecutionSummary } from './summary/index';
export {
  buildStageCountSummaryItems,
  buildIntegrationStageSummaryItems
} from './summary/index';

export {
  isValidExecutionLocale,
  pushInvalidLocaleIssue,
  pushEmptyOptionalStringIssue,
  pushProviderContextRequiredIssue,
  pushEmptyProviderContextIdIssue
} from './validation/index';
