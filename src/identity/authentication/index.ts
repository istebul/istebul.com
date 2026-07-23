/**
 * İSTEBUL Identity — Authentication Runtime (PR-203B).
 *
 * Architecture Freeze v1.0 — additive runtime.
 * Identity Foundation (PR-203A) değiştirilmez.
 * Yalnızca projeksiyon; Login UI / Logout UI / JWT / Supabase Auth /
 * OAuth / OIDC / API / DB yok.
 */

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
} from './runtime/index';

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
} from './runtime/index';

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
} from './adapters/index';

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
} from './adapters/index';

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
} from './providers/index';

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
} from './providers/index';

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
} from './bridge/index';

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
} from './integration/index';

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
} from './integration/index';
