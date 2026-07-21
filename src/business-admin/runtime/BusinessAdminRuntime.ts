/**
 * İSTEBUL Business Admin — BusinessAdminRuntime (PR-202A).
 *
 * Pipeline:
 *   Validation → Module Registry → Summary → BusinessAdminResult
 *
 * Yalnızca projeksiyon — CRUD, API, veritabanı yok.
 */

import type { BusinessAdminContext } from './BusinessAdminContext';
import type { BusinessAdminRegistryRuntime } from './BusinessAdminRegistryRuntime';
import { createBusinessAdminRegistryRuntime } from './BusinessAdminRegistryRuntime';
import { toModuleProjection } from './BusinessAdminModule';
import type {
  BusinessAdminExecutionSummary,
  BusinessAdminResult,
  BusinessAdminTelemetry
} from './BusinessAdminResult';
import {
  resolveRequestedModules,
  validateBusinessAdminContext
} from './businessValidation';
import { buildBusinessAdminSummaryItems } from './businessSummary';
import { endStageTimer, nowMs, startStageTimer } from './timing';

/**
 * Business Admin Runtime orchestrator.
 */
export class BusinessAdminRuntime {
  private readonly registry: BusinessAdminRegistryRuntime;

  constructor(registry?: BusinessAdminRegistryRuntime) {
    this.registry = registry ?? createBusinessAdminRegistryRuntime(true);
  }

  getRegistry(): BusinessAdminRegistryRuntime {
    return this.registry;
  }

  /**
   * Business Admin pipeline'ını çalıştırır; projeksiyon sonucu döndürür.
   */
  execute(context: BusinessAdminContext): BusinessAdminResult {
    const timer = startStageTimer();
    const startMark = nowMs();

    // Aşama 1: Validation
    const validationIssues = validateBusinessAdminContext(
      context,
      this.registry
    );
    const hasErrors = validationIssues.some(
      (item) => item.severity === 'error'
    );

    // Aşama 2: Module Registry
    const { modules, requestedCount, unavailableCount } =
      resolveRequestedModules(context, this.registry);

    // Aşama 3: Summary
    const projections = Object.freeze(
      modules.map((module) => toModuleProjection(module))
    );
    const summaryItems = buildBusinessAdminSummaryItems(
      context,
      modules,
      validationIssues,
      this.registry.count()
    );

    const summary: BusinessAdminExecutionSummary = {
      success: !hasErrors && projections.length > 0,
      moduleCount: projections.length,
      requestedCount,
      unavailableCount,
      tenantId: context.tenantId
    };

    const { endedAt, durationMs } = endStageTimer(timer);
    const telemetry: BusinessAdminTelemetry = {
      durationMs: durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timer.startedAt,
      endedAt,
      registeredModuleCount: this.registry.count(),
      summaryItemCount: summaryItems.length
    };

    // Aşama 4: BusinessAdminResult
    return {
      modules: projections,
      summary,
      summaryItems,
      validationIssues,
      telemetry
    };
  }
}

export function createBusinessAdminRuntime(
  registry?: BusinessAdminRegistryRuntime
): BusinessAdminRuntime {
  return new BusinessAdminRuntime(registry);
}

export default BusinessAdminRuntime;
