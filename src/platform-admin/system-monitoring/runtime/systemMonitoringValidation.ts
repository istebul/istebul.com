/**
 * İSTEBUL Platform Admin — system monitoring doğrulama (PR-201E).
 *
 * Pipeline aşaması 1: Validation.
 * Yalnızca bağlam doğrulaması — gerçek health check / metric / alert yok.
 */

import type { SystemMonitoringContext } from './SystemMonitoringContext';
import type { SystemMonitoringValidationIssue } from './SystemMonitoringResult';
import type { SystemMonitoringDefinition } from './SystemMonitoring';
import type { SystemMonitoringRegistryRuntime } from './SystemMonitoringRegistryRuntime';

const VALID_LOCALES = new Set<string>(['tr', 'en']);

/**
 * System Monitoring bağlamını doğrular.
 */
export function validateSystemMonitoringContext(
  context: SystemMonitoringContext,
  registry: SystemMonitoringRegistryRuntime
): readonly SystemMonitoringValidationIssue[] {
  const issues: SystemMonitoringValidationIssue[] = [];

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
          'Upstream PlatformAdminResult başarısız; monitoring projection devam eder.',
        severity: 'warning'
      });
    }

    const hasSystemModule = platform.modules?.some(
      (m) => m.moduleId === 'system'
    );
    if (platform.modules && !hasSystemModule) {
      issues.push({
        code: 'SYSTEM_MODULE_NOT_PROJECTED',
        message:
          'PlatformAdminResult içinde system modülü yok; registry ile devam edilir.',
        severity: 'warning'
      });
    }
  }

  if (context.serviceIds !== undefined) {
    if (!Array.isArray(context.serviceIds)) {
      issues.push({
        code: 'INVALID_SERVICE_IDS',
        message: 'serviceIds bir dizi olmalıdır.',
        severity: 'error'
      });
    } else if (context.serviceIds.length === 0) {
      issues.push({
        code: 'EMPTY_SERVICE_IDS',
        message:
          'serviceIds boş olamaz; tüm servisler için undefined kullanın.',
        severity: 'warning'
      });
    } else {
      const seen = new Set<string>();
      for (const serviceId of context.serviceIds) {
        if (typeof serviceId !== 'string' || serviceId.trim() === '') {
          issues.push({
            code: 'INVALID_SERVICE_ID',
            message: 'Geçersiz servis kimliği.',
            severity: 'error'
          });
          continue;
        }
        if (seen.has(serviceId)) {
          issues.push({
            code: 'DUPLICATE_SERVICE_ID',
            message: `Yinelenen servis kimliği: ${serviceId}`,
            severity: 'warning'
          });
        }
        seen.add(serviceId);
        if (!registry.getById(serviceId)) {
          issues.push({
            code: 'UNKNOWN_SERVICE_ID',
            message: `Kayıtlı olmayan servis: ${serviceId}`,
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
 * İstenen servis kimliklerini kayıtlı monitoring kayıtlarıyla eşleştirir.
 */
export function resolveRequestedServices(
  context: SystemMonitoringContext,
  registry: SystemMonitoringRegistryRuntime
): {
  services: readonly SystemMonitoringDefinition[];
  requestedCount: number;
  unavailableCount: number;
} {
  const allServices = registry.getAll();

  if (!context.serviceIds || context.serviceIds.length === 0) {
    return {
      services: allServices,
      requestedCount: allServices.length,
      unavailableCount: 0
    };
  }

  const requestedIds = context.serviceIds;
  const services = requestedIds
    .map((id) => registry.getById(id))
    .filter(
      (item): item is SystemMonitoringDefinition => item !== undefined
    );

  return {
    services,
    requestedCount: requestedIds.length,
    unavailableCount: requestedIds.length - services.length
  };
}
