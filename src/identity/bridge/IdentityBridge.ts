/**
 * İSTEBUL Identity — IdentityBridge (EPIC-301D).
 *
 * Identity Runtime ile Authentication Integration katmanları arasında
 * orkestrasyon bridge'i.
 *
 * Architecture Freeze — Identity / Authentication / Session / Authorization /
 * Tenant Runtime, Authentication Adapter, Supabase Provider ve
 * Authentication Session Bridge değiştirilmez.
 *
 * Pipeline:
 *   Authentication Adapter
 *     → Session Bridge
 *     → Identity Mapping
 *     → Identity Projection
 *     → Summary
 *     → IdentityBridgeResult
 */

import type { AuthenticationAdapter } from '../authentication/adapters/AuthenticationAdapter';
import type { AuthenticationProviderResult } from '../authentication/adapters/AuthenticationProviderResult';
import type { AuthenticationSessionBridge } from '../authentication/bridge/AuthenticationSessionBridge';
import type { AuthenticationSessionBridgeResult } from '../authentication/bridge/AuthenticationSessionBridgeResult';
import type { IdentityRegistry } from '../runtime/IdentityRegistry';
import { createIdentityRegistry } from '../runtime/IdentityRegistry';
import type { IdentityRuntime } from '../runtime/IdentityRuntime';
import { createIdentityRuntime } from '../runtime/IdentityRuntime';
import { createIdentityContext } from '../runtime/IdentityContext';
import type { IdentityModule } from '../runtime/IdentityModule';
import { endStageTimer, startStageTimer } from '../runtime/timing';
import type {
  IdentityBridgeContext,
  IdentityBridgeOperation
} from './IdentityBridgeContext';
import {
  resolveIdentityBridgeProviderContext,
  toAuthenticationSessionBridgeContextFromIdentity
} from './IdentityBridgeContext';
import type {
  IdentityBridgeResult,
  IdentityBridgeSummaryItem,
  IdentityBridgeValidationIssue
} from './IdentityBridgeResult';
import { createIdentityBridgeResult } from './IdentityBridgeResult';
import type { IdentityBridgeRegistry } from './IdentityBridgeRegistry';
import { createIdentityBridgeRegistry } from './IdentityBridgeRegistry';
import {
  createIdentityBridgeBindingFromModule,
  mapIntegrationIssuesToIdentityBridgeIssues,
  mapIntegrationResultsToIdentityModule,
  projectMappedIdentityModule
} from './identityBridgeMapping';

/**
 * Identity Bridge bağımlılıkları — DI; singleton yok.
 */
export interface IdentityBridgeDependencies {
  /** Authentication adapter */
  authenticationAdapter: AuthenticationAdapter;
  /** Authentication session bridge */
  authenticationSessionBridge: AuthenticationSessionBridge;
  /** Identity runtime */
  identityRuntime?: IdentityRuntime;
  /** Identity registry — runtime ile paylaşılmalı */
  identityRegistry?: IdentityRegistry;
  /** Identity bridge binding registry */
  bridgeRegistry?: IdentityBridgeRegistry;
}

/**
 * Identity Bridge orchestrator.
 */
export class IdentityBridge {
  private readonly authenticationAdapter: AuthenticationAdapter;
  private readonly authenticationSessionBridge: AuthenticationSessionBridge;
  private readonly identityRegistry: IdentityRegistry;
  private readonly identityRuntime: IdentityRuntime;
  private readonly bridgeRegistry: IdentityBridgeRegistry;

  constructor(deps: IdentityBridgeDependencies) {
    if (!deps?.authenticationAdapter) {
      throw new Error('authenticationAdapter zorunludur.');
    }
    if (!deps?.authenticationSessionBridge) {
      throw new Error('authenticationSessionBridge zorunludur.');
    }
    this.authenticationAdapter = deps.authenticationAdapter;
    this.authenticationSessionBridge = deps.authenticationSessionBridge;
    this.identityRegistry =
      deps.identityRegistry ??
      deps.identityRuntime?.getRegistry() ??
      createIdentityRegistry(false);
    this.identityRuntime =
      deps.identityRuntime ?? createIdentityRuntime(this.identityRegistry);
    this.bridgeRegistry =
      deps.bridgeRegistry ?? createIdentityBridgeRegistry();
  }

  getBridgeRegistry(): IdentityBridgeRegistry {
    return this.bridgeRegistry;
  }

  getIdentityRegistry(): IdentityRegistry {
    return this.identityRegistry;
  }

  getIdentityRuntime(): IdentityRuntime {
    return this.identityRuntime;
  }

  getAuthenticationAdapter(): AuthenticationAdapter {
    return this.authenticationAdapter;
  }

