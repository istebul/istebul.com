/**
 * İSTEBUL Identity — AuthenticationIntegrationPipelineRunner (EPIC-301E).
 *
 * Pipeline:
 *   Validation → Authentication Adapter → Supabase Provider →
 *   Session Bridge → Identity Bridge → Summary → AuthenticationIntegrationResult
 *
 * Validation başarısızsa Adapter–Identity Bridge atlanır; Summary yine çalışır.
 * Her durumda geçerli AuthenticationIntegrationResult döner.
 *
 * 301A–301D dosyalarını değiştirmez; mevcut katmanları DI ile koordine eder.
 */

import type { AuthenticationAdapter } from '../adapters/AuthenticationAdapter';
import { createAuthenticationAdapter } from '../adapters/AuthenticationAdapter';
import type { AuthenticationProviderResult } from '../adapters/AuthenticationProviderResult';
import { createAuthenticationProviderContext } from '../adapters/AuthenticationProviderContext';
import { SUPABASE_AUTHENTICATION_PROVIDER_ID } from '../providers/supabase/constants';
import type { AuthenticationSessionBridge } from '../bridge/AuthenticationSessionBridge';
import { createAuthenticationSessionBridge } from '../bridge/AuthenticationSessionBridge';
import type { AuthenticationSessionBridgeResult } from '../bridge/AuthenticationSessionBridgeResult';
import { createAuthenticationSessionBridgeContext } from '../bridge/AuthenticationSessionBridgeContext';
import type { IdentityBridge } from '../../bridge/IdentityBridge';
import { createIdentityBridge } from '../../bridge/IdentityBridge';
import type { IdentityBridgeResult } from '../../bridge/IdentityBridgeResult';
import { createIdentityBridgeContext } from '../../bridge/IdentityBridgeContext';
import type {
  AuthenticationIntegrationExecutionContext,
  AuthenticationIntegrationOperation,
  AuthenticationIntegrationPipelineBag
} from './AuthenticationIntegrationExecutionContext';
import type {
  AuthenticationIntegrationExecutionResult,
  AuthenticationIntegrationResult,
  AuthenticationIntegrationStageExecution,
  AuthenticationIntegrationValidationIssue
} from './AuthenticationIntegrationExecutionResult';
import { PIPELINE_BAG_AUTHENTICATION_INTEGRATION_RESULT_KEY } from './AuthenticationIntegrationExecutionResult';
import {
  buildAuthenticationIntegrationExecutionTelemetry,
  buildAuthenticationIntegrationE2ESummaryItems,
  buildAuthenticationIntegrationPipelineExecutionSummary,
  createAuthenticationIntegrationResult,
  createEmptyAuthenticationIntegrationResult,
  createAuthenticationIntegrationSkippedStageExecution,
  createAuthenticationIntegrationStageExecution,
  endStageTimer,
  nowMs,
  startStageTimer,
  validateAuthenticationIntegrationContext
} from './helpers';
import { AUTHENTICATION_INTEGRATION_SKIP_ON_VALIDATION_FAILURE } from './stages';

export interface AuthenticationIntegrationPipelineRunnerDependencies {
  authenticationAdapter?: AuthenticationAdapter;
  authenticationSessionBridge?: AuthenticationSessionBridge;
  identityBridge?: IdentityBridge;
}

/**
 * Uçtan uca Authentication Integration Pipeline yürütücüsü.
 */
export class AuthenticationIntegrationPipelineRunner {
  private readonly authenticationAdapter: AuthenticationAdapter;
  private readonly authenticationSessionBridge: AuthenticationSessionBridge;
  private readonly identityBridge: IdentityBridge;

  constructor(
    deps: AuthenticationIntegrationPipelineRunnerDependencies = {}
  ) {
    this.authenticationAdapter =
      deps.authenticationAdapter ?? createAuthenticationAdapter();
    this.authenticationSessionBridge =
      deps.authenticationSessionBridge ??
      createAuthenticationSessionBridge({
        authenticationAdapter: this.authenticationAdapter
      });
    this.identityBridge =
      deps.identityBridge ??
      createIdentityBridge({
        authenticationAdapter: this.authenticationAdapter,
        authenticationSessionBridge: this.authenticationSessionBridge
      });
  }

  getAuthenticationAdapter(): AuthenticationAdapter {
    return this.authenticationAdapter;
  }

  getAuthenticationSessionBridge(): AuthenticationSessionBridge {
    return this.authenticationSessionBridge;
  }

  getIdentityBridge(): IdentityBridge {
    return this.identityBridge;
  }

