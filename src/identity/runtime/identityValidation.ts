/**
 * İSTEBUL Identity — kimlik doğrulama (PR-203A).
 *
 * Pipeline aşaması 1: Validation.
 * Yalnızca bağlam doğrulaması — Login / Auth / JWT / API / DB yok.
 */

import type { IdentityContext } from './IdentityContext';
import type { IdentityValidationIssue } from './IdentityResult';
import type { IdentityModule } from './IdentityModule';
import type { IdentityRegistry } from './IdentityRegistry';

const VALID_LOCALES = new Set<string>(['tr', 'en']);

/**
 * Identity bağlamını doğrular.
 */
export function validateIdentityContext(
  context: IdentityContext,
  registry: IdentityRegistry
): readonly IdentityValidationIssue[] {
  const issues: IdentityValidationIssue[] = [];

  if (!VALID_LOCALES.has(context.locale)) {
    issues.push({
      code: 'INVALID_LOCALE',
      message: `Geçersiz locale: ${String(context.locale)}`,
      severity: 'error'
    });
  }

  if (context.identityIds !== undefined) {
    if (!Array.isArray(context.identityIds)) {
      issues.push({
        code: 'INVALID_IDENTITY_IDS',
        message: 'identityIds bir dizi olmalıdır.',
        severity: 'error'
      });
    } else if (context.identityIds.length === 0) {
      issues.push({
        code: 'EMPTY_IDENTITY_IDS',
        message:
          'identityIds boş olamaz; tüm kimlikler için undefined kullanın.',
        severity: 'warning'
      });
    } else {
      const seen = new Set<string>();
      for (const identityId of context.identityIds) {
        if (typeof identityId !== 'string' || identityId.trim() === '') {
          issues.push({
            code: 'INVALID_IDENTITY_ID',
            message: 'Geçersiz kimlik kimliği.',
            severity: 'error'
          });
          continue;
        }
        if (seen.has(identityId)) {
          issues.push({
            code: 'DUPLICATE_IDENTITY_ID',
            message: `Yinelenen kimlik kimliği: ${identityId}`,
            severity: 'warning'
          });
        }
        seen.add(identityId);
        if (!registry.getById(identityId)) {
          issues.push({
            code: 'UNKNOWN_IDENTITY_ID',
            message: `Kayıtlı olmayan kimlik: ${identityId}`,
            severity: 'warning'
          });
        }
      }
    }
  }

  if (context.tenantId !== undefined) {
    if (typeof context.tenantId !== 'string' || context.tenantId.trim() === '') {
      issues.push({
        code: 'EMPTY_TENANT_ID',
        message: 'tenantId boş string olamaz.',
        severity: 'error'
      });
    } else if (registry.getByTenantId(context.tenantId).length === 0) {
      issues.push({
        code: 'UNKNOWN_TENANT_ID',
        message: `Kayıtlı kimliği olmayan tenant: ${context.tenantId}`,
        severity: 'warning'
      });
    }
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
 * İstenen kimlik kimliklerini kayıtlı kimliklerle eşleştirir.
 */
export function resolveRequestedIdentities(
  context: IdentityContext,
  registry: IdentityRegistry
): {
  identities: readonly IdentityModule[];
  requestedCount: number;
  unavailableCount: number;
} {
  let pool = registry.getAll();

  if (context.tenantId && context.tenantId.trim() !== '') {
    pool = registry.getByTenantId(context.tenantId);
  }

  if (!context.identityIds || context.identityIds.length === 0) {
    return {
      identities: pool,
      requestedCount: pool.length,
      unavailableCount: 0
    };
  }

  const requestedIds = context.identityIds;
  const poolById = new Map(pool.map((item) => [item.id, item]));
  const identities = requestedIds
    .map((id) => poolById.get(id) ?? registry.getById(id))
    .filter((item): item is IdentityModule => {
      if (item === undefined) {
        return false;
      }
      if (context.tenantId && item.tenant.id !== context.tenantId) {
        return false;
      }
      return true;
    });

  return {
    identities,
    requestedCount: requestedIds.length,
    unavailableCount: requestedIds.length - identities.length
  };
}
