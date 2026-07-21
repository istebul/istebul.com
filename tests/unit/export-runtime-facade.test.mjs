/**
 * Export Runtime Facade — PR-106F (en az 13 unit test)
 */

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
register(
  pathToFileURL(path.join(__dirname, '../helpers/business-ts-resolve.mjs')).href
);

const {
  createExportRuntimeFacade,
  createExportPipelineRunner,
  createExportExecutionContext,
  resolveExportContext,
  ensureRequestIds,
  createSkippedStageExecution,
  createStageExecution,
  replaceStageExecution,
  buildFinalExportResult,
  syncExportResultFromBag,
  buildExportExecutionTelemetry
} = await import('../../src/business/export/integration/runtime/index.ts');

function sampleDashboardModel(overrides = {}) {
  return {
    id: 'dashboard-model-facade-001',
    metadata: {
      id: 'dashboard-model-facade-001',
      title: 'Örnek dashboard',
      reportDnaId: 'report-dna-facade',
      datasetId: 'ds-facade-001',
      locale: 'tr',
      createdAt: '2026-07-20T22:00:00.000Z',
      version: '1.0.0',
      layoutId: 'layout-1',
      themeId: 'theme-1'
    },
    status: 'basarili',
    lastStage: 'dashboard-derleme',
    layout: {
      id: 'layout-1',
      name: 'Varsayılan',
      columnCount: 12,
      rowHeightToken: 'dashboard.row.height.default',
      density: 'standart',
      gapToken: 'dashboard.gap.default'
    },
    theme: {
      id: 'theme-1',
      name: 'Varsayılan tema',
      description: 'Test teması',
      defaultLayoutId: 'layout-1',
      surfaceColorToken: 'dashboard.color.surface',
      accentColorToken: 'dashboard.color.accent',
      typographyToken: 'dashboard.typography.default',
      version: '1.0.0'
    },
    sections: [{ id: 'sec-1', title: 'Bölüm 1', order: 1 }],
    widgets: [{ id: 'w-1', widgetCode: 'W_1', title: 'Widget' }],
    kpis: [{ id: 'kpi-1', code: 'KPI_1', label: 'KPI' }],
    filters: [],
    navigation: { items: [] },
    ...overrides
  };
}

function sampleRequest(overrides = {}) {
  return {
    id: 'export-facade-1',
    formatIds: ['pdf', 'json'],
    dashboardModelId: 'dashboard-model-facade-001',
    reportDnaId: 'report-dna-facade',
    locale: 'tr',
    ...overrides
  };
}

