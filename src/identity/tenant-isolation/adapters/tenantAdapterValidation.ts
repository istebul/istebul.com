/**
 * İSTEBUL Identity — tenant adapter doğrulama (EPIC-302A).
 */

import type {
  TenantProvider,
  TenantProviderRegistration
} from './TenantProvider';
import type { TenantProviderContext } from './TenantProviderContext';
import type { TenantProviderRegistry } from './TenantProviderRegistry';
import type { TenantProviderValidationIssue } from './TenantProviderResult';

/**
 * TenantProviderContext doğrular.
 */
export function validateTenantProviderContext(
  context: TenantProviderContext,
  registry: TenantProviderRegistry
): TenantProviderValidationIssue[] {
  const issues: TenantProviderValidationIssue[] = [];

  if (!context) {
    issues.push({
      code: 'CONTEXT_MISSING',
      message: 'TenantProviderContext zorunludur.',
      severity: 'error'
    });
    return issues;
  }

  if (!context.providerId || typeof context.providerId !== 'string') {
    issues.push({
      code: 'PROVIDER_ID_REQUIRED',
      message: 'providerId zorunludur.',
      severity: 'error'
    });
  } else if (!registry.hasRegistration(context.providerId)) {
    issues.push({
      code: 'PROVIDER_NOT_FOUND',
      message: `Provider kaydı bulunamadı: ${context.providerId}`,
      severity: 'error'
    });
  }

  if (context.locale !== 'tr' && context.locale !== 'en') {
    issues.push({
      code: 'INVALID_LOCALE',
      message: 'locale yalnızca tr veya en olabilir.',
      severity: 'error'
    });
  }

  if (
    context.kind &&
    registry.hasRegistration(context.providerId) &&
    !registry.isKindSupported(context.providerId, context.kind)
  ) {
    issues.push({
      code: 'KIND_MISMATCH',
      message: `Provider türü uyuşmuyor: ${context.providerId} / ${context.kind}`,
      severity: 'warning'
    });
  }

  return issues;
}

/**
 * Kayıtlı provider implementasyonunu çözer.
 */
export function resolveTenantProvider(
  context: TenantProviderContext,
  registry: TenantProviderRegistry
): TenantProvider | undefined {
  if (!context?.providerId) {
    return undefined;
  }
  return registry.getProviderById(context.providerId);
}

/**
 * Provider metadata kaydını çözer.
 */
export function resolveTenantProviderRegistration(
  context: TenantProviderContext,
  registry: TenantProviderRegistry
): TenantProviderRegistration | undefined {
  if (!context?.providerId) {
    return undefined;
  }
  return registry.getRegistrationById(context.providerId);
}

/**
 * Doğrulama bulgularında hata var mı.
 */
export function hasTenantProviderValidationErrors(
  issues: readonly TenantProviderValidationIssue[]
): boolean {
  return issues.some((item) => item.severity === 'error');
}
