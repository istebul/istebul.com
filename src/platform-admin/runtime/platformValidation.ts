/**
 * İSTEBUL Platform Admin — platform doğrulama (PR-201A).
 *
 * Pipeline aşaması 1: Platform Validation.
 * Yalnızca bağlam doğrulaması — CRUD/API/DB yok.
 */

import type { PlatformAdminContext } from './PlatformAdminContext';
import type { PlatformAdminValidationIssue } from './PlatformAdminResult';
import type { PlatformAdminModuleId } from './PlatformAdminModule';
import type { PlatformAdminRegistryRuntime } from './PlatformAdminRegistryRuntime';

const VALID_LOCALES = new Set<string>(['tr', 'en']);

/**
 * Platform bağlamını doğrular.
 */
export function validatePlatformContext(
  context: PlatformAdminContext,
  registry: PlatformAdminRegistryRuntime
): readonly PlatformAdminValidationIssue[] {
  const issues: PlatformAdminValidationIssue[] = [];

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
  context: PlatformAdminContext,
  registry: PlatformAdminRegistryRuntime
): {
  modules: readonly import('./PlatformAdminModule').PlatformAdminModule[];
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

  const requestedIds = context.moduleIds as readonly PlatformAdminModuleId[];
  const modules = requestedIds
    .map((id) => registry.getById(id))
    .filter(
      (item): item is import('./PlatformAdminModule').PlatformAdminModule =>
        item !== undefined
    );

  return {
    modules,
    requestedCount: requestedIds.length,
    unavailableCount: requestedIds.length - modules.length
  };
}
