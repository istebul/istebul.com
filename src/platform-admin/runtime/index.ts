/**
 * Platform Admin Runtime — dışa aktarımlar (PR-201A).
 */

export type {
  PlatformAdminModuleId,
  PlatformAdminModuleCategory,
  PlatformAdminModuleStatus,
  PlatformAdminModule,
  PlatformAdminModuleProjection
} from './PlatformAdminModule';
export { toModuleProjection } from './PlatformAdminModule';

export type { PlatformAdminContext } from './PlatformAdminContext';
export { createPlatformAdminContext } from './PlatformAdminContext';

export type {
  PlatformAdminValidationIssue,
  PlatformAdminSummaryItem,
  PlatformAdminExecutionSummary,
  PlatformAdminTelemetry,
  PlatformAdminResult
} from './PlatformAdminResult';
export { PIPELINE_BAG_PLATFORM_ADMIN_RESULT_KEY } from './PlatformAdminResult';

export {
  PlatformAdminRegistryRuntime,
  createPlatformAdminRegistryRuntime
} from './PlatformAdminRegistryRuntime';

export {
  PlatformAdminRuntime,
  createPlatformAdminRuntime
} from './PlatformAdminRuntime';

export {
  BUILTIN_PLATFORM_ADMIN_MODULES,
  BUILTIN_PLATFORM_ADMIN_MODULE_COUNT,
  getBuiltinPlatformAdminModule
} from './builtinModules';

export {
  validatePlatformContext,
  resolveRequestedModules
} from './platformValidation';

export { buildPlatformSummaryItems } from './platformSummary';

export { nowMs, startStageTimer, endStageTimer } from './timing';
export type { StageTimer } from './timing';
