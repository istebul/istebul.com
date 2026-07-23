/**
 * İSTEBUL Identity — TenantSessionBridgeContext (EPIC-302C).
 *
 * Provider ↔ Tenant Runtime bridge girdi bağlamı.
 * Tenant Isolation Runtime / TenantAdapter / SupabaseTenantProvider
 * değiştirilmez.
 */

import type { TenantProviderContext } from '../adapters/TenantProviderContext';
import { createTenantProviderContext } from '../adapters/TenantProviderContext';

/**
 * Bridge operasyonları.
 */
export type TenantSessionBridgeOperation =
  | 'synchronize'
  | 'refresh'
  | 'validate'
  | 'listMemberships'
  | 'getTenant';

/**
 * Tenant Session Bridge girdi bağlamı.
 */
export interface TenantSessionBridgeContext {
  /** Dil */
  locale: 'tr' | 'en';
  /** Bridge operasyonu */
  operation: TenantSessionBridgeOperation;
  /**
   * Adapter'a iletilecek provider bağlamı.
   * Yoksa providerId + alanlardan üretilir.
   */
  providerContext?: TenantProviderContext;
  /** Hedef provider kimliği (providerContext yoksa zorunlu) */
  providerId?: string;
  /** Opsiyonel bridge binding kimliği */
  bridgeBindingId?: string;
  /** Opsiyonel tenant kimliği */
  tenantId?: string;
  /** Opsiyonel tenant slug */
  tenantSlug?: string;
  /** Opsiyonel identity kimliği */
  identityId?: string;
  /** Opsiyonel üyelik kimliği */
  membershipId?: string;
  /** Opsiyonel oturum kimliği — session ↔ tenant eşleştirme */
  sessionId?: string;
  /** Opsiyonel kaynak kimliği (validate) */
  resourceId?: string;
  /** Opsiyonel aktör kimliği */
  actorId?: string;
  /** Ek bag */
  bag?: Record<string, unknown>;
}

/**
 * TenantSessionBridgeContext üretir — locale varsayılanı `tr`.
 */
export function createTenantSessionBridgeContext(
  partial: Omit<TenantSessionBridgeContext, 'locale'> & {
    locale?: 'tr' | 'en';
  }
): TenantSessionBridgeContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? 'tr'
  };
}

/**
 * Bridge bağlamından TenantProviderContext üretir.
 */
export function resolveTenantBridgeProviderContext(
  context: TenantSessionBridgeContext
): TenantProviderContext {
  if (context.providerContext) {
    return {
      ...context.providerContext,
      locale: context.providerContext.locale ?? context.locale,
      tenantId: context.providerContext.tenantId ?? context.tenantId,
      tenantSlug: context.providerContext.tenantSlug ?? context.tenantSlug,
      identityId: context.providerContext.identityId ?? context.identityId,
      membershipId:
        context.providerContext.membershipId ?? context.membershipId,
      sessionId: context.providerContext.sessionId ?? context.sessionId,
      resourceId: context.providerContext.resourceId ?? context.resourceId,
      actorId: context.providerContext.actorId ?? context.actorId,
      bag: {
        ...(context.bag ?? {}),
        ...(context.providerContext.bag ?? {})
      }
    };
  }

  const providerId = context.providerId;
  if (!providerId) {
    throw new Error('providerId veya providerContext zorunludur.');
  }

  return createTenantProviderContext({
    locale: context.locale,
    providerId,
    tenantId: context.tenantId,
    tenantSlug: context.tenantSlug,
    identityId: context.identityId,
    membershipId: context.membershipId,
    sessionId: context.sessionId,
    resourceId: context.resourceId,
    actorId: context.actorId,
    bag: context.bag
  });
}

/**
 * Bridge operasyonunu TenantProvider operasyonuna eşler.
 */
export function mapTenantBridgeOperationToProviderOperation(
  operation: TenantSessionBridgeOperation
):
  | 'resolveTenant'
  | 'getTenant'
  | 'listMemberships'
  | 'validateAccess'
  | 'refreshTenant' {
  switch (operation) {
    case 'synchronize':
      return 'resolveTenant';
    case 'refresh':
      return 'refreshTenant';
    case 'validate':
      return 'validateAccess';
    case 'listMemberships':
      return 'listMemberships';
    case 'getTenant':
      return 'getTenant';
    default: {
      const exhaustive: never = operation;
      throw new Error(`Desteklenmeyen bridge operasyonu: ${exhaustive}`);
    }
  }
}
