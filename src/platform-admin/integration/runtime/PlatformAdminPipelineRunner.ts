/**
 * İSTEBUL Platform Admin — PlatformAdminPipelineRunner (PR-201F).
 *
 * Pipeline:
 *   Platform Validation → Foundation → Tenant → Users →
 *   Subscriptions → System Monitoring → Summary → PlatformAdminResult
 *
 * Validation başarısızsa Foundation–Monitoring atlanır; Summary yine çalışır.
 * Her durumda geçerli PlatformAdminResult döner.
 *
 * PR-201A–201E dosyalarını değiştirmez; mevcut runtime'ları koordine eder.
 */

import {
  createPlatformAdminContext,
  createPlatformAdminRuntime,
  validatePlatformContext,
  PIPELINE_BAG_PLATFORM_ADMIN_RESULT_KEY,
  type PlatformAdminResult,
  type PlatformAdminRuntime
} from '../../runtime/index';
import {
  createTenantManagementContext,
  createTenantManagementRuntime,
  PIPELINE_BAG_TENANT_MANAGEMENT_RESULT_KEY,
  type TenantManagementResult,
  type TenantManagementRuntime
} from '../../tenant/index';
import {
  createUserManagementContext,
  createUserManagementRuntime,
  PIPELINE_BAG_USER_MANAGEMENT_RESULT_KEY,
  type UserManagementResult,
  type UserManagementRuntime
} from '../../users/index';
import {
  createSubscriptionManagementContext,
  createSubscriptionManagementRuntime,
  PIPELINE_BAG_SUBSCRIPTION_MANAGEMENT_RESULT_KEY,
  type SubscriptionManagementResult,
  type SubscriptionManagementRuntime
} from '../../subscriptions/index';
import {
  createSystemMonitoringContext,
  createSystemMonitoringRuntime,
  PIPELINE_BAG_SYSTEM_MONITORING_RESULT_KEY,
  type SystemMonitoringResult,
  type SystemMonitoringRuntime
} from '../../system-monitoring/index';
import type {
  PlatformAdminExecutionContext,
  PlatformAdminPipelineBag
} from './PlatformAdminExecutionContext';
import type {
  PlatformAdminExecutionResult,
  PlatformAdminStageExecution
} from './PlatformAdminExecutionResult';
import {
  buildE2ESummaryItems,
  buildPlatformAdminExecutionTelemetry,
  createEmptyPlatformAdminResult,
  createSkippedStageExecution,
  createStageExecution,
  endStageTimer,
  nowMs,
  startStageTimer
} from './helpers';
import { PLATFORM_ADMIN_SKIP_ON_VALIDATION_FAILURE } from './stages';

export interface PlatformAdminPipelineRunnerDependencies {
  foundationRuntime?: PlatformAdminRuntime;
  tenantRuntime?: TenantManagementRuntime;
  userRuntime?: UserManagementRuntime;
  subscriptionRuntime?: SubscriptionManagementRuntime;
  systemMonitoringRuntime?: SystemMonitoringRuntime;
}

/**
 * Uçtan uca Platform Admin Pipeline yürütücüsü.
 */
export class PlatformAdminPipelineRunner {
  private readonly foundation: PlatformAdminRuntime;
  private readonly tenant: TenantManagementRuntime;
  private readonly users: UserManagementRuntime;
  private readonly subscriptions: SubscriptionManagementRuntime;
  private readonly systemMonitoring: SystemMonitoringRuntime;

  constructor(deps: PlatformAdminPipelineRunnerDependencies = {}) {
    this.foundation = deps.foundationRuntime ?? createPlatformAdminRuntime();
    this.tenant = deps.tenantRuntime ?? createTenantManagementRuntime();
    this.users = deps.userRuntime ?? createUserManagementRuntime();
    this.subscriptions =
      deps.subscriptionRuntime ?? createSubscriptionManagementRuntime();
    this.systemMonitoring =
      deps.systemMonitoringRuntime ?? createSystemMonitoringRuntime();
  }

