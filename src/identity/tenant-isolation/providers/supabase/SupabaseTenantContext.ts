/**
 * İSTEBUL Identity — SupabaseTenantContext (EPIC-302B).
 *
 * Provider-özel girdi bağlamı. Adapter contract'a bag üzerinden taşınır.
 * Business Context / RLS / Middleware / API / Dashboard yok.
 */

import type { TenantProviderContext } from '../../adapters/TenantProviderContext';
import { createTenantProviderContext } from '../../adapters/TenantProviderContext';
import type { TenantProviderKind } from '../../adapters/TenantProvider';
import { SUPABASE_TENANT_PROVIDER_ID } from './constants';

/**
 * Supabase tenant girdi bağlamı.
 */
export interface SupabaseTenantContext {
  /** Dil */
  locale: 'tr' | 'en';
  /** Tenant kimliği */
  tenantId?: string;
  /** Tenant slug */
  tenantSlug?: string;
  /** Domain (çözümleme) */
  domain?: string;
  /** Header değeri (çözümleme) */
  headerValue?: string;
  /** Claim değeri (çözümleme) */
  claimValue?: string;
  /** Identity kimliği */
  identityId?: string;
  /** Üyelik kimliği */
  membershipId?: string;
  /** Oturum kimliği */
  sessionId?: string;
  /** Aktör kimliği */
  actorId?: string;
  /** Kaynak kimliği (erişim doğrulama) */
  resourceId?: string;
  /** Ek bag */
  bag?: Record<string, unknown>;
}

export const SUPABASE_TENANT_CONTEXT_BAG_KEY = 'supabaseTenant' as const;

/**
 * SupabaseTenantContext üretir — locale varsayılanı `tr`.
 */
export function createSupabaseTenantContext(
  partial: Omit<SupabaseTenantContext, 'locale'> & {
    locale?: 'tr' | 'en';
  } = {}
): SupabaseTenantContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? 'tr'
  };
}

/**
 * Provider context'i adapter TenantProviderContext'e dönüştürür.
 */
export function toTenantProviderContext(
  context: SupabaseTenantContext,
  providerId: string = SUPABASE_TENANT_PROVIDER_ID,
  kind: TenantProviderKind = 'registry'
): TenantProviderContext {
  return createTenantProviderContext({
    locale: context.locale,
    providerId,
    kind,
    tenantId: context.tenantId,
    tenantSlug: context.tenantSlug,
    identityId: context.identityId,
    membershipId: context.membershipId,
    sessionId: context.sessionId,
    actorId: context.actorId,
    resourceId: context.resourceId,
    bag: {
      ...(context.bag ?? {}),
      [SUPABASE_TENANT_CONTEXT_BAG_KEY]: {
        domain: context.domain,
        headerValue: context.headerValue,
        claimValue: context.claimValue
      }
    }
  });
}

/**
 * Adapter context bag'inden SupabaseTenantContext çıkarır.
 */
export function fromTenantProviderContext(
  context: TenantProviderContext
): SupabaseTenantContext {
  const bagPayload = context.bag?.[SUPABASE_TENANT_CONTEXT_BAG_KEY];
  const payload =
    bagPayload && typeof bagPayload === 'object'
      ? (bagPayload as Record<string, unknown>)
      : {};

  return createSupabaseTenantContext({
    locale: context.locale,
    tenantId: context.tenantId,
    tenantSlug: context.tenantSlug,
    identityId: context.identityId,
    membershipId: context.membershipId,
    sessionId: context.sessionId,
    actorId: context.actorId,
    resourceId: context.resourceId,
    domain: typeof payload.domain === 'string' ? payload.domain : undefined,
    headerValue:
      typeof payload.headerValue === 'string'
        ? payload.headerValue
        : undefined,
    claimValue:
      typeof payload.claimValue === 'string' ? payload.claimValue : undefined,
    bag: context.bag
  });
}

/**
 * resolveTenant için en az bir çözümleme anahtarı zorunluluğunu doğrular.
 */
export function validateSupabaseResolveTenantKeys(
  context: SupabaseTenantContext
): string | undefined {
  if (
    context.tenantId ||
    context.tenantSlug ||
    context.domain ||
    context.headerValue ||
    context.claimValue ||
    context.membershipId
  ) {
    return undefined;
  }
  return 'tenantId, tenantSlug, domain, headerValue, claimValue veya membershipId zorunludur.';
}

/**
 * getTenant / refreshTenant için tenantId zorunluluğunu doğrular.
 */
export function validateSupabaseTenantId(
  context: SupabaseTenantContext
): string | undefined {
  if (!context.tenantId || typeof context.tenantId !== 'string') {
    return 'tenantId zorunludur.';
  }
  return undefined;
}

/**
 * listMemberships için identityId veya tenantId zorunluluğunu doğrular.
 */
export function validateSupabaseMembershipLookup(
  context: SupabaseTenantContext
): string | undefined {
  if (context.identityId || context.tenantId || context.membershipId) {
    return undefined;
  }
  return 'identityId, tenantId veya membershipId zorunludur.';
}

/**
 * validateAccess için identityId + tenantId zorunluluğunu doğrular.
 */
export function validateSupabaseAccessKeys(
  context: SupabaseTenantContext
): string | undefined {
  if (!context.identityId || typeof context.identityId !== 'string') {
    return 'identityId zorunludur.';
  }
  if (!context.tenantId || typeof context.tenantId !== 'string') {
    return 'tenantId zorunludur.';
  }
  return undefined;
}
