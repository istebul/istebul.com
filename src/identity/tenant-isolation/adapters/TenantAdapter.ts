/**
 * İSTEBUL Identity — TenantAdapter (EPIC-302A).
 *
 * Tenant Runtime ile gerçek tenant sağlayıcıları arasında adapter katmanı.
 *
 * Architecture Freeze — tenant-isolation/runtime değiştirilmez.
 * Identity Runtime / Authentication Integration değiştirilmez.
 * Supabase / API / Database / RLS / Business Context yok.
 */

import type { TenantProvider } from './TenantProvider';
import type {
  TenantProviderContext,
  TenantProviderOperation
} from './TenantProviderContext';
import type {
  TenantProviderResult,
  TenantProviderSummaryItem,
  TenantProviderValidationIssue
} from './TenantProviderResult';
import {
  createTenantProviderFailure,
  createTenantProviderResult
} from './TenantProviderResult';
import type { TenantProviderRegistry } from './TenantProviderRegistry';
import { createTenantProviderRegistry } from './TenantProviderRegistry';
import {
  hasTenantProviderValidationErrors,
  resolveTenantProvider,
  resolveTenantProviderRegistration,
  validateTenantProviderContext
} from './tenantAdapterValidation';
import { endStageTimer, startStageTimer } from '../../runtime/timing';

/**
 * Tenant adapter — provider registry üzerinden operasyon yönlendirir.
 */
export class TenantAdapter {
  private readonly registry: TenantProviderRegistry;

  constructor(registry?: TenantProviderRegistry) {
    this.registry = registry ?? createTenantProviderRegistry(true);
  }

  getRegistry(): TenantProviderRegistry {
    return this.registry;
  }

  /**
   * Tenant çözümleme operasyonu.
   */
  resolveTenant(
    context: TenantProviderContext
  ): Promise<TenantProviderResult> {
    return this.executeOperation('resolveTenant', context);
  }

  /**
   * Tenant getirme operasyonu.
   */
  getTenant(context: TenantProviderContext): Promise<TenantProviderResult> {
    return this.executeOperation('getTenant', context);
  }

  /**
   * Üyelik listesi operasyonu.
   */
  listMemberships(
    context: TenantProviderContext
  ): Promise<TenantProviderResult> {
    return this.executeOperation('listMemberships', context);
  }

  /**
   * Erişim doğrulama operasyonu.
   */
  validateAccess(
    context: TenantProviderContext
  ): Promise<TenantProviderResult> {
    return this.executeOperation('validateAccess', context);
  }

  /**
   * Tenant yenileme operasyonu.
   */
  refreshTenant(
    context: TenantProviderContext
  ): Promise<TenantProviderResult> {
    return this.executeOperation('refreshTenant', context);
  }

  private async executeOperation(
    operation: TenantProviderOperation,
    context: TenantProviderContext
  ): Promise<TenantProviderResult> {
    const timer = startStageTimer();
    const startedAt = timer.startedAt;
    const enrichedContext: TenantProviderContext = {
      ...context,
      operation
    };

    const validationIssues = validateTenantProviderContext(
      enrichedContext,
      this.registry
    );

    if (hasTenantProviderValidationErrors(validationIssues)) {
      return this.buildResultFromValidationFailure(
        operation,
        enrichedContext,
        validationIssues,
        timer,
        startedAt
      );
    }

    const provider = resolveTenantProvider(enrichedContext, this.registry);

    if (!provider) {
      const registration = resolveTenantProviderRegistration(
        enrichedContext,
        this.registry
      );
      const issues: TenantProviderValidationIssue[] = [
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

    return createTenantProviderResult({
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
    provider: TenantProvider,
    operation: TenantProviderOperation,
    context: TenantProviderContext
  ): Promise<TenantProviderResult> | TenantProviderResult {
    switch (operation) {
      case 'resolveTenant':
        return provider.resolveTenant(context);
      case 'getTenant':
        return provider.getTenant(context);
      case 'listMemberships':
        return provider.listMemberships(context);
      case 'validateAccess':
        return provider.validateAccess(context);
      case 'refreshTenant':
        return provider.refreshTenant(context);
      default: {
        const exhaustive: never = operation;
        throw new Error(`Desteklenmeyen operasyon: ${exhaustive}`);
      }
    }
  }

  private buildResultFromValidationFailure(
    operation: TenantProviderOperation,
    context: TenantProviderContext,
    validationIssues: readonly TenantProviderValidationIssue[],
    timer: ReturnType<typeof startStageTimer>,
    startedAt: string
  ): TenantProviderResult {
    const { endedAt, durationMs } = endStageTimer(timer);

    return createTenantProviderFailure(
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
      'unresolved'
    );
  }

  private buildSummaryItems(
    operation: TenantProviderOperation,
    success: boolean
  ): TenantProviderSummaryItem[] {
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

export function createTenantAdapter(
  registry?: TenantProviderRegistry
): TenantAdapter {
  return new TenantAdapter(registry);
}

export default TenantAdapter;
