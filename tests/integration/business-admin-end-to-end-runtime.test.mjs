/**
 * End-to-End Business Admin Runtime — PR-202F (en az 20 integration test)
 */

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
register(
  pathToFileURL(path.join(__dirname, '../helpers/business-ts-resolve.mjs')).href
);

const {
  createBusinessAdminRuntimeFacade,
  createBusinessAdminPipelineRunner,
  createBusinessAdminExecutionContext,
  BUSINESS_ADMIN_PIPELINE_STAGES,
  PIPELINE_BAG_BUSINESS_ADMIN_RESULT_KEY,
  PIPELINE_BAG_DASHBOARD_WORKSPACE_RESULT_KEY,
  PIPELINE_BAG_REPORTS_WORKSPACE_RESULT_KEY,
  PIPELINE_BAG_EXPORT_WORKSPACE_RESULT_KEY,
  PIPELINE_BAG_BUSINESS_SETTINGS_WORKSPACE_RESULT_KEY,
  BUILTIN_BUSINESS_ADMIN_MODULE_COUNT,
  BUILTIN_DASHBOARD_WORKSPACE_WIDGET_COUNT,
  BUILTIN_REPORTS_WORKSPACE_WIDGET_COUNT,
  BUILTIN_EXPORT_WORKSPACE_WIDGET_COUNT,
  BUILTIN_BUSINESS_SETTINGS_WORKSPACE_WIDGET_COUNT
} = await import('../../src/business-admin/index.ts');

