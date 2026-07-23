/**
 * İSTEBUL Identity — authentication doğrulama (PR-203B).
 *
 * Pipeline aşaması 1: Validation.
 * Yalnızca bağlam doğrulaması — Login UI / JWT / Supabase Auth / API / DB yok.
 */

import type { AuthenticationContext } from './AuthenticationContext';
import type { AuthenticationValidationIssue } from './AuthenticationResult';
import type { AuthenticationModule } from './AuthenticationModule';
import type { AuthenticationRegistry } from './AuthenticationRegistry';
import type { IdentityProjection } from '../../runtime/IdentityModule';

const VALID_LOCALES = new Set<string>(['tr', 'en']);
const VALID_STATUSES = new Set<string>([
  'authenticated',
  'unauthenticated',
  'expired',
  'revoked',
  'pending'
]);

/**
 * Authentication bağlamını doğrular.
 */
export function validateAuthenticationContext(
  context: AuthenticationContext,
  registry: AuthenticationRegistry
): readonly AuthenticationValidationIssue[] {
  const issues: AuthenticationValidationIssue[] = [];

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
          'Upstream IdentityResult başarısız; authentication projection devam eder.',
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

  if (context.authenticationIds !== undefined) {
    if (!Array.isArray(context.authenticationIds)) {
      issues.push({
        code: 'INVALID_AUTHENTICATION_IDS',
        message: 'authenticationIds bir dizi olmalıdır.',
        severity: 'error'
      });
    } else if (context.authenticationIds.length === 0) {
      issues.push({
        code: 'EMPTY_AUTHENTICATION_IDS',
        message:
          'authenticationIds boş olamaz; tüm kayıtlar için undefined kullanın.',
        severity: 'warning'
      });
    } else {
      const seen = new Set<string>();
      for (const authenticationId of context.authenticationIds) {
        if (
          typeof authenticationId !== 'string' ||
          authenticationId.trim() === ''
        ) {
          issues.push({
            code: 'INVALID_AUTHENTICATION_ID',
            message: 'Geçersiz authentication kimliği.',
            severity: 'error'
          });
          continue;
        }
        if (seen.has(authenticationId)) {
          issues.push({
            code: 'DUPLICATE_AUTHENTICATION_ID',
            message: `Yinelenen authentication kimliği: ${authenticationId}`,
            severity: 'warning'
          });
        }
        seen.add(authenticationId);
        if (!registry.getById(authenticationId)) {
          issues.push({
            code: 'UNKNOWN_AUTHENTICATION_ID',
            message: `Kayıtlı olmayan authentication: ${authenticationId}`,
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
        message: `Kayıtlı authentication’ı olmayan identity: ${context.identityId}`,
        severity: 'warning'
      });
    }
  }

  if (context.status !== undefined && !VALID_STATUSES.has(context.status)) {
    issues.push({
      code: 'INVALID_STATUS',
      message: `Geçersiz authentication status: ${String(context.status)}`,
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
 * Upstream Identity Projection aşaması — IdentityResult’tan projeksiyonları alır.
 */
export function resolveIdentityProjections(
  context: AuthenticationContext
): readonly IdentityProjection[] {
  if (!context.identityResult?.identities) {
    return Object.freeze([]);
  }
  return Object.freeze([...context.identityResult.identities]);
}

/**
 * İstenen authentication kimliklerini kayıtlı kayıtlarla eşleştirir.
 */
export function resolveRequestedAuthentications(
  context: AuthenticationContext,
  registry: AuthenticationRegistry
): {
  authentications: readonly AuthenticationModule[];
  requestedCount: number;
  unavailableCount: number;
} {
  let pool = registry.getAll();

  if (context.identityId && context.identityId.trim() !== '') {
    pool = registry.getByIdentityId(context.identityId);
  }

  if (context.status) {
    pool = Object.freeze(
      pool.filter((item) => item.state.status === context.status)
    );
  }

  if (
    context.identityResult?.identities &&
    context.identityResult.identities.length > 0 &&
    !context.authenticationIds
  ) {
    const allowed = new Set(
      context.identityResult.identities.map((item) => item.identityId)
    );
    pool = Object.freeze(
      pool.filter((item) => allowed.has(item.state.principal.identityId))
    );
  }

  if (!context.authenticationIds || context.authenticationIds.length === 0) {
    return {
      authentications: pool,
      requestedCount: pool.length,
      unavailableCount: 0
    };
  }

  const requestedIds = context.authenticationIds;
  const poolById = new Map(pool.map((item) => [item.id, item]));
  const authentications = requestedIds
    .map((id) => poolById.get(id) ?? registry.getById(id))
    .filter((item): item is AuthenticationModule => {
      if (item === undefined) {
        return false;
      }
      if (
        context.identityId &&
        item.state.principal.identityId !== context.identityId
      ) {
        return false;
      }
      if (context.status && item.state.status !== context.status) {
        return false;
      }
      return true;
    });

  return {
    authentications,
    requestedCount: requestedIds.length,
    unavailableCount: requestedIds.length - authentications.length
  };
}