describe('ExportRuntimeFacade — unit', () => {
  it('createExportRuntimeFacade fabrika', () => {
    const facade = createExportRuntimeFacade();
    assert.ok(facade);
    assert.equal(typeof facade.execute, 'function');
    assert.equal(typeof facade.run, 'function');
  });

  it('createExportPipelineRunner fabrika', () => {
    const runner = createExportPipelineRunner();
    assert.ok(runner);
    assert.equal(typeof runner.execute, 'function');
  });

  it('createExportExecutionContext — request korunur', () => {
    const ctx = createExportExecutionContext({
      request: sampleRequest(),
      dashboardModel: sampleDashboardModel(),
      locale: 'en'
    });
    assert.equal(ctx.request.id, 'export-facade-1');
    assert.equal(ctx.locale, 'en');
  });

  it('resolveExportContext — dashboardModel üzerinden üretir', () => {
    const ctx = resolveExportContext(
      createExportExecutionContext({
        request: sampleRequest(),
        dashboardModel: sampleDashboardModel()
      })
    );
    assert.equal(ctx.exportJobId, 'export-facade-1');
    assert.equal(ctx.dashboardModel?.id, 'dashboard-model-facade-001');
    assert.equal(ctx.locale, 'tr');
    assert.equal(ctx.currentStage, 'export-dogrulama');
    assert.equal(ctx.status, 'bekliyor');
  });

  it('resolveExportContext — exportContext varsa birleştirir', () => {
    const ctx = resolveExportContext(
      createExportExecutionContext({
        request: sampleRequest(),
        exportContext: {
          exportJobId: 'job-existing',
          locale: 'tr',
          currentStage: 'format-cozumu',
          status: 'suruyor',
          dashboardModel: sampleDashboardModel()
        },
        locale: 'en'
      })
    );
    assert.equal(ctx.exportJobId, 'job-existing');
    assert.equal(ctx.locale, 'en');
    assert.equal(ctx.currentStage, 'export-dogrulama');
  });

  it('resolveExportContext — kaynak yoksa hata', () => {
    assert.throws(
      () =>
        resolveExportContext(
          createExportExecutionContext({
            request: sampleRequest()
          })
        ),
      /documentModel, dashboardModel veya exportContext zorunludur/
    );
  });

  it('ensureRequestIds — boş id alanlarını doldurur', () => {
    const request = ensureRequestIds(
      sampleRequest({
        dashboardModelId: '',
        reportDnaId: ''
      }),
      { dashboardModel: sampleDashboardModel() }
    );
    assert.equal(request.dashboardModelId, 'dashboard-model-facade-001');
    assert.equal(request.reportDnaId, 'report-dna-facade');
  });

  it('ensureRequestIds — mevcut id alanları korunur', () => {
    const request = ensureRequestIds(
      sampleRequest({
        dashboardModelId: 'keep-dashboard',
        reportDnaId: 'keep-dna'
      }),
      { dashboardModel: sampleDashboardModel() }
    );
    assert.equal(request.dashboardModelId, 'keep-dashboard');
    assert.equal(request.reportDnaId, 'keep-dna');
  });

  it('createSkippedStageExecution — atlandi outcome', () => {
    const stage = createSkippedStageExecution(
      'sablon-cozumu',
      'Template Resolution',
      'skipped for test'
    );
    assert.equal(stage.stageId, 'sablon-cozumu');
    assert.equal(stage.outcome, 'atlandi');
    assert.equal(stage.detail, 'skipped for test');
    assert.ok(typeof stage.durationMs === 'number');
  });

  it('createStageExecution — basarili outcome', () => {
    const stage = createStageExecution(
      'export-sonuc',
      'Export Result',
      'basarili',
      'ok'
    );
    assert.equal(stage.outcome, 'basarili');
    assert.equal(stage.errors.length, 0);
  });

  it('replaceStageExecution — mevcut aşamayı değiştirir', () => {
    const context = {
      stageExecutions: [
        createStageExecution(
          'export-birlestirme',
          'Export Composition',
          'not-implemented',
          'placeholder'
        )
      ]
    };
    replaceStageExecution(
      context,
      createStageExecution(
        'export-birlestirme',
        'Export Composition',
        'basarili',
        'done'
      )
    );
    assert.equal(context.stageExecutions.length, 1);
    assert.equal(context.stageExecutions[0].outcome, 'basarili');
  });

  it('buildFinalExportResult ve syncExportResultFromBag', () => {
    const context = {
      request: sampleRequest(),
      exportContext: {
        exportJobId: 'export-facade-1',
        locale: 'tr',
        currentStage: 'export-sonuc',
        status: 'suruyor',
        dashboardModel: sampleDashboardModel()
      },
      stageExecutions: [
        createStageExecution(
          'export-dogrulama',
          'Export Validation',
          'basarili',
          'ok'
        )
      ],
      bag: {
        summary: {
          headline: 'Export özeti',
          artifactCount: 0,
          formatLabels: ['PDF'],
          warnings: []
        },
        format: [
          {
            id: 'pdf',
            name: 'PDF',
            mimeType: 'application/pdf',
            fileExtension: '.pdf',
            order: 1
          }
        ]
      }
    };
    const exportResult = buildFinalExportResult(context, 'export-sonuc');
    syncExportResultFromBag(exportResult, context);
    assert.equal(exportResult.requestId, 'export-facade-1');
    assert.equal(exportResult.lastStage, 'export-sonuc');
    assert.equal(exportResult.summary.headline, 'Export özeti');
    assert.deepEqual([...exportResult.metadata.formatIds], ['pdf']);
  });

  it('buildExportExecutionTelemetry — sayaçlar ve süreler', () => {
    const context = {
      stageExecutions: [
        {
          stageId: 'export-dogrulama',
          stageName: 'Export Validation',
          outcome: 'basarili',
          startedAt: '2026-07-20T22:00:00.000Z',
          endedAt: '2026-07-20T22:00:01.000Z',
          durationMs: 12,
          errors: [],
          warnings: [{ code: 'W1', message: 'warn' }]
        },
        {
          stageId: 'export-birlestirme',
          stageName: 'Export Composition',
          outcome: 'basarisiz',
          startedAt: '2026-07-20T22:00:01.000Z',
          endedAt: '2026-07-20T22:00:02.000Z',
          durationMs: 8,
          errors: [{ code: 'E1', message: 'fail' }],
          warnings: []
        },
        {
          stageId: 'sablon-cozumu',
          stageName: 'Template Resolution',
          outcome: 'atlandi',
          startedAt: '2026-07-20T22:00:02.000Z',
          endedAt: '2026-07-20T22:00:02.000Z',
          durationMs: 0,
          errors: [],
          warnings: []
        }
      ]
    };
    const telemetry = buildExportExecutionTelemetry(
      context,
      '2026-07-20T22:00:00.000Z',
      '2026-07-20T22:00:03.000Z',
      30,
      {
        exportModelPartCount: 8,
        renderPartCount: 5,
        formatRepresentationCount: 5,
        summarySectionCount: 7
      }
    );
    assert.equal(telemetry.totalDurationMs, 30);
    assert.equal(telemetry.summary.stagesSucceeded, 1);
    assert.equal(telemetry.summary.stagesFailed, 1);
    assert.equal(telemetry.summary.stagesSkipped, 1);
    assert.equal(telemetry.summary.success, false);
    assert.equal(telemetry.summary.exportModelPartCount, 8);
    assert.equal(telemetry.summary.summarySectionCount, 7);
    assert.equal(telemetry.stageDurationsMs['export-birlestirme'], 8);
    assert.equal(telemetry.stageOutcomes['sablon-cozumu'], 'atlandi');
  });
});
