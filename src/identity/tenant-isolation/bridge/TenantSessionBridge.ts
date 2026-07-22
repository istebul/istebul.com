/**
 * İSTEBUL Identity — TenantSessionBridge (EPIC-302C).
 *
 * Tenant Provider ile Tenant Runtime arasında orkestrasyon katmanı.
 * Architecture Freeze — Tenant Isolation Runtime / TenantAdapter /
 * SupabaseTenantProvider değiştirilmez.
 *
 * Pipeline:
 *   Tenant Provider
 *     → Bridge Mapping
 *     → Tenant Projection
 *     → Summary
 *     → TenantSessionBridgeResult
 */

import type { TenantAdapter } from '../adapters/TenantAdapter';
import type { TenantProviderResult } from '../adapters/TenantProviderResult';
import type { TenantIsolationRegistry } from '../runtime/TenantIsolationRegistry';
import { createTenantIsolationRegistry } from '../runtime/TenantIsolationRegistry';
import type { TenantIsolationRuntime } from '../runtime/TenantIsolationRuntime';
import { createTenantIsolationRuntime } from '../runtime/TenantIsolationRuntime';
import { createTenantIsolationContext } from '../runtime/TenantIsolationContext';
import type { TenantIsolationModule } from '../runtime/TenantIsolationModule';
import { endStageTimer, startStageTimer } from '../../runtime/timing';
import type {
  TenantSessionBridgeContext,
  TenantSessionBridgeOperation
} from './TenantSessionBridgeContext';
import {
  mapTenantBridgeOperationToProviderOperation,
  resolveTenantBridgeProviderContext
} from './TenantSessionBridgeContext';
import type {
  TenantSessionBridgeResult,
  TenantSessionBridgeSummaryItem,
  TenantSessionBridgeValidationIssue
} from './TenantSessionBridgeResult';
import { createTenantSessionBridgeResult } from './TenantSessionBridgeResult';
import type { TenantSessionBridgeRegistry } from './TenantSessionBridgeRegistry';
import { createTenantSessionBridgeRegistry } from './TenantSessionBridgeRegistry';
import {
  createBridgeBindingFromIsolationModule,
  mapTenantProviderIssuesToBridgeIssues,
  mapTenantProviderResultToIsolationModule,
  projectMappedIsolationModule
} from './tenantSessionBridgeMapping';

/**
 * Bridge bağımlılıkları — DI; singleton yok.
 */
export interface TenantSessionBridgeDependencies {
  /** Tenant adapter (provider çağrıları) */
  tenantAdapter: TenantAdapter;
  /** Tenant isolation runtime (projeksiyon) */
  isolationRuntime?: TenantIsolationRuntime;
  /** Isolation registry — runtime ile paylaşılmalı */
  isolationRegistry?: TenantIsolationRegistry;
  /** Bridge binding registry */
  bridgeRegistry?: TenantSessionBridgeRegistry;
}

/**
 * Tenant Session Bridge orchestrator.
 */
export class TenantSessionBridge {
  private readonly tenantAdapter: TenantAdapter;
  private readonly isolationRegistry: TenantIsolationRegistry;
  private readonly isolationRuntime: TenantIsolationRuntime;
  private readonly bridgeRegistry: TenantSessionBridgeRegistry;

  constructor(deps: TenantSessionBridgeDependencies) {
    if (!deps?.tenantAdapter) {
      throw new Error('tenantAdapter zorunludur.');
    }
    this.tenantAdapter = deps.tenantAdapter;
    this.isolationRegistry =
      deps.isolationRegistry ??
      deps.isolationRuntime?.getRegistry() ??
      createTenantIsolationRegistry(false);
    this.isolationRuntime =
      deps.isolationRuntime ??
      createTenantIsolationRuntime(this.isolationRegistry);
    this.bridgeRegistry =
      deps.bridgeRegistry ?? createTenantSessionBridgeRegistry();
  }

  getBridgeRegistry(): TenantSessionBridgeRegistry {
    return this.bridgeRegistry;
  }

  getIsolationRegistry(): TenantIsolationRegistry {
    return this.isolationRegistry;
  }

  getIsolationRuntime(): TenantIsolationRuntime {
    return this.isolationRuntime;
  }

  getTenantAdapter(): TenantAdapter {
    return this.tenantAdapter;
  }

  /**
   * Provider resolveTenant → tenant senkronizasyonu.
   */
  synchronize(
    context: TenantSessionBridgeContext
  ): Promise<TenantSessionBridgeResult> {
    return this.execute({ ...context, operation: 'synchronize' });
  }

  /**
   * Provider refreshTenant → yenileme koordinasyonu.
   */
  refresh(
    context: TenantSessionBridgeContext
  ): Promise<TenantSessionBridgeResult> {
    return this.execute({ ...context, operation: 'refresh' });
  }

