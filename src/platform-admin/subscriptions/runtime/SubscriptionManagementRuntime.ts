/**
 * İSTEBUL Platform Admin — SubscriptionManagementRuntime (PR-201D).
 *
 * Pipeline:
 *   Validation → Subscription Projection → Summary → SubscriptionManagementResult
 *
 * Girdi: PlatformAdminResult (opsiyonel) + SubscriptionManagementContext
 * Yalnızca projeksiyon — Payment, Billing, API, veritabanı yok.
 */

import type { SubscriptionManagementContext } from './SubscriptionManagementContext';
import type { SubscriptionRegistryRuntime } from './SubscriptionRegistryRuntime';
import { createSubscriptionRegistryRuntime } from './SubscriptionRegistryRuntime';
import { toSubscriptionProjection } from './Subscription';
import type {
  SubscriptionManagementResult,
  SubscriptionManagementTelemetry
} from './SubscriptionManagementResult';
import {
  buildSubscriptionSummary,
  buildSubscriptionSummaryItems
} from './SubscriptionSummary';
import {
  resolveRequestedSubscriptions,
  validateSubscriptionManagementContext
} from './subscriptionValidation';
import {
  endStageTimer,
  nowMs,
  startStageTimer
} from '../../runtime/timing';

/**
 * Subscription Management Runtime orchestrator.
 */
export class SubscriptionManagementRuntime {
  private readonly registry: SubscriptionRegistryRuntime;

  constructor(registry?: SubscriptionRegistryRuntime) {
    this.registry = registry ?? createSubscriptionRegistryRuntime(true);
  }

  getRegistry(): SubscriptionRegistryRuntime {
    return this.registry;
  }

  /**
   * Subscription Management pipeline'ını çalıştırır; projeksiyon sonucu döndürür.
   */
  execute(
    context: SubscriptionManagementContext
  ): SubscriptionManagementResult {
    const timer = startStageTimer();
    const startMark = nowMs();

    // Aşama 1: Validation
    const validationIssues = validateSubscriptionManagementContext(
      context,
      this.registry
    );
    const hasErrors = validationIssues.some(
      (item) => item.severity === 'error'
    );

    // Aşama 2: Subscription Projection
    const { subscriptions, requestedCount, unavailableCount } =
      resolveRequestedSubscriptions(context, this.registry);
    const projections = Object.freeze(
      subscriptions.map((definition) => toSubscriptionProjection(definition))
    );

    // Aşama 3: Summary
    const summary = buildSubscriptionSummary(
      projections,
      requestedCount,
      unavailableCount,
      hasErrors
    );
    const summaryItems = buildSubscriptionSummaryItems(
      summary,
      context.locale,
      context.actorId
    );

    const { endedAt, durationMs } = endStageTimer(timer);
    const telemetry: SubscriptionManagementTelemetry = {
      durationMs: durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timer.startedAt,
      endedAt,
      subscriptionCount: projections.length,
      summaryItemCount: summaryItems.length
    };

    // Aşama 4: SubscriptionManagementResult
    return {
      subscriptions: projections,
      summary,
      summaryItems,
      validationIssues,
      telemetry
    };
  }
}

export function createSubscriptionManagementRuntime(
  registry?: SubscriptionRegistryRuntime
): SubscriptionManagementRuntime {
  return new SubscriptionManagementRuntime(registry);
}

export default SubscriptionManagementRuntime;
