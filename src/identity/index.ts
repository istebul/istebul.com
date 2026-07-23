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

/** Authentication Adapter Foundation — EPIC-301A */
export type {
  AuthenticationProviderOperation,
  AuthenticationProviderContext,
  AuthenticationProviderValidationIssue,
  AuthenticationProviderSummaryItem,
  AuthenticationProviderTelemetry,
  AuthenticationProviderResult,
  CreateAuthenticationProviderResultInput,
  AuthenticationProviderRegistration,
  AuthenticationProviderOperationResult,
  AuthenticationProvider
} from './authentication/index';

export {
  createAuthenticationProviderContext,
  createAuthenticationProviderResult,
  createAuthenticationProviderFailure,
  createAuthenticationProviderSuccess,
  AuthenticationProviderRegistry,
  AuthenticationProviderRegistryRuntime,
  createAuthenticationProviderRegistry,
  createAuthenticationProviderRegistryRuntime,
  BUILTIN_AUTHENTICATION_PROVIDER_REGISTRATIONS,
  BUILTIN_AUTHENTICATION_PROVIDER_COUNT,
  getBuiltinAuthenticationProviderRegistration,
  validateAuthenticationProviderContext,
  resolveAuthenticationProvider,
  resolveAuthenticationProviderRegistration,
  hasAuthenticationProviderValidationErrors,
  AuthenticationAdapter,
  createAuthenticationAdapter
} from './authentication/index';

/** Supabase Authentication Provider — EPIC-301B */
export type {
  AuthenticationErrorCode,
  SupabaseAuthenticationContext,
  SupabaseAuthUser,
  SupabaseAuthSession,
  SupabaseAuthenticationErrorInfo,
  SupabaseAuthenticationResult,
  CreateSupabaseAuthenticationResultInput,
  SupabaseAuthUserLike,
  SupabaseAuthSessionLike,
  SupabaseClientAuthErrorLike,
  SupabaseAuthResponseLike,
  SupabaseAuthClientLike,
  SupabaseAuthErrorLike,
  SupabaseAuthenticationProviderDependencies
} from './authentication/index';

export {
  AuthenticationError,
  SessionExpired,
  InvalidCredentials,
  ProviderUnavailable,
  createAuthenticationErrorByCode,
  toAuthenticationError,
  SUPABASE_AUTHENTICATION_PROVIDER_ID,
  SUPABASE_AUTHENTICATION_PROVIDER_NAME,
  SUPABASE_AUTHENTICATION_PROVIDER_DESCRIPTION,
  SUPABASE_CONTEXT_BAG_KEY,
  createSupabaseAuthenticationContext,
  toAuthenticationProviderContext,
  fromAuthenticationProviderContext,
  validateSupabaseAuthenticateCredentials,
  createSupabaseAuthenticationResult,
  toPrincipalFromSupabaseUser,
  toCredentialReferenceFromSupabaseSession,
  toAuthenticationProviderResult,
  assertSupabaseAuthClient,
  mapSupabaseErrorMessageToCode,
  mapSupabaseAuthError,
  mapUnknownProviderError,
  SupabaseAuthenticationProvider,
  createSupabaseAuthenticationProvider,
  createSupabaseAuthenticationProviderRegistration,
  registerSupabaseAuthenticationProvider,
  createAuthenticationAdapterWithSupabaseProvider,
  attachSupabaseAuthenticationProvider
} from './authentication/index';

/** Authentication Session Bridge — EPIC-301C */
export type {
  AuthenticationSessionBridgeOperation,
  AuthenticationSessionBridgeContext,
  AuthenticationSessionBridgeValidationIssue,
  AuthenticationSessionBridgeSummaryItem,
  AuthenticationSessionBridgeTelemetry,
  AuthenticationSessionBridgeResult,
  CreateAuthenticationSessionBridgeResultInput,
  AuthenticationSessionBridgeBinding,
  MapAuthenticationToSessionOptions,
  AuthenticationSessionBridgeDependencies
} from './authentication/index';

