/**
 * İSTEBUL Identity — TenantIntegrationPipelineRunner (EPIC-302E).
 *
 * Pipeline:
 *   Validation → Tenant Adapter → Supabase Tenant Provider →
 *   Tenant Session Bridge → Business Context Bridge → Summary →
 *   TenantIntegrationResult
 *
 * Validation başarısızsa Adapter–Business Context Bridge atlanır; Summary yine çalışır.
 * Her durumda geçerli TenantIntegrationResult döner.
 *
 * 302A–302D dosyalarını değiştirmez; mevcut katmanları DI ile koordine eder.
 */

import type { TenantAdapter } from '../adapters/TenantAdapter';
import { createTenantAdapter } from '../adapters/TenantAdapter';
import type { TenantProviderResult } from '../adapters/TenantProviderResult';
import { createTenantProviderContext } from '../adapters/TenantProviderContext';
import { SUPABASE_TENANT_PROVIDER_ID } from '../providers/supabase/constants';
import type { TenantSessionBridge } from '../bridge/TenantSessionBridge';
import { createTenantSessionBridge } from '../bridge/TenantSessionBridge';
import type { TenantSessionBridgeResult } from '../bridge/TenantSessionBridgeResult';
import { createTenantSessionBridgeContext } from '../bridge/TenantSessionBridgeContext';
import type { BusinessContextBridge } from '../../business-context/bridge/BusinessContextBridge';
import { createBusinessContextBridge } from '../../business-context/bridge/BusinessContextBridge';
import type { BusinessContextBridgeResult } from '../../business-context/bridge/BusinessContextBridgeResult';
import { createBusinessContextBridgeContext } from '../../business-context/bridge/BusinessContextBridgeContext';
import type { BusinessRuntimePort } from '../../business-context/bridge/BusinessRuntimePort';
import type {
  TenantIntegrationExecutionContext,
  TenantIntegrationOperation,
  TenantIntegrationPipelineBag
} from './TenantIntegrationExecutionContext';
import type {
  TenantIntegrationExecutionResult,
  TenantIntegrationResult,
  TenantIntegrationStageExecution,
  TenantIntegrationValidationIssue
} from './TenantIntegrationExecutionResult';
import { PIPELINE_BAG_TENANT_INTEGRATION_RESULT_KEY } from './TenantIntegrationExecutionResult';
import {
  buildTenantIntegrationExecutionTelemetry,
  buildTenantIntegrationE2ESummaryItems,
  buildTenantIntegrationPipelineExecutionSummary,
  createTenantIntegrationResult,
  createEmptyTenantIntegrationResult,
  createTenantIntegrationSkippedStageExecution,
  createTenantIntegrationStageExecution,
  endStageTimer,
  nowMs,
  startStageTimer,
  validateTenantIntegrationContext
} from './helpers';
import { TENANT_INTEGRATION_SKIP_ON_VALIDATION_FAILURE } from './stages';

export interface TenantIntegrationPipelineRunnerDependencies {
  tenantAdapter?: TenantAdapter;
  tenantSessionBridge?: TenantSessionBridge;
  businessContextBridge?: BusinessContextBridge;
  /**
   * Business runtime port — businessContextBridge yoksa zorunlu.
   * Identity paketi Business Admin'e bağımlı değildir.
   */
  businessRuntime?: BusinessRuntimePort;
}

/**
 * Uçtan uca Tenant Integration Pipeline yürütücüsü.
 */
export class TenantIntegrationPipelineRunner {
  private readonly tenantAdapter: TenantAdapter;
  private readonly tenantSessionBridge: TenantSessionBridge;
  private readonly businessContextBridge: BusinessContextBridge;

  constructor(deps: TenantIntegrationPipelineRunnerDependencies = {}) {
    this.tenantAdapter = deps.tenantAdapter ?? createTenantAdapter();
    this.tenantSessionBridge =
      deps.tenantSessionBridge ??
      createTenantSessionBridge({
        tenantAdapter: this.tenantAdapter
      });

    if (deps.businessContextBridge) {
      this.businessContextBridge = deps.businessContextBridge;
    } else if (deps.businessRuntime) {
      this.businessContextBridge = createBusinessContextBridge({
        tenantSessionBridge: this.tenantSessionBridge,
        businessRuntime: deps.businessRuntime
      });
    } else {
      throw new Error(
        'businessContextBridge veya businessRuntime zorunludur.'
      );
    }
  }

