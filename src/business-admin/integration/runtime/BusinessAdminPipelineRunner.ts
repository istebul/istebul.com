/**
 * İSTEBUL Business Admin — BusinessAdminPipelineRunner (PR-202F).
 *
 * Pipeline:
 *   Validation → Foundation → Dashboard → Reports →
 *   Export → Settings → Summary → BusinessAdminResult
 *
 * Validation başarısızsa Foundation–Settings atlanır; Summary yine çalışır.
 * Her durumda geçerli BusinessAdminResult döner.
 *
 * PR-202A–202E dosyalarını değiştirmez; mevcut runtime'ları koordine eder.
 */

import {
  createBusinessAdminContext,
  createBusinessAdminRuntime,
  validateBusinessAdminContext,
  PIPELINE_BAG_BUSINESS_ADMIN_RESULT_KEY,
  type BusinessAdminResult,
  type BusinessAdminRuntime
} from '../../runtime/index';
import {
  createDashboardWorkspaceContext,
  createDashboardWorkspaceRuntime,
  PIPELINE_BAG_DASHBOARD_WORKSPACE_RESULT_KEY,
  type DashboardWorkspaceResult,
  type DashboardWorkspaceRuntime
} from '../../dashboard/index';
import {
  createReportsWorkspaceContext,
  createReportsWorkspaceRuntime,
  PIPELINE_BAG_REPORTS_WORKSPACE_RESULT_KEY,
  type ReportsWorkspaceResult,
  type ReportsWorkspaceRuntime
} from '../../reports/index';
import {
  createExportWorkspaceContext,
  createExportWorkspaceRuntime,
  PIPELINE_BAG_EXPORT_WORKSPACE_RESULT_KEY,
  type ExportWorkspaceResult,
  type ExportWorkspaceRuntime
} from '../../exports/index';
import {
  createBusinessSettingsWorkspaceContext,
  createBusinessSettingsWorkspaceRuntime,
  PIPELINE_BAG_BUSINESS_SETTINGS_WORKSPACE_RESULT_KEY,
  type BusinessSettingsWorkspaceResult,
  type BusinessSettingsWorkspaceRuntime
} from '../../settings/index';
import type {
  BusinessAdminExecutionContext,
  BusinessAdminPipelineBag
} from './BusinessAdminExecutionContext';
import type {
  BusinessAdminExecutionResult,
  BusinessAdminStageExecution
} from './BusinessAdminExecutionResult';
import {
  buildE2ESummaryItems,
  buildBusinessAdminExecutionTelemetry,
  createEmptyBusinessAdminResult,
  createSkippedStageExecution,
  createStageExecution,
  endStageTimer,
  nowMs,
  startStageTimer
} from './helpers';
import { BUSINESS_ADMIN_SKIP_ON_VALIDATION_FAILURE } from './stages';

export interface BusinessAdminPipelineRunnerDependencies {
  foundationRuntime?: BusinessAdminRuntime;
  dashboardRuntime?: DashboardWorkspaceRuntime;
  reportsRuntime?: ReportsWorkspaceRuntime;
  exportRuntime?: ExportWorkspaceRuntime;
  settingsRuntime?: BusinessSettingsWorkspaceRuntime;
}

/**
 * Uçtan uca Business Admin Pipeline yürütücüsü.
 */
export class BusinessAdminPipelineRunner {
  private readonly foundation: BusinessAdminRuntime;
  private readonly dashboard: DashboardWorkspaceRuntime;
  private readonly reports: ReportsWorkspaceRuntime;
  private readonly exports: ExportWorkspaceRuntime;
  private readonly settings: BusinessSettingsWorkspaceRuntime;

  constructor(deps: BusinessAdminPipelineRunnerDependencies = {}) {
    this.foundation = deps.foundationRuntime ?? createBusinessAdminRuntime();
    this.dashboard =
      deps.dashboardRuntime ?? createDashboardWorkspaceRuntime();
    this.reports = deps.reportsRuntime ?? createReportsWorkspaceRuntime();
    this.exports = deps.exportRuntime ?? createExportWorkspaceRuntime();
    this.settings =
      deps.settingsRuntime ?? createBusinessSettingsWorkspaceRuntime();
  }

