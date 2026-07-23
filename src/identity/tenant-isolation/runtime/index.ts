/**
 * Tenant Isolation Runtime — dışa aktarımlar (PR-203E).
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
  TenantIsolationProjection
} from './TenantIsolationModule';
export { toTenantIsolationProjection } from './TenantIsolationModule';

export type { TenantIsolationContext } from './TenantIsolationContext';
export { createTenantIsolationContext } from './TenantIsolationContext';

export type {
  TenantIsolationValidationIssue,
  TenantIsolationSummaryItem,
  TenantIsolationSummary,
  TenantIsolationTelemetry,
  TenantIsolationResult
} from './TenantIsolationResult';
export { PIPELINE_BAG_TENANT_ISOLATION_RESULT_KEY } from './TenantIsolationResult';

export {
  TenantIsolationRegistry,
  TenantIsolationRegistryRuntime,
  createTenantIsolationRegistry,
  createTenantIsolationRegistryRuntime
} from './TenantIsolationRegistry';

export {
  TenantIsolationRuntime,
  createTenantIsolationRuntime
} from './TenantIsolationRuntime';

export {
  BUILTIN_TENANT_ISOLATION_MODULES,
  BUILTIN_TENANT_ISOLATION_MODULE_COUNT,
  getBuiltinTenantIsolationModule
} from './builtinModules';

export {
  validateTenantIsolationContext,
  resolveTenantIsolationIdentityProjections,
  resolveTenantIsolationAuthenticationProjections,
  resolveTenantIsolationSessionProjections,
  resolveTenantIsolationAuthorizationProjections,
  resolveRequestedIsolations
} from './tenantIsolationValidation';

export {
  buildTenantIsolationSummary,
  buildTenantIsolationSummaryItems
} from './tenantIsolationSummary';