export {
  createAuthenticationSessionBridgeContext,
  resolveBridgeProviderContext,
  mapBridgeOperationToProviderOperation,
  createAuthenticationSessionBridgeResult,
  PIPELINE_BAG_AUTHENTICATION_SESSION_BRIDGE_RESULT_KEY,
  AuthenticationSessionBridgeRegistry,
  AuthenticationSessionBridgeRegistryRuntime,
  createAuthenticationSessionBridgeRegistry,
  createAuthenticationSessionBridgeRegistryRuntime,
  mapAuthenticationStatusToSessionState,
  resolveSessionIdentifiers,
  mapAuthenticationProviderResultToSessionModule,
  createBridgeBindingFromSessionModule,
  mapProviderIssuesToBridgeIssues,
  projectMappedSessionModule,
  AuthenticationSessionBridge,
  createAuthenticationSessionBridge
} from './authentication/index';

/** Identity Bridge — EPIC-301D */
export type {
  IdentityBridgeOperation,
  IdentityBridgeContext,
  IdentityBridgeValidationIssue,
  IdentityBridgeSummaryItem,
  IdentityBridgeTelemetry,
  IdentityBridgeResult,
  CreateIdentityBridgeResultInput,
  IdentityBridgeBinding,
  MapToIdentityModuleOptions,
  IdentityBridgeDependencies
} from './bridge/index';

export {
  createIdentityBridgeContext,
  resolveIdentityBridgeProviderContext,
  mapIdentityBridgeOperationToSessionBridgeOperation,
  toAuthenticationSessionBridgeContextFromIdentity,
  createIdentityBridgeResult,
  PIPELINE_BAG_IDENTITY_BRIDGE_RESULT_KEY,
  IdentityBridgeRegistry,
  IdentityBridgeRegistryRuntime,
  createIdentityBridgeRegistry,
  createIdentityBridgeRegistryRuntime,
  mapAuthenticationStatusToIdentityStatus,
  resolveIdentityIdentifiers,
  mapIntegrationResultsToIdentityModule,
  createIdentityBridgeBindingFromModule,
  mapIntegrationIssuesToIdentityBridgeIssues,
  projectMappedIdentityModule,
  IdentityBridge,
  createIdentityBridge
} from './bridge/index';

/** Authentication End-to-End Runtime — EPIC-301E */
export type {
  AuthenticationIntegrationPipelineStage,
  AuthenticationIntegrationStageOutcome,
  AuthenticationIntegrationPipelineBag,
  AuthenticationIntegrationOperation,
  AuthenticationIntegrationExecutionContext,
  AuthenticationIntegrationSummaryItem,
  AuthenticationIntegrationValidationIssue,
  AuthenticationIntegrationSummary,
  AuthenticationIntegrationResultTelemetry,
  AuthenticationIntegrationResult,
  AuthenticationIntegrationStageExecution,
  AuthenticationIntegrationPipelineExecutionSummary,
  AuthenticationIntegrationExecutionTelemetry,
  AuthenticationIntegrationExecutionResult,
  AuthenticationIntegrationPipelineRunnerDependencies
} from './authentication/index';

