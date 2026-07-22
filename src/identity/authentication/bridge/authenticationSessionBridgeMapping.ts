/**
 * İSTEBUL Identity — Authentication → Session mapping (EPIC-301C).
 *
 * Provider sonucunu Session Runtime modeline dönüştürür.
 * Token'lar Session modeline kopyalanmaz.
 */

import type { AuthenticationProviderResult } from '../adapters/AuthenticationProviderResult';
import type { AuthenticationStatus } from '../runtime/AuthenticationModule';
import type {
  SessionModule,
  SessionState
} from '../../session/runtime/SessionModule';
import { toSessionProjection } from '../../session/runtime/SessionModule';
import type { AuthenticationSessionBridgeOperation } from './AuthenticationSessionBridgeContext';
import type { AuthenticationSessionBridgeValidationIssue } from './AuthenticationSessionBridgeResult';
import type { AuthenticationSessionBridgeBinding } from './AuthenticationSessionBridgeRegistry';

export interface MapAuthenticationToSessionOptions {
  operation: AuthenticationSessionBridgeOperation;
  existingModule?: SessionModule;
  nowIso?: string;
  order?: number;
}

/**
 * Authentication status → Session state.
 */
export function mapAuthenticationStatusToSessionState(
  status: AuthenticationStatus,
  operation: AuthenticationSessionBridgeOperation
): SessionState {
  if (operation === 'logout') {
    return 'revoked';
  }
  switch (status) {
    case 'authenticated':
      return 'active';
    case 'expired':
      return 'expired';
    case 'revoked':
      return 'revoked';
    case 'pending':
      return 'pending';
    case 'unauthenticated':
    default:
      return operation === 'validate' ? 'expired' : 'pending';
  }
}

/**
 * Provider sonucundan session / identity / principal kimliklerini çözer.
 */
export function resolveSessionIdentifiers(
  providerResult: AuthenticationProviderResult,
  existingModule?: SessionModule
): {
  sessionId: string;
  sessionModuleId: string;
  identityId: string;
  principalId: string;
  authenticationId: string;
} {
  const bagSession = providerResult.bag?.supabaseSession as
    | { sessionId?: string }
    | undefined;
  const sessionId =
    bagSession?.sessionId ||
    providerResult.credentialReference?.credentialId ||
    existingModule?.session.sessionId ||
    `sess-bridge-${providerResult.providerId}`;

  const identityId =
    providerResult.principal?.identityId ||
    existingModule?.session.identityId ||
    'identity-unknown';

  const principalId =
    providerResult.principal?.principalId ||
    existingModule?.session.principalId ||
    `principal-bridge-${identityId}`;

  const authenticationId =
    existingModule?.session.authenticationId ||
    `auth-bridge-${providerResult.providerId}-${identityId}`;

  const sessionModuleId =
    existingModule?.id || `session-bridge-${sessionId}`;

  return {
    sessionId,
    sessionModuleId,
    identityId,
    principalId,
    authenticationId
  };
}

/**
 * AuthenticationProviderResult → SessionModule.
 */
export function mapAuthenticationProviderResultToSessionModule(
  providerResult: AuthenticationProviderResult,
  options: MapAuthenticationToSessionOptions
): SessionModule {
  const nowIso = options.nowIso ?? new Date().toISOString();
  const existing = options.existingModule;
  const ids = resolveSessionIdentifiers(providerResult, existing);
  const state = mapAuthenticationStatusToSessionState(
    providerResult.status,
    options.operation
  );

  const expiresAt =
    providerResult.credentialReference?.expiresAt ||
    existing?.session.expiration.expiresAt ||
    nowIso;
  const isExpired =
    state === 'expired' ||
    state === 'revoked' ||
    (Date.parse(expiresAt) > 0 && Date.parse(expiresAt) <= Date.parse(nowIso));

  const issuedAt =
    providerResult.credentialReference?.issuedAt ||
    existing?.session.lifetime.startedAt ||
    nowIso;

  const previousActivityCount = existing?.session.activity.activityCount ?? 0;
  const lastAction =
    options.operation === 'refresh'
      ? 'refresh'
      : options.operation === 'logout'
        ? 'logout'
        : options.operation === 'validate'
          ? 'validate'
          : 'authenticate';

  const lastRenewedAt =
    options.operation === 'refresh'
      ? nowIso
      : existing?.session.renewalReference.lastRenewedAt;

  return {
    id: ids.sessionModuleId,
    session: {
      sessionId: ids.sessionId,
      identityId: ids.identityId,
      authenticationId: ids.authenticationId,
      principalId: ids.principalId,
      state,
      lifetime: {
        startedAt: existing?.session.lifetime.startedAt || issuedAt,
        endsAt: expiresAt,
        durationSeconds: existing?.session.lifetime.durationSeconds
      },
      expiration: {
        expiresAt,
        isExpired,
        reason:
          options.operation === 'logout'
            ? 'logout'
            : isExpired
              ? 'expired'
              : existing?.session.expiration.reason
      },
      renewalReference: {
        renewalId:
          existing?.session.renewalReference.renewalId ||
          `renew-${ids.sessionId}`,
        lastRenewedAt,
        nextRenewalAt: existing?.session.renewalReference.nextRenewalAt
      },
      activity: {
        lastActivityAt: nowIso,
        activityCount: previousActivityCount + 1,
        lastAction
      },
      deviceReference: existing?.session.deviceReference || {
        deviceId: 'device-bridge-web',
        platform: 'web'
      }
    },
    order: options.order ?? existing?.order ?? 100,
    createdAt: existing?.createdAt || nowIso,
    updatedAt: nowIso
  };
}

/**
 * SessionModule → binding.
 */
export function createBridgeBindingFromSessionModule(
  module: SessionModule,
  providerId: string,
  operation: AuthenticationSessionBridgeOperation,
  existing?: AuthenticationSessionBridgeBinding
): AuthenticationSessionBridgeBinding {
  const nowIso = new Date().toISOString();
  return {
    id: existing?.id || `bridge-${module.id}`,
    providerId,
    authenticationId: module.session.authenticationId,
    sessionModuleId: module.id,
    sessionId: module.session.sessionId,
    identityId: module.session.identityId,
    principalId: module.session.principalId,
    order: existing?.order ?? module.order,
    createdAt: existing?.createdAt || module.createdAt,
    updatedAt: nowIso,
    lastOperation: operation
  };
}

/**
 * Provider validation issue → bridge issue.
 */
export function mapProviderIssuesToBridgeIssues(
  providerResult: AuthenticationProviderResult | undefined
): AuthenticationSessionBridgeValidationIssue[] {
  if (!providerResult) {
    return [];
  }
  return providerResult.validationIssues.map((issue) => ({
    code: issue.code,
    message: issue.message,
    severity: issue.severity
  }));
}

/**
 * SessionModule projeksiyon yardımcı.
 */
export function projectMappedSessionModule(
  module: SessionModule
): ReturnType<typeof toSessionProjection> {
  return toSessionProjection(module);
}