  /**
   * Tam uçtan uca akışı yürütür.
   */
  execute(
    execution: PlatformAdminExecutionContext = {}
  ): PlatformAdminExecutionResult {
    const startedMark = nowMs();
    const startedAt = new Date().toISOString();
    const rawLocale = execution.locale ?? 'tr';
    const locale: 'tr' | 'en' = rawLocale === 'en' ? 'en' : 'tr';
    const bag: PlatformAdminPipelineBag = {
      ...(execution.initialBag ?? {})
    };
    const stageExecutions: PlatformAdminStageExecution[] = [];

    let platformAdminResult: PlatformAdminResult | undefined;
    let tenantResult: TenantManagementResult | undefined;
    let userResult: UserManagementResult | undefined;
    let subscriptionResult: SubscriptionManagementResult | undefined;
    let systemMonitoringResult: SystemMonitoringResult | undefined;

    // ─── 1. Platform Validation ───
    const validationTimer = startStageTimer();
    const foundationContext = createPlatformAdminContext({
      locale: rawLocale as 'tr' | 'en',
      actorId: execution.actorId,
      moduleIds: execution.moduleIds
    });
    const validationIssues = validatePlatformContext(
      foundationContext,
      this.foundation.getRegistry()
    );
    const validationTiming = endStageTimer(validationTimer);
    const hasValidationErrors = validationIssues.some(
      (issue) => issue.severity === 'error'
    );

    stageExecutions.push(
      createStageExecution(
        'platform-validation',
        hasValidationErrors ? 'failed' : 'succeeded',
        hasValidationErrors
          ? `${validationIssues.filter((i) => i.severity === 'error').length} validation error(s).`
          : 'Platform validation passed.',
        {
          durationMs: validationTiming.durationMs,
          startedAt: validationTimer.startedAt,
          endedAt: validationTiming.endedAt
        }
      )
    );

    if (hasValidationErrors) {
      // Skip Foundation → Monitoring
      for (const stageId of PLATFORM_ADMIN_SKIP_ON_VALIDATION_FAILURE) {
        stageExecutions.push(
          createSkippedStageExecution(
            stageId,
            'Skipped due to platform validation failure.'
          )
        );
      }
    } else {
      // ─── 2. Foundation ───
      const foundationTimer = startStageTimer();
      platformAdminResult = this.foundation.execute(foundationContext);
      const foundationTiming = endStageTimer(foundationTimer);
      bag[PIPELINE_BAG_PLATFORM_ADMIN_RESULT_KEY] = platformAdminResult;
      stageExecutions.push(
        createStageExecution(
          'foundation',
          platformAdminResult.summary.success ? 'succeeded' : 'failed',
          `${platformAdminResult.summary.moduleCount} module(s) projected.`,
          {
            durationMs: foundationTiming.durationMs,
            startedAt: foundationTimer.startedAt,
            endedAt: foundationTiming.endedAt
          }
        )
      );

      // ─── 3. Tenant ───
      const tenantTimer = startStageTimer();
      tenantResult = this.tenant.execute(
        createTenantManagementContext({
          locale,
          actorId: execution.actorId,
          platformAdminResult,
          tenantIds: execution.tenantIds
        })
      );
      const tenantTiming = endStageTimer(tenantTimer);
      bag[PIPELINE_BAG_TENANT_MANAGEMENT_RESULT_KEY] = tenantResult;
      stageExecutions.push(
        createStageExecution(
          'tenant',
          tenantResult.summary.success ? 'succeeded' : 'failed',
          `${tenantResult.summary.tenantCount} tenant(s) projected.`,
          {
            durationMs: tenantTiming.durationMs,
            startedAt: tenantTimer.startedAt,
            endedAt: tenantTiming.endedAt
          }
        )
      );

      // ─── 4. Users ───
      const usersTimer = startStageTimer();
      userResult = this.users.execute(
        createUserManagementContext({
          locale,
          actorId: execution.actorId,
          platformAdminResult,
          userIds: execution.userIds
        })
      );
      const usersTiming = endStageTimer(usersTimer);
      bag[PIPELINE_BAG_USER_MANAGEMENT_RESULT_KEY] = userResult;
      stageExecutions.push(
        createStageExecution(
          'users',
          userResult.summary.success ? 'succeeded' : 'failed',
          `${userResult.summary.userCount} user(s) projected.`,
          {
            durationMs: usersTiming.durationMs,
            startedAt: usersTimer.startedAt,
            endedAt: usersTiming.endedAt
          }
        )
      );

      // ─── 5. Subscriptions ───
      const subscriptionsTimer = startStageTimer();
      subscriptionResult = this.subscriptions.execute(
        createSubscriptionManagementContext({
          locale,
          actorId: execution.actorId,
          platformAdminResult,
          subscriptionIds: execution.subscriptionIds
        })
      );
      const subscriptionsTiming = endStageTimer(subscriptionsTimer);
      bag[PIPELINE_BAG_SUBSCRIPTION_MANAGEMENT_RESULT_KEY] =
        subscriptionResult;
      stageExecutions.push(
        createStageExecution(
          'subscriptions',
          subscriptionResult.summary.success ? 'succeeded' : 'failed',
          `${subscriptionResult.summary.subscriptionCount} subscription(s) projected.`,
          {
            durationMs: subscriptionsTiming.durationMs,
            startedAt: subscriptionsTimer.startedAt,
            endedAt: subscriptionsTiming.endedAt
          }
        )
      );

      // ─── 6. System Monitoring ───
      const monitoringTimer = startStageTimer();
      systemMonitoringResult = this.systemMonitoring.execute(
        createSystemMonitoringContext({
          locale,
          actorId: execution.actorId,
          platformAdminResult,
          serviceIds: execution.serviceIds
        })
      );
      const monitoringTiming = endStageTimer(monitoringTimer);
      bag[PIPELINE_BAG_SYSTEM_MONITORING_RESULT_KEY] =
        systemMonitoringResult;
      stageExecutions.push(
        createStageExecution(
          'system-monitoring',
          systemMonitoringResult.summary.success ? 'succeeded' : 'failed',
          `${systemMonitoringResult.summary.serviceCount} service(s) projected.`,
          {
            durationMs: monitoringTiming.durationMs,
            startedAt: monitoringTimer.startedAt,
            endedAt: monitoringTiming.endedAt
          }
        )
      );
    }

    // ─── 7. Summary (always runs) ───
    const summaryTimer = startStageTimer();
    const e2eSummaryItems = buildE2ESummaryItems(stageExecutions, locale, {
      moduleCount: platformAdminResult?.summary.moduleCount ?? 0,
      tenantCount: tenantResult?.summary.tenantCount ?? 0,
      userCount: userResult?.summary.userCount ?? 0,
      subscriptionCount: subscriptionResult?.summary.subscriptionCount ?? 0,
      serviceCount: systemMonitoringResult?.summary.serviceCount ?? 0
    });
    const summaryTiming = endStageTimer(summaryTimer);
    stageExecutions.push(
      createStageExecution(
        'summary',
        'succeeded',
        `${e2eSummaryItems.length} summary item(s) built.`,
        {
          durationMs: summaryTiming.durationMs,
          startedAt: summaryTimer.startedAt,
          endedAt: summaryTiming.endedAt
        }
      )
    );

    const endedAt = new Date().toISOString();
    const totalDurationMs = Math.max(0, Math.round(nowMs() - startedMark));

    // Always produce a valid PlatformAdminResult
    if (!platformAdminResult) {
      platformAdminResult = createEmptyPlatformAdminResult(
        validationIssues,
        e2eSummaryItems,
        startedAt,
        endedAt,
        totalDurationMs
      );
    } else {
      platformAdminResult = {
        ...platformAdminResult,
        summaryItems: Object.freeze([
          ...platformAdminResult.summaryItems,
          ...e2eSummaryItems
        ]),
        validationIssues: Object.freeze([
          ...platformAdminResult.validationIssues,
          ...validationIssues
        ]),
        telemetry: {
          ...platformAdminResult.telemetry,
          durationMs: totalDurationMs,
          startedAt,
          endedAt,
          summaryItemCount:
            platformAdminResult.summaryItems.length + e2eSummaryItems.length
        }
      };
      bag[PIPELINE_BAG_PLATFORM_ADMIN_RESULT_KEY] = platformAdminResult;
    }

    const telemetry = buildPlatformAdminExecutionTelemetry(
      stageExecutions,
      startedAt,
      endedAt,
      totalDurationMs
    );

    return {
      platformAdminResult,
      stageExecutions: Object.freeze([...stageExecutions]),
      telemetry,
      bag: Object.freeze({ ...bag }),
      tenantResult,
      userResult,
      subscriptionResult,
      systemMonitoringResult
    };
  }
}

export function createPlatformAdminPipelineRunner(
  deps?: PlatformAdminPipelineRunnerDependencies
): PlatformAdminPipelineRunner {
  return new PlatformAdminPipelineRunner(deps);
}

export default PlatformAdminPipelineRunner;
