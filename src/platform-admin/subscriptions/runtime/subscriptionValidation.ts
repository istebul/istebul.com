/**
 * İSTEBUL Platform Admin — subscription doğrulama (PR-201D).
 *
 * Pipeline aşaması 1: Validation.
 * Yalnızca bağlam doğrulaması — Payment/Billing/API/DB yok.
 */

import type { SubscriptionManagementContext } from './SubscriptionManagementContext';
import type { SubscriptionManagementValidationIssue } from './SubscriptionManagementResult';
import type { SubscriptionDefinition } from './Subscription';
import type { SubscriptionRegistryRuntime } from './SubscriptionRegistryRuntime';

const VALID_LOCALES = new Set<string>(['tr', 'en']);

/**
 * Subscription Management bağlamını doğrular.
 */
export function validateSubscriptionManagementContext(
  context: SubscriptionManagementContext,
  registry: SubscriptionRegistryRuntime
): readonly SubscriptionManagementValidationIssue[] {
  const issues: SubscriptionManagementValidationIssue[] = [];

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
          'Upstream PlatformAdminResult başarısız; subscription projection devam eder.',
        severity: 'warning'
      });
    }

    const hasSubscriptionsModule = platform.modules?.some(
      (m) => m.moduleId === 'subscriptions'
    );
    if (platform.modules && !hasSubscriptionsModule) {
      issues.push({
        code: 'SUBSCRIPTIONS_MODULE_NOT_PROJECTED',
        message:
          'PlatformAdminResult içinde subscriptions modülü yok; registry ile devam edilir.',
        severity: 'warning'
      });
    }
  }

  if (context.subscriptionIds !== undefined) {
    if (!Array.isArray(context.subscriptionIds)) {
      issues.push({
        code: 'INVALID_SUBSCRIPTION_IDS',
        message: 'subscriptionIds bir dizi olmalıdır.',
        severity: 'error'
      });
    } else if (context.subscriptionIds.length === 0) {
      issues.push({
        code: 'EMPTY_SUBSCRIPTION_IDS',
        message:
          'subscriptionIds boş olamaz; tüm abonelikler için undefined kullanın.',
        severity: 'warning'
      });
    } else {
      const seen = new Set<string>();
      for (const subscriptionId of context.subscriptionIds) {
        if (
          typeof subscriptionId !== 'string' ||
          subscriptionId.trim() === ''
        ) {
          issues.push({
            code: 'INVALID_SUBSCRIPTION_ID',
            message: 'Geçersiz abonelik kimliği.',
            severity: 'error'
          });
          continue;
        }
        if (seen.has(subscriptionId)) {
          issues.push({
            code: 'DUPLICATE_SUBSCRIPTION_ID',
            message: `Yinelenen abonelik kimliği: ${subscriptionId}`,
            severity: 'warning'
          });
        }
        seen.add(subscriptionId);
        if (!registry.getById(subscriptionId)) {
          issues.push({
            code: 'UNKNOWN_SUBSCRIPTION_ID',
            message: `Kayıtlı olmayan abonelik: ${subscriptionId}`,
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
        code: 'NO_SUBSCRIPTIONS_FOR_TENANT',
        message: `Tenant için kayıtlı abonelik yok: ${context.tenantId}`,
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
 * İstenen abonelik kimliklerini kayıtlı aboneliklerle eşleştirir.
 */
export function resolveRequestedSubscriptions(
  context: SubscriptionManagementContext,
  registry: SubscriptionRegistryRuntime
): {
  subscriptions: readonly SubscriptionDefinition[];
  requestedCount: number;
  unavailableCount: number;
} {
  let pool = registry.getAll();

  if (context.tenantId && context.tenantId.trim() !== '') {
    pool = registry.getByTenantId(context.tenantId);
  }

  if (!context.subscriptionIds || context.subscriptionIds.length === 0) {
    return {
      subscriptions: pool,
      requestedCount: pool.length,
      unavailableCount: 0
    };
  }

  const requestedIds = context.subscriptionIds;
  const poolById = new Map(pool.map((s) => [s.identity.id, s]));
  const subscriptions = requestedIds
    .map((id) => poolById.get(id) ?? registry.getById(id))
    .filter((item): item is SubscriptionDefinition => {
      if (item === undefined) return false;
      if (
        context.tenantId &&
        item.tenantReference.tenantId !== context.tenantId
      ) {
        return false;
      }
      return true;
    });

  return {
    subscriptions,
    requestedCount: requestedIds.length,
    unavailableCount: requestedIds.length - subscriptions.length
  };
}
