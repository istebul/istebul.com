/**
 * İSTEBUL Business Admin — business doğrulama (PR-202A).
 *
 * Pipeline aşaması 1: Validation.
 * Yalnızca bağlam doğrulaması — CRUD/API/DB yok.
 */

import type { BusinessAdminContext } from './BusinessAdminContext';
import type { BusinessAdminValidationIssue } from './BusinessAdminResult';
import type { BusinessAdminModuleId } from './BusinessAdminModule';
import type { BusinessAdminRegistryRuntime } from './BusinessAdminRegistryRuntime';

const VALID_LOCALES = new Set<string>(['tr', 'en']);

/**
 * Business Admin bağlamını doğrular.
 */
export function validateBusinessAdminContext(
  context: BusinessAdminContext,
  registry: BusinessAdminRegistryRuntime
): readonly BusinessAdminValidationIssue[] {
  const issues: BusinessAdminValidationIssue[] = [];

  if (
    typeof context.tenantId !== 'string' ||
    context.tenantId.trim() === ''
  ) {
    issues.push({
      code: 'MISSING_TENANT_ID',
      message: 'tenantId zorunludur.',
      severity: 'error'
    });
  }

  if (!VALID_LOCALES.has(context.locale)) {
    issues.push({
      code: 'INVALID_LOCALE',
      message: `Geçersiz locale: ${String(context.locale)}`,
      severity: 'error'
    });
  }

  if (context.moduleIds !== undefined) {
    if (!Array.isArray(context.moduleIds)) {
      issues.push({
        code: 'INVALID_MODULE_IDS',
        message: 'moduleIds bir dizi olmalıdır.',
        severity: 'error'
      });
    } else if (context.moduleIds.length === 0) {
      issues.push({
        code: 'EMPTY_MODULE_IDS',
        message: 'moduleIds boş olamaz; tüm modüller için undefined kullanın.',
        severity: 'warning'
      });
    } else {
      const seen = new Set<string>();
      for (const moduleId of context.moduleIds) {
        if (typeof moduleId !== 'string' || moduleId.trim() === '') {
          issues.push({
            code: 'INVALID_MODULE_ID',
            message: 'Geçersiz modül kimliği.',
            severity: 'error'
          });
          continue;
        }
        if (seen.has(moduleId)) {
          issues.push({
            code: 'DUPLICATE_MODULE_ID',
            message: `Yinelenen modül kimliği: ${moduleId}`,
            severity: 'warning'
          });
        }
        seen.add(moduleId);
        if (!registry.getById(moduleId)) {
          issues.push({
            code: 'UNKNOWN_MODULE_ID',
            message: `Kayıtlı olmayan modül: ${moduleId}`,
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
 * İstenen modül kimliklerini kayıtlı modüllerle eşleştirir.
 */
export function resolveRequestedModules(
  context: BusinessAdminContext,
  registry: BusinessAdminRegistryRuntime
): {
  modules: readonly import('./BusinessAdminModule').BusinessAdminModule[];
  requestedCount: number;
  unavailableCount: number;
} {
  const allModules = registry.getAll();

  if (!context.moduleIds || context.moduleIds.length === 0) {
    return {
      modules: allModules,
      requestedCount: allModules.length,
      unavailableCount: 0
    };
  }

  const requestedIds = context.moduleIds as readonly BusinessAdminModuleId[];
  const modules = requestedIds
    .map((id) => registry.getById(id))
    .filter(
      (item): item is import('./BusinessAdminModule').BusinessAdminModule =>
        item !== undefined
    );

  return {
    modules,
    requestedCount: requestedIds.length,
    unavailableCount: requestedIds.length - modules.length
  };
}
