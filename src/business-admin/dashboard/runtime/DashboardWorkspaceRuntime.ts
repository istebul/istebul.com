/**
 * İSTEBUL Business Admin — DashboardWorkspaceRuntime (PR-202B).
 *
 * Pipeline:
 *   DashboardResult → Workspace Projection → Workspace Summary → DashboardWorkspaceResult
 *
 * Mevcut Dashboard Engine yeniden yazılmaz; çıktısı projection girdisidir.
 * Yalnızca projeksiyon — CRUD, API, veritabanı, charts, realtime yok.
 */

import type { DashboardWorkspaceContext } from './DashboardWorkspaceContext';
import type { DashboardWorkspaceRegistry } from './DashboardWorkspaceRegistry';
import { createDashboardWorkspaceRegistry } from './DashboardWorkspaceRegistry';
import type {
  DashboardWorkspaceResult,
  DashboardWorkspaceTelemetry
} from './DashboardWorkspaceResult';
import {
  buildDashboardWorkspaceSummary,
  buildDashboardWorkspaceSummaryItems
} from './DashboardWorkspaceSummary';
import {
  resolveRequestedWidgets,
  validateDashboardWorkspaceContext
} from './workspaceValidation';
import { projectWorkspaceWidgets } from './workspaceProjection';
import {
  endStageTimer,
  nowMs,
  startStageTimer
} from '../../runtime/timing';

/**
 * Dashboard Workspace Runtime orchestrator.
 */
export class DashboardWorkspaceRuntime {
  private readonly registry: DashboardWorkspaceRegistry;

  constructor(registry?: DashboardWorkspaceRegistry) {
    this.registry = registry ?? createDashboardWorkspaceRegistry(true);
  }

  getRegistry(): DashboardWorkspaceRegistry {
    return this.registry;
  }

  /**
   * Dashboard Workspace pipeline'ını çalıştırır; projeksiyon sonucu döndürür.
   */
  execute(context: DashboardWorkspaceContext): DashboardWorkspaceResult {
    const timer = startStageTimer();
    const startMark = nowMs();

    // Aşama 1: Validation
    const validationIssues = validateDashboardWorkspaceContext(
      context,
      this.registry
    );
    const hasErrors = validationIssues.some(
      (item) => item.severity === 'error'
    );

    // Aşama 2: Workspace Projection (DashboardResult → widgets)
    const { widgets, requestedCount, unavailableCount } =
      resolveRequestedWidgets(context, this.registry);
    const projections = projectWorkspaceWidgets(
      widgets,
      context.dashboardResult
    );

    // Aşama 3: Workspace Summary
    const summary = buildDashboardWorkspaceSummary(
      projections,
      requestedCount,
      unavailableCount,
      hasErrors,
      context.tenantId,
      context.dashboardResult !== undefined
    );
    const summaryItems = buildDashboardWorkspaceSummaryItems(
      summary,
      context.locale,
      context.actorId
    );

    const { endedAt, durationMs } = endStageTimer(timer);
    const telemetry: DashboardWorkspaceTelemetry = {
      durationMs: durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timer.startedAt,
      endedAt,
      visibleWidgetCount: summary.visibleWidgetCount,
      summaryItemCount: summaryItems.length
    };

    // Aşama 4: DashboardWorkspaceResult
    return {
      widgets: projections,
      summary,
      summaryItems,
      validationIssues,
      telemetry
    };
  }
}

export function createDashboardWorkspaceRuntime(
  registry?: DashboardWorkspaceRegistry
): DashboardWorkspaceRuntime {
  return new DashboardWorkspaceRuntime(registry);
}

export default DashboardWorkspaceRuntime;
