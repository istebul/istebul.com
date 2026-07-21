/**
 * İSTEBUL Platform Admin — foundation runtime (PR-201A).
 *
 * Architecture Freeze v1.0 — additive foundation katmanı.
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
