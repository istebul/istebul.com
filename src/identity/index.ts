/**
 * İSTEBUL Identity — foundation (PR-203A).
 *
 * Architecture Freeze v1.0 — additive katman.
 * Core Runtime, Platform Admin ve Business Admin değiştirilmez.
 * Yalnızca projeksiyon; Login / Logout / Supabase Auth / JWT / API / DB yok.
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
  IdentityProjection,
  IdentityContext,
  IdentityValidationIssue,
  IdentitySummaryItem,
  IdentityExecutionSummary,
  IdentityTelemetry,
  IdentityResult,
  StageTimer
} from './runtime/index';

export {
  toIdentityProjection,
  createIdentityContext,
  PIPELINE_BAG_IDENTITY_RESULT_KEY,
  IdentityRegistry,
  IdentityRegistryRuntime,
  createIdentityRegistry,
  createIdentityRegistryRuntime,
  IdentityRuntime,
  createIdentityRuntime,
  BUILTIN_IDENTITY_MODULES,
  BUILTIN_IDENTITY_MODULE_COUNT,
  getBuiltinIdentityModule,
  validateIdentityContext,
  resolveRequestedIdentities,
  buildIdentitySummary,
  buildIdentitySummaryItems,
  nowMs,
  startStageTimer,
  endStageTimer
} from './runtime/index';
