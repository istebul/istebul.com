/**
 * İSTEBUL Identity — Tenant Adapter Foundation (EPIC-302A).
 *
 * Architecture Freeze — tenant-isolation/runtime değiştirilmez.
 * Identity Runtime / Authentication Integration değiştirilmez.
 * Provider implementasyonu yoktur; yalnızca adapter iskeleti.
 * Supabase / API / Database / RLS / Business Context yok.
 */

export type {
  TenantProviderOperation,
  TenantProviderContext
} from './TenantProviderContext';

export { createTenantProviderContext } from './TenantProviderContext';

export type {
  TenantProviderStatus,
  TenantProviderValidationIssue,
  TenantProviderSummaryItem,
  TenantProviderTelemetry,
  TenantProviderResult,
  CreateTenantProviderResultInput
} from './TenantProviderResult';

export {
  createTenantProviderResult,
  createTenantProviderFailure,
  createTenantProviderSuccess
} from './TenantProviderResult';

export type {
  TenantProviderKind,
  TenantProviderRegistration,
  TenantProviderOperationResult,
  TenantProvider
} from './TenantProvider';

export {
  TenantProviderRegistry,
  TenantProviderRegistryRuntime,
  createTenantProviderRegistry,
  createTenantProviderRegistryRuntime
} from './TenantProviderRegistry';

export {
  BUILTIN_TENANT_PROVIDER_REGISTRATIONS,
  BUILTIN_TENANT_PROVIDER_COUNT,
  getBuiltinTenantProviderRegistration
} from './builtinProviders';

export {
  validateTenantProviderContext,
  resolveTenantProvider,
  resolveTenantProviderRegistration,
  hasTenantProviderValidationErrors
} from './tenantAdapterValidation';

export { TenantAdapter, createTenantAdapter } from './TenantAdapter';
