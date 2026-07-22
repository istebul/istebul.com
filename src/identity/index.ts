/**
 * İSTEBUL Identity — foundation through Authentication Runtime.
 *
 * Architecture Freeze v1.0 — additive katmanlar.
 * PR-203A foundation runtime dosyaları değiştirilmez.
 * Yalnızca projeksiyon; Login / Logout / Supabase Auth / JWT / OAuth /
 * OIDC / API / DB yok.
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

/** Authentication Runtime — PR-203B */
export type {
  AuthenticationStatus,
  AuthenticationMethod,
  Principal,
  CredentialReference,
  AuthenticationState,
  AuthenticationModule,
  AuthenticationProjection,
  AuthenticationContext,
  AuthenticationValidationIssue,
  AuthenticationSummaryItem,
  AuthenticationSummary,
  AuthenticationTelemetry,
  AuthenticationResult
} from './authentication/index';

export {
  toAuthenticationProjection,
  createAuthenticationContext,
  PIPELINE_BAG_AUTHENTICATION_RESULT_KEY,
  AuthenticationRegistry,
  AuthenticationRegistryRuntime,
  createAuthenticationRegistry,
  createAuthenticationRegistryRuntime,
  AuthenticationRuntime,
  createAuthenticationRuntime,
  BUILTIN_AUTHENTICATION_MODULES,
  BUILTIN_AUTHENTICATION_MODULE_COUNT,
  getBuiltinAuthenticationModule,
  validateAuthenticationContext,
  resolveIdentityProjections,
  resolveRequestedAuthentications,
  buildAuthenticationSummary,
  buildAuthenticationSummaryItems
} from './authentication/index';
