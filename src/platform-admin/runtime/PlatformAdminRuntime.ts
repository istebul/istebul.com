/**
 * İSTEBUL Platform Admin — PlatformAdminRuntime (PR-201A).
 *
 * Pipeline:
 *   Platform Validation → Module Registry → Platform Summary → PlatformAdminResult
 *
 * Yalnızca projeksiyon — CRUD, API, veritabanı yok.
 */

import type { PlatformAdminContext } from './PlatformAdminContext';
import type { PlatformAdminRegistryRuntime } from './PlatformAdminRegistryRuntime';
import { createPlatformAdminRegistryRuntime } from './PlatformAdminRegistryRuntime';
import { toModuleProjection } from './PlatformAdminModule';
import type {
  PlatformAdminExecutionSummary,
  PlatformAdminResult,
  PlatformAdminTelemetry
} from './PlatformAdminResult';
import {
  resolveRequestedModules,
  validatePlatformContext
} from './platformValidation';
import { buildPlatformSummaryItems } from './platformSummary';
import { endStageTimer, nowMs, startStageTimer } from './timing';

/**
 * Platform Admin Runtime orchestrator.
 */
export class PlatformAdminRuntime {
  private readonly registry: PlatformAdminRegistryRuntime;

  constructor(registry?: PlatformAdminRegistryRuntime) {
    this.registry = registry ?? createPlatformAdminRegistryRuntime(true);
  }

  getRegistry(): PlatformAdminRegistryRuntime {
    return this.registry;
  }

  /**
   * Platform Admin pipeline'ını çalıştırır; projeksiyon sonucu döndürür.
   */
  execute(context: PlatformAdminContext): PlatformAdminResult {
    const timer = startStageTimer();
    const startMark = nowMs();

    // Aşama 1: Platform Validation
    const validationIssues = validatePlatformContext(context, this.registry);
    const hasErrors = validationIssues.some(
      (item) => item.severity === 'error'
    );

    // Aşama 2: Module Registry
    const { modules, requestedCount, unavailableCount } =
      resolveRequestedModules(context, this.registry);

    // Aşama 3: Platform Summary
    const projections = Object.freeze(
      modules.map((module) => toModuleProjection(module))
    );
    const summaryItems = buildPlatformSummaryItems(
      context,
      modules,
      validationIssues,
      this.registry.count()
    );

    const summary: PlatformAdminExecutionSummary = {
      success: !hasErrors && projections.length > 0,
      moduleCount: projections.length,
      requestedCount,
      unavailableCount
    };

    const { endedAt, durationMs } = endStageTimer(timer);
    const telemetry: PlatformAdminTelemetry = {
      durationMs: durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timer.startedAt,
      endedAt,
      registeredModuleCount: this.registry.count(),
      summaryItemCount: summaryItems.length
    };

    // Aşama 4: PlatformAdminResult
    return {
      modules: projections,
      summary,
      summaryItems,
      validationIssues,
      telemetry
    };
  }
}

export function createPlatformAdminRuntime(
  registry?: PlatformAdminRegistryRuntime
): PlatformAdminRuntime {
  return new PlatformAdminRuntime(registry);
}

export default PlatformAdminRuntime;
