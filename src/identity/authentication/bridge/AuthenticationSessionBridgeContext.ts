/**
 * İSTEBUL Identity — AuthenticationSessionBridgeContext (EPIC-301C).
 *
 * Provider ↔ Session Runtime bridge girdi bağlamı.
 * AuthenticationRuntime / SessionRuntime değiştirilmez.
 */

import type { AuthenticationProviderContext } from '../adapters/AuthenticationProviderContext';
import { createAuthenticationProviderContext } from '../adapters/AuthenticationProviderContext';

/**
 * Bridge operasyonları.
 */
export type AuthenticationSessionBridgeOperation =
  | 'synchronize'
  | 'refresh'
  | 'logout'
  | 'validate';

/**
 * Authentication Session Bridge girdi bağlamı.
 */
export interface AuthenticationSessionBridgeContext {
  /** Dil */
  locale: 'tr' | 'en';
  /** Bridge operasyonu */
  operation: AuthenticationSessionBridgeOperation;
  /**
   * Adapter'a iletilecek provider bağlamı.
   * Yoksa providerId + bag alanlarından üretilir.
   */
  providerContext?: AuthenticationProviderContext;
  /** Hedef provider kimliği (providerContext yoksa zorunlu) */
  providerId?: string;
  /** Opsiyonel bridge binding kimliği */
  bridgeBindingId?: string;
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
 * AuthenticationSessionBridgeContext üretir — locale varsayılanı `tr`.
 */
export function createAuthenticationSessionBridgeContext(
  partial: Omit<AuthenticationSessionBridgeContext, 'locale'> & {
    locale?: 'tr' | 'en';
  }
): AuthenticationSessionBridgeContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? 'tr'
  };
}

/**
 * Bridge bağlamından AuthenticationProviderContext üretir.
 */
export function resolveBridgeProviderContext(
  context: AuthenticationSessionBridgeContext
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
 * Bridge operasyonunu AuthenticationProvider operasyonuna eşler.
 */
export function mapBridgeOperationToProviderOperation(
  operation: AuthenticationSessionBridgeOperation
):
  | 'authenticate'
  | 'refresh'
  | 'logout'
  | 'validateSession' {
  switch (operation) {
    case 'synchronize':
      return 'authenticate';
    case 'refresh':
      return 'refresh';
    case 'logout':
      return 'logout';
    case 'validate':
      return 'validateSession';
    default: {
      const exhaustive: never = operation;
      throw new Error(`Desteklenmeyen bridge operasyonu: ${exhaustive}`);
    }
  }
}
