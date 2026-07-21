/**
 * End-to-End Export Runtime — PR-106F (en az 16 entegrasyon testi)
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
  createExportRuntimeFacade,
  createExportExecutionContext,
  EXPORT_PART_ORDER,
  RENDER_PART_ORDER,
  FORMAT_REPRESENTATION_ORDER,
  EXPORT_SUMMARY_SECTION_ORDER,
  PIPELINE_BAG_EXPORT_MODEL_RUNTIME_RESULT_KEY,
  PIPELINE_BAG_EXPORT_RENDERER_RUNTIME_RESULT_KEY,
  PIPELINE_BAG_EXPORT_FORMAT_RUNTIME_RESULT_KEY,
  PIPELINE_BAG_EXPORT_SUMMARY_RUNTIME_RESULT_KEY,
  EXPORT_PIPELINE_STAGE_COUNT
} = await import('../../src/business/export/index.ts');

function sampleDashboardModel(overrides = {}) {
  return {
    id: 'dashboard-model-e2e-001',
    metadata: {
      id: 'dashboard-model-e2e-001',
      title: 'Örnek dashboard',
      reportDnaId: 'report-dna-e2e',
      datasetId: 'ds-e2e-001',
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

function sampleDocumentModel(overrides = {}) {
  return {
    id: 'document-model-e2e-001',
    metadata: {
      id: 'document-model-e2e-001',
      title: 'Örnek doküman',
      reportModelId: 'report-model-e2e-001',
      reportDnaId: 'report-dna-e2e',
      locale: 'tr',
      createdAt: '2026-07-20T22:00:00.000Z',
      version: '1.0.0',
      layoutId: 'doc-layout-1',
      themeId: 'doc-theme-1'
    },
    status: 'basarili',
    lastStage: 'dokuman-derleme',
    layout: { id: 'doc-layout-1', name: 'Doküman yerleşimi' },
    style: { id: 'doc-style-1', name: 'Doküman stili' },
    theme: { id: 'doc-theme-1', name: 'Doküman teması' },
    header: { title: 'Başlık' },
    footer: { text: 'Alt bilgi' },
    sections: [{ id: 'doc-sec-1', title: 'Bölüm', order: 1 }],
    ...overrides
  };
}

function emptyDashboardModel() {
  return sampleDashboardModel({
    id: 'dashboard-model-empty-001',
    metadata: {
      id: 'dashboard-model-empty-001',
      title: 'Boş dashboard',
      reportDnaId: 'report-dna-empty',
      datasetId: 'ds-empty-001',
      locale: 'tr',
      createdAt: '2026-07-20T22:00:00.000Z',
      version: '1.0.0',
      layoutId: 'layout-1',
      themeId: 'theme-1'
    },
    sections: [],
    widgets: [],
    kpis: []
  });
}

function invalidDashboardModel() {
  return sampleDashboardModel({
    id: '',
    status: 'basarisiz',
    sections: /** @type {any} */ ('broken')
  });
}

function sampleRequest(overrides = {}) {
  return {
    id: 'export-e2e-1',
    formatIds: ['pdf', 'json'],
    dashboardModelId: 'dashboard-model-e2e-001',
    reportDnaId: 'report-dna-e2e',
    locale: 'tr',
    ...overrides
  };
}

function outcomeOf(result, stageId) {
  return result.stageExecutions.find((s) => s.stageId === stageId)?.outcome;
}

