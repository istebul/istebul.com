/**
 * End-to-End Dashboard Runtime — PR-105F (en az 15 entegrasyon testi)
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
  createDashboardRuntimeFacade,
  createDashboardExecutionContext,
  DASHBOARD_SUMMARY_SECTION_ORDER,
  DASHBOARD_PART_ORDER,
  WIDGET_ORDER,
  KPI_ORDER,
  PIPELINE_BAG_DASHBOARD_MODEL_RUNTIME_RESULT_KEY,
  PIPELINE_BAG_DASHBOARD_WIDGET_RUNTIME_RESULT_KEY,
  PIPELINE_BAG_DASHBOARD_KPI_BOARD_RUNTIME_RESULT_KEY,
  PIPELINE_BAG_DASHBOARD_SUMMARY_RUNTIME_RESULT_KEY
} = await import('../../src/business/dashboard/index.ts');

function sampleReportModel(overrides = {}) {
  return {
    id: 'report-model-e2e-001',
    metadata: {
      id: 'report-model-e2e-001',
      title: 'Örnek rapor',
      reportDnaId: 'report-dna-e2e',
      locale: 'tr',
      createdAt: '2026-07-20T22:00:00.000Z',
      version: '1.0.0'
    },
    status: 'basarili',
    lastStage: 'rapor-derleme',
    executiveSummary: {
      headline: 'Yönetici özeti',
      body: 'Özet gövde',
      highlights: ['Bulgu 1']
    },
    sections: [
      {
        id: 'sec-1',
        sectionCode: 'SEC_SUMMARY',
        kind: 'ozet',
        title: 'Özet',
        order: 1,
        content: {}
      }
    ],
    findings: [
      {
        id: 'find-1',
        code: 'FIND_1',
        title: 'Bulgu',
        description: 'd',
        severity: 'bilgi'
      }
    ],
    recommendations: [
      {
        id: 'rec-1',
        code: 'REC_A',
        title: 'Kaliteyi artır',
        description: 'İyileştir',
        priorityLevel: 'yuksek'
      }
    ],
    appendices: [],
    references: [],
    ...overrides
  };
}

function emptyReportModel() {
  return {
    id: 'report-model-empty-001',
    metadata: {
      id: 'report-model-empty-001',
      title: 'Boş rapor',
      reportDnaId: 'report-dna-empty',
      locale: 'tr',
      createdAt: '2026-07-20T22:00:00.000Z',
      version: '1.0.0'
    },
    status: 'basarili',
    lastStage: 'rapor-derleme',
    executiveSummary: { headline: 'Boş', body: '', highlights: [] },
    sections: [],
    findings: [],
    recommendations: [],
    appendices: [],
    references: []
  };
}

function invalidReportModel() {
  return sampleReportModel({
    id: '',
    status: 'basarisiz',
    sections: /** @type {any} */ ('broken')
  });
}

function sampleRequest(overrides = {}) {
  return {
    id: 'dashboard-e2e-1',
    reportDnaId: 'report-dna-e2e',
    datasetId: 'ds-e2e-001',
    reportModelId: 'report-model-e2e-001',
    locale: 'tr',
    ...overrides
  };
}

function outcomeOf(result, stageId) {
  return result.stageExecutions.find((s) => s.stageId === stageId)?.outcome;
}

