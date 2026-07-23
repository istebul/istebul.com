/**
 * İSTEBUL Business Admin — ExportWorkspaceRuntime (PR-202D).
 *
 * Pipeline:
 *   ExportResult → Workspace Projection → Summary → ExportWorkspaceResult
 *
 * Mevcut Export Engine yeniden yazılmaz; çıktısı projection girdisidir.
 * Yalnızca projeksiyon — CRUD, API, veritabanı, realtime yok.
 */

import type { ExportWorkspaceContext } from './ExportWorkspaceContext';
import type { ExportWorkspaceRegistry } from './ExportWorkspaceRegistry';
import { createExportWorkspaceRegistry } from './ExportWorkspaceRegistry';
import type {
  ExportWorkspaceResult,
  ExportWorkspaceTelemetry
} from './ExportWorkspaceResult';
import {
  buildExportWorkspaceSummary,
  buildExportWorkspaceSummaryItems
} from './ExportWorkspaceSummary';
import {
  resolveRequestedExportWidgets,
  validateExportWorkspaceContext
} from './workspaceValidation';
import { projectExportWorkspaceWidgets } from './workspaceProjection';
import {
  endStageTimer,
  nowMs,
  startStageTimer
} from '../../runtime/timing';

/**
 * Export Workspace Runtime orchestrator.
 */
export class ExportWorkspaceRuntime {
  private readonly registry: ExportWorkspaceRegistry;

  constructor(registry?: ExportWorkspaceRegistry) {
    this.registry = registry ?? createExportWorkspaceRegistry(true);
  }

  getRegistry(): ExportWorkspaceRegistry {
    return this.registry;
  }

  /**
   * Export Workspace pipeline'ını çalıştırır; projeksiyon sonucu döndürür.
   */
  execute(context: ExportWorkspaceContext): ExportWorkspaceResult {
    const timer = startStageTimer();
    const startMark = nowMs();

    // Aşama 1: Validation
    const validationIssues = validateExportWorkspaceContext(
      context,
      this.registry
    );
    const hasErrors = validationIssues.some(
      (item) => item.severity === 'error'
    );

    // Aşama 2: Workspace Projection (ExportResult → widgets)
    const { widgets, requestedCount, unavailableCount } =
      resolveRequestedExportWidgets(context, this.registry);
    const projections = projectExportWorkspaceWidgets(widgets, context);

    // Aşama 3: Summary
    const summary = buildExportWorkspaceSummary(
      projections,
      requestedCount,
      unavailableCount,
      hasErrors,
      context.tenantId,
      context.exportResult !== undefined ||
        (context.recentExports?.length ?? 0) > 0
    );
    const summaryItems = buildExportWorkspaceSummaryItems(
      summary,
      context.locale,
      context.actorId
    );

    const { endedAt, durationMs } = endStageTimer(timer);
    const telemetry: ExportWorkspaceTelemetry = {
      durationMs: durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timer.startedAt,
      endedAt,
      visibleExportCount: summary.visibleExportCount,
      summaryItemCount: summaryItems.length
    };

    // Aşama 4: ExportWorkspaceResult
    return {
      widgets: projections,
      summary,
      summaryItems,
      validationIssues,
      telemetry
    };
  }
}

export function createExportWorkspaceRuntime(
  registry?: ExportWorkspaceRegistry
): ExportWorkspaceRuntime {
  return new ExportWorkspaceRuntime(registry);
}

export default ExportWorkspaceRuntime;
