/**
 * İSTEBUL Identity — authorization doğrulama (PR-203D).
 *
 * Pipeline aşaması 1: Validation.
 * Yalnızca bağlam doğrulaması — Middleware / Policy Engine / RLS / API / DB yok.
 */

import type { AuthorizationContext } from './AuthorizationContext';
import type { AuthorizationValidationIssue } from './AuthorizationResult';
import type { AuthorizationModule } from './AuthorizationModule';
import type { AuthorizationRegistry } from './AuthorizationRegistry';
import type { IdentityProjection } from '../../runtime/IdentityModule';
import type { AuthenticationProjection } from '../../authentication/runtime/AuthenticationModule';
import type { SessionProjection } from '../../session/runtime/SessionModule';

const VALID_LOCALES = new Set<string>(['tr', 'en']);
const VALID_OUTCOMES = new Set<string>(['allow', 'deny']);

/**
 * Authorization bağlamını doğrular.
 */
export function validateAuthorizationContext(
  context: AuthorizationContext,
  registry: AuthorizationRegistry
): readonly AuthorizationValidationIssue[] {
  const issues: AuthorizationValidationIssue[] = [];

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
          'Upstream IdentityResult başarısız; authorization projection devam eder.',
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
          'Upstream AuthenticationResult başarısız; authorization projection devam eder.',
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

  if (context.sessionResult !== undefined) {
    const session = context.sessionResult;
    if (!session.summary || typeof session.summary.success !== 'boolean') {
      issues.push({
        code: 'INVALID_SESSION_RESULT',
        message: 'sessionResult.summary.success zorunludur.',
        severity: 'error'
      });
    } else if (!session.summary.success) {
      issues.push({
        code: 'SESSION_NOT_SUCCESS',
        message:
          'Upstream SessionResult başarısız; authorization projection devam eder.',
        severity: 'warning'
      });
    }
    if (!Array.isArray(session.sessions)) {
      issues.push({
        code: 'INVALID_SESSION_PROJECTIONS',
        message: 'sessionResult.sessions bir dizi olmalıdır.',
        severity: 'error'
      });
    }
  }

  if (context.authorizationIds !== undefined) {
    if (!Array.isArray(context.authorizationIds)) {
      issues.push({
        code: 'INVALID_AUTHORIZATION_IDS',
        message: 'authorizationIds bir dizi olmalıdır.',
        severity: 'error'
      });
    } else if (context.authorizationIds.length === 0) {
      issues.push({
        code: 'EMPTY_AUTHORIZATION_IDS',
        message:
          'authorizationIds boş olamaz; tüm kayıtlar için undefined kullanın.',
        severity: 'warning'
      });
    } else {
      const seen = new Set<string>();
      for (const authorizationId of context.authorizationIds) {
        if (
          typeof authorizationId !== 'string' ||
          authorizationId.trim() === ''
        ) {
          issues.push({
            code: 'INVALID_AUTHORIZATION_ID',
            message: 'Geçersiz authorization kimliği.',
            severity: 'error'
          });
          continue;
        }
        if (seen.has(authorizationId)) {
          issues.push({
            code: 'DUPLICATE_AUTHORIZATION_ID',
            message: `Yinelenen authorization kimliği: ${authorizationId}`,
            severity: 'warning'
          });
        }
        seen.add(authorizationId);
        if (!registry.getById(authorizationId)) {
          issues.push({
            code: 'UNKNOWN_AUTHORIZATION_ID',
            message: `Kayıtlı olmayan authorization: ${authorizationId}`,
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
        message: `Kayıtlı authorization’ı olmayan identity: ${context.identityId}`,
        severity: 'warning'
      });
    }
  }

  if (context.sessionId !== undefined) {
    if (
      typeof context.sessionId !== 'string' ||
      context.sessionId.trim() === ''
    ) {
      issues.push({
        code: 'EMPTY_SESSION_ID',
        message: 'sessionId boş string olamaz.',
        severity: 'error'
      });
    } else if (registry.getBySessionId(context.sessionId).length === 0) {
      issues.push({
        code: 'UNKNOWN_SESSION_ID',
        message: `Kayıtlı authorization’ı olmayan session: ${context.sessionId}`,
        severity: 'warning'
      });
    }
  }

  if (
    context.decisionOutcome !== undefined &&
    !VALID_OUTCOMES.has(context.decisionOutcome)
  ) {
    issues.push({
      code: 'INVALID_DECISION_OUTCOME',
      message: `Geçersiz decision outcome: ${String(context.decisionOutcome)}`,
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
export function resolveAuthorizationIdentityProjections(
  context: AuthorizationContext
): readonly IdentityProjection[] {
  if (!context.identityResult?.identities) {
    return Object.freeze([]);
  }
  return Object.freeze([...context.identityResult.identities]);
}

/**
 * Authentication Projection aşaması.
 */
export function resolveAuthorizationAuthenticationProjections(
  context: AuthorizationContext
): readonly AuthenticationProjection[] {
  if (!context.authenticationResult?.authentications) {
    return Object.freeze([]);
  }
  return Object.freeze([...context.authenticationResult.authentications]);
}

/**
 * Session Projection aşaması.
 */
export function resolveAuthorizationSessionProjections(
  context: AuthorizationContext
): readonly SessionProjection[] {
  if (!context.sessionResult?.sessions) {
    return Object.freeze([]);
  }
  return Object.freeze([...context.sessionResult.sessions]);
}

/**
 * İstenen authorization kimliklerini kayıtlı kayıtlarla eşleştirir.
 */
export function resolveRequestedAuthorizations(
  context: AuthorizationContext,
  registry: AuthorizationRegistry
): {
  authorizations: readonly AuthorizationModule[];
  requestedCount: number;
  unavailableCount: number;
} {
  let pool = registry.getAll();

  if (context.identityId && context.identityId.trim() !== '') {
    pool = registry.getByIdentityId(context.identityId);
  }

  if (context.sessionId && context.sessionId.trim() !== '') {
    pool = Object.freeze(
      pool.filter((item) => item.sessionId === context.sessionId)
    );
  }

  if (context.decisionOutcome) {
    pool = Object.freeze(
      pool.filter((item) =>
        item.decisions.some(
          (decision) => decision.outcome === context.decisionOutcome
        )
      )
    );
  }

  if (
    context.identityResult?.identities &&
    context.identityResult.identities.length > 0 &&
    !context.authorizationIds
  ) {
    const allowed = new Set(
      context.identityResult.identities.map((item) => item.identityId)
    );
    pool = Object.freeze(
      pool.filter((item) => allowed.has(item.identityId))
    );
  }

  if (
    context.sessionResult?.sessions &&
    context.sessionResult.sessions.length > 0 &&
    !context.authorizationIds
  ) {
    const allowed = new Set(
      context.sessionResult.sessions.map((item) => item.sessionId)
    );
    pool = Object.freeze(
      pool.filter(
        (item) => item.sessionId !== undefined && allowed.has(item.sessionId)
      )
    );
  }

  if (
    context.authenticationResult?.authentications &&
    context.authenticationResult.authentications.length > 0 &&
    !context.authorizationIds
  ) {
    const allowed = new Set(
      context.authenticationResult.authentications.map(
        (item) => item.authenticationId
      )
    );
    pool = Object.freeze(
      pool.filter(
        (item) =>
          item.authenticationId !== undefined &&
          allowed.has(item.authenticationId)
      )
    );
  }

  if (!context.authorizationIds || context.authorizationIds.length === 0) {
    return {
      authorizations: pool,
      requestedCount: pool.length,
      unavailableCount: 0
    };
  }

  const requestedIds = context.authorizationIds;
  const resolved = requestedIds
    .map((id) => registry.getById(id))
    .filter((item): item is AuthorizationModule => item !== undefined)
    .filter((item) => {
      if (context.identityId && item.identityId !== context.identityId) {
        return false;
      }
      if (context.sessionId && item.sessionId !== context.sessionId) {
        return false;
      }
      if (
        context.decisionOutcome &&
        !item.decisions.some(
          (decision) => decision.outcome === context.decisionOutcome
        )
      ) {
        return false;
      }
      return true;
    });

  return {
    authorizations: Object.freeze(resolved),
    requestedCount: requestedIds.length,
    unavailableCount: requestedIds.length - resolved.length
  };
}