  getAuthenticationSessionBridge(): AuthenticationSessionBridge {
    return this.authenticationSessionBridge;
  }

  synchronize(context: IdentityBridgeContext): Promise<IdentityBridgeResult> {
    return this.execute({ ...context, operation: 'synchronize' });
  }

  refresh(context: IdentityBridgeContext): Promise<IdentityBridgeResult> {
    return this.execute({ ...context, operation: 'refresh' });
  }

  logout(context: IdentityBridgeContext): Promise<IdentityBridgeResult> {
    return this.execute({ ...context, operation: 'logout' });
  }

  validate(context: IdentityBridgeContext): Promise<IdentityBridgeResult> {
    return this.execute({ ...context, operation: 'validate' });
  }

  /**
   * Identity Bridge pipeline'ını çalıştırır.
   */
  async execute(context: IdentityBridgeContext): Promise<IdentityBridgeResult> {
    const timer = startStageTimer();
    const operation = context.operation;
    const issues: IdentityBridgeValidationIssue[] = [];
    let identitySynchronizationCount = 0;
    let sessionMappingCount = 0;
    let authenticationMappingCount = 0;

    try {
      const providerContext = resolveIdentityBridgeProviderContext(context);
      const providerResult = await this.invokeProvider(operation, providerContext);
      authenticationMappingCount = 1;

      const sessionBridgeContext =
        toAuthenticationSessionBridgeContextFromIdentity({
          ...context,
          operation,
          sessionBridgeBindingId:
            context.sessionBridgeBindingId ||
            this.resolveSessionBridgeBindingId(context, providerResult)
        });
      const sessionBridgeResult =
        await this.authenticationSessionBridge.execute(sessionBridgeContext);
      if (sessionBridgeResult.sessionModule || sessionBridgeResult.binding) {
        sessionMappingCount = 1;
      }

      issues.push(
        ...mapIntegrationIssuesToIdentityBridgeIssues(
          providerResult,
          sessionBridgeResult
        )
      );

      const existingBinding = this.resolveExistingBinding(
        context,
        providerResult,
        sessionBridgeResult
      );
      const existingModule = existingBinding
        ? this.identityRegistry.getById(existingBinding.identityModuleId)
        : providerResult.principal?.identityId
          ? this.identityRegistry.getById(
              `identity-bridge-${providerResult.principal.identityId}`
            ) || this.identityRegistry.getById(providerResult.principal.identityId)
          : undefined;

      let identityModule: IdentityModule | undefined;
      let binding = existingBinding;

      const shouldMapIdentity =
        providerResult.success ||
        operation === 'logout' ||
        (operation === 'validate' && Boolean(existingModule));

      if (
        shouldMapIdentity &&
        (providerResult.principal ||
          existingModule ||
          sessionBridgeResult.sessionModule)
      ) {
        const mappingSource =
          providerResult.principal || existingModule
            ? providerResult
            : {
                ...providerResult,
                principal: sessionBridgeResult.sessionModule
                  ? {
                      principalId:
                        sessionBridgeResult.sessionModule.session.principalId,
                      identityId:
                        sessionBridgeResult.sessionModule.session.identityId,
                      displayName:
                        sessionBridgeResult.sessionModule.session.identityId
                    }
                  : undefined,
                status:
                  operation === 'logout' ? ('revoked' as const) : providerResult.status
              };

        identityModule = mapIntegrationResultsToIdentityModule(
          mappingSource,
          { operation, existingModule },
          sessionBridgeResult
        );

        this.upsertIdentityModule(identityModule);
        binding = createIdentityBridgeBindingFromModule(
          identityModule,
          providerResult.providerId,
          operation,
          sessionBridgeResult,
          existingBinding
        );
        this.bridgeRegistry.upsert(binding);
        identitySynchronizationCount = 1;
      }

      const identityResult = identityModule
        ? this.identityRuntime.execute(
            createIdentityContext({
              locale: context.locale,
              identityIds: [identityModule.id],
              actorId: context.actorId,
              bag: context.bag
            })
          )
        : undefined;

      const summaryItems = this.buildSummaryItems(
        operation,
        Boolean(
          operation === 'logout'
            ? providerResult.success
            : providerResult.success && identityModule
        ),
        identitySynchronizationCount,
        sessionMappingCount,
        authenticationMappingCount
      );

      const { endedAt, durationMs } = endStageTimer(timer);

      return createIdentityBridgeResult({
        success:
          operation === 'logout'
            ? providerResult.success
            : providerResult.success && Boolean(identityModule),
        operation,
        providerResult,
        sessionBridgeResult,
        identityResult,
        identityModule,
        identityProjection: identityModule
          ? projectMappedIdentityModule(identityModule)
          : undefined,
        binding,
        validationIssues: issues,
        summaryItems,
        telemetry: {
          durationMs,
          startedAt: timer.startedAt,
          endedAt,
          identitySynchronizationCount,
          sessionMappingCount,
          authenticationMappingCount,
          summaryCount: summaryItems.length,
          operation
        },
        bag: {
          ...(context.bag ?? {}),
          providerSuccess: providerResult.success,
          sessionBridgeSuccess: sessionBridgeResult.success
        }
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Identity bridge yürütme hatası.';
      issues.push({
        code: 'IDENTITY_BRIDGE_EXECUTION_ERROR',
        message,
        severity: 'error'
      });
      const summaryItems = this.buildSummaryItems(
        operation,
        false,
        identitySynchronizationCount,
        sessionMappingCount,
        authenticationMappingCount
      );
      const { endedAt, durationMs } = endStageTimer(timer);
      return createIdentityBridgeResult({
        success: false,
        operation,
        validationIssues: issues,
        summaryItems,
        telemetry: {
          durationMs,
          startedAt: timer.startedAt,
          endedAt,
          identitySynchronizationCount,
          sessionMappingCount,
          authenticationMappingCount,
          summaryCount: summaryItems.length,
          operation
        },
        bag: context.bag
      });
    }
  }

  private async invokeProvider(
    operation: IdentityBridgeOperation,
    providerContext: ReturnType<typeof resolveIdentityBridgeProviderContext>
  ): Promise<AuthenticationProviderResult> {
    switch (operation) {
      case 'synchronize':
        return this.authenticationAdapter.authenticate(providerContext);
      case 'refresh':
        return this.authenticationAdapter.refresh(providerContext);
      case 'logout':
        return this.authenticationAdapter.logout(providerContext);
      case 'validate':
        return this.authenticationAdapter.validateSession(providerContext);
      default: {
        const exhaustive: never = operation;
        throw new Error(`Desteklenmeyen identity bridge operasyonu: ${exhaustive}`);
      }
    }
  }

  private resolveSessionBridgeBindingId(
    context: IdentityBridgeContext,
    providerResult: AuthenticationProviderResult
  ): string | undefined {
    if (context.sessionBridgeBindingId) {
      return context.sessionBridgeBindingId;
    }
    if (context.bridgeBindingId) {
      const binding = this.bridgeRegistry.getById(context.bridgeBindingId);
      return binding?.sessionBridgeBindingId;
    }
    if (providerResult.principal?.identityId) {
      const byIdentity = this.bridgeRegistry.getByIdentityId(
        providerResult.principal.identityId
      );
      return byIdentity[0]?.sessionBridgeBindingId;
    }
    return undefined;
  }

  private resolveExistingBinding(
    context: IdentityBridgeContext,
    providerResult: AuthenticationProviderResult,
    sessionBridgeResult: AuthenticationSessionBridgeResult
  ) {
    if (context.bridgeBindingId) {
      return this.bridgeRegistry.getById(context.bridgeBindingId);
    }
    if (context.identityId) {
      return this.bridgeRegistry.getByIdentityId(context.identityId)[0];
    }
    if (sessionBridgeResult.binding?.sessionId) {
      return this.bridgeRegistry.getBySessionId(
        sessionBridgeResult.binding.sessionId
      );
    }
    if (providerResult.principal?.identityId) {
      return this.bridgeRegistry.getByIdentityId(
        providerResult.principal.identityId
      )[0];
    }
    return undefined;
  }

  private upsertIdentityModule(module: IdentityModule): void {
    const existing = this.identityRegistry.getById(module.id);
    if (existing) {
      this.identityRegistry.unregister(module.id);
    }
    this.identityRegistry.register(module);
  }

  private buildSummaryItems(
    operation: IdentityBridgeOperation,
    success: boolean,
    identitySynchronizationCount: number,
    sessionMappingCount: number,
    authenticationMappingCount: number
  ): IdentityBridgeSummaryItem[] {
    return [
      { key: 'operation', label: 'Operation', value: operation },
      { key: 'success', label: 'Success', value: success },
      {
        key: 'identitySynchronizationCount',
        label: 'Identity Sync Count',
        value: identitySynchronizationCount
      },
      {
        key: 'sessionMappingCount',
        label: 'Session Mapping Count',
        value: sessionMappingCount
      },
      {
        key: 'authenticationMappingCount',
        label: 'Authentication Mapping Count',
        value: authenticationMappingCount
      }
    ];
  }
}

/**
 * IdentityBridge üretir — singleton yok.
 */
export function createIdentityBridge(
  deps: IdentityBridgeDependencies
): IdentityBridge {
  return new IdentityBridge(deps);
}

export default IdentityBridge;