  /**
   * Tam uçtan uca akışı yürütür.
   */
  execute(
    execution: BusinessAdminExecutionContext = {}
  ): BusinessAdminExecutionResult {
    const startedMark = nowMs();
    const startedAt = new Date().toISOString();
    const rawLocale = execution.locale ?? 'tr';
    const locale: 'tr' | 'en' = rawLocale === 'en' ? 'en' : 'tr';
    const tenantId =
      typeof execution.tenantId === 'string' ? execution.tenantId : '';
    const bag: BusinessAdminPipelineBag = {
      ...(execution.initialBag ?? {})
    };
    const stageExecutions: BusinessAdminStageExecution[] = [];

    let businessAdminResult: BusinessAdminResult | undefined;
    let dashboardResult: DashboardWorkspaceResult | undefined;
    let reportsResult: ReportsWorkspaceResult | undefined;
    let exportResult: ExportWorkspaceResult | undefined;
    let settingsResult: BusinessSettingsWorkspaceResult | undefined;

    // ─── 1. Business Validation ───
    const validationTimer = startStageTimer();
    const foundationContext = createBusinessAdminContext({
      tenantId,
      locale: rawLocale as 'tr' | 'en',
      actorId: execution.actorId,
      moduleIds: execution.moduleIds
    });
    const validationIssues = validateBusinessAdminContext(
      foundationContext,
      this.foundation.getRegistry()
    );
    const validationTiming = endStageTimer(validationTimer);
    const hasValidationErrors = validationIssues.some(
      (issue) => issue.severity === 'error'
    );

    stageExecutions.push(
      createStageExecution(
        'business-validation',
        hasValidationErrors ? 'failed' : 'succeeded',
        hasValidationErrors
          ? `${validationIssues.filter((i) => i.severity === 'error').length} validation error(s).`
          : 'Business validation passed.',
        {
          durationMs: validationTiming.durationMs,
          startedAt: validationTimer.startedAt,
          endedAt: validationTiming.endedAt
        }
      )
    );

    if (hasValidationErrors) {
      // Skip Foundation → Settings
      for (const stageId of BUSINESS_ADMIN_SKIP_ON_VALIDATION_FAILURE) {
        stageExecutions.push(
          createSkippedStageExecution(
            stageId,
            'Skipped due to business validation failure.'
          )
        );
      }
    } else {
      // ─── 2. Foundation ───
      const foundationTimer = startStageTimer();
      businessAdminResult = this.foundation.execute(foundationContext);
      const foundationTiming = endStageTimer(foundationTimer);
      bag[PIPELINE_BAG_BUSINESS_ADMIN_RESULT_KEY] = businessAdminResult;
      stageExecutions.push(
        createStageExecution(
          'foundation',
          businessAdminResult.summary.success ? 'succeeded' : 'failed',
          `${businessAdminResult.summary.moduleCount} module(s) projected.`,
          {
            durationMs: foundationTiming.durationMs,
            startedAt: foundationTimer.startedAt,
            endedAt: foundationTiming.endedAt
          }
        )
      );

      // ─── 3. Dashboard Workspace ───
      const dashboardTimer = startStageTimer();
      dashboardResult = this.dashboard.execute(
        createDashboardWorkspaceContext({
          tenantId,
          locale,
          actorId: execution.actorId,
          businessAdminResult,
          dashboardResult: execution.dashboardResult,
          widgetIds: execution.dashboardWidgetIds
        })
      );
      const dashboardTiming = endStageTimer(dashboardTimer);
      bag[PIPELINE_BAG_DASHBOARD_WORKSPACE_RESULT_KEY] = dashboardResult;
      stageExecutions.push(
        createStageExecution(
          'dashboard',
          dashboardResult.summary.success ? 'succeeded' : 'failed',
          `${dashboardResult.summary.widgetCount} dashboard widget(s) projected.`,
          {
            durationMs: dashboardTiming.durationMs,
            startedAt: dashboardTimer.startedAt,
            endedAt: dashboardTiming.endedAt
          }
        )
      );

      // ─── 4. Reports Workspace ───
      const reportsTimer = startStageTimer();
      reportsResult = this.reports.execute(
        createReportsWorkspaceContext({
          tenantId,
          locale,
          actorId: execution.actorId,
          businessAdminResult,
          reportResult: execution.reportResult,
          recentReports: execution.recentReports,
          widgetIds: execution.reportsWidgetIds
        })
      );
      const reportsTiming = endStageTimer(reportsTimer);
      bag[PIPELINE_BAG_REPORTS_WORKSPACE_RESULT_KEY] = reportsResult;
      stageExecutions.push(
        createStageExecution(
          'reports',
          reportsResult.summary.success ? 'succeeded' : 'failed',
          `${reportsResult.summary.widgetCount} reports widget(s) projected.`,
          {
            durationMs: reportsTiming.durationMs,
            startedAt: reportsTimer.startedAt,
            endedAt: reportsTiming.endedAt
          }
        )
      );

      // ─── 5. Export Workspace ───
      const exportTimer = startStageTimer();
      exportResult = this.exports.execute(
        createExportWorkspaceContext({
          tenantId,
          locale,
          actorId: execution.actorId,
          businessAdminResult,
          exportResult: execution.exportResult,
          recentExports: execution.recentExports,
          widgetIds: execution.exportWidgetIds
        })
      );
      const exportTiming = endStageTimer(exportTimer);
      bag[PIPELINE_BAG_EXPORT_WORKSPACE_RESULT_KEY] = exportResult;
      stageExecutions.push(
        createStageExecution(
          'exports',
          exportResult.summary.success ? 'succeeded' : 'failed',
          `${exportResult.summary.widgetCount} export widget(s) projected.`,
          {
            durationMs: exportTiming.durationMs,
            startedAt: exportTimer.startedAt,
            endedAt: exportTiming.endedAt
          }
        )
      );

      // ─── 6. Business Settings Workspace ───
      const settingsTimer = startStageTimer();
      settingsResult = this.settings.execute(
        createBusinessSettingsWorkspaceContext({
          tenantId,
          locale,
          actorId: execution.actorId,
          businessAdminResult,
          businessSettings: execution.businessSettings,
          widgetIds: execution.settingsWidgetIds
        })
      );
      const settingsTiming = endStageTimer(settingsTimer);
      bag[PIPELINE_BAG_BUSINESS_SETTINGS_WORKSPACE_RESULT_KEY] =
        settingsResult;
      stageExecutions.push(
        createStageExecution(
          'settings',
          settingsResult.summary.success ? 'succeeded' : 'failed',
          `${settingsResult.summary.widgetCount} settings section(s) projected.`,
          {
            durationMs: settingsTiming.durationMs,
            startedAt: settingsTimer.startedAt,
            endedAt: settingsTiming.endedAt
          }
        )
      );
    }

    // ─── 7. Summary (always runs) ───
    const summaryTimer = startStageTimer();
    const e2eSummaryItems = buildE2ESummaryItems(stageExecutions, locale, {
      moduleCount: businessAdminResult?.summary.moduleCount ?? 0,
      dashboardWidgetCount: dashboardResult?.summary.widgetCount ?? 0,
      reportsWidgetCount: reportsResult?.summary.widgetCount ?? 0,
      exportWidgetCount: exportResult?.summary.widgetCount ?? 0,
      settingsSectionCount: settingsResult?.summary.widgetCount ?? 0
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

    // Always produce a valid BusinessAdminResult
    if (!businessAdminResult) {
      businessAdminResult = createEmptyBusinessAdminResult(
        tenantId,
        validationIssues,
        e2eSummaryItems,
        startedAt,
        endedAt,
        totalDurationMs
      );
    } else {
      businessAdminResult = {
        ...businessAdminResult,
        summaryItems: Object.freeze([
          ...businessAdminResult.summaryItems,
          ...e2eSummaryItems
        ]),
        validationIssues: Object.freeze([
          ...businessAdminResult.validationIssues,
          ...validationIssues
        ]),
        telemetry: {
          ...businessAdminResult.telemetry,
          durationMs: totalDurationMs,
          startedAt,
          endedAt,
          summaryItemCount:
            businessAdminResult.summaryItems.length + e2eSummaryItems.length
        }
      };
      bag[PIPELINE_BAG_BUSINESS_ADMIN_RESULT_KEY] = businessAdminResult;
    }

    const telemetry = buildBusinessAdminExecutionTelemetry(
      stageExecutions,
      startedAt,
      endedAt,
      totalDurationMs
    );

    return {
      businessAdminResult,
      stageExecutions: Object.freeze([...stageExecutions]),
      telemetry,
      bag: Object.freeze({ ...bag }),
      dashboardResult,
      reportsResult,
      exportResult,
      settingsResult
    };
  }
}

export function createBusinessAdminPipelineRunner(
  deps?: BusinessAdminPipelineRunnerDependencies
): BusinessAdminPipelineRunner {
  return new BusinessAdminPipelineRunner(deps);
}

export default BusinessAdminPipelineRunner;
