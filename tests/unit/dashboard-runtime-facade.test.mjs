/**
 * Dashboard Runtime Facade — PR-105F (en az 10 unit test)
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
  createDashboardRuntimeFacade,
  createDashboardPipelineRunner,
  createDashboardExecutionContext,
  resolveDashboardContext,
  ensureRequestIds,
  createSkippedStageExecution,
  createStageExecution,
  replaceStageExecution,
  mutateDashboardModel,
  syncDashboardModelFromBag,
  buildDashboardExecutionTelemetry
} = await import('../../src/business/dashboard/integration/runtime/index.ts');

function sampleReportModel(overrides = {}) {
  return {
    id: 'report-model-facade-001',
    metadata: {
      id: 'report-model-facade-001',
      title: 'Örnek rapor',
      reportDnaId: 'report-dna-facade',
      locale: 'tr',
      createdAt: '2026-07-20T22:00:00.000Z',
      version: '1.0.0'
    },
    status: 'basarili',
    lastStage: 'rapor-derleme',
    executiveSummary: { headline: 'Özet', body: 'Gövde', highlights: [] },
    sections: [],
    findings: [],
    recommendations: [],
    appendices: [],
    references: [],
    ...overrides
  };
}

function sampleRequest(overrides = {}) {
  return {
    id: 'dashboard-facade-1',
    reportDnaId: 'report-dna-facade',
    datasetId: 'ds-facade-001',
    reportModelId: 'report-model-facade-001',
    locale: 'tr',
    ...overrides
  };
}

describe('DashboardRuntimeFacade — unit', () => {
  it('createDashboardRuntimeFacade fabrika', () => {
    const facade = createDashboardRuntimeFacade();
    assert.ok(facade);
    assert.equal(typeof facade.execute, 'function');
    assert.equal(typeof facade.run, 'function');
  });

  it('createDashboardPipelineRunner fabrika', () => {
    const runner = createDashboardPipelineRunner();
    assert.ok(runner);
    assert.equal(typeof runner.execute, 'function');
  });

  it('createDashboardExecutionContext — request korunur', () => {
    const ctx = createDashboardExecutionContext({
      request: sampleRequest(),
      reportModel: sampleReportModel(),
      locale: 'en'
    });
    assert.equal(ctx.request.id, 'dashboard-facade-1');
    assert.equal(ctx.locale, 'en');
  });

  it('resolveDashboardContext — reportModel üzerinden üretir', () => {
    const ctx = resolveDashboardContext(
      createDashboardExecutionContext({
        request: sampleRequest(),
        reportModel: sampleReportModel()
      })
    );
    assert.equal(ctx.dashboardJobId, 'dashboard-facade-1');
    assert.equal(ctx.reportModel?.id, 'report-model-facade-001');
    assert.equal(ctx.locale, 'tr');
    assert.equal(ctx.currentStage, 'dashboard-dogrulama');
    assert.equal(ctx.status, 'bekliyor');
  });

  it('resolveDashboardContext — dashboardContext varsa birleştirir', () => {
    const ctx = resolveDashboardContext(
      createDashboardExecutionContext({
        request: sampleRequest({ layoutId: 'layout-new' }),
        dashboardContext: {
          dashboardJobId: 'job-existing',
          locale: 'tr',
          layoutId: 'layout-old',
          themeId: 'theme-old',
          currentStage: 'widget-derleme',
          status: 'suruyor',
          reportModel: sampleReportModel()
        },
        locale: 'en'
      })
    );
    assert.equal(ctx.dashboardJobId, 'job-existing');
    assert.equal(ctx.locale, 'en');
    assert.equal(ctx.layoutId, 'layout-new');
    assert.equal(ctx.currentStage, 'dashboard-dogrulama');
  });

  it('resolveDashboardContext — kaynak yoksa hata', () => {
    assert.throws(
      () =>
        resolveDashboardContext(
          createDashboardExecutionContext({
            request: sampleRequest()
          })
        ),
      /reportModel, decisionResult, analysisResult veya dashboardContext zorunludur/
    );
  });

  it('ensureRequestIds — boş id alanlarını doldurur', () => {
    const request = ensureRequestIds(
      sampleRequest({
        reportModelId: '',
        reportDnaId: '',
        datasetId: '',
        decisionRequestId: '',
        analysisRequestId: ''
      }),
      {
        reportModel: sampleReportModel(),
        decisionResult: {
          requestId: 'decision-facade-001',
          analysisRequestId: 'analysis-facade-001',
          datasetId: 'ds-from-decision',
          status: 'basarili',
          lastStage: 'karar-derleme',
          summary: { headline: 'OK', highlights: [] },
          recommendations: [],
          actions: [],
          risks: [],
          opportunities: [],
          priorities: [],
          scores: []
        }
      }
    );
    assert.equal(request.reportModelId, 'report-model-facade-001');
    assert.equal(request.reportDnaId, 'report-dna-facade');
    assert.equal(request.datasetId, 'ds-from-decision');
    assert.equal(request.decisionRequestId, 'decision-facade-001');
    assert.equal(request.analysisRequestId, 'analysis-facade-001');
  });

  it('ensureRequestIds — mevcut id alanları korunur', () => {
    const request = ensureRequestIds(
      sampleRequest({
        reportModelId: 'keep-report',
        datasetId: 'keep-ds',
        reportDnaId: 'keep-dna'
      }),
      { reportModel: sampleReportModel() }
    );
    assert.equal(request.reportModelId, 'keep-report');
    assert.equal(request.datasetId, 'keep-ds');
    assert.equal(request.reportDnaId, 'keep-dna');
  });

  it('createSkippedStageExecution — atlandi outcome', () => {
    const stage = createSkippedStageExecution(
      'yerlesim-cozumu',
      'Layout Resolution',
      'skipped for test'
    );
    assert.equal(stage.stageId, 'yerlesim-cozumu');
    assert.equal(stage.outcome, 'atlandi');
    assert.equal(stage.detail, 'skipped for test');
    assert.ok(typeof stage.durationMs === 'number');
  });

  it('createStageExecution — basarili outcome', () => {
    const stage = createStageExecution(
      'dashboard-derleme',
      'Dashboard Assembly',
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
          'widget-derleme',
          'Widget Assembly',
          'not-implemented',
          'placeholder'
        )
      ]
    };
    replaceStageExecution(
      context,
      createStageExecution(
        'widget-derleme',
        'Widget Assembly',
        'basarili',
        'done'
      )
    );
    assert.equal(context.stageExecutions.length, 1);
    assert.equal(context.stageExecutions[0].outcome, 'basarili');
  });

  it('mutateDashboardModel ve syncDashboardModelFromBag', () => {
    const dashboardModel = {
      id: 'x',
      metadata: {
        id: 'x',
        title: '',
        reportDnaId: 'dna',
        datasetId: 'ds',
        locale: 'tr',
        createdAt: '2026-07-20T22:00:00.000Z',
        version: '1.0.0',
        layoutId: 'l1',
        themeId: 't1'
      },
      status: 'bekliyor',
      lastStage: 'dashboard-dogrulama',
      layout: {
        id: 'l1',
        name: 'L',
        columnCount: 12,
        rowHeightToken: 'r',
        density: 'standart',
        gapToken: 'g'
      },
      theme: {
        id: 't1',
        name: 'T',
        defaultLayoutId: 'l1',
        surfaceColorToken: 's',
        accentColorToken: 'a',
        typographyToken: 'ty',
        version: '1.0.0'
      },
      sections: [],
      widgets: [],
      kpis: [],
      filters: [],
      navigation: { items: [] }
    };
    const context = {
      bag: {
        widgets: [
          {
            id: 'w1',
            code: 'W',
            kind: 'ozet',
            title: 'Widget',
            placement: { sectionId: 's1', order: 1 }
          }
        ],
        kpis: [
          {
            id: 'k1',
            code: 'K',
            label: 'KPI',
            value: 1,
            unit: 'adet'
          }
        ],
        sections: [
          {
            id: 's1',
            code: 'SEC',
            title: 'Bölüm',
            order: 1,
            widgetIds: []
          }
        ],
        navigation: { items: [{ id: 'n1', label: 'Ana', targetSectionId: 's1' }] }
      }
    };
    syncDashboardModelFromBag(dashboardModel, context);
    mutateDashboardModel(dashboardModel, 'basarili', 'dashboard-derleme');
    assert.equal(dashboardModel.widgets.length, 1);
    assert.equal(dashboardModel.kpis.length, 1);
    assert.equal(dashboardModel.sections.length, 1);
    assert.equal(dashboardModel.status, 'basarili');
    assert.equal(dashboardModel.lastStage, 'dashboard-derleme');
  });

  it('buildDashboardExecutionTelemetry — sayaçlar ve süreler', () => {
    const context = {
      stageExecutions: [
        {
          stageId: 'dashboard-dogrulama',
          stageName: 'Dashboard Validation',
          outcome: 'basarili',
          startedAt: '2026-07-20T22:00:00.000Z',
          endedAt: '2026-07-20T22:00:01.000Z',
          durationMs: 12,
          errors: [],
          warnings: [{ code: 'W1', message: 'warn' }]
        },
        {
          stageId: 'dashboard-birlestirme',
          stageName: 'Dashboard Composition',
          outcome: 'basarisiz',
          startedAt: '2026-07-20T22:00:01.000Z',
          endedAt: '2026-07-20T22:00:02.000Z',
          durationMs: 8,
          errors: [{ code: 'E1', message: 'fail' }],
          warnings: []
        },
        {
          stageId: 'yerlesim-cozumu',
          stageName: 'Layout Resolution',
          outcome: 'atlandi',
          startedAt: '2026-07-20T22:00:02.000Z',
          endedAt: '2026-07-20T22:00:02.000Z',
          durationMs: 0,
          errors: [],
          warnings: []
        }
      ]
    };
    const telemetry = buildDashboardExecutionTelemetry(
      context,
      '2026-07-20T22:00:00.000Z',
      '2026-07-20T22:00:03.000Z',
      30,
      {
        dashboardModelPartCount: 5,
        widgetCount: 0,
        kpiCount: 0,
        summarySectionCount: 6
      }
    );
    assert.equal(telemetry.totalDurationMs, 30);
    assert.equal(telemetry.summary.stagesSucceeded, 1);
    assert.equal(telemetry.summary.stagesFailed, 1);
    assert.equal(telemetry.summary.stagesSkipped, 1);
    assert.equal(telemetry.summary.success, false);
    assert.equal(telemetry.summary.dashboardModelPartCount, 5);
    assert.equal(telemetry.summary.summarySectionCount, 6);
    assert.equal(telemetry.stageDurationsMs['dashboard-birlestirme'], 8);
    assert.equal(telemetry.stageOutcomes['yerlesim-cozumu'], 'atlandi');
  });
});
