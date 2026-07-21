/**
 * İSTEBUL Platform Admin — foundation + tenant management.
 *
 * Architecture Freeze v1.0 — additive katmanlar.
 * PR-201A foundation runtime dosyaları değiştirilmez.
 * Yalnızca projeksiyon; CRUD, API, veritabanı yok.
 */

export type {
  PlatformAdminModuleId,
  PlatformAdminModuleCategory,
  PlatformAdminModuleStatus,
  PlatformAdminModule,
  PlatformAdminModuleProjection,
  PlatformAdminContext,
  PlatformAdminValidationIssue,
  PlatformAdminSummaryItem,
  PlatformAdminExecutionSummary,
  PlatformAdminTelemetry,
  PlatformAdminResult,
  StageTimer
} from './runtime/index';

export {
  toModuleProjection,
  createPlatformAdminContext,
  PIPELINE_BAG_PLATFORM_ADMIN_RESULT_KEY,
  PlatformAdminRegistryRuntime,
  createPlatformAdminRegistryRuntime,
  PlatformAdminRuntime,
  createPlatformAdminRuntime,
  BUILTIN_PLATFORM_ADMIN_MODULES,
  BUILTIN_PLATFORM_ADMIN_MODULE_COUNT,
  getBuiltinPlatformAdminModule,
  validatePlatformContext,
  resolveRequestedModules,
  buildPlatformSummaryItems,
  nowMs,
  startStageTimer,
  endStageTimer
} from './runtime/index';

/** Tenant Management Runtime — PR-201B */
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
} from './tenant/index';

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
} from './tenant/index';