  /**
   * Tam uçtan uca akışı yürütür.
   */
  async execute(
    execution: AuthenticationIntegrationExecutionContext = {}
  ): Promise<AuthenticationIntegrationExecutionResult> {
    const startedMark = nowMs();
    const startedAt = new Date().toISOString();
    const rawLocale = execution.locale ?? 'tr';
    const locale: 'tr' | 'en' = rawLocale === 'en' ? 'en' : 'tr';
    const operation: AuthenticationIntegrationOperation =
      execution.operation ?? 'synchronize';
    const bag: AuthenticationIntegrationPipelineBag = {
      ...(execution.initialBag ?? {})
    };
    const stageExecutions: AuthenticationIntegrationStageExecution[] = [];
    const collectedIssues: AuthenticationIntegrationValidationIssue[] = [];

    let providerResult: AuthenticationProviderResult | undefined;
    let sessionBridgeResult: AuthenticationSessionBridgeResult | undefined;
    let identityBridgeResult: IdentityBridgeResult | undefined;

    // ── Validation ──────────────────────────────────────────────
    const validationTimer = startStageTimer();
    const validationIssues = validateAuthenticationIntegrationContext(execution);
    collectedIssues.push(...validationIssues);
    const hasValidationErrors = validationIssues.some(
      (item) => item.severity === 'error'
    );
    const validationTiming = endStageTimer(validationTimer);
    stageExecutions.push(
      createAuthenticationIntegrationStageExecution(
        'validation',
        hasValidationErrors ? 'failed' : 'succeeded',
        hasValidationErrors
          ? `Validation failed (${validationIssues.filter((i) => i.severity === 'error').length} error)`
          : 'Validation passed',
        {
          durationMs: validationTiming.durationMs,
          startedAt: validationTimer.startedAt,
          endedAt: validationTiming.endedAt
        }
      )
    );

    if (hasValidationErrors) {
      for (const stageId of AUTHENTICATION_INTEGRATION_SKIP_ON_VALIDATION_FAILURE) {
        stageExecutions.push(
          createAuthenticationIntegrationSkippedStageExecution(
            stageId,
            'Skipped due to validation failure'
          )
        );
      }
    } else {
      const providerContext =
        execution.providerContext ??
        createAuthenticationProviderContext({
          locale,
          providerId: execution.providerId!,
          identityId: execution.identityId,
          sessionId: execution.sessionId,
          actorId: execution.actorId,
          bag: execution.initialBag
        });

      // ── Authentication Adapter ────────────────────────────────
      const adapterTimer = startStageTimer();
      try {
        providerResult = await this.invokeAdapter(operation, providerContext);
        const adapterTiming = endStageTimer(adapterTimer);
        const adapterOk = providerResult.success;
        stageExecutions.push(
          createAuthenticationIntegrationStageExecution(
            'authentication-adapter',
            adapterOk ? 'succeeded' : 'failed',
            adapterOk
              ? `Adapter ${operation} succeeded`
              : `Adapter ${operation} failed`,
            {
              durationMs: adapterTiming.durationMs,
              startedAt: adapterTimer.startedAt,
              endedAt: adapterTiming.endedAt
            }
          )
        );
        if (!adapterOk) {
          collectedIssues.push(
            ...providerResult.validationIssues.map((issue) => ({
              code: issue.code,
              message: issue.message,
              severity: issue.severity
            }))
          );
        }
        bag.providerResult = providerResult;
      } catch (error) {
        const adapterTiming = endStageTimer(adapterTimer);
        const message =
          error instanceof Error ? error.message : 'Adapter stage error';
        collectedIssues.push({
          code: 'ADAPTER_STAGE_ERROR',
          message,
          severity: 'error'
        });
        stageExecutions.push(
          createAuthenticationIntegrationStageExecution(
            'authentication-adapter',
            'failed',
            message,
            {
              durationMs: adapterTiming.durationMs,
              startedAt: adapterTimer.startedAt,
              endedAt: adapterTiming.endedAt
            }
          )
        );
      }

      // ── Supabase Provider ─────────────────────────────────────
      const providerTimer = startStageTimer();
      const providerRegistered = this.authenticationAdapter
        .getRegistry()
        .hasProvider(
          providerContext.providerId || SUPABASE_AUTHENTICATION_PROVIDER_ID
        );
      const providerIdMatches =
        (providerResult?.providerId || providerContext.providerId) ===
          SUPABASE_AUTHENTICATION_PROVIDER_ID ||
        providerContext.providerId === SUPABASE_AUTHENTICATION_PROVIDER_ID;
      const providerOk =
        Boolean(providerResult?.success) &&
        providerRegistered &&
        providerIdMatches;
      const providerTiming = endStageTimer(providerTimer);
      stageExecutions.push(
        createAuthenticationIntegrationStageExecution(
          'supabase-provider',
          providerOk
            ? 'succeeded'
            : providerRegistered
              ? 'failed'
              : 'failed',
          providerOk
            ? 'Supabase provider available and succeeded'
            : providerRegistered
              ? 'Supabase provider registered but operation failed'
              : 'Supabase provider not registered',
          {
            durationMs: providerTiming.durationMs,
            startedAt: providerTimer.startedAt,
            endedAt: providerTiming.endedAt
          }
        )
      );
      if (!providerOk && providerRegistered === false) {
        collectedIssues.push({
          code: 'SUPABASE_PROVIDER_NOT_REGISTERED',
          message: 'Supabase authentication provider kayıtlı değil.',
          severity: 'error'
        });
      }

      // ── Session Bridge ────────────────────────────────────────
      const sessionTimer = startStageTimer();
      try {
        sessionBridgeResult = await this.authenticationSessionBridge.execute(
          createAuthenticationSessionBridgeContext({
            locale,
            operation,
            providerContext,
            bridgeBindingId: execution.sessionBridgeBindingId,
            identityId: execution.identityId,
            sessionId: execution.sessionId,
            actorId: execution.actorId,
            bag: execution.initialBag
          })
        );
        const sessionTiming = endStageTimer(sessionTimer);
        const sessionOk = sessionBridgeResult.success;
        stageExecutions.push(
          createAuthenticationIntegrationStageExecution(
            'session-bridge',
            sessionOk ? 'succeeded' : 'failed',
            sessionOk
              ? 'Session bridge succeeded'
              : 'Session bridge failed',
            {
              durationMs: sessionTiming.durationMs,
              startedAt: sessionTimer.startedAt,
              endedAt: sessionTiming.endedAt
            }
          )
        );
        if (!sessionOk) {
          collectedIssues.push(
            ...sessionBridgeResult.validationIssues.map((issue) => ({
              code: `SESSION_${issue.code}`,
              message: issue.message,
              severity: issue.severity
            }))
          );
        }
        bag.sessionBridgeResult = sessionBridgeResult;
      } catch (error) {
        const sessionTiming = endStageTimer(sessionTimer);
        const message =
          error instanceof Error ? error.message : 'Session bridge stage error';
        collectedIssues.push({
          code: 'SESSION_BRIDGE_STAGE_ERROR',
          message,
          severity: 'error'
        });
        stageExecutions.push(
          createAuthenticationIntegrationStageExecution('session-bridge', 'failed', message, {
            durationMs: sessionTiming.durationMs,
            startedAt: sessionTimer.startedAt,
            endedAt: sessionTiming.endedAt
          })
        );
      }

      // ── Identity Bridge ───────────────────────────────────────
      const identityTimer = startStageTimer();
      try {
        identityBridgeResult = await this.identityBridge.execute(
          createIdentityBridgeContext({
            locale,
            operation,
            providerContext,
            bridgeBindingId: execution.identityBridgeBindingId,
            sessionBridgeBindingId:
              execution.sessionBridgeBindingId ||
              sessionBridgeResult?.binding?.id,
            identityId: execution.identityId,
            sessionId: execution.sessionId,
            actorId: execution.actorId,
            bag: execution.initialBag
          })
        );
        const identityTiming = endStageTimer(identityTimer);
        const identityOk = identityBridgeResult.success;
        stageExecutions.push(
          createAuthenticationIntegrationStageExecution(
            'identity-bridge',
            identityOk ? 'succeeded' : 'failed',
            identityOk
              ? 'Identity bridge succeeded'
              : 'Identity bridge failed',
            {
              durationMs: identityTiming.durationMs,
              startedAt: identityTimer.startedAt,
              endedAt: identityTiming.endedAt
            }
          )
        );
        if (!identityOk) {
          collectedIssues.push(
            ...identityBridgeResult.validationIssues.map((issue) => ({
              code: `IDENTITY_${issue.code}`,
              message: issue.message,
              severity: issue.severity
            }))
          );
        }
        bag.identityBridgeResult = identityBridgeResult;
      } catch (error) {
        const identityTiming = endStageTimer(identityTimer);
        const message =
          error instanceof Error ? error.message : 'Identity bridge stage error';
        collectedIssues.push({
          code: 'IDENTITY_BRIDGE_STAGE_ERROR',
          message,
          severity: 'error'
        });
        stageExecutions.push(
          createAuthenticationIntegrationStageExecution('identity-bridge', 'failed', message, {
            durationMs: identityTiming.durationMs,
            startedAt: identityTimer.startedAt,
            endedAt: identityTiming.endedAt
          })
        );
      }
    }

    // ── Summary (always) ────────────────────────────────────────
    const summaryTimer = startStageTimer();
    const pipelineSummary = buildAuthenticationIntegrationPipelineExecutionSummary(stageExecutions);
    const adapterSucceeded = Boolean(providerResult?.success);
    const providerSucceeded =
      adapterSucceeded &&
      this.authenticationAdapter
        .getRegistry()
        .hasProvider(
          providerResult?.providerId ||
            execution.providerContext?.providerId ||
            execution.providerId ||
            ''
        );
    const sessionBridgeSucceeded = Boolean(sessionBridgeResult?.success);
    const identityBridgeSucceeded = Boolean(identityBridgeResult?.success);
    const overallSuccess =
      !hasValidationErrors &&
      adapterSucceeded &&
      providerSucceeded &&
      (operation === 'logout'
        ? sessionBridgeSucceeded || identityBridgeSucceeded || adapterSucceeded
        : sessionBridgeSucceeded && identityBridgeSucceeded);

    const endedAt = new Date().toISOString();
    const totalDurationMs = Math.max(0, Math.round(nowMs() - startedMark));

    let integrationResult: AuthenticationIntegrationResult;
    if (hasValidationErrors) {
      integrationResult = createEmptyAuthenticationIntegrationResult(
        collectedIssues,
        {
          durationMs: totalDurationMs,
          startedAt,
          endedAt,
          summaryItemCount: 0
        }
      );
      integrationResult = {
        ...integrationResult,
        summary: {
          ...integrationResult.summary,
          stagesSucceeded: pipelineSummary.stagesSucceeded,
          stagesSkipped: pipelineSummary.stagesSkipped,
          stagesFailed: pipelineSummary.stagesFailed
        }
      };
    } else {
      integrationResult = createAuthenticationIntegrationResult({
        success: overallSuccess,
        adapterSucceeded,
        providerSucceeded,
        sessionBridgeSucceeded,
        identityBridgeSucceeded,
        stagesSucceeded: pipelineSummary.stagesSucceeded,
        stagesSkipped: pipelineSummary.stagesSkipped,
        stagesFailed: pipelineSummary.stagesFailed,
        summaryItems: [],
        validationIssues: collectedIssues,
        telemetry: {
          durationMs: totalDurationMs,
          startedAt,
          endedAt,
          summaryItemCount: 0
        },
        providerResult,
        sessionBridgeResult,
        identityBridgeResult
      });
    }

    const summaryTiming = endStageTimer(summaryTimer);
    stageExecutions.push(
      createAuthenticationIntegrationStageExecution(
        'summary',
        'succeeded',
        'Summary built',
        {
          durationMs: summaryTiming.durationMs,
          startedAt: summaryTimer.startedAt,
          endedAt: summaryTiming.endedAt
        }
      )
    );

    const finalPipelineSummary =
      buildAuthenticationIntegrationPipelineExecutionSummary(stageExecutions);

    integrationResult = {
      ...integrationResult,
      summary: {
        ...integrationResult.summary,
        stagesSucceeded: finalPipelineSummary.stagesSucceeded,
        stagesSkipped: finalPipelineSummary.stagesSkipped,
        stagesFailed: finalPipelineSummary.stagesFailed
      }
    };

    const summaryItems = buildAuthenticationIntegrationE2ESummaryItems(
      finalPipelineSummary,
      integrationResult
    );
    integrationResult = {
      ...integrationResult,
      summaryItems: Object.freeze(summaryItems),
      telemetry: {
        ...integrationResult.telemetry,
        summaryItemCount: summaryItems.length
      }
    };

    const telemetry = buildAuthenticationIntegrationExecutionTelemetry(
      stageExecutions,
      startedAt,
      endedAt,
      totalDurationMs,
      summaryItems.length
    );

    bag[PIPELINE_BAG_AUTHENTICATION_INTEGRATION_RESULT_KEY] = integrationResult;

    return {
      authenticationIntegrationResult: integrationResult,
      stageExecutions: Object.freeze([...stageExecutions]),
      pipelineSummary: finalPipelineSummary,
      telemetry,
      bag
    };
  }

  private invokeAdapter(
    operation: AuthenticationIntegrationOperation,
    providerContext: ReturnType<typeof createAuthenticationProviderContext>
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
        throw new Error(`Desteklenmeyen operasyon: ${exhaustive}`);
      }
    }
  }
}

export function createAuthenticationIntegrationPipelineRunner(
  deps?: AuthenticationIntegrationPipelineRunnerDependencies
): AuthenticationIntegrationPipelineRunner {
  return new AuthenticationIntegrationPipelineRunner(deps);
}

export default AuthenticationIntegrationPipelineRunner;