export {
  AUTHENTICATION_INTEGRATION_PIPELINE_STAGES,
  AUTHENTICATION_INTEGRATION_SKIP_ON_VALIDATION_FAILURE,
  AUTHENTICATION_INTEGRATION_STAGE_LABELS,
  createAuthenticationIntegrationExecutionContext,
  PIPELINE_BAG_AUTHENTICATION_INTEGRATION_RESULT_KEY,
  validateAuthenticationIntegrationContext,
  createAuthenticationIntegrationSkippedStageExecution,
  createAuthenticationIntegrationStageExecution,
  buildAuthenticationIntegrationExecutionTelemetry,
  buildAuthenticationIntegrationPipelineExecutionSummary,
  createEmptyAuthenticationIntegrationResult,
  createAuthenticationIntegrationResult,
  buildAuthenticationIntegrationE2ESummaryItems,
  AuthenticationIntegrationPipelineRunner,
  createAuthenticationIntegrationPipelineRunner,
  AuthenticationIntegrationFacade,
  createAuthenticationIntegrationFacade
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

/** Tenant Adapter Foundation — EPIC-302A */
export type {
  TenantProviderOperation,
  TenantProviderContext,
  TenantProviderStatus,
  TenantProviderValidationIssue,
  TenantProviderSummaryItem,
  TenantProviderTelemetry,
  TenantProviderResult,
  CreateTenantProviderResultInput,
  TenantProviderKind,
  TenantProviderRegistration,
  TenantProviderOperationResult,
  TenantProvider
} from './tenant-isolation/index';

export {
  createTenantProviderContext,
  createTenantProviderResult,
  createTenantProviderFailure,
  createTenantProviderSuccess,
  TenantProviderRegistry,
  TenantProviderRegistryRuntime,
  createTenantProviderRegistry,
  createTenantProviderRegistryRuntime,
  BUILTIN_TENANT_PROVIDER_REGISTRATIONS,
  BUILTIN_TENANT_PROVIDER_COUNT,
  getBuiltinTenantProviderRegistration,
  validateTenantProviderContext,
  resolveTenantProvider,
  resolveTenantProviderRegistration,
  hasTenantProviderValidationErrors,
  TenantAdapter,
  createTenantAdapter
} from './tenant-isolation/index';

/** Supabase Tenant Provider — EPIC-302B */
export type {
  TenantErrorCode,
  SupabaseTenantContext,
  SupabaseTenantRecord,
  SupabaseMembershipRecord,
  SupabaseTenantErrorInfo,
  SupabaseTenantResult,
  CreateSupabaseTenantResultInput,
  SupabaseTenantRowLike,
  SupabaseMembershipRowLike,
  SupabaseAccessCheckLike,
  SupabaseTenantClientErrorLike,
  SupabaseTenantResponseLike,
  SupabaseTenantClientLike,
  SupabaseTenantErrorLike,
  SupabaseTenantProviderDependencies
} from './tenant-isolation/index';

export {
  TenantError,
  TenantNotFound,
  MembershipNotFound,
  AccessDenied,
  ProviderUnavailable as TenantProviderUnavailable,
  createTenantErrorByCode,
  toTenantError,
  SUPABASE_TENANT_PROVIDER_ID,
  SUPABASE_TENANT_PROVIDER_NAME,
  SUPABASE_TENANT_PROVIDER_DESCRIPTION,
  SUPABASE_TENANT_CONTEXT_BAG_KEY,
  createSupabaseTenantContext,
  toTenantProviderContext,
  fromTenantProviderContext,
  validateSupabaseResolveTenantKeys,
  validateSupabaseTenantId,
  validateSupabaseMembershipLookup,
  validateSupabaseAccessKeys,
  createSupabaseTenantResult,
  toTenantIdentityRefFromSupabaseTenant,
  toTenantMembershipsFromSupabase,
  statusFromTenantErrorCode,
  toTenantProviderResult,
  assertSupabaseTenantClient,
  mapSupabaseTenantErrorMessageToCode,
  mapSupabaseTenantError,
  mapUnknownTenantProviderError,
  SupabaseTenantProvider,
  createSupabaseTenantProvider,
  createSupabaseTenantProviderRegistration,
  registerSupabaseTenantProvider,
  createTenantAdapterWithSupabaseProvider,
  attachSupabaseTenantProvider
} from './tenant-isolation/index';

/** Tenant Session Bridge — EPIC-302C */
export type {
  TenantSessionBridgeOperation,
  TenantSessionBridgeContext,
  TenantSessionBridgeValidationIssue,
  TenantSessionBridgeSummaryItem,
  TenantSessionBridgeTelemetry,
  TenantSessionBridgeResult,
  CreateTenantSessionBridgeResultInput,
  TenantSessionBridgeBinding,
  MapTenantProviderToIsolationOptions,
  TenantSessionBridgeDependencies
} from './tenant-isolation/index';

export {
  createTenantSessionBridgeContext,
  resolveTenantBridgeProviderContext,
  mapTenantBridgeOperationToProviderOperation,
  createTenantSessionBridgeResult,
  PIPELINE_BAG_TENANT_SESSION_BRIDGE_RESULT_KEY,
  TenantSessionBridgeRegistry,
  TenantSessionBridgeRegistryRuntime,
  createTenantSessionBridgeRegistry,
  createTenantSessionBridgeRegistryRuntime,
  mapTenantProviderStatusToDecisionOutcome,
  resolveTenantBridgeIdentifiers,
  mapTenantProviderResultToIsolationModule,
  createBridgeBindingFromIsolationModule,
  mapTenantProviderIssuesToBridgeIssues,
  projectMappedIsolationModule,
  TenantSessionBridge,
  createTenantSessionBridge
} from './tenant-isolation/index';

/** Tenant End-to-End Runtime — EPIC-302E */
export type {
  TenantIntegrationPipelineStage,
  TenantIntegrationStageOutcome,
  TenantIntegrationPipelineBag,
  TenantIntegrationOperation,
  TenantIntegrationExecutionContext,
  TenantIntegrationSummaryItem,
  TenantIntegrationValidationIssue,
  TenantIntegrationSummary,
  TenantIntegrationResultTelemetry,
  TenantIntegrationResult,
  TenantIntegrationStageExecution,
  TenantIntegrationPipelineExecutionSummary,
  TenantIntegrationExecutionTelemetry,
  TenantIntegrationExecutionResult,
  TenantIntegrationPipelineRunnerDependencies
} from './tenant-isolation/index';

export {
  TENANT_INTEGRATION_PIPELINE_STAGES,
  TENANT_INTEGRATION_SKIP_ON_VALIDATION_FAILURE,
  TENANT_INTEGRATION_STAGE_LABELS,
  createTenantIntegrationExecutionContext,
  PIPELINE_BAG_TENANT_INTEGRATION_RESULT_KEY,
  validateTenantIntegrationContext,
  createTenantIntegrationSkippedStageExecution,
  createTenantIntegrationStageExecution,
  buildTenantIntegrationExecutionTelemetry,
  buildTenantIntegrationPipelineExecutionSummary,
  createEmptyTenantIntegrationResult,
  createTenantIntegrationResult,
  buildTenantIntegrationE2ESummaryItems,
  TenantIntegrationPipelineRunner,
  createTenantIntegrationPipelineRunner,
  TenantIntegrationFacade,
  createTenantIntegrationFacade
} from './tenant-isolation/index';

/** Business Context Bridge — EPIC-302D */
export type {
  BusinessRuntimeExecutionContext,
  BusinessRuntimeModuleProjection,
  BusinessRuntimeExecutionResult,
  BusinessRuntimePort,
  BusinessContextStatus,
  BusinessContextWorkspaceRef,
  BusinessContextModule,
  BusinessContextProjection,
  BusinessContextBridgeOperation,
  BusinessContextBridgeContext,
  BusinessContextBridgeValidationIssue,
  BusinessContextBridgeSummaryItem,
  BusinessContextBridgeTelemetry,
  BusinessContextBridgeResult,
  CreateBusinessContextBridgeResultInput,
  BusinessContextBridgeBinding,
  MapTenantToBusinessContextOptions,
  BusinessContextBridgeDependencies
} from './business-context/index';

export {
  toBusinessContextProjection,
  createBusinessContextBridgeContext,
  resolveTenantSessionBridgeContextFromBusiness,
  mapBusinessBridgeOperationToTenantBridgeOperation,
  createBusinessContextBridgeResult,
  PIPELINE_BAG_BUSINESS_CONTEXT_BRIDGE_RESULT_KEY,
  BusinessContextBridgeRegistry,
  BusinessContextBridgeRegistryRuntime,
  createBusinessContextBridgeRegistry,
  createBusinessContextBridgeRegistryRuntime,
  mapToBusinessContextStatus,
  resolveBusinessContextIdentifiers,
  mapBusinessModulesToWorkspaces,
  mapTenantBridgeResultToBusinessContextModule,
  createBusinessContextBridgeBindingFromModule,
  mapUpstreamIssuesToBusinessContextBridgeIssues,
  projectMappedBusinessContextModule,
  BusinessContextBridge,
  createBusinessContextBridge
} from './business-context/index';

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