describe('ExportRuntimeFacade — integration', () => {
  /** @type {ReturnType<typeof createExportRuntimeFacade>} */
  let facade;

  beforeEach(() => {
    facade = createExportRuntimeFacade();
  });

  it('normal akış — uçtan uca başarılı', async () => {
    const result = await facade.execute(
      createExportExecutionContext({
        request: sampleRequest(),
        dashboardModel: sampleDashboardModel()
      })
    );
    assert.equal(result.exportResult.status, 'basarili');
    assert.ok(result.exportModelResult);
    assert.ok(result.rendererResult);
    assert.ok(result.formatResult);
    assert.ok(result.exportSummaryResult);
    assert.equal(outcomeOf(result, 'export-dogrulama'), 'basarili');
    assert.equal(outcomeOf(result, 'export-birlestirme'), 'basarili');
    assert.equal(outcomeOf(result, 'format-cozumu'), 'basarili');
    assert.equal(outcomeOf(result, 'sablon-cozumu'), 'atlandi');
    assert.equal(outcomeOf(result, 'artifact-derleme'), 'basarili');
    assert.equal(outcomeOf(result, 'export-sonuc'), 'basarili');
  });

  it('validation fail — Model / Renderer / Format atlanır', async () => {
    const result = await facade.execute(
      createExportExecutionContext({
        request: sampleRequest({
          dashboardModelId: 'dashboard-model-e2e-001',
          reportDnaId: 'report-dna-e2e'
        }),
        dashboardModel: invalidDashboardModel()
      })
    );
    assert.equal(result.exportResult.status, 'basarisiz');
    assert.equal(outcomeOf(result, 'export-dogrulama'), 'basarisiz');
    assert.equal(outcomeOf(result, 'export-birlestirme'), 'atlandi');
    assert.equal(outcomeOf(result, 'format-cozumu'), 'atlandi');
    assert.equal(outcomeOf(result, 'sablon-cozumu'), 'atlandi');
    assert.equal(result.exportModelResult, undefined);
    assert.equal(result.rendererResult, undefined);
    assert.equal(result.formatResult, undefined);
  });

  it('validation fail — Export Summary yine de üretilir', async () => {
    const result = await facade.execute(
      createExportExecutionContext({
        request: sampleRequest(),
        dashboardModel: invalidDashboardModel()
      })
    );
    assert.ok(result.exportSummaryResult);
    assert.equal(
      result.exportSummaryResult.sections.length,
      EXPORT_SUMMARY_SECTION_ORDER.length
    );
    assert.ok(result.exportSummaryResult.foundationSummary);
    assert.equal(outcomeOf(result, 'artifact-derleme'), 'basarili');
  });

  it('boş DashboardResult — geçerli ExportResult döner', async () => {
    const result = await facade.execute(
      createExportExecutionContext({
        request: sampleRequest({
          dashboardModelId: 'dashboard-model-empty-001',
          reportDnaId: 'report-dna-empty'
        }),
        dashboardModel: emptyDashboardModel()
      })
    );
    assert.ok(result.exportResult);
    assert.equal(result.exportResult.requestId, 'export-e2e-1');
    assert.ok(result.exportSummaryResult);
  });

  it('Export Model oluşturuldu', async () => {
    const result = await facade.execute(
      createExportExecutionContext({
        request: sampleRequest(),
        dashboardModel: sampleDashboardModel()
      })
    );
    assert.ok(result.exportModelResult);
    assert.ok(result.exportModelResult.model.metadata.id);
    assert.equal(
      result.telemetry.summary.exportModelPartCount,
      EXPORT_PART_ORDER.length
    );
  });

  it('Renderer oluşturuldu', async () => {
    const result = await facade.execute(
      createExportExecutionContext({
        request: sampleRequest(),
        dashboardModel: sampleDashboardModel()
      })
    );
    assert.ok(result.rendererResult);
    assert.ok(result.rendererResult.document);
    assert.equal(
      result.telemetry.summary.renderPartCount,
      RENDER_PART_ORDER.length
    );
  });

  it('Format oluşturuldu', async () => {
    const result = await facade.execute(
      createExportExecutionContext({
        request: sampleRequest(),
        dashboardModel: sampleDashboardModel()
      })
    );
    assert.ok(result.formatResult);
    assert.ok(result.formatResult.documents.length >= 1);
    assert.equal(
      result.telemetry.summary.formatRepresentationCount,
      result.formatResult.documents.length
    );
  });

  it('Summary oluşturuldu', async () => {
    const result = await facade.execute(
      createExportExecutionContext({
        request: sampleRequest(),
        dashboardModel: sampleDashboardModel()
      })
    );
    assert.ok(result.exportSummaryResult);
    assert.equal(
      result.exportSummaryResult.sections.length,
      EXPORT_SUMMARY_SECTION_ORDER.length
    );
    assert.equal(
      result.telemetry.summary.summarySectionCount,
      EXPORT_SUMMARY_SECTION_ORDER.length
    );
  });

  it('telemetry doğrulaması — süre ve stage sayaçları', async () => {
    const result = await facade.execute(
      createExportExecutionContext({
        request: sampleRequest(),
        dashboardModel: sampleDashboardModel()
      })
    );
    assert.ok(result.telemetry.totalDurationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.ok(result.telemetry.summary.stagesSucceeded >= 1);
    assert.ok(result.telemetry.summary.stagesSkipped >= 1);
    assert.equal(
      result.telemetry.summary.exportModelPartCount,
      EXPORT_PART_ORDER.length
    );
    assert.ok(result.telemetry.stageDurationsMs['export-birlestirme'] >= 0);
    assert.equal(result.telemetry.stageOutcomes['sablon-cozumu'], 'atlandi');
  });

  it('facade.run — yalnızca ExportResult döner', async () => {
    const exportResult = await facade.run(sampleRequest(), {
      dashboardModel: sampleDashboardModel()
    });
    assert.equal(exportResult.requestId, 'export-e2e-1');
    assert.equal(exportResult.lastStage, 'export-sonuc');
    assert.equal(exportResult.status, 'basarili');
    assert.ok(exportResult.summary);
    assert.equal(exportResult.artifacts.length, 0);
  });

  it('pipeline bag anahtarları doldurulur', async () => {
    const result = await facade.execute(
      createExportExecutionContext({
        request: sampleRequest(),
        dashboardModel: sampleDashboardModel()
      })
    );
    const bag = result.pipelineContext.bag;
    assert.ok(bag[PIPELINE_BAG_EXPORT_MODEL_RUNTIME_RESULT_KEY]);
    assert.ok(bag[PIPELINE_BAG_EXPORT_RENDERER_RUNTIME_RESULT_KEY]);
    assert.ok(bag[PIPELINE_BAG_EXPORT_FORMAT_RUNTIME_RESULT_KEY]);
    assert.ok(bag[PIPELINE_BAG_EXPORT_SUMMARY_RUNTIME_RESULT_KEY]);
    assert.ok(bag.validation);
    assert.ok(bag.exportModel);
    assert.ok(bag.render);
    assert.ok(bag.format);
    assert.ok(bag.summary);
    assert.ok(bag.exportResult);
  });

  it('exportContext ile yürütme', async () => {
    const result = await facade.execute(
      createExportExecutionContext({
        request: sampleRequest(),
        exportContext: {
          exportJobId: 'ctx-e2e',
          locale: 'tr',
          currentStage: 'export-dogrulama',
          status: 'bekliyor',
          dashboardModel: sampleDashboardModel()
        }
      })
    );
    assert.equal(
      result.pipelineContext.exportContext.exportJobId,
      'ctx-e2e'
    );
    assert.ok(result.exportSummaryResult);
  });

  it('DocumentModel kaynağı ile yürütme', async () => {
    const result = await facade.execute(
      createExportExecutionContext({
        request: sampleRequest({
          documentModelId: 'document-model-e2e-001',
          dashboardModelId: undefined,
          formatIds: ['pdf']
        }),
        documentModel: sampleDocumentModel()
      })
    );
    assert.equal(result.exportResult.status, 'basarili');
    assert.equal(
      result.exportResult.metadata.documentModelId,
      'document-model-e2e-001'
    );
    assert.ok(result.exportModelResult);
  });

  it('validation fail telemetry — atlanan stage sayısı', async () => {
    const result = await facade.execute(
      createExportExecutionContext({
        request: sampleRequest(),
        dashboardModel: invalidDashboardModel()
      })
    );
    assert.ok(result.telemetry.summary.stagesFailed >= 1);
    assert.ok(result.telemetry.summary.stagesSkipped >= 3);
    assert.equal(result.telemetry.summary.exportModelPartCount, 0);
    assert.equal(result.telemetry.summary.renderPartCount, 0);
    assert.equal(result.telemetry.summary.formatRepresentationCount, 0);
    assert.equal(
      result.telemetry.summary.summarySectionCount,
      EXPORT_SUMMARY_SECTION_ORDER.length
    );
  });

  it('her koşulda geçerli ExportResult şeması', async () => {
    for (const dashboardModel of [
      sampleDashboardModel(),
      emptyDashboardModel(),
      invalidDashboardModel()
    ]) {
      const result = await facade.execute(
        createExportExecutionContext({
          request: sampleRequest({
            dashboardModelId:
              dashboardModel.id || 'dashboard-model-e2e-001',
            reportDnaId:
              dashboardModel.metadata?.reportDnaId || 'report-dna-e2e'
          }),
          dashboardModel
        })
      );
      const er = result.exportResult;
      assert.equal(typeof er.requestId, 'string');
      assert.ok(['basarili', 'basarisiz'].includes(er.status));
      assert.ok(er.metadata && typeof er.metadata.id === 'string');
      assert.ok(Array.isArray(er.artifacts));
      assert.ok(er.summary && typeof er.summary.headline === 'string');
      assert.ok(er.completedAt);
    }
  });

  it('başarılı stage sayısı ve pipeline özeti', async () => {
    const result = await facade.execute(
      createExportExecutionContext({
        request: sampleRequest(),
        dashboardModel: sampleDashboardModel()
      })
    );
    assert.equal(result.stageExecutions.length, EXPORT_PIPELINE_STAGE_COUNT);
    assert.ok(result.telemetry.summary.stagesSucceeded >= 5);
    assert.equal(result.telemetry.summary.stagesSkipped, 1);
    assert.equal(result.telemetry.summary.stagesNotImplemented, 0);
    assert.equal(result.telemetry.summary.success, true);
  });

  it('initialBag mevcut bag mimarisine merge edilir', async () => {
    const result = await facade.execute(
      createExportExecutionContext({
        request: sampleRequest(),
        dashboardModel: sampleDashboardModel(),
        initialBag: { customFlag: true }
      })
    );
    assert.equal(result.pipelineContext.bag.customFlag, true);
    assert.ok(result.pipelineContext.bag.validation);
  });

  it('stage sırası — foundation pipeline aşamaları korunur', async () => {
    const result = await facade.execute(
      createExportExecutionContext({
        request: sampleRequest(),
        dashboardModel: sampleDashboardModel()
      })
    );
    const stageIds = result.stageExecutions.map((stage) => stage.stageId);
    assert.deepEqual(stageIds, [
      'export-dogrulama',
      'format-cozumu',
      'sablon-cozumu',
      'export-birlestirme',
      'artifact-derleme',
      'export-sonuc'
    ]);
  });
});
