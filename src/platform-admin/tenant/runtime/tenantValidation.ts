/**
 * İSTEBUL Platform Admin — tenant doğrulama (PR-201B).
 *
 * Pipeline aşaması 1: Validation.
 * Yalnızca bağlam doğrulaması — CRUD/API/DB yok.
 */

import type { TenantManagementContext } from './TenantManagementContext';
import type { TenantManagementValidationIssue } from './TenantManagementResult';
import type { TenantDefinition } from './Tenant';
import type { TenantRegistryRuntime } from './TenantRegistryRuntime';

const VALID_LOCALES = new Set<string>(['tr', 'en']);

/**
 * Tenant Management bağlamını doğrular.
 */
export function validateTenantManagementContext(
  context: TenantManagementContext,
  registry: TenantRegistryRuntime
): readonly TenantManagementValidationIssue[] {
  const issues: TenantManagementValidationIssue[] = [];

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
        message: 'Upstream PlatformAdminResult başarısız; tenant projection devam eder.',
        severity: 'warning'
      });
    }

    const hasTenantModule = platform.modules?.some(
      (m) => m.moduleId === 'tenant'
    );
    if (platform.modules && !hasTenantModule) {
      issues.push({
        code: 'TENANT_MODULE_NOT_PROJECTED',
        message:
          'PlatformAdminResult içinde tenant modülü yok; registry ile devam edilir.',
        severity: 'warning'
      });
    }
  }

  if (context.tenantIds !== undefined) {
    if (!Array.isArray(context.tenantIds)) {
      issues.push({
        code: 'INVALID_TENANT_IDS',
        message: 'tenantIds bir dizi olmalıdır.',
        severity: 'error'
      });
    } else if (context.tenantIds.length === 0) {
      issues.push({
        code: 'EMPTY_TENANT_IDS',
        message: 'tenantIds boş olamaz; tüm tenantlar için undefined kullanın.',
        severity: 'warning'
      });
    } else {
      const seen = new Set<string>();
      for (const tenantId of context.tenantIds) {
        if (typeof tenantId !== 'string' || tenantId.trim() === '') {
          issues.push({
            code: 'INVALID_TENANT_ID',
            message: 'Geçersiz tenant kimliği.',
            severity: 'error'
          });
          continue;
        }
        if (seen.has(tenantId)) {
          issues.push({
            code: 'DUPLICATE_TENANT_ID',
            message: `Yinelenen tenant kimliği: ${tenantId}`,
            severity: 'warning'
          });
        }
        seen.add(tenantId);
        if (!registry.getById(tenantId)) {
          issues.push({
            code: 'UNKNOWN_TENANT_ID',
            message: `Kayıtlı olmayan tenant: ${tenantId}`,
            severity: 'warning'
          });
        }
      }
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
 * İstenen tenant kimliklerini kayıtlı tenantlarla eşleştirir.
 */
export function resolveRequestedTenants(
  context: TenantManagementContext,
  registry: TenantRegistryRuntime
): {
  tenants: readonly TenantDefinition[];
  requestedCount: number;
  unavailableCount: number;
} {
  const allTenants = registry.getAll();

  if (!context.tenantIds || context.tenantIds.length === 0) {
    return {
      tenants: allTenants,
      requestedCount: allTenants.length,
      unavailableCount: 0
    };
  }

  const requestedIds = context.tenantIds;
  const tenants = requestedIds
    .map((id) => registry.getById(id))
    .filter((item): item is TenantDefinition => item !== undefined);

  return {
    tenants,
    requestedCount: requestedIds.length,
    unavailableCount: requestedIds.length - tenants.length
  };
}
