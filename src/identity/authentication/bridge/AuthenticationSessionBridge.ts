/**
 * İSTEBUL Identity — AuthenticationSessionBridge (EPIC-301C).
 *
 * Authentication Provider ile Session Runtime arasında orkestrasyon katmanı.
 * Architecture Freeze — AuthenticationRuntime / SessionRuntime /
 * SupabaseAuthenticationProvider değiştirilmez.
 *
 * Pipeline:
 *   Authentication Provider
 *     → Bridge Mapping
 *     → Session Projection
 *     → Summary
 *     → AuthenticationSessionBridgeResult
 */

import type { AuthenticationAdapter } from '../adapters/AuthenticationAdapter';
import type { AuthenticationProviderResult } from '../adapters/AuthenticationProviderResult';
import type { SessionRegistry } from '../../session/runtime/SessionRegistry';
import { createSessionRegistry } from '../../session/runtime/SessionRegistry';
import type { SessionRuntime } from '../../session/runtime/SessionRuntime';
import { createSessionRuntime } from '../../session/runtime/SessionRuntime';
import { createSessionContext } from '../../session/runtime/SessionContext';
import type { SessionModule } from '../../session/runtime/SessionModule';
import {
  endStageTimer,
  startStageTimer
} from '../../runtime/timing';
import type {
  AuthenticationSessionBridgeContext,
  AuthenticationSessionBridgeOperation
} from './AuthenticationSessionBridgeContext';
import {
  mapBridgeOperationToProviderOperation,
  resolveBridgeProviderContext
} from './AuthenticationSessionBridgeContext';
import type {
  AuthenticationSessionBridgeResult,
  AuthenticationSessionBridgeSummaryItem,
  AuthenticationSessionBridgeValidationIssue
} from './AuthenticationSessionBridgeResult';
import { createAuthenticationSessionBridgeResult } from './AuthenticationSessionBridgeResult';
import type { AuthenticationSessionBridgeRegistry } from './AuthenticationSessionBridgeRegistry';
import { createAuthenticationSessionBridgeRegistry } from './AuthenticationSessionBridgeRegistry';
import {
  createBridgeBindingFromSessionModule,
  mapAuthenticationProviderResultToSessionModule,
  mapProviderIssuesToBridgeIssues,
  projectMappedSessionModule
} from './authenticationSessionBridgeMapping';

/**
 * Bridge bağımlılıkları — DI; singleton yok.
 */
export interface AuthenticationSessionBridgeDependencies {
  /** Authentication adapter (provider çağrıları) */
  authenticationAdapter: AuthenticationAdapter;
  /** Session runtime (projeksiyon) */
  sessionRuntime?: SessionRuntime;
  /** Session registry — runtime ile paylaşılmalı */
  sessionRegistry?: SessionRegistry;
  /** Bridge binding registry */
  bridgeRegistry?: AuthenticationSessionBridgeRegistry;
}

/**
 * Authentication Session Bridge orchestrator.
 */
export class AuthenticationSessionBridge {
  private readonly authenticationAdapter: AuthenticationAdapter;
  private readonly sessionRegistry: SessionRegistry;
  private readonly sessionRuntime: SessionRuntime;
  private readonly bridgeRegistry: AuthenticationSessionBridgeRegistry;

  constructor(deps: AuthenticationSessionBridgeDependencies) {
    if (!deps?.authenticationAdapter) {
      throw new Error('authenticationAdapter zorunludur.');
    }
    this.authenticationAdapter = deps.authenticationAdapter;
    this.sessionRegistry =
      deps.sessionRegistry ??
      deps.sessionRuntime?.getRegistry() ??
      createSessionRegistry(false);
    this.sessionRuntime =
      deps.sessionRuntime ?? createSessionRuntime(this.sessionRegistry);
    this.bridgeRegistry =
      deps.bridgeRegistry ?? createAuthenticationSessionBridgeRegistry();
  }

  getBridgeRegistry(): AuthenticationSessionBridgeRegistry {
    return this.bridgeRegistry;
  }

  getSessionRegistry(): SessionRegistry {
    return this.sessionRegistry;
  }

  getSessionRuntime(): SessionRuntime {
    return this.sessionRuntime;
  }

  getAuthenticationAdapter(): AuthenticationAdapter {
    return this.authenticationAdapter;
  }