describe('DashboardRuntimeFacade — integration', () => {
  /** @type {ReturnType<typeof createDashboardRuntimeFacade>} */
  let facade;

  beforeEach(() => {
    facade = createDashboardRuntimeFacade();
  });

  it('normal akış — uçtan uca başarılı', async () => {
    const result = await facade.execute(
      createDashboardExecutionContext({
        request: sampleRequest(),
        reportModel: sampleReportModel()
      })
    );
    assert.equal(result.dashboardModel.status, 'basarili');
    assert.ok(result.dashboardModelResult);
    assert.ok(result.widgetResult);
    assert.ok(result.kpiBoardResult);
    assert.ok(result.dashboardSummaryResult);
    assert.equal(outcomeOf(result, 'dashboard-dogrulama'), 'basarili');
    assert.equal(outcomeOf(result, 'widget-derleme'), 'basarili');
    assert.equal(outcomeOf(result, 'dashboard-birlestirme'), 'basarili');
    assert.equal(outcomeOf(result, 'yerlesim-cozumu'), 'atlandi');
    assert.equal(outcomeOf(result, 'filtre-cozumu'), 'atlandi');
    assert.equal(outcomeOf(result, 'dashboard-derleme'), 'basarili');
  });

  it('validation fail — Model/Widget/KPI atlanır', async () => {
    const result = await facade.execute(
      createDashboardExecutionContext({
        request: sampleRequest({
          reportModelId: 'report-model-e2e-001',
          reportDnaId: 'report-dna-e2e'
        }),
        reportModel: invalidReportModel()
      })
    );
    assert.equal(result.dashboardModel.status, 'basarisiz');
    assert.equal(outcomeOf(result, 'dashboard-dogrulama'), 'basarisiz');
    assert.equal(outcomeOf(result, 'widget-derleme'), 'atlandi');
    assert.equal(outcomeOf(result, 'yerlesim-cozumu'), 'atlandi');
    assert.equal(outcomeOf(result, 'filtre-cozumu'), 'atlandi');
    assert.equal(outcomeOf(result, 'dashboard-birlestirme'), 'atlandi');
    assert.equal(result.dashboardModelResult, undefined);
    assert.equal(result.widgetResult, undefined);
    assert.equal(result.kpiBoardResult, undefined);
  });

  it('validation fail — Dashboard Summary yine de üretilir', async () => {
    const result = await facade.execute(
      createDashboardExecutionContext({
        request: sampleRequest(),
        reportModel: invalidReportModel()
      })
    );
    assert.ok(result.dashboardSummaryResult);
    assert.equal(
      result.dashboardSummaryResult.sections.length,
      DASHBOARD_SUMMARY_SECTION_ORDER.length
    );
    assert.ok(result.dashboardSummaryResult.summary);
    assert.equal(outcomeOf(result, 'dashboard-derleme'), 'basarili');
  });

  it('boş ReportResult — geçerli DashboardModel döner', async () => {
    const result = await facade.execute(
      createDashboardExecutionContext({
        request: sampleRequest({
          reportModelId: 'report-model-empty-001',
          reportDnaId: 'report-dna-empty'
        }),
        reportModel: emptyReportModel()
      })
    );
    assert.ok(result.dashboardModel);
    assert.equal(result.dashboardModel.id, 'dashboard-e2e-1');
    assert.ok(Array.isArray(result.dashboardModel.widgets));
    assert.ok(Array.isArray(result.dashboardModel.kpis));
    assert.ok(Array.isArray(result.dashboardModel.sections));
    assert.ok(result.dashboardSummaryResult);
  });

  it('DashboardModel oluşturuldu', async () => {
    const result = await facade.execute(
      createDashboardExecutionContext({
        request: sampleRequest(),
        reportModel: sampleReportModel()
      })
    );
    assert.ok(result.dashboardModelResult);
    assert.ok(result.dashboardModelResult.model.metadata.id);
    assert.equal(
      result.telemetry.summary.dashboardModelPartCount,
      DASHBOARD_PART_ORDER.length
    );
  });

  it('Widget oluşturuldu', async () => {
    const result = await facade.execute(
      createDashboardExecutionContext({
        request: sampleRequest(),
        reportModel: sampleReportModel()
      })
    );
    assert.ok(result.widgetResult);
    assert.equal(result.widgetResult.widgets.length, WIDGET_ORDER.length);
    assert.equal(result.dashboardModel.widgets.length, WIDGET_ORDER.length);
    assert.equal(result.telemetry.summary.widgetCount, WIDGET_ORDER.length);
  });

  it('KPI oluşturuldu', async () => {
    const result = await facade.execute(
      createDashboardExecutionContext({
        request: sampleRequest(),
        reportModel: sampleReportModel()
      })
    );
    assert.ok(result.kpiBoardResult);
    assert.equal(result.kpiBoardResult.kpis.length, KPI_ORDER.length);
    assert.equal(result.dashboardModel.kpis.length, KPI_ORDER.length);
    assert.equal(result.telemetry.summary.kpiCount, KPI_ORDER.length);
  });

  it('Summary oluşturuldu', async () => {
    const result = await facade.execute(
      createDashboardExecutionContext({
        request: sampleRequest(),
        reportModel: sampleReportModel()
      })
    );
    assert.ok(result.dashboardSummaryResult);
    assert.equal(
      result.dashboardSummaryResult.sections.length,
      DASHBOARD_SUMMARY_SECTION_ORDER.length
    );
    assert.equal(
      result.telemetry.summary.summarySectionCount,
      DASHBOARD_SUMMARY_SECTION_ORDER.length
    );
  });

  it('telemetry doğrulaması — süre ve stage sayaçları', async () => {
    const result = await facade.execute(
      createDashboardExecutionContext({
        request: sampleRequest(),
        reportModel: sampleReportModel()
      })
    );
    assert.ok(result.telemetry.totalDurationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.ok(result.telemetry.summary.stagesSucceeded >= 1);
    assert.ok(result.telemetry.summary.stagesSkipped >= 1);
    assert.equal(
      result.telemetry.summary.dashboardModelPartCount,
      DASHBOARD_PART_ORDER.length
    );
    assert.equal(result.telemetry.summary.widgetCount, WIDGET_ORDER.length);
    assert.equal(result.telemetry.summary.kpiCount, KPI_ORDER.length);
    assert.ok(result.telemetry.stageDurationsMs['widget-derleme'] >= 0);
    assert.equal(result.telemetry.stageOutcomes['yerlesim-cozumu'], 'atlandi');
  });

  it('facade.run — yalnızca DashboardModel döner', async () => {
    const dashboardModel = await facade.run(sampleRequest(), {
      reportModel: sampleReportModel()
    });
    assert.equal(dashboardModel.id, 'dashboard-e2e-1');
    assert.ok(Array.isArray(dashboardModel.widgets));
    assert.equal(dashboardModel.status, 'basarili');
    assert.equal(dashboardModel.lastStage, 'dashboard-derleme');
  });

  it('pipeline bag anahtarları doldurulur', async () => {
    const result = await facade.execute(
      createDashboardExecutionContext({
        request: sampleRequest(),
        reportModel: sampleReportModel()
      })
    );
    const bag = result.pipelineContext.bag;
    assert.ok(bag[PIPELINE_BAG_DASHBOARD_MODEL_RUNTIME_RESULT_KEY]);
    assert.ok(bag[PIPELINE_BAG_DASHBOARD_WIDGET_RUNTIME_RESULT_KEY]);
    assert.ok(bag[PIPELINE_BAG_DASHBOARD_KPI_BOARD_RUNTIME_RESULT_KEY]);
    assert.ok(bag[PIPELINE_BAG_DASHBOARD_SUMMARY_RUNTIME_RESULT_KEY]);
    assert.ok(Array.isArray(bag.widgets));
    assert.ok(Array.isArray(bag.kpis));
    assert.ok(bag.dashboardSummary);
  });

  it('dashboardContext ile yürütme', async () => {
    const result = await facade.execute(
      createDashboardExecutionContext({
        request: sampleRequest(),
        dashboardContext: {
          dashboardJobId: 'ctx-e2e',
          locale: 'tr',
          layoutId: 'layout-ctx',
          themeId: 'theme-ctx',
          currentStage: 'dashboard-dogrulama',
          status: 'bekliyor',
          reportModel: sampleReportModel()
        }
      })
    );
    assert.equal(
      result.pipelineContext.dashboardContext.dashboardJobId,
      'ctx-e2e'
    );
    assert.ok(result.dashboardSummaryResult);
  });

  it('validation fail telemetry — atlanan stage sayısı', async () => {
    const result = await facade.execute(
      createDashboardExecutionContext({
        request: sampleRequest(),
        reportModel: invalidReportModel()
      })
    );
    assert.ok(result.telemetry.summary.stagesFailed >= 1);
    assert.ok(result.telemetry.summary.stagesSkipped >= 4);
    assert.equal(result.telemetry.summary.dashboardModelPartCount, 0);
    assert.equal(result.telemetry.summary.widgetCount, 0);
    assert.equal(result.telemetry.summary.kpiCount, 0);
    assert.equal(
      result.telemetry.summary.summarySectionCount,
      DASHBOARD_SUMMARY_SECTION_ORDER.length
    );
  });

  it('her koşulda geçerli DashboardModel şeması', async () => {
    for (const reportModel of [
      sampleReportModel(),
      emptyReportModel(),
      invalidReportModel()
    ]) {
      const result = await facade.execute(
        createDashboardExecutionContext({
          request: sampleRequest({
            reportModelId: reportModel.id || 'report-model-e2e-001',
            reportDnaId:
              reportModel.metadata?.reportDnaId || 'report-dna-e2e'
          }),
          reportModel
        })
      );
      const dm = result.dashboardModel;
      assert.ok(typeof dm.id === 'string');
      assert.ok(dm.metadata && typeof dm.metadata.id === 'string');
      assert.ok(['basarili', 'basarisiz'].includes(dm.status));
      assert.ok(Array.isArray(dm.widgets));
      assert.ok(Array.isArray(dm.kpis));
      assert.ok(Array.isArray(dm.sections));
      assert.ok(Array.isArray(dm.filters));
      assert.ok(dm.layout && typeof dm.layout.id === 'string');
      assert.ok(dm.theme && typeof dm.theme.id === 'string');
      assert.ok(dm.navigation && Array.isArray(dm.navigation.items));
    }
  });

  it('başarılı stage sayısı ve pipeline özeti', async () => {
    const result = await facade.execute(
      createDashboardExecutionContext({
        request: sampleRequest(),
        reportModel: sampleReportModel()
      })
    );
    assert.equal(result.telemetry.summary.stagesExecuted, 6);
    assert.ok(result.telemetry.summary.stagesSucceeded >= 4);
    assert.equal(result.telemetry.summary.stagesSkipped, 2);
    assert.equal(result.telemetry.summary.stagesNotImplemented, 0);
    assert.equal(result.telemetry.summary.success, true);
  });

  it('initialBag mevcut bag mimarisine merge edilir', async () => {
    const result = await facade.execute(
      createDashboardExecutionContext({
        request: sampleRequest(),
        reportModel: sampleReportModel(),
        initialBag: { customFlag: true }
      })
    );
    assert.equal(result.pipelineContext.bag.customFlag, true);
    assert.ok(result.pipelineContext.bag.sourceValidation);
  });
});
