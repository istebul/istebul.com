/**
 * İSTEBUL Business Admin — ReportsWorkspaceRuntime (PR-202C).
 *
 * Pipeline:
 *   ReportResult → Workspace Projection → Summary → ReportsWorkspaceResult
 *
 * Mevcut Report Engine yeniden yazılmaz; çıktısı projection girdisidir.
 * Yalnızca projeksiyon — CRUD, API, veritabanı, realtime, export yok.
 */

import type { ReportsWorkspaceContext } from './ReportsWorkspaceContext';
import type { ReportsWorkspaceRegistry } from './ReportsWorkspaceRegistry';
import { createReportsWorkspaceRegistry } from './ReportsWorkspaceRegistry';
import type {
  ReportsWorkspaceResult,
  ReportsWorkspaceTelemetry
} from './ReportsWorkspaceResult';
import {
  buildReportsWorkspaceSummary,
  buildReportsWorkspaceSummaryItems
} from './ReportsWorkspaceSummary';
import {
  resolveRequestedReportsWidgets,
  validateReportsWorkspaceContext
} from './workspaceValidation';
import { projectReportsWorkspaceWidgets } from './workspaceProjection';
import {
  endStageTimer,
  nowMs,
  startStageTimer
} from '../../runtime/timing';

/**
 * Reports Workspace Runtime orchestrator.
 */
export class ReportsWorkspaceRuntime {
  private readonly registry: ReportsWorkspaceRegistry;

  constructor(registry?: ReportsWorkspaceRegistry) {
    this.registry = registry ?? createReportsWorkspaceRegistry(true);
  }

  getRegistry(): ReportsWorkspaceRegistry {
    return this.registry;
  }

  /**
   * Reports Workspace pipeline'ını çalıştırır; projeksiyon sonucu döndürür.
   */
  execute(context: ReportsWorkspaceContext): ReportsWorkspaceResult {
    const timer = startStageTimer();
    const startMark = nowMs();

    // Aşama 1: Validation
    const validationIssues = validateReportsWorkspaceContext(
      context,
      this.registry
    );
    const hasErrors = validationIssues.some(
      (item) => item.severity === 'error'
    );

    // Aşama 2: Workspace Projection (ReportResult → widgets)
    const { widgets, requestedCount, unavailableCount } =
      resolveRequestedReportsWidgets(context, this.registry);
    const projections = projectReportsWorkspaceWidgets(widgets, context);

    // Aşama 3: Summary
    const summary = buildReportsWorkspaceSummary(
      projections,
      requestedCount,
      unavailableCount,
      hasErrors,
      context.tenantId,
      context.reportResult !== undefined ||
        (context.recentReports?.length ?? 0) > 0
    );
    const summaryItems = buildReportsWorkspaceSummaryItems(
      summary,
      context.locale,
      context.actorId
    );

    const { endedAt, durationMs } = endStageTimer(timer);
    const telemetry: ReportsWorkspaceTelemetry = {
      durationMs: durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timer.startedAt,
      endedAt,
      visibleReportCount: summary.visibleReportCount,
      summaryItemCount: summaryItems.length
    };

    // Aşama 4: ReportsWorkspaceResult
    return {
      widgets: projections,
      summary,
      summaryItems,
      validationIssues,
      telemetry
    };
  }
}

export function createReportsWorkspaceRuntime(
  registry?: ReportsWorkspaceRegistry
): ReportsWorkspaceRuntime {
  return new ReportsWorkspaceRuntime(registry);
}

export default ReportsWorkspaceRuntime;
