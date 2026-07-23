/**
 * İSTEBUL Identity — Tenant End-to-End Runtime (EPIC-302E).
 *
 * Architecture Freeze — 302A–302D implementasyonları değiştirilmez.
 */

export type {
  TenantIntegrationPipelineStage,
  TenantIntegrationStageOutcome
} from './stages';

export {
  TENANT_INTEGRATION_PIPELINE_STAGES,
  TENANT_INTEGRATION_SKIP_ON_VALIDATION_FAILURE,
  TENANT_INTEGRATION_STAGE_LABELS
} from './stages';

export type {
  TenantIntegrationPipelineBag,
  TenantIntegrationOperation,
  TenantIntegrationExecutionContext
} from './TenantIntegrationExecutionContext';

export { createTenantIntegrationExecutionContext } from './TenantIntegrationExecutionContext';

export type {
  TenantIntegrationSummaryItem,
  TenantIntegrationValidationIssue,
  TenantIntegrationSummary,
  TenantIntegrationResultTelemetry,
  TenantIntegrationResult,
  TenantIntegrationStageExecution,
  TenantIntegrationPipelineExecutionSummary,
  TenantIntegrationExecutionTelemetry,
  TenantIntegrationExecutionResult
} from './TenantIntegrationExecutionResult';

export { PIPELINE_BAG_TENANT_INTEGRATION_RESULT_KEY } from './TenantIntegrationExecutionResult';

export {
  validateTenantIntegrationContext,
  createTenantIntegrationSkippedStageExecution,
  createTenantIntegrationStageExecution,
  buildTenantIntegrationExecutionTelemetry,
  buildTenantIntegrationPipelineExecutionSummary,
  createEmptyTenantIntegrationResult,
  createTenantIntegrationResult,
  buildTenantIntegrationE2ESummaryItems
} from './helpers';

export type { TenantIntegrationPipelineRunnerDependencies } from './TenantIntegrationPipelineRunner';

export {
  TenantIntegrationPipelineRunner,
  createTenantIntegrationPipelineRunner
} from './TenantIntegrationPipelineRunner';

export {
  TenantIntegrationFacade,
  createTenantIntegrationFacade
} from './TenantIntegrationFacade';