  /**
   * Provider authenticate → session senkronizasyonu.
   */
  synchronize(
    context: AuthenticationSessionBridgeContext
  ): Promise<AuthenticationSessionBridgeResult> {
    return this.execute({ ...context, operation: 'synchronize' });
  }

  /**
   * Provider refresh → session yenileme koordinasyonu.
   */
  refresh(
    context: AuthenticationSessionBridgeContext
  ): Promise<AuthenticationSessionBridgeResult> {
    return this.execute({ ...context, operation: 'refresh' });
  }

  /**
   * Provider logout → session temizliği.
   */
  logout(
    context: AuthenticationSessionBridgeContext
  ): Promise<AuthenticationSessionBridgeResult> {
    return this.execute({ ...context, operation: 'logout' });
  }

  /**
   * Provider validateSession → session doğrulama.
   */
  validate(
    context: AuthenticationSessionBridgeContext
  ): Promise<AuthenticationSessionBridgeResult> {
    return this.execute({ ...context, operation: 'validate' });
  }

  /**
   * Bridge pipeline'ını çalıştırır.
   */
  async execute(
    context: AuthenticationSessionBridgeContext
  ): Promise<AuthenticationSessionBridgeResult> {
    const timer = startStageTimer();
    const operation = context.operation;
    const issues: AuthenticationSessionBridgeValidationIssue[] = [];
    let sessionSynchronizationCount = 0;
    let refreshCount = 0;
    let validationCount = 0;

    try {
      const providerContext = resolveBridgeProviderContext(context);
      const providerResult = await this.invokeProvider(
        operation,
        providerContext
      );
      issues.push(...mapProviderIssuesToBridgeIssues(providerResult));

      const existingBinding = this.resolveExistingBinding(
        context,
        providerResult
      );
      const existingModule = existingBinding
        ? this.sessionRegistry.getById(existingBinding.sessionModuleId)
        : providerResult.credentialReference?.credentialId
          ? this.sessionRegistry.getBySessionId(
              providerResult.credentialReference.credentialId
            )
          : undefined;

      let sessionModule: SessionModule | undefined;
      let binding = existingBinding;

      const shouldMapSession =
        providerResult.success ||
        operation === 'logout' ||
        operation === 'validate';

      if (shouldMapSession && (providerResult.principal || existingModule || operation === 'logout')) {
        if (operation === 'logout' && !providerResult.principal && existingModule) {
          sessionModule = mapAuthenticationProviderResultToSessionModule(
            {
              ...providerResult,
              status: 'revoked',
              principal: {
                principalId: existingModule.session.principalId,
                identityId: existingModule.session.identityId,
                displayName: existingModule.session.principalId
              },
              credentialReference: {
                credentialId: existingModule.session.sessionId,
                method: 'session-ref'
              }
            },
            { operation, existingModule }
          );
        } else if (providerResult.principal || existingModule) {
          sessionModule = mapAuthenticationProviderResultToSessionModule(
            providerResult,
            { operation, existingModule }
          );
        }

        if (sessionModule) {
          this.upsertSessionModule(sessionModule);
          binding = createBridgeBindingFromSessionModule(
            sessionModule,
            providerResult.providerId,
            operation,
            existingBinding
          );
          this.bridgeRegistry.upsert(binding);
          sessionSynchronizationCount = 1;
          if (operation === 'refresh') {
            refreshCount = 1;
          }
          if (operation === 'validate') {
            validationCount = 1;
          }
        }
      }

      if (operation === 'logout' && binding) {
        // Logout sonrası binding korunur ama session revoked olarak senkronize edilir;
        // isteğe bağlı temizlikte unregister yapılabilir — binding updated kalır.
        binding = {
          ...binding,
          lastOperation: 'logout',
          updatedAt: new Date().toISOString()
        };
        this.bridgeRegistry.upsert(binding);
      }

      const sessionResult = sessionModule
        ? this.sessionRuntime.execute(
            createSessionContext({
              locale: context.locale,
              sessionIds: [sessionModule.id],
              identityId: sessionModule.session.identityId,
              authenticationId: sessionModule.session.authenticationId,
              actorId: context.actorId,
              bag: context.bag
            })
          )
        : undefined;

      if (operation === 'validate' && !sessionModule) {
        validationCount = 1;
      }

      const summaryItems = this.buildSummaryItems(
        operation,
        Boolean(providerResult.success && (sessionModule || operation === 'logout')),
        sessionSynchronizationCount,
        refreshCount,
        validationCount
      );

      const { endedAt, durationMs } = endStageTimer(timer);

      return createAuthenticationSessionBridgeResult({
        success:
          operation === 'logout'
            ? providerResult.success
            : providerResult.success && Boolean(sessionModule),
        operation,
        providerResult,
        sessionResult,
        sessionModule,
        sessionProjection: sessionModule
          ? projectMappedSessionModule(sessionModule)
          : undefined,
        binding,
        validationIssues: issues,
        summaryItems,
        telemetry: {
          durationMs,
          startedAt: timer.startedAt,
          endedAt,
          sessionSynchronizationCount,
          refreshCount,
          validationCount,
          summaryCount: summaryItems.length,
          operation
        },
        bag: {
          ...(context.bag ?? {}),
          providerSuccess: providerResult.success
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
        sessionSynchronizationCount,
        refreshCount,
        validationCount
      );
      const { endedAt, durationMs } = endStageTimer(timer);
      return createAuthenticationSessionBridgeResult({
        success: false,
        operation,
        validationIssues: issues,
        summaryItems,
        telemetry: {
          durationMs,
          startedAt: timer.startedAt,
          endedAt,
          sessionSynchronizationCount,
          refreshCount,
          validationCount,
          summaryCount: summaryItems.length,
          operation
        },
        bag: context.bag
      });
    }
  }

  private async invokeProvider(
    operation: AuthenticationSessionBridgeOperation,
    providerContext: ReturnType<typeof resolveBridgeProviderContext>
  ): Promise<AuthenticationProviderResult> {
    const providerOperation = mapBridgeOperationToProviderOperation(operation);
    switch (providerOperation) {
      case 'authenticate':
        return this.authenticationAdapter.authenticate(providerContext);
      case 'refresh':
        return this.authenticationAdapter.refresh(providerContext);
      case 'logout':
        return this.authenticationAdapter.logout(providerContext);
      case 'validateSession':
        return this.authenticationAdapter.validateSession(providerContext);
      default: {
        const exhaustive: never = providerOperation;
        throw new Error(`Desteklenmeyen provider operasyonu: ${exhaustive}`);
      }
    }
  }

  private resolveExistingBinding(
    context: AuthenticationSessionBridgeContext,
    providerResult: AuthenticationProviderResult
  ) {
    if (context.bridgeBindingId) {
      return this.bridgeRegistry.getById(context.bridgeBindingId);
    }
    if (context.sessionId) {
      return this.bridgeRegistry.getBySessionId(context.sessionId);
    }
    const bagSession = providerResult.bag?.supabaseSession as
      | { sessionId?: string }
      | undefined;
    if (bagSession?.sessionId) {
      return this.bridgeRegistry.getBySessionId(bagSession.sessionId);
    }
    if (providerResult.credentialReference?.credentialId) {
      return this.bridgeRegistry.getBySessionId(
        providerResult.credentialReference.credentialId
      );
    }
    if (providerResult.principal?.identityId) {
      const byIdentity = this.bridgeRegistry.getByIdentityId(
        providerResult.principal.identityId
      );
      return byIdentity[0];
    }
    return undefined;
  }

  private upsertSessionModule(module: SessionModule): void {
    const existing = this.sessionRegistry.getById(module.id);
    if (existing) {
      this.sessionRegistry.unregister(module.id);
    }
    this.sessionRegistry.register(module);
  }

  private buildSummaryItems(
    operation: AuthenticationSessionBridgeOperation,
    success: boolean,
    sessionSynchronizationCount: number,
    refreshCount: number,
    validationCount: number
  ): AuthenticationSessionBridgeSummaryItem[] {
    return [
      { key: 'operation', label: 'Operation', value: operation },
      { key: 'success', label: 'Success', value: success },
      {
        key: 'sessionSynchronizationCount',
        label: 'Session Sync Count',
        value: sessionSynchronizationCount
      },
      { key: 'refreshCount', label: 'Refresh Count', value: refreshCount },
      {
        key: 'validationCount',
        label: 'Validation Count',
        value: validationCount
      }
    ];
  }
}

/**
 * AuthenticationSessionBridge üretir — singleton yok.
 */
export function createAuthenticationSessionBridge(
  deps: AuthenticationSessionBridgeDependencies
): AuthenticationSessionBridge {
  return new AuthenticationSessionBridge(deps);
}

export default AuthenticationSessionBridge;
