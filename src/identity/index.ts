/**
 * İSTEBUL Identity — foundation through Session Management Runtime.
 *
 * Architecture Freeze v1.0 — additive katmanlar.
 * PR-203A / PR-203B runtime dosyaları değiştirilmez.
 * Yalnızca projeksiyon; JWT / Refresh Token / Cookie / Supabase Auth /
 * OAuth / OIDC / API / DB yok.
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

/** Session Management Runtime — PR-203C */
export type {
  SessionState,
  SessionLifetime,
  SessionExpiration,
  RenewalReference,
  SessionActivity,
  DeviceReference,
  Session,
  SessionModule,
  SessionProjection,
  SessionContext,
  SessionValidationIssue,
  SessionSummaryItem,
  SessionSummary,
  SessionTelemetry,
  SessionResult
} from './session/index';

export {
  toSessionProjection,
  createSessionContext,
  PIPELINE_BAG_SESSION_RESULT_KEY,
  SessionRegistry,
  SessionRegistryRuntime,
  createSessionRegistry,
  createSessionRegistryRuntime,
  SessionRuntime,
  createSessionRuntime,
  BUILTIN_SESSION_MODULES,
  BUILTIN_SESSION_MODULE_COUNT,
  getBuiltinSessionModule,
  validateSessionContext,
  resolveSessionIdentityProjections,
  resolveSessionAuthenticationProjections,
  resolveRequestedSessions,
  buildSessionSummary,
  buildSessionSummaryItems
} from './session/index';
