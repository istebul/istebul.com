/**
 * Identity Runtime — dışa aktarımlar (PR-203A).
 */

export type {
  IdentityStatus,
  IdentityRoleScope,
  IdentityRoleId,
  IdentityUser,
  IdentityTenant,
  IdentityRole,
  IdentityPermission,
  IdentityClaims,
  SessionReference,
  Identity,
  IdentityModule,
  IdentityProjection
} from './IdentityModule';
export { toIdentityProjection } from './IdentityModule';

export type { IdentityContext } from './IdentityContext';
export { createIdentityContext } from './IdentityContext';

export type {
  IdentityValidationIssue,
  IdentitySummaryItem,
  IdentityExecutionSummary,
  IdentityTelemetry,
  IdentityResult
} from './IdentityResult';
export { PIPELINE_BAG_IDENTITY_RESULT_KEY } from './IdentityResult';

export {
  IdentityRegistry,
  IdentityRegistryRuntime,
  createIdentityRegistry,
  createIdentityRegistryRuntime
} from './IdentityRegistry';

export {
  IdentityRuntime,
  createIdentityRuntime
} from './IdentityRuntime';

export {
  BUILTIN_IDENTITY_MODULES,
  BUILTIN_IDENTITY_MODULE_COUNT,
  getBuiltinIdentityModule
} from './builtinModules';

export {
  validateIdentityContext,
  resolveRequestedIdentities
} from './identityValidation';

export {
  buildIdentitySummary,
  buildIdentitySummaryItems
} from './identitySummary';

export { nowMs, startStageTimer, endStageTimer } from './timing';
export type { StageTimer } from './timing';