  getTenantAdapter(): TenantAdapter {
    return this.tenantAdapter;
  }

  getTenantSessionBridge(): TenantSessionBridge {
    return this.tenantSessionBridge;
  }

  getBusinessContextBridge(): BusinessContextBridge {
    return this.businessContextBridge;
  }

  /**
   * Tam uçtan uca akışı yürütür.
   */
  async execute(
    execution: TenantIntegrationExecutionContext = {}
  ): Promise<TenantIntegrationExecutionResult> {
    const startedMark = nowMs();
    const startedAt = new Date().toISOString();
    const rawLocale = execution.locale ?? 'tr';
    const locale: 'tr' | 'en' = rawLocale === 'en' ? 'en' : 'tr';
    const operation: TenantIntegrationOperation =
      execution.operation ?? 'synchronize';
    const bag: TenantIntegrationPipelineBag = {
      ...(execution.initialBag ?? {})
    };
    const stageExecutions: TenantIntegrationStageExecution[] = [];
    const collectedIssues: TenantIntegrationValidationIssue[] = [];

    let providerResult: TenantProviderResult | undefined;
    let sessionBridgeResult: TenantSessionBridgeResult | undefined;
    let businessContextBridgeResult: BusinessContextBridgeResult | undefined;

    // ── Validation ──────────────────────────────────────────────
    const validationTimer = startStageTimer();
    const validationIssues = validateTenantIntegrationContext(execution);
    collectedIssues.push(...validationIssues);
    const hasValidationErrors = validationIssues.some(
      (item) => item.severity === 'error'
    );
    const validationTiming = endStageTimer(validationTimer);
    stageExecutions.push(
      createTenantIntegrationStageExecution(
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
      for (const stageId of TENANT_INTEGRATION_SKIP_ON_VALIDATION_FAILURE) {
        stageExecutions.push(
          createTenantIntegrationSkippedStageExecution(
            stageId,
            'Skipped due to validation failure'
          )
        );
      }
    } else {
      const providerContext =
        execution.providerContext ??
        createTenantProviderContext({
          locale,
          providerId: execution.providerId!,
          tenantId: execution.tenantId,
          tenantSlug: execution.tenantSlug,
          identityId: execution.identityId,
          membershipId: execution.membershipId,
          sessionId: execution.sessionId,
          actorId: execution.actorId,
          bag: execution.initialBag
        });

      // ── Tenant Adapter ────────────────────────────────────────
      const adapterTimer = startStageTimer();
      try {
        providerResult = await this.invokeAdapter(operation, providerContext);
        const adapterTiming = endStageTimer(adapterTimer);
        const adapterOk = providerResult.success;
        stageExecutions.push(
          createTenantIntegrationStageExecution(
            'tenant-adapter',
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
          createTenantIntegrationStageExecution(
            'tenant-adapter',
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

      // ── Supabase Tenant Provider ──────────────────────────────
      const providerTimer = startStageTimer();
      const providerRegistered = this.tenantAdapter
        .getRegistry()
        .hasProvider(
          providerContext.providerId || SUPABASE_TENANT_PROVIDER_ID
        );
      const providerIdMatches =
        (providerResult?.providerId || providerContext.providerId) ===
          SUPABASE_TENANT_PROVIDER_ID ||
        providerContext.providerId === SUPABASE_TENANT_PROVIDER_ID;
      const providerOk =
        Boolean(providerResult?.success) &&
        providerRegistered &&
        providerIdMatches;
      const providerTiming = endStageTimer(providerTimer);
      stageExecutions.push(
        createTenantIntegrationStageExecution(
          'supabase-provider',
          providerOk ? 'succeeded' : 'failed',
          providerOk
            ? 'Supabase tenant provider available and succeeded'
            : providerRegistered
              ? 'Supabase tenant provider registered but operation failed'
              : 'Supabase tenant provider not registered',
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
          message: 'Supabase tenant provider kayıtlı değil.',
          severity: 'error'
        });
      }

      // ── Tenant Session Bridge ─────────────────────────────────
      const sessionTimer = startStageTimer();
      try {
        const sessionOperation = mapIntegrationToSessionOperation(operation);
        sessionBridgeResult = await this.tenantSessionBridge.execute(
          createTenantSessionBridgeContext({
            locale,
            operation: sessionOperation,
            providerContext,
            bridgeBindingId: execution.sessionBridgeBindingId,
            tenantId: execution.tenantId,
            tenantSlug: execution.tenantSlug,
            identityId: execution.identityId,
            membershipId: execution.membershipId,
            sessionId: execution.sessionId,
            actorId: execution.actorId,
            bag: execution.initialBag
          })
        );
        const sessionTiming = endStageTimer(sessionTimer);
        const sessionOk = sessionBridgeResult.success;
        stageExecutions.push(
          createTenantIntegrationStageExecution(
            'session-bridge',
            sessionOk ? 'succeeded' : 'failed',
            sessionOk
              ? 'Tenant session bridge succeeded'
              : 'Tenant session bridge failed',
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
          error instanceof Error
            ? error.message
            : 'Tenant session bridge stage error';
        collectedIssues.push({
          code: 'SESSION_BRIDGE_STAGE_ERROR',
          message,
          severity: 'error'
        });
        stageExecutions.push(
          createTenantIntegrationStageExecution(
            'session-bridge',
            'failed',
            message,
            {
              durationMs: sessionTiming.durationMs,
              startedAt: sessionTimer.startedAt,
              endedAt: sessionTiming.endedAt
            }
          )
        );
      }

      // ── Business Context Bridge ───────────────────────────────
      const businessTimer = startStageTimer();
      try {
        businessContextBridgeResult = await this.businessContextBridge.execute(
          createBusinessContextBridgeContext({
            locale,
            operation,
            providerId: providerContext.providerId,
            tenantBridgeContext: createTenantSessionBridgeContext({
              locale,
              operation: mapIntegrationToSessionOperation(operation),
              providerContext,
              bridgeBindingId: execution.sessionBridgeBindingId,
              tenantId: execution.tenantId,
              tenantSlug: execution.tenantSlug,
              identityId: execution.identityId,
              membershipId: execution.membershipId,
              sessionId: execution.sessionId,
              actorId: execution.actorId,
              bag: execution.initialBag
            }),
            bridgeBindingId: execution.businessContextBridgeBindingId,
            tenantBridgeBindingId:
              execution.sessionBridgeBindingId ||
              sessionBridgeResult?.binding?.id,
            tenantId: execution.tenantId,
            tenantSlug: execution.tenantSlug,
            businessId: execution.businessId,
            identityId: execution.identityId,
            sessionId: execution.sessionId,
            workspaceId: execution.workspaceId,
            workspaceLabel: execution.workspaceLabel,
            moduleIds: execution.moduleIds,
            actorId: execution.actorId,
            bag: execution.initialBag
          })
        );
        const businessTiming = endStageTimer(businessTimer);
        const businessOk = businessContextBridgeResult.success;
        stageExecutions.push(
          createTenantIntegrationStageExecution(
            'business-context-bridge',
            businessOk ? 'succeeded' : 'failed',
            businessOk
              ? 'Business context bridge succeeded'
              : 'Business context bridge failed',
            {
              durationMs: businessTiming.durationMs,
              startedAt: businessTimer.startedAt,
              endedAt: businessTiming.endedAt
            }
          )
        );
        if (!businessOk) {
          collectedIssues.push(
            ...businessContextBridgeResult.validationIssues.map((issue) => ({
              code: `BUSINESS_${issue.code}`,
              message: issue.message,
              severity: issue.severity
            }))
          );
        }
        bag.businessContextBridgeResult = businessContextBridgeResult;
      } catch (error) {
        const businessTiming = endStageTimer(businessTimer);
        const message =
          error instanceof Error
            ? error.message
            : 'Business context bridge stage error';
        collectedIssues.push({
          code: 'BUSINESS_CONTEXT_BRIDGE_STAGE_ERROR',
          message,
          severity: 'error'
        });
        stageExecutions.push(
          createTenantIntegrationStageExecution(
            'business-context-bridge',
            'failed',
            message,
            {
              durationMs: businessTiming.durationMs,
              startedAt: businessTimer.startedAt,
              endedAt: businessTiming.endedAt
            }
          )
        );
      }
    }

    // ── Summary (always) ────────────────────────────────────────
    const summaryTimer = startStageTimer();
    const pipelineSummary =
      buildTenantIntegrationPipelineExecutionSummary(stageExecutions);
    const adapterSucceeded = Boolean(providerResult?.success);
    const providerSucceeded =
      adapterSucceeded &&
      this.tenantAdapter
        .getRegistry()
        .hasProvider(
          providerResult?.providerId ||
            execution.providerContext?.providerId ||
            execution.providerId ||
            ''
        );
    const sessionBridgeSucceeded = Boolean(sessionBridgeResult?.success);
    const businessContextBridgeSucceeded = Boolean(
      businessContextBridgeResult?.success
    );
    const overallSuccess =
      !hasValidationErrors &&
      adapterSucceeded &&
      providerSucceeded &&
      sessionBridgeSucceeded &&
      businessContextBridgeSucceeded;

    const endedAt = new Date().toISOString();
    const totalDurationMs = Math.max(0, Math.round(nowMs() - startedMark));

    let integrationResult: TenantIntegrationResult;
    if (hasValidationErrors) {
      integrationResult = createEmptyTenantIntegrationResult(
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
      integrationResult = createTenantIntegrationResult({
        success: overallSuccess,
        adapterSucceeded,
        providerSucceeded,
        sessionBridgeSucceeded,
        businessContextBridgeSucceeded,
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
        businessContextBridgeResult
      });
    }

    const summaryTiming = endStageTimer(summaryTimer);
    stageExecutions.push(
      createTenantIntegrationStageExecution(
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
      buildTenantIntegrationPipelineExecutionSummary(stageExecutions);

    integrationResult = {
      ...integrationResult,
      summary: {
        ...integrationResult.summary,
        stagesSucceeded: finalPipelineSummary.stagesSucceeded,
        stagesSkipped: finalPipelineSummary.stagesSkipped,
        stagesFailed: finalPipelineSummary.stagesFailed
      }
    };

    const summaryItems = buildTenantIntegrationE2ESummaryItems(
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

    const telemetry = buildTenantIntegrationExecutionTelemetry(
      stageExecutions,
      startedAt,
      endedAt,
      totalDurationMs,
      summaryItems.length
    );

    bag[PIPELINE_BAG_TENANT_INTEGRATION_RESULT_KEY] = integrationResult;

    return {
      tenantIntegrationResult: integrationResult,
      stageExecutions: Object.freeze([...stageExecutions]),
      pipelineSummary: finalPipelineSummary,
      telemetry,
      bag
    };
  }

  private invokeAdapter(
    operation: TenantIntegrationOperation,
    providerContext: ReturnType<typeof createTenantProviderContext>
  ): Promise<TenantProviderResult> {
    switch (operation) {
      case 'synchronize':
        return this.tenantAdapter.resolveTenant(providerContext);
      case 'refresh':
        return this.tenantAdapter.refreshTenant(providerContext);
      case 'validate':
        return this.tenantAdapter.validateAccess(providerContext);
      case 'mapWorkspace':
        return this.tenantAdapter.getTenant(providerContext);
      default: {
        const exhaustive: never = operation;
        throw new Error(`Desteklenmeyen operasyon: ${exhaustive}`);
      }
    }
  }
}

function mapIntegrationToSessionOperation(
  operation: TenantIntegrationOperation
): 'synchronize' | 'refresh' | 'validate' | 'getTenant' {
  switch (operation) {
    case 'synchronize':
      return 'synchronize';
    case 'refresh':
      return 'refresh';
    case 'validate':
      return 'validate';
    case 'mapWorkspace':
      return 'getTenant';
    default: {
      const exhaustive: never = operation;
      throw new Error(`Desteklenmeyen operasyon: ${exhaustive}`);
    }
  }
}

export function createTenantIntegrationPipelineRunner(
  deps?: TenantIntegrationPipelineRunnerDependencies
): TenantIntegrationPipelineRunner {
  return new TenantIntegrationPipelineRunner(deps);
}

export default TenantIntegrationPipelineRunner;