  /**
   * Provider validateAccess → erişim doğrulama.
   */
  validate(
    context: TenantSessionBridgeContext
  ): Promise<TenantSessionBridgeResult> {
    return this.execute({ ...context, operation: 'validate' });
  }

  /**
   * Provider listMemberships → üyelik senkronizasyonu.
   */
  listMemberships(
    context: TenantSessionBridgeContext
  ): Promise<TenantSessionBridgeResult> {
    return this.execute({ ...context, operation: 'listMemberships' });
  }

  /**
   * Provider getTenant → tenant getirme.
   */
  getTenant(
    context: TenantSessionBridgeContext
  ): Promise<TenantSessionBridgeResult> {
    return this.execute({ ...context, operation: 'getTenant' });
  }

  /**
   * Bridge pipeline'ını çalıştırır.
   */
  async execute(
    context: TenantSessionBridgeContext
  ): Promise<TenantSessionBridgeResult> {
    const timer = startStageTimer();
    const operation = context.operation;
    const issues: TenantSessionBridgeValidationIssue[] = [];
    let tenantSynchronizationCount = 0;
    let membershipSynchronizationCount = 0;
    let validationCount = 0;
    let refreshCount = 0;

    try {
      const providerContext = resolveTenantBridgeProviderContext(context);
      const providerResult = await this.invokeProvider(
        operation,
        providerContext
      );
      issues.push(...mapTenantProviderIssuesToBridgeIssues(providerResult));

      const existingBinding = this.resolveExistingBinding(
        context,
        providerResult
      );
      const existingModule = existingBinding
        ? this.isolationRegistry.getById(existingBinding.isolationModuleId)
        : this.resolveExistingModule(context, providerResult);

      let isolationModule: TenantIsolationModule | undefined;
      let binding = existingBinding;

      const shouldMap =
        providerResult.success ||
        operation === 'validate' ||
        (operation === 'listMemberships' && Boolean(existingModule));

      if (
        shouldMap &&
        (providerResult.tenant ||
          providerResult.memberships?.length ||
          existingModule ||
          providerResult.accessOutcome)
      ) {
        isolationModule = mapTenantProviderResultToIsolationModule(
          providerResult,
          {
            operation,
            existingModule,
            sessionId: context.sessionId ?? existingBinding?.sessionId,
            identityId: context.identityId ?? existingBinding?.identityId
          }
        );

        this.upsertIsolationModule(isolationModule);
        binding = createBridgeBindingFromIsolationModule(
          isolationModule,
          providerResult.providerId,
          operation,
          existingBinding
        );
        this.bridgeRegistry.upsert(binding);

        tenantSynchronizationCount = providerResult.tenant || existingModule ? 1 : 0;
        membershipSynchronizationCount = isolationModule.memberships.length;
        if (operation === 'refresh') {
          refreshCount = 1;
          tenantSynchronizationCount = 1;
        }
        if (operation === 'validate') {
          validationCount = 1;
        }
        if (operation === 'synchronize' || operation === 'getTenant') {
          tenantSynchronizationCount = 1;
        }
        if (operation === 'listMemberships') {
          membershipSynchronizationCount = isolationModule.memberships.length;
        }
      }

      if (operation === 'validate' && !isolationModule) {
        validationCount = 1;
      }

      const isolationResult = isolationModule
        ? this.isolationRuntime.execute(
            createTenantIsolationContext({
              locale: context.locale,
              isolationIds: [isolationModule.id],
              tenantId: isolationModule.tenantIdentity.tenantId,
              identityId: isolationModule.primaryIdentityId,
              actorId: context.actorId,
              bag: {
                ...(context.bag ?? {}),
                sessionId: isolationModule.sessionId
              }
            })
          )
        : undefined;

      const summaryItems = this.buildSummaryItems(
        operation,
        Boolean(providerResult.success && isolationModule),
        tenantSynchronizationCount,
        membershipSynchronizationCount,
        validationCount,
        refreshCount
      );

      const { endedAt, durationMs } = endStageTimer(timer);

      return createTenantSessionBridgeResult({
        success: providerResult.success && Boolean(isolationModule),
        operation,
        providerResult,
        isolationResult,
        isolationModule,
        isolationProjection: isolationModule
          ? projectMappedIsolationModule(isolationModule)
          : undefined,
        binding,
        validationIssues: issues,
        summaryItems,
        telemetry: {
          durationMs,
          startedAt: timer.startedAt,
          endedAt,
          tenantSynchronizationCount,
          membershipSynchronizationCount,
          validationCount,
          refreshCount,
          summaryCount: summaryItems.length,
          operation
        },
        bag: {
          ...(context.bag ?? {}),
          providerSuccess: providerResult.success,
          sessionId: context.sessionId ?? binding?.sessionId
        }
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Bridge yürütme hatası.';
      issues.push({
        code: 'BRIDGE_EXECUTION_ERROR',
        message,
        severity: 'error'
      });
      const summaryItems = this.buildSummaryItems(
        operation,
        false,
        tenantSynchronizationCount,
        membershipSynchronizationCount,
        validationCount,
        refreshCount
      );
      const { endedAt, durationMs } = endStageTimer(timer);
      return createTenantSessionBridgeResult({
        success: false,
        operation,
        validationIssues: issues,
        summaryItems,
        telemetry: {
          durationMs,
          startedAt: timer.startedAt,
          endedAt,
          tenantSynchronizationCount,
          membershipSynchronizationCount,
          validationCount,
          refreshCount,
          summaryCount: summaryItems.length,
          operation
        },
        bag: context.bag
      });
    }
  }

  private async invokeProvider(
    operation: TenantSessionBridgeOperation,
    providerContext: ReturnType<typeof resolveTenantBridgeProviderContext>
  ): Promise<TenantProviderResult> {
    const providerOperation =
      mapTenantBridgeOperationToProviderOperation(operation);
    switch (providerOperation) {
      case 'resolveTenant':
        return this.tenantAdapter.resolveTenant(providerContext);
      case 'getTenant':
        return this.tenantAdapter.getTenant(providerContext);
      case 'listMemberships':
        return this.tenantAdapter.listMemberships(providerContext);
      case 'validateAccess':
        return this.tenantAdapter.validateAccess(providerContext);
      case 'refreshTenant':
        return this.tenantAdapter.refreshTenant(providerContext);
      default: {
        const exhaustive: never = providerOperation;
        throw new Error(`Desteklenmeyen provider operasyonu: ${exhaustive}`);
      }
    }
  }

  private resolveExistingBinding(
    context: TenantSessionBridgeContext,
    providerResult: TenantProviderResult
  ) {
    if (context.bridgeBindingId) {
      return this.bridgeRegistry.getById(context.bridgeBindingId);
    }
    if (context.sessionId) {
      return this.bridgeRegistry.getBySessionId(context.sessionId);
    }
    const tenantId =
      context.tenantId ||
      providerResult.tenant?.tenantId ||
      (providerResult.bag?.supabaseTenant as { id?: string } | undefined)?.id;
    if (tenantId) {
      const byTenant = this.bridgeRegistry.getByTenantId(tenantId);
      if (byTenant[0]) {
        return byTenant[0];
      }
    }
    if (context.identityId) {
      const byIdentity = this.bridgeRegistry.getByIdentityId(context.identityId);
      return byIdentity[0];
    }
    const membershipIdentity = providerResult.memberships?.[0]?.identityId;
    if (membershipIdentity) {
      const byIdentity =
        this.bridgeRegistry.getByIdentityId(membershipIdentity);
      return byIdentity[0];
    }
    return undefined;
  }

  private resolveExistingModule(
    context: TenantSessionBridgeContext,
    providerResult: TenantProviderResult
  ): TenantIsolationModule | undefined {
    const tenantId =
      context.tenantId ||
      providerResult.tenant?.tenantId ||
      (providerResult.bag?.supabaseTenant as { id?: string } | undefined)?.id;
    if (tenantId) {
      const byTenant = this.isolationRegistry.getByTenantId(tenantId);
      if (byTenant[0]) {
        return byTenant[0];
      }
    }
    if (context.identityId) {
      const byIdentity = this.isolationRegistry.getByIdentityId(
        context.identityId
      );
      return byIdentity[0];
    }
    return undefined;
  }

  private upsertIsolationModule(module: TenantIsolationModule): void {
    const existing = this.isolationRegistry.getById(module.id);
    if (existing) {
      this.isolationRegistry.unregister(module.id);
    }
    this.isolationRegistry.register(module);
  }

  private buildSummaryItems(
    operation: TenantSessionBridgeOperation,
    success: boolean,
    tenantSynchronizationCount: number,
    membershipSynchronizationCount: number,
    validationCount: number,
    refreshCount: number
  ): TenantSessionBridgeSummaryItem[] {
    return [
      { key: 'operation', label: 'Operation', value: operation },
      { key: 'success', label: 'Success', value: success },
      {
        key: 'tenantSynchronizationCount',
        label: 'Tenant Sync Count',
        value: tenantSynchronizationCount
      },
      {
        key: 'membershipSynchronizationCount',
        label: 'Membership Sync Count',
        value: membershipSynchronizationCount
      },
      {
        key: 'validationCount',
        label: 'Validation Count',
        value: validationCount
      },
      { key: 'refreshCount', label: 'Refresh Count', value: refreshCount }
    ];
  }
}

/**
 * TenantSessionBridge üretir — singleton yok.
 */
export function createTenantSessionBridge(
  deps: TenantSessionBridgeDependencies
): TenantSessionBridge {
  return new TenantSessionBridge(deps);
}

export default TenantSessionBridge;
