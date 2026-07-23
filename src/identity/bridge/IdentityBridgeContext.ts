/**
 * İSTEBUL Identity — IdentityBridgeContext (EPIC-301D).
 *
 * Identity Runtime ↔ Authentication Integration bridge girdi bağlamı.
 * Mevcut runtime / adapter / provider / session bridge değiştirilmez.
 */

import type { AuthenticationProviderContext } from '../authentication/adapters/AuthenticationProviderContext';
import { createAuthenticationProviderContext } from '../authentication/adapters/AuthenticationProviderContext';
import type { AuthenticationSessionBridgeContext } from '../authentication/bridge/AuthenticationSessionBridgeContext';
import { createAuthenticationSessionBridgeContext } from '../authentication/bridge/AuthenticationSessionBridgeContext';

/**
 * Identity Bridge operasyonları.
 */
export type IdentityBridgeOperation =
  | 'synchronize'
  | 'refresh'
  | 'logout'
  | 'validate';

/**
 * Identity Bridge girdi bağlamı.
 */
export interface IdentityBridgeContext {
  /** Dil */
  locale: 'tr' | 'en';
  /** Bridge operasyonu */
  operation: IdentityBridgeOperation;
  /**
   * Adapter'a iletilecek provider bağlamı.
   * Yoksa providerId + bag alanlarından üretilir.
   */
  providerContext?: AuthenticationProviderContext;
  /** Hedef provider kimliği (providerContext yoksa zorunlu) */
  providerId?: string;
  /** Opsiyonel identity bridge binding kimliği */
  bridgeBindingId?: string;
  /** Opsiyonel session bridge binding kimliği */
  sessionBridgeBindingId?: string;
  /** Opsiyonel identity kimliği */
  identityId?: string;
  /** Opsiyonel oturum kimliği */
  sessionId?: string;
  /** Opsiyonel aktör kimliği */
  actorId?: string;
  /** Ek bag */
  bag?: Record<string, unknown>;
}

/**
 * IdentityBridgeContext üretir — locale varsayılanı `tr`.
 */
export function createIdentityBridgeContext(
  partial: Omit<IdentityBridgeContext, 'locale'> & {
    locale?: 'tr' | 'en';
  }
): IdentityBridgeContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? 'tr'
  };
}

/**
 * Identity Bridge bağlamından AuthenticationProviderContext üretir.
 */
export function resolveIdentityBridgeProviderContext(
  context: IdentityBridgeContext
): AuthenticationProviderContext {
  if (context.providerContext) {
    return {
      ...context.providerContext,
      locale: context.providerContext.locale ?? context.locale,
      identityId: context.providerContext.identityId ?? context.identityId,
      sessionId: context.providerContext.sessionId ?? context.sessionId,
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

  return createAuthenticationProviderContext({
    locale: context.locale,
    providerId,
    identityId: context.identityId,
    sessionId: context.sessionId,
    actorId: context.actorId,
    bag: context.bag
  });
}

/**
 * Identity Bridge operasyonunu Session Bridge operasyonuna eşler.
 */
export function mapIdentityBridgeOperationToSessionBridgeOperation(
  operation: IdentityBridgeOperation
): 'synchronize' | 'refresh' | 'logout' | 'validate' {
  return operation;
}

/**
 * Identity Bridge bağlamından AuthenticationSessionBridgeContext üretir.
 */
export function toAuthenticationSessionBridgeContextFromIdentity(
  context: IdentityBridgeContext
): AuthenticationSessionBridgeContext {
  const providerContext = resolveIdentityBridgeProviderContext(context);
  return createAuthenticationSessionBridgeContext({
    locale: context.locale,
    operation: mapIdentityBridgeOperationToSessionBridgeOperation(
      context.operation
    ),
    providerContext,
    bridgeBindingId: context.sessionBridgeBindingId,
    identityId: context.identityId,
    sessionId: context.sessionId,
    actorId: context.actorId,
    bag: context.bag
  });
}
