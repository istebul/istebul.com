/**
 * İSTEBUL Identity — BusinessContextBridge (EPIC-302D).
 *
 * Tenant Session Bridge ile Business Runtime arasında orkestrasyon katmanı.
 * Architecture Freeze — Tenant Runtime / Business Runtime / Business Admin /
 * Tenant Session Bridge değiştirilmez.
 *
 * Pipeline:
 *   Tenant Session Bridge
 *     → Business Context Mapping
 *     → Business Projection
 *     → Summary
 *     → BusinessContextBridgeResult
 */

import type { TenantSessionBridge } from '../../tenant-isolation/bridge/TenantSessionBridge';
import type { TenantSessionBridgeResult } from '../../tenant-isolation/bridge/TenantSessionBridgeResult';
import { endStageTimer, startStageTimer } from '../../runtime/timing';
import type { BusinessRuntimePort } from './BusinessRuntimePort';
import type {
  BusinessContextBridgeContext,
  BusinessContextBridgeOperation
} from './BusinessContextBridgeContext';
import { resolveTenantSessionBridgeContextFromBusiness } from './BusinessContextBridgeContext';
import type {
  BusinessContextBridgeResult,
  BusinessContextBridgeSummaryItem,
  BusinessContextBridgeValidationIssue
} from './BusinessContextBridgeResult';
import { createBusinessContextBridgeResult } from './BusinessContextBridgeResult';
import type { BusinessContextBridgeRegistry } from './BusinessContextBridgeRegistry';
import { createBusinessContextBridgeRegistry } from './BusinessContextBridgeRegistry';
import type { BusinessContextModule } from './BusinessContextModule';
import {
  createBusinessContextBridgeBindingFromModule,
  mapTenantBridgeResultToBusinessContextModule,
  mapUpstreamIssuesToBusinessContextBridgeIssues,
  projectMappedBusinessContextModule
} from './businessContextBridgeMapping';

/**
 * Bridge bağımlılıkları — DI; singleton yok.
 */
export interface BusinessContextBridgeDependencies {
  /** Tenant Session Bridge */
  tenantSessionBridge: TenantSessionBridge;
  /** Business Runtime port (ör. BusinessAdminRuntime) */
  businessRuntime: BusinessRuntimePort;
  /** Bridge binding registry */
  bridgeRegistry?: BusinessContextBridgeRegistry;
  /** In-memory business context module store — instance scoped */
  contextModules?: Map<string, BusinessContextModule>;
}

/**
 * Business Context Bridge orchestrator.
 */
export class BusinessContextBridge {
  private readonly tenantSessionBridge: TenantSessionBridge;
  private readonly businessRuntime: BusinessRuntimePort;
  private readonly bridgeRegistry: BusinessContextBridgeRegistry;
  private readonly contextModules: Map<string, BusinessContextModule>;

  constructor(deps: BusinessContextBridgeDependencies) {
    if (!deps?.tenantSessionBridge) {
      throw new Error('tenantSessionBridge zorunludur.');
    }
    if (!deps?.businessRuntime) {
      throw new Error('businessRuntime zorunludur.');
    }
    this.tenantSessionBridge = deps.tenantSessionBridge;
    this.businessRuntime = deps.businessRuntime;
    this.bridgeRegistry =
      deps.bridgeRegistry ?? createBusinessContextBridgeRegistry();
    this.contextModules = deps.contextModules ?? new Map();
  }

  getBridgeRegistry(): BusinessContextBridgeRegistry {
    return this.bridgeRegistry;
  }

  getTenantSessionBridge(): TenantSessionBridge {
    return this.tenantSessionBridge;
  }

  getBusinessRuntime(): BusinessRuntimePort {
    return this.businessRuntime;
  }

  getContextModule(
    moduleId: string
  ): BusinessContextModule | undefined {
    return this.contextModules.get(moduleId);
  }

  listContextModules(): readonly BusinessContextModule[] {
    return Object.freeze([...this.contextModules.values()]);
  }

  synchronize(
    context: BusinessContextBridgeContext
  ): Promise<BusinessContextBridgeResult> {
    return this.execute({ ...context, operation: 'synchronize' });
  }

  refresh(
    context: BusinessContextBridgeContext
  ): Promise<BusinessContextBridgeResult> {
    return this.execute({ ...context, operation: 'refresh' });
  }

