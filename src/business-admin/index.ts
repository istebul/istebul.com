/**
 * İSTEBUL Business Admin — foundation runtime (PR-202A).
 *
 * Architecture Freeze v1.0 — additive katman.
 * Core Runtime, Platform Admin ve Business Runtime Engine'lerine dokunulmaz.
 * Yalnızca projeksiyon; CRUD / API / DB / Auth yok.
 */

export type {
  BusinessAdminModuleId,
  BusinessAdminModuleCategory,
  BusinessAdminModuleStatus,
  BusinessAdminModule,
  BusinessAdminModuleProjection,
  BusinessAdminContext,
  BusinessAdminValidationIssue,
  BusinessAdminSummaryItem,
  BusinessAdminExecutionSummary,
  BusinessAdminTelemetry,
  BusinessAdminResult,
  StageTimer
} from './runtime/index';

export {
  toModuleProjection,
  createBusinessAdminContext,
  PIPELINE_BAG_BUSINESS_ADMIN_RESULT_KEY,
  BusinessAdminRegistryRuntime,
  createBusinessAdminRegistryRuntime,
  BusinessAdminRuntime,
  createBusinessAdminRuntime,
  BUILTIN_BUSINESS_ADMIN_MODULES,
  BUILTIN_BUSINESS_ADMIN_MODULE_COUNT,
  getBuiltinBusinessAdminModule,
  validateBusinessAdminContext,
  resolveRequestedModules,
  buildBusinessAdminSummaryItems,
  nowMs,
  startStageTimer,
  endStageTimer
} from './runtime/index';
