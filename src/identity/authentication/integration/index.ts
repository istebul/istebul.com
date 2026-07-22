/**
 * İSTEBUL Identity — Authentication End-to-End Runtime (EPIC-301E).
 *
 * Architecture Freeze — 301A–301D implementasyonları değiştirilmez.
 */

export type {
  AuthenticationIntegrationPipelineStage,
  AuthenticationIntegrationStageOutcome
} from './stages';

export {
  AUTHENTICATION_INTEGRATION_PIPELINE_STAGES,
  AUTHENTICATION_INTEGRATION_SKIP_ON_VALIDATION_FAILURE,
  AUTHENTICATION_INTEGRATION_STAGE_LABELS
} from './stages';

export type {
  AuthenticationIntegrationPipelineBag,
  AuthenticationIntegrationOperation,
  AuthenticationIntegrationExecutionContext
} from './AuthenticationIntegrationExecutionContext';

export { createAuthenticationIntegrationExecutionContext } from './AuthenticationIntegrationExecutionContext';

export type {
  AuthenticationIntegrationSummaryItem,
  AuthenticationIntegrationValidationIssue,
  AuthenticationIntegrationSummary,
  AuthenticationIntegrationResultTelemetry,
  AuthenticationIntegrationResult,
  AuthenticationIntegrationStageExecution,
  AuthenticationIntegrationPipelineExecutionSummary,
  AuthenticationIntegrationExecutionTelemetry,
  AuthenticationIntegrationExecutionResult
} from './AuthenticationIntegrationExecutionResult';

export { PIPELINE_BAG_AUTHENTICATION_INTEGRATION_RESULT_KEY } from './AuthenticationIntegrationExecutionResult';

export {
  validateAuthenticationIntegrationContext,
  createAuthenticationIntegrationSkippedStageExecution,
  createAuthenticationIntegrationStageExecution,
  buildAuthenticationIntegrationExecutionTelemetry,
  buildAuthenticationIntegrationPipelineExecutionSummary,
  createEmptyAuthenticationIntegrationResult,
  createAuthenticationIntegrationResult,
  buildAuthenticationIntegrationE2ESummaryItems
} from './helpers';

export type { AuthenticationIntegrationPipelineRunnerDependencies } from './AuthenticationIntegrationPipelineRunner';

export {
  AuthenticationIntegrationPipelineRunner,
  createAuthenticationIntegrationPipelineRunner
} from './AuthenticationIntegrationPipelineRunner';

export {
  AuthenticationIntegrationFacade,
  createAuthenticationIntegrationFacade
} from './AuthenticationIntegrationFacade';
