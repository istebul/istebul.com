/**
 * İSTEBUL Platform Admin — End-to-End Integration (PR-201F).
 *
 * Architecture Freeze v1.0 — additive runtime.
 * PR-201A–201E değiştirilmez.
 */

export type {
  PlatformAdminPipelineStage,
  PlatformAdminStageOutcome,
  PlatformAdminPipelineBag,
  PlatformAdminExecutionContext,
  PlatformAdminStageExecution,
  PlatformAdminPipelineExecutionSummary,
  PlatformAdminExecutionTelemetry,
  PlatformAdminExecutionResult,
  PlatformAdminPipelineRunnerDependencies
} from './runtime/index';

export {
  PLATFORM_ADMIN_PIPELINE_STAGES,
  PLATFORM_ADMIN_SKIP_ON_VALIDATION_FAILURE,
  PLATFORM_ADMIN_STAGE_LABELS,
  createPlatformAdminExecutionContext,
  createSkippedStageExecution,
  createStageExecution,
  buildPlatformAdminExecutionTelemetry,
  createEmptyPlatformAdminResult,
  buildE2ESummaryItems,
  PlatformAdminPipelineRunner,
  createPlatformAdminPipelineRunner,
  PlatformAdminRuntimeFacade,
  createPlatformAdminRuntimeFacade
} from './runtime/index';