describe('Business Admin End-to-End Runtime', () => {
  let facade;
  let runner;

  beforeEach(() => {
    facade = createBusinessAdminRuntimeFacade();
    runner = createBusinessAdminPipelineRunner();
  });

  it('full pipeline runs all stages in order', () => {
    const result = runner.execute(
      createBusinessAdminExecutionContext({ tenantId: 'tenant-1' })
    );
    const stageIds = result.stageExecutions.map((s) => s.stageId);
    assert.deepEqual(stageIds, [...BUSINESS_ADMIN_PIPELINE_STAGES]);
    assert.ok(result.stageExecutions.every((s) => s.outcome === 'succeeded'));
  });

  it('full pipeline projects foundation modules', () => {
    const result = facade.execute(
      createBusinessAdminExecutionContext({ tenantId: 'tenant-1' })
    );
    assert.equal(
      result.businessAdminResult.modules.length,
      BUILTIN_BUSINESS_ADMIN_MODULE_COUNT
    );
    assert.equal(result.businessAdminResult.summary.success, true);
  });

  it('full pipeline projects dashboard, reports, exports, settings', () => {
    const result = facade.execute(
      createBusinessAdminExecutionContext({ tenantId: 'tenant-1' })
    );
    assert.equal(
      result.dashboardResult?.summary.widgetCount,
      BUILTIN_DASHBOARD_WORKSPACE_WIDGET_COUNT
    );
    assert.equal(
      result.reportsResult?.summary.widgetCount,
      BUILTIN_REPORTS_WORKSPACE_WIDGET_COUNT
    );
    assert.equal(
      result.exportResult?.summary.widgetCount,
      BUILTIN_EXPORT_WORKSPACE_WIDGET_COUNT
    );
    assert.equal(
      result.settingsResult?.summary.widgetCount,
      BUILTIN_BUSINESS_SETTINGS_WORKSPACE_WIDGET_COUNT
    );
  });

  it('validation failure skips foundation through settings', () => {
    const result = runner.execute(
      createBusinessAdminExecutionContext({
        tenantId: 'tenant-1',
        locale: 'xx'
      })
    );
    const byId = Object.fromEntries(
      result.stageExecutions.map((s) => [s.stageId, s])
    );
    assert.equal(byId['business-validation'].outcome, 'failed');
    assert.equal(byId.foundation.outcome, 'skipped');
    assert.equal(byId.dashboard.outcome, 'skipped');
    assert.equal(byId.reports.outcome, 'skipped');
    assert.equal(byId.exports.outcome, 'skipped');
    assert.equal(byId.settings.outcome, 'skipped');
  });

  it('missing tenantId fails validation and skips middle stages', () => {
    const result = runner.execute(
      createBusinessAdminExecutionContext({ tenantId: '' })
    );
    const byId = Object.fromEntries(
      result.stageExecutions.map((s) => [s.stageId, s])
    );
    assert.equal(byId['business-validation'].outcome, 'failed');
    assert.equal(byId.foundation.outcome, 'skipped');
    assert.equal(byId.dashboard.outcome, 'skipped');
  });

  it('validation failure still runs summary', () => {
    const result = runner.execute(
      createBusinessAdminExecutionContext({
        tenantId: 'tenant-1',
        locale: 'xx'
      })
    );
    const summary = result.stageExecutions.find((s) => s.stageId === 'summary');
    assert.ok(summary);
    assert.equal(summary.outcome, 'succeeded');
  });

  it('validation failure still returns valid BusinessAdminResult', () => {
    const result = facade.execute(
      createBusinessAdminExecutionContext({
        tenantId: 'tenant-1',
        locale: 'xx'
      })
    );
    assert.ok(result.businessAdminResult);
    assert.equal(result.businessAdminResult.modules.length, 0);
    assert.equal(result.businessAdminResult.summary.success, false);
    assert.ok(
      result.businessAdminResult.validationIssues.some(
        (i) => i.code === 'INVALID_LOCALE'
      )
    );
    assert.ok(result.businessAdminResult.summaryItems.length > 0);
    assert.ok(result.businessAdminResult.telemetry);
  });

  it('validation failure does not produce workspace runtime results', () => {
    const result = facade.execute(
      createBusinessAdminExecutionContext({
        tenantId: 'tenant-1',
        locale: 'xx'
      })
    );
    assert.equal(result.dashboardResult, undefined);
    assert.equal(result.reportsResult, undefined);
    assert.equal(result.exportResult, undefined);
    assert.equal(result.settingsResult, undefined);
  });

  it('successful input runs full successful pipeline', () => {
    const result = facade.execute(
      createBusinessAdminExecutionContext({ tenantId: 'tenant-1' })
    );
    assert.equal(result.telemetry.summary.success, true);
    assert.equal(result.telemetry.summary.stagesSkipped, 0);
    assert.equal(
      result.telemetry.summary.stagesSucceeded,
      BUSINESS_ADMIN_PIPELINE_STAGES.length
    );
  });

  it('stage order matches BUSINESS_ADMIN_PIPELINE_STAGES', () => {
    const result = runner.execute(
      createBusinessAdminExecutionContext({ tenantId: 'tenant-1' })
    );
    assert.deepEqual(
      result.stageExecutions.map((s) => s.stageId),
      [...BUSINESS_ADMIN_PIPELINE_STAGES]
    );
  });

  it('bag uses existing Business Admin result keys', () => {
    const result = facade.execute(
      createBusinessAdminExecutionContext({ tenantId: 'tenant-1' })
    );
    assert.ok(result.bag[PIPELINE_BAG_BUSINESS_ADMIN_RESULT_KEY]);
    assert.ok(result.bag[PIPELINE_BAG_DASHBOARD_WORKSPACE_RESULT_KEY]);
    assert.ok(result.bag[PIPELINE_BAG_REPORTS_WORKSPACE_RESULT_KEY]);
    assert.ok(result.bag[PIPELINE_BAG_EXPORT_WORKSPACE_RESULT_KEY]);
    assert.ok(result.bag[PIPELINE_BAG_BUSINESS_SETTINGS_WORKSPACE_RESULT_KEY]);
  });

  it('initialBag is preserved and merged', () => {
    const result = facade.execute(
      createBusinessAdminExecutionContext({
        tenantId: 'tenant-1',
        initialBag: { customFlag: true }
      })
    );
    assert.equal(result.bag.customFlag, true);
    assert.ok(result.bag[PIPELINE_BAG_BUSINESS_ADMIN_RESULT_KEY]);
  });

  it('telemetry includes total duration and stage durations', () => {
    const result = facade.execute(
      createBusinessAdminExecutionContext({ tenantId: 'tenant-1' })
    );
    assert.ok(result.telemetry.totalDurationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    for (const stage of BUSINESS_ADMIN_PIPELINE_STAGES) {
      assert.ok(result.telemetry.stageDurationsMs[stage] !== undefined);
      assert.equal(result.telemetry.stageOutcomes[stage], 'succeeded');
    }
  });

  it('telemetry reports succeeded and skipped counts on validation failure', () => {
    const result = facade.execute(
      createBusinessAdminExecutionContext({
        tenantId: 'tenant-1',
        locale: 'xx'
      })
    );
    assert.equal(result.telemetry.summary.stagesSucceeded, 1); // summary only
    assert.equal(result.telemetry.summary.stagesSkipped, 5);
    assert.equal(result.telemetry.summary.stagesFailed, 1);
    assert.equal(result.telemetry.summary.success, false);
  });

  it('BusinessAdminResult summaryItems include e2e keys', () => {
    const result = facade.execute(
      createBusinessAdminExecutionContext({ tenantId: 'tenant-1' })
    );
    const keys = result.businessAdminResult.summaryItems.map((i) => i.key);
    assert.ok(keys.includes('stages-succeeded'));
    assert.ok(keys.includes('dashboard-widget-count'));
    assert.ok(keys.includes('reports-widget-count'));
    assert.ok(keys.includes('export-widget-count'));
    assert.ok(keys.includes('settings-section-count'));
  });

  it('facade.run shortcut returns BusinessAdminResult only', () => {
    const result = facade.run({ tenantId: 'tenant-1', locale: 'en' });
    assert.ok(result.modules.length > 0);
    assert.equal(result.summary.success, true);
    assert.ok(!('stageExecutions' in result));
  });

  it('filtered execution respects module and widget ids', () => {
    const result = facade.execute(
      createBusinessAdminExecutionContext({
        tenantId: 'tenant-1',
        moduleIds: ['dashboard', 'reports'],
        dashboardWidgetIds: ['overview', 'kpi-cards'],
        reportsWidgetIds: ['reports-overview']
      })
    );
    assert.equal(result.businessAdminResult.modules.length, 2);
    assert.equal(result.dashboardResult?.summary.widgetCount, 2);
    assert.equal(result.reportsResult?.summary.widgetCount, 1);
  });

  it('workspaces receive upstream businessAdminResult', () => {
    const result = facade.execute(
      createBusinessAdminExecutionContext({ tenantId: 'tenant-1' })
    );
    assert.equal(result.dashboardResult?.summary.hasDashboardResult, false);
    assert.equal(result.reportsResult?.summary.hasReportResult, false);
    assert.equal(result.exportResult?.summary.hasExportResult, false);
    assert.equal(result.settingsResult?.summary.hasBusinessSettings, false);
    assert.equal(result.dashboardResult?.summary.tenantId, 'tenant-1');
  });

  it('omitted tenantId fails validation', () => {
    const result = facade.execute(createBusinessAdminExecutionContext({}));
    assert.equal(result.telemetry.summary.stagesFailed, 1);
    assert.ok(
      result.businessAdminResult.validationIssues.some(
        (i) => i.code === 'MISSING_TENANT_ID'
      )
    );
  });

  it('bag on validation failure does not include workspace keys', () => {
    const result = facade.execute(
      createBusinessAdminExecutionContext({
        tenantId: 'tenant-1',
        locale: 'xx',
        initialBag: { keep: 1 }
      })
    );
    assert.equal(result.bag.keep, 1);
    assert.equal(
      result.bag[PIPELINE_BAG_DASHBOARD_WORKSPACE_RESULT_KEY],
      undefined
    );
    assert.equal(
      result.bag[PIPELINE_BAG_BUSINESS_ADMIN_RESULT_KEY],
      undefined
    );
  });
});
