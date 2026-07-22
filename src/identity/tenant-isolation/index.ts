/**
 * İSTEBUL Identity — Tenant Isolation Runtime (PR-203E).
 *
 * Architecture Freeze v1.0 — additive runtime.
 * Identity / Authentication / Session / Authorization (PR-203A–D)
 * değiştirilmez.
 * Yalnızca projeksiyon; Supabase RLS / Database / API / Middleware /
 * JWT Claims yok.
 */

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
} from './runtime/index';

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
} from './runtime/index';

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
} from './adapters/index';

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
} from './adapters/index';

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
} from './providers/index';

export {
  TenantError,
  TenantNotFound,
  MembershipNotFound,
  AccessDenied,
  ProviderUnavailable,
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
} from './providers/index';

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
} from './bridge/index';

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
} from './bridge/index';
