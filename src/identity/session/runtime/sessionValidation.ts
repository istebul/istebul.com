/**
 * İSTEBUL Identity — session doğrulama (PR-203C).
 *
 * Pipeline aşaması 1: Validation.
 * Yalnızca bağlam doğrulaması — JWT / Cookie / Refresh Token / API / DB yok.
 */

import type { SessionContext } from './SessionContext';
import type { SessionValidationIssue } from './SessionResult';
import type { SessionModule } from './SessionModule';
import type { SessionRegistry } from './SessionRegistry';
import type { IdentityProjection } from '../../runtime/IdentityModule';
import type { AuthenticationProjection } from '../../authentication/runtime/AuthenticationModule';

const VALID_LOCALES = new Set<string>(['tr', 'en']);
const VALID_STATES = new Set<string>([
  'active',
  'idle',
  'expired',
  'revoked',
  'pending'
]);

/**
 * Session bağlamını doğrular.
 */
export function validateSessionContext(
  context: SessionContext,
  registry: SessionRegistry
): readonly SessionValidationIssue[] {
  const issues: SessionValidationIssue[] = [];

  if (!VALID_LOCALES.has(context.locale)) {
    issues.push({
      code: 'INVALID_LOCALE',
      message: `Geçersiz locale: ${String(context.locale)}`,
      severity: 'error'
    });
  }

  if (context.identityResult !== undefined) {
    const identity = context.identityResult;
    if (!identity.summary || typeof identity.summary.success !== 'boolean') {
      issues.push({
        code: 'INVALID_IDENTITY_RESULT',
        message: 'identityResult.summary.success zorunludur.',
        severity: 'error'
      });
    } else if (!identity.summary.success) {
      issues.push({
        code: 'IDENTITY_NOT_SUCCESS',
        message:
          'Upstream IdentityResult başarısız; session projection devam eder.',
        severity: 'warning'
      });
    }
    if (!Array.isArray(identity.identities)) {
      issues.push({
        code: 'INVALID_IDENTITY_PROJECTIONS',
        message: 'identityResult.identities bir dizi olmalıdır.',
        severity: 'error'
      });
    }
  }

  if (context.authenticationResult !== undefined) {
    const authentication = context.authenticationResult;
    if (
      !authentication.summary ||
      typeof authentication.summary.success !== 'boolean'
    ) {
      issues.push({
        code: 'INVALID_AUTHENTICATION_RESULT',
        message: 'authenticationResult.summary.success zorunludur.',
        severity: 'error'
      });
    } else if (!authentication.summary.success) {
      issues.push({
        code: 'AUTHENTICATION_NOT_SUCCESS',
        message:
          'Upstream AuthenticationResult başarısız; session projection devam eder.',
        severity: 'warning'
      });
    }
    if (!Array.isArray(authentication.authentications)) {
      issues.push({
        code: 'INVALID_AUTHENTICATION_PROJECTIONS',
        message: 'authenticationResult.authentications bir dizi olmalıdır.',
        severity: 'error'
      });
    }
  }

  if (context.sessionIds !== undefined) {
    if (!Array.isArray(context.sessionIds)) {
      issues.push({
        code: 'INVALID_SESSION_IDS',
        message: 'sessionIds bir dizi olmalıdır.',
        severity: 'error'
      });
    } else if (context.sessionIds.length === 0) {
      issues.push({
        code: 'EMPTY_SESSION_IDS',
        message:
          'sessionIds boş olamaz; tüm oturumlar için undefined kullanın.',
        severity: 'warning'
      });
    } else {
      const seen = new Set<string>();
      for (const sessionId of context.sessionIds) {
        if (typeof sessionId !== 'string' || sessionId.trim() === '') {
          issues.push({
            code: 'INVALID_SESSION_ID',
            message: 'Geçersiz session kimliği.',
            severity: 'error'
          });
          continue;
        }
        if (seen.has(sessionId)) {
          issues.push({
            code: 'DUPLICATE_SESSION_ID',
            message: `Yinelenen session kimliği: ${sessionId}`,
            severity: 'warning'
          });
        }
        seen.add(sessionId);
        if (!registry.getById(sessionId) && !registry.getBySessionId(sessionId)) {
          issues.push({
            code: 'UNKNOWN_SESSION_ID',
            message: `Kayıtlı olmayan session: ${sessionId}`,
            severity: 'warning'
          });
        }
      }
    }
  }

  if (context.identityId !== undefined) {
    if (
      typeof context.identityId !== 'string' ||
      context.identityId.trim() === ''
    ) {
      issues.push({
        code: 'EMPTY_IDENTITY_ID',
        message: 'identityId boş string olamaz.',
        severity: 'error'
      });
    } else if (registry.getByIdentityId(context.identityId).length === 0) {
      issues.push({
        code: 'UNKNOWN_IDENTITY_ID',
        message: `Kayıtlı session’ı olmayan identity: ${context.identityId}`,
        severity: 'warning'
      });
    }
  }

  if (context.authenticationId !== undefined) {
    if (
      typeof context.authenticationId !== 'string' ||
      context.authenticationId.trim() === ''
    ) {
      issues.push({
        code: 'EMPTY_AUTHENTICATION_ID',
        message: 'authenticationId boş string olamaz.',
        severity: 'error'
      });
    } else if (
      registry.getByAuthenticationId(context.authenticationId).length === 0
    ) {
      issues.push({
        code: 'UNKNOWN_AUTHENTICATION_ID',
        message: `Kayıtlı session’ı olmayan authentication: ${context.authenticationId}`,
        severity: 'warning'
      });
    }
  }

  if (context.state !== undefined && !VALID_STATES.has(context.state)) {
    issues.push({
      code: 'INVALID_STATE',
      message: `Geçersiz session state: ${String(context.state)}`,
      severity: 'error'
    });
  }

  if (context.actorId !== undefined && context.actorId.trim() === '') {
    issues.push({
      code: 'EMPTY_ACTOR_ID',
      message: 'actorId boş string olamaz.',
      severity: 'warning'
    });
  }

  return Object.freeze(issues);
}

