/**
 * Platform Admin End-to-End Runtime — dışa aktarımlar (PR-201F).
 */

export type {
  PlatformAdminPipelineStage,
  PlatformAdminStageOutcome
} from './stages';
export {
  PLATFORM_ADMIN_PIPELINE_STAGES,
  PLATFORM_ADMIN_SKIP_ON_VALIDATION_FAILURE,
  PLATFORM_ADMIN_STAGE_LABELS
} from './stages';

export type {
  PlatformAdminPipelineBag,
  PlatformAdminExecutionContext
} from './PlatformAdminExecutionContext';
export { createPlatformAdminExecutionContext } from './PlatformAdminExecutionContext';

export type {
  PlatformAdminStageExecution,
  PlatformAdminPipelineExecutionSummary,
  PlatformAdminExecutionTelemetry,
  PlatformAdminExecutionResult
} from './PlatformAdminExecutionResult';

export {
  createSkippedStageExecution,
  createStageExecution,
  buildPlatformAdminExecutionTelemetry,
  createEmptyPlatformAdminResult,
  buildE2ESummaryItems
} from './helpers';

export {
  PlatformAdminPipelineRunner,
  createPlatformAdminPipelineRunner
} from './PlatformAdminPipelineRunner';
export type { PlatformAdminPipelineRunnerDependencies } from './PlatformAdminPipelineRunner';

export {
  PlatformAdminRuntimeFacade,
  createPlatformAdminRuntimeFacade
} from './PlatformAdminRuntimeFacade';
