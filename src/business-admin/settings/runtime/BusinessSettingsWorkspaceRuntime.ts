/**
 * İSTEBUL Business Admin — BusinessSettingsWorkspaceRuntime (PR-202E).
 *
 * Pipeline:
 *   BusinessSettings → Workspace Projection → Summary → BusinessSettingsWorkspaceResult
 *
 * Yalnızca projeksiyon — CRUD, API, veritabanı, realtime, auth yok.
 */

import type { BusinessSettingsWorkspaceContext } from './BusinessSettingsWorkspaceContext';
import type { BusinessSettingsWorkspaceRegistry } from './BusinessSettingsWorkspaceRegistry';
import { createBusinessSettingsWorkspaceRegistry } from './BusinessSettingsWorkspaceRegistry';
import type {
  BusinessSettingsWorkspaceResult,
  BusinessSettingsWorkspaceTelemetry
} from './BusinessSettingsWorkspaceResult';
import {
  buildBusinessSettingsWorkspaceSummary,
  buildBusinessSettingsWorkspaceSummaryItems
} from './BusinessSettingsWorkspaceSummary';
import {
  resolveRequestedBusinessSettingsWidgets,
  validateBusinessSettingsWorkspaceContext
} from './workspaceValidation';
import { projectBusinessSettingsWorkspaceWidgets } from './workspaceProjection';
import {
  endStageTimer,
  nowMs,
  startStageTimer
} from '../../runtime/timing';

/**
 * Business Settings Workspace Runtime orchestrator.
 */
export class BusinessSettingsWorkspaceRuntime {
  private readonly registry: BusinessSettingsWorkspaceRegistry;

  constructor(registry?: BusinessSettingsWorkspaceRegistry) {
    this.registry =
      registry ?? createBusinessSettingsWorkspaceRegistry(true);
  }

  getRegistry(): BusinessSettingsWorkspaceRegistry {
    return this.registry;
  }

  /**
   * Business Settings Workspace pipeline'ını çalıştırır; projeksiyon sonucu döndürür.
   */
  execute(
    context: BusinessSettingsWorkspaceContext
  ): BusinessSettingsWorkspaceResult {
    const timer = startStageTimer();
    const startMark = nowMs();

    // Aşama 1: Validation
    const validationIssues = validateBusinessSettingsWorkspaceContext(
      context,
      this.registry
    );
    const hasErrors = validationIssues.some(
      (item) => item.severity === 'error'
    );

    // Aşama 2: Workspace Projection (BusinessSettings → sections)
    const { widgets, requestedCount, unavailableCount } =
      resolveRequestedBusinessSettingsWidgets(context, this.registry);
    const projections = projectBusinessSettingsWorkspaceWidgets(
      widgets,
      context
    );

    // Aşama 3: Summary
    const summary = buildBusinessSettingsWorkspaceSummary(
      projections,
      requestedCount,
      unavailableCount,
      hasErrors,
      context.tenantId,
      context.businessSettings !== undefined
    );
    const summaryItems = buildBusinessSettingsWorkspaceSummaryItems(
      summary,
      context.locale,
      context.actorId
    );

    const { endedAt, durationMs } = endStageTimer(timer);
    const telemetry: BusinessSettingsWorkspaceTelemetry = {
      durationMs: durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timer.startedAt,
      endedAt,
      visibleSettingsSectionCount: summary.visibleSettingsSectionCount,
      summaryItemCount: summaryItems.length
    };

    // Aşama 4: BusinessSettingsWorkspaceResult
    return {
      widgets: projections,
      summary,
      summaryItems,
      validationIssues,
      telemetry
    };
  }
}

export function createBusinessSettingsWorkspaceRuntime(
  registry?: BusinessSettingsWorkspaceRegistry
): BusinessSettingsWorkspaceRuntime {
  return new BusinessSettingsWorkspaceRuntime(registry);
}

export default BusinessSettingsWorkspaceRuntime;