/**
 * Identity Projection aşaması.
 */
export function resolveSessionIdentityProjections(
  context: SessionContext
): readonly IdentityProjection[] {
  if (!context.identityResult?.identities) {
    return Object.freeze([]);
  }
  return Object.freeze([...context.identityResult.identities]);
}

/**
 * Authentication Projection aşaması.
 */
export function resolveSessionAuthenticationProjections(
  context: SessionContext
): readonly AuthenticationProjection[] {
  if (!context.authenticationResult?.authentications) {
    return Object.freeze([]);
  }
  return Object.freeze([...context.authenticationResult.authentications]);
}

/**
 * İstenen session kimliklerini kayıtlı oturumlarla eşleştirir.
 */
export function resolveRequestedSessions(
  context: SessionContext,
  registry: SessionRegistry
): {
  sessions: readonly SessionModule[];
  requestedCount: number;
  unavailableCount: number;
} {
  let pool = registry.getAll();

  if (context.identityId && context.identityId.trim() !== '') {
    pool = registry.getByIdentityId(context.identityId);
  }

  if (context.authenticationId && context.authenticationId.trim() !== '') {
    pool = Object.freeze(
      pool.filter(
        (item) => item.session.authenticationId === context.authenticationId
      )
    );
  }

  if (context.state) {
    pool = Object.freeze(
      pool.filter((item) => item.session.state === context.state)
    );
  }

  if (
    context.identityResult?.identities &&
    context.identityResult.identities.length > 0 &&
    !context.sessionIds
  ) {
    const allowed = new Set(
      context.identityResult.identities.map((item) => item.identityId)
    );
    pool = Object.freeze(
      pool.filter((item) => allowed.has(item.session.identityId))
    );
  }

  if (
    context.authenticationResult?.authentications &&
    context.authenticationResult.authentications.length > 0 &&
    !context.sessionIds
  ) {
    const allowed = new Set(
      context.authenticationResult.authentications.map(
        (item) => item.authenticationId
      )
    );
    pool = Object.freeze(
      pool.filter((item) => allowed.has(item.session.authenticationId))
    );
  }

  if (!context.sessionIds || context.sessionIds.length === 0) {
    return {
      sessions: pool,
      requestedCount: pool.length,
      unavailableCount: 0
    };
  }

  const requestedIds = context.sessionIds;
  const resolved = requestedIds
    .map((id) => registry.getById(id) ?? registry.getBySessionId(id))
    .filter((item): item is SessionModule => item !== undefined)
    .filter((item) => {
      if (
        context.identityId &&
        item.session.identityId !== context.identityId
      ) {
        return false;
      }
      if (
        context.authenticationId &&
        item.session.authenticationId !== context.authenticationId
      ) {
        return false;
      }
      if (context.state && item.session.state !== context.state) {
        return false;
      }
      return true;
    });

  return {
    sessions: Object.freeze(resolved),
    requestedCount: requestedIds.length,
    unavailableCount: requestedIds.length - resolved.length
  };
}
