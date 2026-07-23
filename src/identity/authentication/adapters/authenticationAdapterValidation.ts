/**
 * İSTEBUL Identity — authentication adapter doğrulama (EPIC-301A).
 */

import type {
  AuthenticationProvider,
  AuthenticationProviderRegistration
} from './AuthenticationProvider';
import type { AuthenticationProviderContext } from './AuthenticationProviderContext';
import type { AuthenticationProviderRegistry } from './AuthenticationProviderRegistry';
import type { AuthenticationProviderValidationIssue } from './AuthenticationProviderResult';

/**
 * AuthenticationProviderContext doğrular.
 */
export function validateAuthenticationProviderContext(
  context: AuthenticationProviderContext,
  registry: AuthenticationProviderRegistry
): AuthenticationProviderValidationIssue[] {
  const issues: AuthenticationProviderValidationIssue[] = [];

  if (!context) {
    issues.push({
      code: 'CONTEXT_MISSING',
      message: 'AuthenticationProviderContext zorunludur.',
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
    context.method &&
    registry.hasRegistration(context.providerId) &&
    !registry.isMethodSupported(context.providerId, context.method)
  ) {
    issues.push({
      code: 'METHOD_MISMATCH',
      message: `Provider yöntemi uyuşmuyor: ${context.providerId} / ${context.method}`,
      severity: 'warning'
    });
  }

  return issues;
}

/**
 * Kayıtlı provider implementasyonunu çözer.
 */
export function resolveAuthenticationProvider(
  context: AuthenticationProviderContext,
  registry: AuthenticationProviderRegistry
): AuthenticationProvider | undefined {
  if (!context?.providerId) {
    return undefined;
  }
  return registry.getProviderById(context.providerId);
}

/**
 * Provider metadata kaydını çözer.
 */
export function resolveAuthenticationProviderRegistration(
  context: AuthenticationProviderContext,
  registry: AuthenticationProviderRegistry
): AuthenticationProviderRegistration | undefined {
  if (!context?.providerId) {
    return undefined;
  }
  return registry.getRegistrationById(context.providerId);
}

/**
 * Doğrulama bulgularında hata var mı.
 */
export function hasAuthenticationProviderValidationErrors(
  issues: readonly AuthenticationProviderValidationIssue[]
): boolean {
  return issues.some((item) => item.severity === 'error');
}
