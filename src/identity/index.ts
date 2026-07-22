/**
 * İSTEBUL Identity — foundation through Identity & Access E2E Runtime.
 *
 * Architecture Freeze v1.0 — additive katmanlar.
 * PR-203A / PR-203B / PR-203C / PR-203D / PR-203E runtime dosyaları
 * değiştirilmez.
 * Yalnızca projeksiyon; Login / Logout / JWT / Refresh Token / Cookie /
 * Middleware / Policy Engine / Supabase RLS / OAuth / OIDC / API / DB yok.
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

/** Authorization (RBAC) Runtime — PR-203D */
export type {
  AuthorizationDecisionOutcome,
  AuthorizationRoleScope,
  AuthorizationAction,
  AuthorizationResource,
  AuthorizationPermission,
  AuthorizationRole,
  AuthorizationPolicy,
  AuthorizationDecision,
  AuthorizationModule,
  AuthorizationProjection,
  AuthorizationContext,
  AuthorizationValidationIssue,
  AuthorizationSummaryItem,
  AuthorizationSummary,
  AuthorizationTelemetry,
  AuthorizationResult
} from './authorization/index';

export {
  toAuthorizationProjection,
  createAuthorizationContext,
  PIPELINE_BAG_AUTHORIZATION_RESULT_KEY,
  AuthorizationRegistry,
  AuthorizationRegistryRuntime,
  createAuthorizationRegistry,
  createAuthorizationRegistryRuntime,
  AuthorizationRuntime,
  createAuthorizationRuntime,
  BUILTIN_AUTHORIZATION_MODULES,
  BUILTIN_AUTHORIZATION_MODULE_COUNT,
  getBuiltinAuthorizationModule,
  validateAuthorizationContext,
  resolveAuthorizationIdentityProjections,
  resolveAuthorizationAuthenticationProjections,
  resolveAuthorizationSessionProjections,
  resolveRequestedAuthorizations,
  buildAuthorizationSummary,
  buildAuthorizationSummaryItems
} from './authorization/index';

/** Tenant Isolation Runtime — PR-203E */
export type {
  TenantIsolationDecisionOutcome,
  TenantIsolationScopeLevel,
  TenantIdentityRef,
  TenantBoundary,
  TenantMembership,
  TenantIsolationScope,
  TenantIsolationRule,
  TenantAccessScope,
  TenantIsolationDecision,
  TenantIsolationModule,
  TenantIsolationProjection,
  TenantIsolationContext,
  TenantIsolationValidationIssue,
  TenantIsolationSummaryItem,
  TenantIsolationSummary,
  TenantIsolationTelemetry,
  TenantIsolationResult
} from './tenant-isolation/index';

export {
  toTenantIsolationProjection,
  createTenantIsolationContext,
  PIPELINE_BAG_TENANT_ISOLATION_RESULT_KEY,
  TenantIsolationRegistry,
  TenantIsolationRegistryRuntime,
  createTenantIsolationRegistry,
  createTenantIsolationRegistryRuntime,
  TenantIsolationRuntime,
  createTenantIsolationRuntime,
  BUILTIN_TENANT_ISOLATION_MODULES,
  BUILTIN_TENANT_ISOLATION_MODULE_COUNT,
  getBuiltinTenantIsolationModule,
  validateTenantIsolationContext,
  resolveTenantIsolationIdentityProjections,
  resolveTenantIsolationAuthenticationProjections,
  resolveTenantIsolationSessionProjections,
  resolveTenantIsolationAuthorizationProjections,
  resolveRequestedIsolations,
  buildTenantIsolationSummary,
  buildTenantIsolationSummaryItems
} from './tenant-isolation/index';

/** Identity & Access End-to-End Runtime — PR-203F */
export type {
  IdentityAccessPipelineStage,
  IdentityAccessStageOutcome,
  IdentityAccessPipelineBag,
  IdentityAccessExecutionContext,
  IdentityAccessSummaryItem,
  IdentityAccessValidationIssue,
  IdentityAccessSummary,
  IdentityAccessResultTelemetry,
  IdentityAccessResult,
  IdentityAccessStageExecution,
  IdentityAccessPipelineExecutionSummary,
  IdentityAccessExecutionTelemetry,
  IdentityAccessExecutionResult,
  IdentityAccessPipelineRunnerDependencies
} from './integration/index';

export {
  IDENTITY_ACCESS_PIPELINE_STAGES,
  IDENTITY_ACCESS_SKIP_ON_VALIDATION_FAILURE,
  IDENTITY_ACCESS_STAGE_LABELS,
  createIdentityAccessExecutionContext,
  PIPELINE_BAG_IDENTITY_ACCESS_RESULT_KEY,
  validateIdentityAccessContext,
  createSkippedStageExecution,
  createStageExecution,
  buildIdentityAccessExecutionTelemetry,
  createEmptyIdentityAccessResult,
  createIdentityAccessResult,
  buildE2ESummaryItems,
  IdentityAccessPipelineRunner,
  createIdentityAccessPipelineRunner,
  IdentityAccessRuntimeFacade,
  createIdentityAccessRuntimeFacade
} from './integration/index';
