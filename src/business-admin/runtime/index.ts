/**
 * Business Admin Runtime — dışa aktarımlar (PR-202A).
 */

export type {
  BusinessAdminModuleId,
  BusinessAdminModuleCategory,
  BusinessAdminModuleStatus,
  BusinessAdminModule,
  BusinessAdminModuleProjection
} from './BusinessAdminModule';
export { toModuleProjection } from './BusinessAdminModule';

export type { BusinessAdminContext } from './BusinessAdminContext';
export { createBusinessAdminContext } from './BusinessAdminContext';

export type {
  BusinessAdminValidationIssue,
  BusinessAdminSummaryItem,
  BusinessAdminExecutionSummary,
  BusinessAdminTelemetry,
  BusinessAdminResult
} from './BusinessAdminResult';
export { PIPELINE_BAG_BUSINESS_ADMIN_RESULT_KEY } from './BusinessAdminResult';

export {
  BusinessAdminRegistryRuntime,
  createBusinessAdminRegistryRuntime
} from './BusinessAdminRegistryRuntime';

export {
  BusinessAdminRuntime,
  createBusinessAdminRuntime
} from './BusinessAdminRuntime';

export {
  BUILTIN_BUSINESS_ADMIN_MODULES,
  BUILTIN_BUSINESS_ADMIN_MODULE_COUNT,
  getBuiltinBusinessAdminModule
} from './builtinModules';

export {
  validateBusinessAdminContext,
  resolveRequestedModules
} from './businessValidation';

export { buildBusinessAdminSummaryItems } from './businessSummary';

export { nowMs, startStageTimer, endStageTimer } from './timing';
export type { StageTimer } from './timing';
