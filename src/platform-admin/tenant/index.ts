/**
 * İSTEBUL Platform Admin — Tenant Management (PR-201B).
 *
 * Architecture Freeze v1.0 — additive runtime.
 * Platform Foundation (PR-201A) değiştirilmez.
 * Yalnızca projeksiyon; CRUD, API, veritabanı yok.
 */

export type {
  TenantStatus,
  TenantSubscriptionStatus,
  TenantPlanId,
  TenantLimits,
  TenantIdentity,
  TenantOrganization,
  TenantDefinition,
  TenantProjection,
  TenantManagementContext,
  TenantSummary,
  TenantSummaryItem,
  TenantManagementValidationIssue,
  TenantManagementTelemetry,
  TenantManagementResult
} from './runtime/index';

export {
  toTenantProjection,
  createTenantManagementContext,
  buildTenantSummary,
  buildTenantSummaryItems,
  PIPELINE_BAG_TENANT_MANAGEMENT_RESULT_KEY,
  TenantRegistryRuntime,
  createTenantRegistryRuntime,
  TenantManagementRuntime,
  createTenantManagementRuntime,
  BUILTIN_TENANT_DEFINITIONS,
  BUILTIN_TENANT_DEFINITION_COUNT,
  getBuiltinTenantDefinition,
  validateTenantManagementContext,
  resolveRequestedTenants
} from './runtime/index';
