/**
 * İSTEBUL Identity — BusinessContextBridgeContext (EPIC-302D).
 *
 * Tenant Session Bridge ↔ Business Runtime bridge girdi bağlamı.
 * Tenant Session Bridge / Business Admin / Business Runtime değiştirilmez.
 */

import type { TenantSessionBridgeContext } from '../../tenant-isolation/bridge/TenantSessionBridgeContext';
import { createTenantSessionBridgeContext } from '../../tenant-isolation/bridge/TenantSessionBridgeContext';

/**
 * Business Context Bridge operasyonları.
 */
export type BusinessContextBridgeOperation =
  | 'synchronize'
  | 'refresh'
  | 'validate'
  | 'mapWorkspace';

/**
 * Business Context Bridge girdi bağlamı.
 */
export interface BusinessContextBridgeContext {
  /** Dil */
  locale: 'tr' | 'en';
  /** Bridge operasyonu */
  operation: BusinessContextBridgeOperation;
  /**
   * Upstream Tenant Session Bridge bağlamı.
   * Yoksa providerId / tenant alanlarından üretilir.
   */
  tenantBridgeContext?: TenantSessionBridgeContext;
  /** Hedef tenant provider kimliği (tenantBridgeContext yoksa zorunlu) */
  providerId?: string;
  /** Opsiyonel business context bridge binding kimliği */
  bridgeBindingId?: string;
  /** Opsiyonel tenant session bridge binding kimliği */
  tenantBridgeBindingId?: string;
  /** Tenant kimliği */
  tenantId?: string;
  /** Tenant slug */
  tenantSlug?: string;
  /** Business kimliği — yoksa tenantId ile eşleşir */
  businessId?: string;
  /** Identity kimliği */
  identityId?: string;
  /** Session kimliği */
  sessionId?: string;
  /** Workspace kimliği (mapWorkspace) */
  workspaceId?: string;
  /** Workspace etiketi */
  workspaceLabel?: string;
  /** Business runtime modül kimlikleri */
  moduleIds?: readonly string[];
  /** Aktör kimliği */
  actorId?: string;
  /** Ek bag */
  bag?: Record<string, unknown>;
}

/**
 * BusinessContextBridgeContext üretir — locale varsayılanı `tr`.
 */
export function createBusinessContextBridgeContext(
  partial: Omit<BusinessContextBridgeContext, 'locale'> & {
    locale?: 'tr' | 'en';
  }
): BusinessContextBridgeContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? 'tr'
  };
}

/**
 * Bridge bağlamından TenantSessionBridgeContext üretir.
 */
export function resolveTenantSessionBridgeContextFromBusiness(
  context: BusinessContextBridgeContext
): TenantSessionBridgeContext {
  if (context.tenantBridgeContext) {
    return {
      ...context.tenantBridgeContext,
      locale: context.tenantBridgeContext.locale ?? context.locale,
      tenantId: context.tenantBridgeContext.tenantId ?? context.tenantId,
      tenantSlug: context.tenantBridgeContext.tenantSlug ?? context.tenantSlug,
      identityId: context.tenantBridgeContext.identityId ?? context.identityId,
      sessionId: context.tenantBridgeContext.sessionId ?? context.sessionId,
      actorId: context.tenantBridgeContext.actorId ?? context.actorId,
      bridgeBindingId:
        context.tenantBridgeContext.bridgeBindingId ??
        context.tenantBridgeBindingId,
      bag: {
        ...(context.bag ?? {}),
        ...(context.tenantBridgeContext.bag ?? {})
      }
    };
  }

  const providerId = context.providerId;
  if (!providerId) {
    throw new Error('providerId veya tenantBridgeContext zorunludur.');
  }

  const tenantOperation =
    mapBusinessBridgeOperationToTenantBridgeOperation(context.operation);

  return createTenantSessionBridgeContext({
    locale: context.locale,
    operation: tenantOperation,
    providerId,
    bridgeBindingId: context.tenantBridgeBindingId,
    tenantId: context.tenantId,
    tenantSlug: context.tenantSlug,
    identityId: context.identityId,
    sessionId: context.sessionId,
    actorId: context.actorId,
    bag: context.bag
  });
}

/**
 * Business bridge operasyonunu Tenant Session Bridge operasyonuna eşler.
 */
export function mapBusinessBridgeOperationToTenantBridgeOperation(
  operation: BusinessContextBridgeOperation
): 'synchronize' | 'refresh' | 'validate' | 'getTenant' {
  switch (operation) {
    case 'synchronize':
      return 'synchronize';
    case 'refresh':
      return 'refresh';
    case 'validate':
      return 'validate';
    case 'mapWorkspace':
      return 'getTenant';
    default: {
      const exhaustive: never = operation;
      throw new Error(`Desteklenmeyen bridge operasyonu: ${exhaustive}`);
    }
  }
}
