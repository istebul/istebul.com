/**
 * Tenant Management Runtime — dışa aktarımlar (PR-201B).
 */

export type {
  TenantStatus,
  TenantSubscriptionStatus,
  TenantPlanId,
  TenantLimits,
  TenantIdentity,
  TenantOrganization,
  TenantDefinition,
  TenantProjection
} from './Tenant';
export { toTenantProjection } from './Tenant';

export type { TenantManagementContext } from './TenantManagementContext';
export { createTenantManagementContext } from './TenantManagementContext';

export type {
  TenantSummary,
  TenantSummaryItem
} from './TenantSummary';
export {
  buildTenantSummary,
  buildTenantSummaryItems
} from './TenantSummary';

export type {
  TenantManagementValidationIssue,
  TenantManagementTelemetry,
  TenantManagementResult
} from './TenantManagementResult';
export { PIPELINE_BAG_TENANT_MANAGEMENT_RESULT_KEY } from './TenantManagementResult';

export {
  TenantRegistryRuntime,
  createTenantRegistryRuntime
} from './TenantRegistryRuntime';

export {
  TenantManagementRuntime,
  createTenantManagementRuntime
} from './TenantManagementRuntime';

export {
  BUILTIN_TENANT_DEFINITIONS,
  BUILTIN_TENANT_DEFINITION_COUNT,
  getBuiltinTenantDefinition
} from './builtinTenants';

export {
  validateTenantManagementContext,
  resolveRequestedTenants
} from './tenantValidation';
