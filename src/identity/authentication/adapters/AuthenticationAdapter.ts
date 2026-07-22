/**
 * İSTEBUL Identity — AuthenticationAdapter (EPIC-301A).
 *
 * Identity & Access Runtime ile gerçek authentication sağlayıcıları
 * arasında adapter katmanı.
 *
 * Architecture Freeze — authentication/runtime değiştirilmez.
 * Supabase / JWT / OAuth / OIDC / API / DB yok.
 */

import type { AuthenticationProvider } from './AuthenticationProvider';
import type {
  AuthenticationProviderContext,
  AuthenticationProviderOperation
} from './AuthenticationProviderContext';
import type {
  AuthenticationProviderResult,
  AuthenticationProviderSummaryItem,
  AuthenticationProviderValidationIssue
} from './AuthenticationProviderResult';
import {
  createAuthenticationProviderFailure,
  createAuthenticationProviderResult
} from './AuthenticationProviderResult';
import type { AuthenticationProviderRegistry } from './AuthenticationProviderRegistry';
import { createAuthenticationProviderRegistry } from './AuthenticationProviderRegistry';
import {
  hasAuthenticationProviderValidationErrors,
  resolveAuthenticationProvider,
  resolveAuthenticationProviderRegistration,
  validateAuthenticationProviderContext
} from './authenticationAdapterValidation';
import {
  endStageTimer,
  startStageTimer
} from '../../runtime/timing';

/**
 * Authentication adapter — provider registry üzerinden operasyon yönlendirir.
 */
export class AuthenticationAdapter {
  private readonly registry: AuthenticationProviderRegistry;

  constructor(registry?: AuthenticationProviderRegistry) {
    this.registry = registry ?? createAuthenticationProviderRegistry(true);
  }

  getRegistry(): AuthenticationProviderRegistry {
    return this.registry;
  }

  /**
   * Kimlik doğrulama operasyonu.
   */
  authenticate(
    context: AuthenticationProviderContext
  ): Promise<AuthenticationProviderResult> {
    return this.executeOperation('authenticate', context);
  }

  /**
   * Oturum / credential yenileme operasyonu.
   */
  refresh(
    context: AuthenticationProviderContext
  ): Promise<AuthenticationProviderResult> {
    return this.executeOperation('refresh', context);
  }

  /**
   * Oturum kapatma operasyonu.
   */
  logout(
    context: AuthenticationProviderContext
  ): Promise<AuthenticationProviderResult> {
    return this.executeOperation('logout', context);
  }

  /**
   * Mevcut kullanıcıyı getirme operasyonu.
   */
  getCurrentUser(
    context: AuthenticationProviderContext
  ): Promise<AuthenticationProviderResult> {
    return this.executeOperation('getCurrentUser', context);
  }

  /**
   * Oturum doğrulama operasyonu.
   */
  validateSession(
    context: AuthenticationProviderContext
  ): Promise<AuthenticationProviderResult> {
    return this.executeOperation('validateSession', context);
  }

  private async executeOperation(
    operation: AuthenticationProviderOperation,
    context: AuthenticationProviderContext
  ): Promise<AuthenticationProviderResult> {
    const timer = startStageTimer();
    const startedAt = timer.startedAt;
    const enrichedContext: AuthenticationProviderContext = {
      ...context,
      operation
    };

    const validationIssues = validateAuthenticationProviderContext(
      enrichedContext,
      this.registry
    );

    if (hasAuthenticationProviderValidationErrors(validationIssues)) {
      return this.buildResultFromValidationFailure(
        operation,
        enrichedContext,
        validationIssues,
        timer,
        startedAt
      );
    }

    const provider = resolveAuthenticationProvider(
      enrichedContext,
      this.registry
    );

    if (!provider) {
      const registration = resolveAuthenticationProviderRegistration(
        enrichedContext,
        this.registry
      );
      const issues: AuthenticationProviderValidationIssue[] = [
        {
          code: 'PROVIDER_NOT_IMPLEMENTED',
          message: registration
            ? `Provider implementasyonu kayıtlı değil: ${enrichedContext.providerId}`
            : `Provider bulunamadı: ${enrichedContext.providerId}`,
          severity: 'error'
        }
      ];
      return this.buildResultFromValidationFailure(
        operation,
        enrichedContext,
        issues,
        timer,
        startedAt
      );
    }

    const providerResult = await Promise.resolve(
      this.invokeProviderOperation(provider, operation, enrichedContext)
    );

    const { endedAt, durationMs } = endStageTimer(timer);

    return createAuthenticationProviderResult({
      ...providerResult,
      operation,
      providerId: enrichedContext.providerId,
      validationIssues: Object.freeze([
        ...validationIssues,
        ...providerResult.validationIssues
      ]),
      summaryItems: Object.freeze([
        ...this.buildSummaryItems(operation, providerResult.success),
        ...providerResult.summaryItems
      ]),
      telemetry: {
        durationMs,
        startedAt,
        endedAt,
        operation,
        providerId: enrichedContext.providerId
      },
      bag: providerResult.bag
        ? { ...providerResult.bag }
        : enrichedContext.bag
          ? { ...enrichedContext.bag }
          : undefined
    });
  }

  private invokeProviderOperation(
    provider: AuthenticationProvider,
    operation: AuthenticationProviderOperation,
    context: AuthenticationProviderContext
  ): Promise<AuthenticationProviderResult> | AuthenticationProviderResult {
    switch (operation) {
      case 'authenticate':
        return provider.authenticate(context);
      case 'refresh':
        return provider.refresh(context);
      case 'logout':
        return provider.logout(context);
      case 'getCurrentUser':
        return provider.getCurrentUser(context);
      case 'validateSession':
        return provider.validateSession(context);
      default: {
        const exhaustive: never = operation;
        throw new Error(`Desteklenmeyen operasyon: ${exhaustive}`);
      }
    }
  }

  private buildResultFromValidationFailure(
    operation: AuthenticationProviderOperation,
    context: AuthenticationProviderContext,
    validationIssues: readonly AuthenticationProviderValidationIssue[],
    timer: ReturnType<typeof startStageTimer>,
    startedAt: string
  ): AuthenticationProviderResult {
    const { endedAt, durationMs } = endStageTimer(timer);

    return createAuthenticationProviderFailure(
      operation,
      context.providerId,
      {
        durationMs,
        startedAt,
        endedAt,
        operation,
        providerId: context.providerId
      },
      validationIssues,
      'unauthenticated'
    );
  }

  private buildSummaryItems(
    operation: AuthenticationProviderOperation,
    success: boolean
  ): AuthenticationProviderSummaryItem[] {
    return [
      {
        key: 'operation',
        label: 'Operation',
        value: operation
      },
      {
        key: 'success',
        label: 'Success',
        value: success
      }
    ];
  }
}

export function createAuthenticationAdapter(
  registry?: AuthenticationProviderRegistry
): AuthenticationAdapter {
  return new AuthenticationAdapter(registry);
}

export default AuthenticationAdapter;
