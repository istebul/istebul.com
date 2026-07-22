/**
 * İSTEBUL Identity — Supabase Tenant Provider (EPIC-302B).
 *
 * Architecture Freeze — Tenant Isolation Runtime / Identity Runtime /
 * TenantAdapter interface değiştirilmez.
 */

export type { TenantErrorCode } from './TenantError';

export {
  TenantError,
  TenantNotFound,
  MembershipNotFound,
  AccessDenied,
  ProviderUnavailable,
  createTenantErrorByCode,
  toTenantError
} from './TenantError';

export {
  SUPABASE_TENANT_PROVIDER_ID,
  SUPABASE_TENANT_PROVIDER_NAME,
  SUPABASE_TENANT_PROVIDER_DESCRIPTION
} from './constants';

export type { SupabaseTenantContext } from './SupabaseTenantContext';

export {
  SUPABASE_TENANT_CONTEXT_BAG_KEY,
  createSupabaseTenantContext,
  toTenantProviderContext,
  fromTenantProviderContext,
  validateSupabaseResolveTenantKeys,
  validateSupabaseTenantId,
  validateSupabaseMembershipLookup,
  validateSupabaseAccessKeys
} from './SupabaseTenantContext';

export type {
  SupabaseTenantRecord,
  SupabaseMembershipRecord,
  SupabaseTenantErrorInfo,
  SupabaseTenantResult,
  CreateSupabaseTenantResultInput
} from './SupabaseTenantResult';

export {
  createSupabaseTenantResult,
  toTenantIdentityRefFromSupabaseTenant,
  toTenantMembershipsFromSupabase,
  statusFromTenantErrorCode,
  toTenantProviderResult
} from './SupabaseTenantResult';

export type {
  SupabaseTenantRowLike,
  SupabaseMembershipRowLike,
  SupabaseAccessCheckLike,
  SupabaseTenantClientErrorLike,
  SupabaseTenantResponseLike,
  SupabaseTenantClientLike
} from './SupabaseTenantClient';

export { assertSupabaseTenantClient } from './SupabaseTenantClient';

export type { SupabaseTenantErrorLike } from './supabaseTenantErrorMapping';

export {
  mapSupabaseTenantErrorMessageToCode,
  mapSupabaseTenantError,
  mapUnknownTenantProviderError
} from './supabaseTenantErrorMapping';

export type { SupabaseTenantProviderDependencies } from './SupabaseTenantProvider';

export {
  SupabaseTenantProvider,
  createSupabaseTenantProvider
} from './SupabaseTenantProvider';

export {
  createSupabaseTenantProviderRegistration,
  registerSupabaseTenantProvider,
  createTenantAdapterWithSupabaseProvider,
  attachSupabaseTenantProvider
} from './registerSupabaseTenantProvider';
