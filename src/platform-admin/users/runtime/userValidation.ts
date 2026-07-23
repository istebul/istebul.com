/**
 * İSTEBUL Platform Admin — user doğrulama (PR-201C).
 *
 * Pipeline aşaması 1: Validation.
 * Yalnızca bağlam doğrulaması — CRUD/Auth/API/DB yok.
 */

import type { UserManagementContext } from './UserManagementContext';
import type { UserManagementValidationIssue } from './UserManagementResult';
import type { UserDefinition } from './User';
import type { UserRegistryRuntime } from './UserRegistryRuntime';

const VALID_LOCALES = new Set<string>(['tr', 'en']);

/**
 * User Management bağlamını doğrular.
 */
export function validateUserManagementContext(
  context: UserManagementContext,
  registry: UserRegistryRuntime
): readonly UserManagementValidationIssue[] {
  const issues: UserManagementValidationIssue[] = [];

  if (!VALID_LOCALES.has(context.locale)) {
    issues.push({
      code: 'INVALID_LOCALE',
      message: `Geçersiz locale: ${String(context.locale)}`,
      severity: 'error'
    });
  }

  if (context.platformAdminResult !== undefined) {
    const platform = context.platformAdminResult;
    if (!platform.summary || typeof platform.summary.success !== 'boolean') {
      issues.push({
        code: 'INVALID_PLATFORM_ADMIN_RESULT',
        message: 'platformAdminResult.summary.success zorunludur.',
        severity: 'error'
      });
    } else if (!platform.summary.success) {
      issues.push({
        code: 'PLATFORM_ADMIN_NOT_SUCCESS',
        message:
          'Upstream PlatformAdminResult başarısız; user projection devam eder.',
        severity: 'warning'
      });
    }

    const hasUsersModule = platform.modules?.some(
      (m) => m.moduleId === 'users'
    );
    if (platform.modules && !hasUsersModule) {
      issues.push({
        code: 'USERS_MODULE_NOT_PROJECTED',
        message:
          'PlatformAdminResult içinde users modülü yok; registry ile devam edilir.',
        severity: 'warning'
      });
    }
  }

  if (context.userIds !== undefined) {
    if (!Array.isArray(context.userIds)) {
      issues.push({
        code: 'INVALID_USER_IDS',
        message: 'userIds bir dizi olmalıdır.',
        severity: 'error'
      });
    } else if (context.userIds.length === 0) {
      issues.push({
        code: 'EMPTY_USER_IDS',
        message: 'userIds boş olamaz; tüm kullanıcılar için undefined kullanın.',
        severity: 'warning'
      });
    } else {
      const seen = new Set<string>();
      for (const userId of context.userIds) {
        if (typeof userId !== 'string' || userId.trim() === '') {
          issues.push({
            code: 'INVALID_USER_ID',
            message: 'Geçersiz kullanıcı kimliği.',
            severity: 'error'
          });
          continue;
        }
        if (seen.has(userId)) {
          issues.push({
            code: 'DUPLICATE_USER_ID',
            message: `Yinelenen kullanıcı kimliği: ${userId}`,
            severity: 'warning'
          });
        }
        seen.add(userId);
        if (!registry.getById(userId)) {
          issues.push({
            code: 'UNKNOWN_USER_ID',
            message: `Kayıtlı olmayan kullanıcı: ${userId}`,
            severity: 'warning'
          });
        }
      }
    }
  }

  if (context.tenantId !== undefined) {
    if (typeof context.tenantId !== 'string' || context.tenantId.trim() === '') {
      issues.push({
        code: 'INVALID_TENANT_ID',
        message: 'tenantId boş olamaz.',
        severity: 'error'
      });
    } else if (registry.getByTenantId(context.tenantId).length === 0) {
      issues.push({
        code: 'NO_USERS_FOR_TENANT',
        message: `Tenant için kayıtlı kullanıcı yok: ${context.tenantId}`,
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
 * İstenen kullanıcı kimliklerini kayıtlı kullanıcılarla eşleştirir.
 */
export function resolveRequestedUsers(
  context: UserManagementContext,
  registry: UserRegistryRuntime
): {
  users: readonly UserDefinition[];
  requestedCount: number;
  unavailableCount: number;
} {
  let pool = registry.getAll();

  if (context.tenantId && context.tenantId.trim() !== '') {
    pool = registry.getByTenantId(context.tenantId);
  }

  if (!context.userIds || context.userIds.length === 0) {
    return {
      users: pool,
      requestedCount: pool.length,
      unavailableCount: 0
    };
  }

  const requestedIds = context.userIds;
  const poolById = new Map(pool.map((u) => [u.identity.id, u]));
  const users = requestedIds
    .map((id) => poolById.get(id) ?? registry.getById(id))
    .filter((item): item is UserDefinition => {
      if (item === undefined) return false;
      if (context.tenantId && item.tenantReference.tenantId !== context.tenantId) {
        return false;
      }
      return true;
    });

  const unavailableCount = requestedIds.length - users.length;

  return {
    users,
    requestedCount: requestedIds.length,
    unavailableCount
  };
}
