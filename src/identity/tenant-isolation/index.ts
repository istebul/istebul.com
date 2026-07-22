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