  validate(
    context: BusinessContextBridgeContext
  ): Promise<BusinessContextBridgeResult> {
    return this.execute({ ...context, operation: 'validate' });
  }

  mapWorkspace(
    context: BusinessContextBridgeContext
  ): Promise<BusinessContextBridgeResult> {
    return this.execute({ ...context, operation: 'mapWorkspace' });
  }

  /**
   * Bridge pipeline'ını çalıştırır.
   */
  async execute(
    context: BusinessContextBridgeContext
  ): Promise<BusinessContextBridgeResult> {
    const timer = startStageTimer();
    const operation = context.operation;
    const issues: BusinessContextBridgeValidationIssue[] = [];
    let businessContextCount = 0;
    let workspaceMappingCount = 0;
    let validationCount = 0;
    let refreshCount = 0;

    try {
      const tenantContext =
        resolveTenantSessionBridgeContextFromBusiness(context);
      const tenantBridgeResult =
        await this.invokeTenantBridge(operation, tenantContext);

      issues.push(
        ...mapUpstreamIssuesToBusinessContextBridgeIssues(tenantBridgeResult)
      );

      const existingBinding = this.resolveExistingBinding(
        context,
        tenantBridgeResult
      );
      const existingModule = existingBinding
        ? this.contextModules.get(existingBinding.businessContextModuleId)
        : this.resolveExistingModule(context, tenantBridgeResult);

      const tenantId =
        context.tenantId ||
        tenantBridgeResult.isolationModule?.tenantIdentity.tenantId ||
        tenantBridgeResult.binding?.tenantId ||
        existingModule?.tenantId;

      let businessRuntimeResult =
        tenantId && typeof tenantId === 'string'
          ? this.businessRuntime.execute({
              tenantId,
              locale: context.locale,
              actorId: context.actorId,
              moduleIds: context.moduleIds,
              bag: {
                ...(context.bag ?? {}),
                sessionId:
                  context.sessionId ||
                  tenantBridgeResult.isolationModule?.sessionId,
                businessId: context.businessId || tenantId
              }
            })
          : undefined;

      if (businessRuntimeResult) {
        issues.push(
          ...mapUpstreamIssuesToBusinessContextBridgeIssues(
            undefined,
            businessRuntimeResult
          )
        );
      }

      let businessContextModule: BusinessContextModule | undefined;
      let binding = existingBinding;

      const canMap =
        Boolean(tenantId) &&
        (tenantBridgeResult.success ||
          Boolean(existingModule) ||
          operation === 'validate');

      if (canMap) {
        businessContextModule = mapTenantBridgeResultToBusinessContextModule(
          tenantBridgeResult,
          businessRuntimeResult,
          {
            operation,
            existingModule,
            businessId: context.businessId || tenantId,
            workspaceId: context.workspaceId,
            workspaceLabel: context.workspaceLabel,
            moduleIds: context.moduleIds
          }
        );

        this.contextModules.set(
          businessContextModule.id,
          businessContextModule
        );
        binding = createBusinessContextBridgeBindingFromModule(
          businessContextModule,
          operation,
          existingBinding
        );
        this.bridgeRegistry.upsert(binding);

        businessContextCount = 1;
        workspaceMappingCount = businessContextModule.workspaces.length;
        if (operation === 'refresh') {
          refreshCount = 1;
        }
        if (operation === 'validate') {
          validationCount = 1;
        }
        if (operation === 'mapWorkspace') {
          workspaceMappingCount = Math.max(workspaceMappingCount, 1);
        }
      }

      if (operation === 'validate' && !businessContextModule) {
        validationCount = 1;
      }

      const success =
        Boolean(businessContextModule) &&
        Boolean(tenantBridgeResult.success) &&
        (businessRuntimeResult ? businessRuntimeResult.summary.success : true);

      const summaryItems = this.buildSummaryItems(
        operation,
        success,
        businessContextCount,
        workspaceMappingCount,
        validationCount,
        refreshCount
      );

      const { endedAt, durationMs } = endStageTimer(timer);

      return createBusinessContextBridgeResult({
        success,
        operation,
        tenantBridgeResult,
        businessRuntimeResult,
        businessContextModule,
        businessContextProjection: businessContextModule
          ? projectMappedBusinessContextModule(businessContextModule)
          : undefined,
        binding,
        validationIssues: issues,
        summaryItems,
        telemetry: {
          durationMs,
          startedAt: timer.startedAt,
          endedAt,
          businessContextCount,
          workspaceMappingCount,
          validationCount,
          refreshCount,
          summaryCount: summaryItems.length,
          operation
        },
        bag: {
          ...(context.bag ?? {}),
          tenantSuccess: tenantBridgeResult.success,
          businessSuccess: businessRuntimeResult?.summary.success,
          sessionId:
            context.sessionId ||
            businessContextModule?.sessionId ||
            binding?.sessionId
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
        businessContextCount,
        workspaceMappingCount,
        validationCount,
        refreshCount
      );
      const { endedAt, durationMs } = endStageTimer(timer);
      return createBusinessContextBridgeResult({
        success: false,
        operation,
        validationIssues: issues,
        summaryItems,
        telemetry: {
          durationMs,
          startedAt: timer.startedAt,
          endedAt,
          businessContextCount,
          workspaceMappingCount,
          validationCount,
          refreshCount,
          summaryCount: summaryItems.length,
          operation
        },
        bag: context.bag
      });
    }
  }

  private async invokeTenantBridge(
    operation: BusinessContextBridgeOperation,
    tenantContext: ReturnType<
      typeof resolveTenantSessionBridgeContextFromBusiness
    >
  ): Promise<TenantSessionBridgeResult> {
    switch (operation) {
      case 'synchronize':
        return this.tenantSessionBridge.synchronize(tenantContext);
      case 'refresh':
        return this.tenantSessionBridge.refresh(tenantContext);
      case 'validate':
        return this.tenantSessionBridge.validate(tenantContext);
      case 'mapWorkspace':
        return this.tenantSessionBridge.getTenant(tenantContext);
      default: {
        const exhaustive: never = operation;
        throw new Error(`Desteklenmeyen operasyon: ${exhaustive}`);
      }
    }
  }

  private resolveExistingBinding(
    context: BusinessContextBridgeContext,
    tenantBridgeResult: TenantSessionBridgeResult
  ) {
    if (context.bridgeBindingId) {
      return this.bridgeRegistry.getById(context.bridgeBindingId);
    }
    if (context.sessionId) {
      return this.bridgeRegistry.getBySessionId(context.sessionId);
    }
    const tenantId =
      context.tenantId ||
      tenantBridgeResult.binding?.tenantId ||
      tenantBridgeResult.isolationModule?.tenantIdentity.tenantId;
    if (tenantId) {
      const byTenant = this.bridgeRegistry.getByTenantId(tenantId);
      if (byTenant[0]) {
        return byTenant[0];
      }
    }
    if (context.businessId) {
      const byBusiness = this.bridgeRegistry.getByBusinessId(context.businessId);
      if (byBusiness[0]) {
        return byBusiness[0];
      }
    }
    if (context.identityId) {
      const byIdentity = this.bridgeRegistry.getByIdentityId(context.identityId);
      return byIdentity[0];
    }
    return undefined;
  }

  private resolveExistingModule(
    context: BusinessContextBridgeContext,
    tenantBridgeResult: TenantSessionBridgeResult
  ): BusinessContextModule | undefined {
    const businessId =
      context.businessId ||
      context.tenantId ||
      tenantBridgeResult.binding?.tenantId;
    if (businessId) {
      const candidate = this.contextModules.get(
        `business-context-${businessId}`
      );
      if (candidate) {
        return candidate;
      }
    }
    for (const module of this.contextModules.values()) {
      if (
        (context.tenantId && module.tenantId === context.tenantId) ||
        (context.sessionId && module.sessionId === context.sessionId)
      ) {
        return module;
      }
    }
    return undefined;
  }

  private buildSummaryItems(
    operation: BusinessContextBridgeOperation,
    success: boolean,
    businessContextCount: number,
    workspaceMappingCount: number,
    validationCount: number,
    refreshCount: number
  ): BusinessContextBridgeSummaryItem[] {
    return [
      { key: 'operation', label: 'Operation', value: operation },
      { key: 'success', label: 'Success', value: success },
      {
        key: 'businessContextCount',
        label: 'Business Context Count',
        value: businessContextCount
      },
      {
        key: 'workspaceMappingCount',
        label: 'Workspace Mapping Count',
        value: workspaceMappingCount
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
 * BusinessContextBridge üretir — singleton yok.
 */
export function createBusinessContextBridge(
  deps: BusinessContextBridgeDependencies
): BusinessContextBridge {
  return new BusinessContextBridge(deps);
}

export default BusinessContextBridge;
