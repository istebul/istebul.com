/**
 * İSTEBUL Platform Admin — SystemMonitoringRuntime (PR-201E).
 *
 * Pipeline:
 *   Validation → Monitoring Projection → Summary → SystemMonitoringResult
 *
 * Girdi: PlatformAdminResult (opsiyonel) + SystemMonitoringContext
 * Yalnızca projeksiyon — gerçek health check / metric / alert yok.
 */

import type { SystemMonitoringContext } from './SystemMonitoringContext';
import type { SystemMonitoringRegistryRuntime } from './SystemMonitoringRegistryRuntime';
import { createSystemMonitoringRegistryRuntime } from './SystemMonitoringRegistryRuntime';
import { toSystemMonitoringProjection } from './SystemMonitoring';
import type {
  SystemMonitoringResult,
  SystemMonitoringTelemetry
} from './SystemMonitoringResult';
import {
  buildSystemMonitoringSummary,
  buildSystemMonitoringSummaryItems
} from './SystemMonitoringSummary';
import {
  resolveRequestedServices,
  validateSystemMonitoringContext
} from './systemMonitoringValidation';
import {
  endStageTimer,
  nowMs,
  startStageTimer
} from '../../runtime/timing';

/**
 * System Monitoring Runtime orchestrator.
 */
export class SystemMonitoringRuntime {
  private readonly registry: SystemMonitoringRegistryRuntime;

  constructor(registry?: SystemMonitoringRegistryRuntime) {
    this.registry = registry ?? createSystemMonitoringRegistryRuntime(true);
  }

  getRegistry(): SystemMonitoringRegistryRuntime {
    return this.registry;
  }

  /**
   * System Monitoring pipeline'ını çalıştırır; projeksiyon sonucu döndürür.
   */
  execute(context: SystemMonitoringContext): SystemMonitoringResult {
    const timer = startStageTimer();
    const startMark = nowMs();

    // Aşama 1: Validation
    const validationIssues = validateSystemMonitoringContext(
      context,
      this.registry
    );
    const hasErrors = validationIssues.some(
      (item) => item.severity === 'error'
    );

    // Aşama 2: Monitoring Projection
    const { services, requestedCount, unavailableCount } =
      resolveRequestedServices(context, this.registry);
    const projections = Object.freeze(
      services.map((definition) => toSystemMonitoringProjection(definition))
    );

    // Aşama 3: Summary
    const summary = buildSystemMonitoringSummary(
      projections,
      requestedCount,
      unavailableCount,
      hasErrors
    );
    const summaryItems = buildSystemMonitoringSummaryItems(
      summary,
      context.locale,
      context.actorId
    );

    const { endedAt, durationMs } = endStageTimer(timer);
    const telemetry: SystemMonitoringTelemetry = {
      durationMs: durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timer.startedAt,
      endedAt,
      serviceCount: projections.length,
      summaryItemCount: summaryItems.length
    };

    // Aşama 4: SystemMonitoringResult
    return {
      services: projections,
      summary,
      summaryItems,
      validationIssues,
      telemetry
    };
  }
}

export function createSystemMonitoringRuntime(
  registry?: SystemMonitoringRegistryRuntime
): SystemMonitoringRuntime {
  return new SystemMonitoringRuntime(registry);
}

export default SystemMonitoringRuntime;
