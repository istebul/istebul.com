/**
 * Export Model Builder Runtime — PR-106B (en az 20 unit test)
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
  createExportModelBuilderRuntime,
  createExportRegistryRuntime,
  createExportModelContext,
  createExportPipelineRuntime,
  applyExportModelBuilderToPipelineResult,
  attachExportModelToPipelineContext,
  readExportModelFromPipelineContext,
  attachExportModelToPipelineResult,
  readExportModelFromPipelineResult,
  EXPORT_PART_ORDER,
  EXPORT_PART_LABELS,
  PIPELINE_BAG_EXPORT_MODEL_RUNTIME_RESULT_KEY
} = await import('../../src/business/export/index.ts');

function sampleDashboardModel(overrides = {}) {
  return {
    id: 'dashboard-model-emb-001',
    metadata: {
      id: 'dashboard-model-emb-001',
      title: 'Örnek dashboard',
      reportDnaId: 'report-dna-emb',
      datasetId: 'ds-emb-001',
      locale: 'tr',
      createdAt: '2026-07-20T22:00:00.000Z',
      version: '1.0.0',
      layoutId: 'layout-emb',
      themeId: 'theme-emb'
    },
    status: 'basarili',
    lastStage: 'dashboard-derleme',
    layout: {
      id: 'layout-emb',
      name: 'Varsayılan',
      columnCount: 12,
      rowHeightToken: 'dashboard.row.height.default',
      density: 'standart',
      gapToken: 'dashboard.gap.default'
    },
    theme: {
      id: 'theme-emb',
      name: 'Varsayılan tema',
      description: 'Test teması',
      defaultLayoutId: 'layout-emb',
      surfaceColorToken: 'dashboard.color.surface',
      accentColorToken: 'dashboard.color.accent',
      typographyToken: 'dashboard.typography.default',
      version: '1.0.0'
    },
    sections: [
      {
        id: 'dsec-1',
        title: 'Özet',
        order: 1,
        widgetIds: ['w-1']
      },
      {
        id: 'dsec-2',
        title: 'KPI',
        order: 2,
        widgetIds: ['w-2']
      }
    ],
    widgets: [
      {
        id: 'w-1',
        widgetCode: 'SUMMARY_CARD',
        kind: 'kpi-card',
        title: 'Özet kart',
        placement: { col: 0, row: 0, colSpan: 4, rowSpan: 2 },
        kpiIds: ['kpi-revenue']
      },
      {
        id: 'w-2',
        widgetCode: 'TREND_CHART',
        kind: 'line-chart',
        title: 'Trend',
        placement: { col: 4, row: 0, colSpan: 8, rowSpan: 2 },
        kpiIds: ['kpi-growth']
      }
    ],
    kpis: [
      {
        kpiId: 'kpi-revenue',
        name: 'Gelir',
        unit: 'TRY',
        value: 120000,
        trendLabel: 'yükseliş'
      },
      {
        kpiId: 'kpi-growth',
        name: 'Büyüme',
        unit: '%',
        value: 8.5
      }
    ],
    filters: [],
    navigation: { items: [] },
    ...overrides
  };
}

function emptyDashboardModel() {
  return sampleDashboardModel({
    sections: [],
    widgets: [],
    kpis: [],
    filters: []
  });
}

function sampleDocumentModel(overrides = {}) {
  return {
    id: 'document-model-emb-001',
    metadata: {
      id: 'document-model-emb-001',
      title: 'Örnek doküman',
      reportModelId: 'report-model-emb-001',
      reportDnaId: 'report-dna-emb',
      locale: 'tr',
      createdAt: '2026-07-20T22:00:00.000Z',
      version: '1.0.0',
      layoutId: 'doc-layout-emb',
      themeId: 'doc-theme-emb'
    },
    status: 'basarili',
    lastStage: 'dokuman-derleme',
    layout: { id: 'doc-layout-emb', name: 'Doküman yerleşimi' },
    style: { id: 'doc-style-emb', name: 'Doküman stili' },
    theme: { id: 'doc-theme-emb', name: 'Doküman teması' },
    header: { title: 'Başlık' },
    footer: { text: 'Alt bilgi' },
    sections: [
      {
        id: 'doc-sec-1',
        sourceSectionId: 'sec-1',
        title: 'Giriş',
        order: 1,
        blocks: []
      },
      {
        id: 'doc-sec-2',
        sourceSectionId: 'sec-2',
        title: 'Sonuç',
        order: 2,
        blocks: [{ type: 'paragraph' }]
      }
    ],
    ...overrides
  };
}

function emptyDocumentModel() {
  return sampleDocumentModel({
    sections: []
  });
}

function sampleRequest(overrides = {}) {
  return {
    id: 'export-emb-001',
    formatIds: ['pdf', 'json'],
    dashboardModelId: 'dashboard-model-emb-001',
    documentModelId: 'document-model-emb-001',
    reportDnaId: 'report-dna-emb',
    locale: 'tr',
    templateId: 'tpl-emb',
    targetId: 'target-emb',
    ...overrides
  };
}

function sampleExportContext(overrides = {}) {
  return {
    exportJobId: 'export-job-emb-001',
    locale: 'tr',
    currentStage: 'export-dogrulama',
    status: 'bekliyor',
    dashboardModel: sampleDashboardModel(),
    documentModel: sampleDocumentModel(),
    metadata: { tenant: 'demo' },
    ...overrides
  };
}

describe('ExportModelBuilderRuntime', () => {
  it('projects a full ExportModel from DocumentModel and DashboardResult', async () => {
    const builder = createExportModelBuilderRuntime();
    const result = builder.compute(
      createExportModelContext({
        request: sampleRequest(),
        documentModel: sampleDocumentModel(),
        dashboardModel: sampleDashboardModel()
      })
    );

    assert.equal(result.model.metadata.requestId, 'export-emb-001');
    assert.equal(result.model.documentReferences.referenceCount, 1);
    assert.equal(result.model.dashboardReferences.referenceCount, 1);
    assert.equal(result.model.sectionReferences.referenceCount, 4);
    assert.equal(result.model.widgetReferences.referenceCount, 2);
    assert.equal(result.model.kpiReferences.referenceCount, 2);
    assert.equal(result.model.content.hasDocument, true);
    assert.equal(result.model.content.hasDashboard, true);
    assert.equal(result.model.content.present, true);
  });

  it('projects metadata fields from request and sources', () => {
    const builder = createExportModelBuilderRuntime();
    const result = builder.compute(
      createExportModelContext({
        request: sampleRequest(),
        documentModel: sampleDocumentModel(),
        dashboardModel: sampleDashboardModel()
      })
    );

    assert.equal(result.metadata.id, 'export-emb-001');
    assert.equal(result.metadata.documentModelId, 'document-model-emb-001');
    assert.equal(result.metadata.dashboardModelId, 'dashboard-model-emb-001');
    assert.equal(result.metadata.reportDnaId, 'report-dna-emb');
    assert.deepEqual([...result.metadata.formatIds], ['pdf', 'json']);
    assert.equal(result.metadata.templateId, 'tpl-emb');
    assert.equal(result.foundationMetadata.id, 'export-emb-001');
    assert.ok(Array.isArray(result.foundationMetadata.formatIds));
  });

  it('warns and returns empty references for empty DashboardResult', () => {
    const builder = createExportModelBuilderRuntime();
    const result = builder.compute(
      createExportModelContext({
        request: sampleRequest({ documentModelId: undefined }),
        dashboardModel: emptyDashboardModel()
      })
    );

    assert.ok(
      result.warnings.some((warning) => warning.code === 'EMPTY_DASHBOARD_RESULT')
    );
    assert.equal(result.model.widgetReferences.referenceCount, 0);
    assert.equal(result.model.kpiReferences.referenceCount, 0);
    assert.equal(result.model.sectionReferences.referenceCount, 0);
    assert.equal(result.model.dashboardReferences.present, true);
  });

  it('warns and returns empty section refs for empty DocumentModel', () => {
    const builder = createExportModelBuilderRuntime();
    const result = builder.compute(
      createExportModelContext({
        request: sampleRequest({ dashboardModelId: undefined }),
        documentModel: emptyDocumentModel()
      })
    );

    assert.ok(
      result.warnings.some((warning) => warning.code === 'EMPTY_DOCUMENT_MODEL')
    );
    assert.equal(result.model.documentReferences.present, true);
    assert.equal(result.model.sectionReferences.referenceCount, 0);
  });

  it('warns when both DocumentModel and DashboardResult are missing', () => {
    const builder = createExportModelBuilderRuntime();
    const result = builder.compute(
      createExportModelContext({
        request: sampleRequest()
      })
    );

    assert.ok(
      result.warnings.some((warning) => warning.code === 'EMPTY_EXPORT_SOURCES')
    );
    assert.equal(result.model.content.hasDocument, false);
    assert.equal(result.model.content.hasDashboard, false);
    assert.equal(result.model.content.totalReferenceCount, 0);
  });

  it('projects document-only sources without dashboard widgets', () => {
    const builder = createExportModelBuilderRuntime();
    const result = builder.compute(
      createExportModelContext({
        request: sampleRequest({ dashboardModelId: undefined }),
        documentModel: sampleDocumentModel()
      })
    );

    assert.equal(result.model.documentReferences.referenceCount, 1);
    assert.equal(result.model.dashboardReferences.referenceCount, 0);
    assert.equal(result.model.widgetReferences.referenceCount, 0);
    assert.equal(result.model.sectionReferences.referenceCount, 2);
    assert.equal(result.model.sectionReferences.items[0].source, 'document');
  });

  it('projects dashboard-only sources with widgets and KPIs', () => {
    const builder = createExportModelBuilderRuntime();
    const result = builder.compute(
      createExportModelContext({
        request: sampleRequest({ documentModelId: undefined }),
        dashboardModel: sampleDashboardModel()
      })
    );

    assert.equal(result.model.dashboardReferences.referenceCount, 1);
    assert.equal(result.model.documentReferences.referenceCount, 0);
    assert.equal(result.model.widgetReferences.items[0].widgetCode, 'SUMMARY_CARD');
    assert.equal(result.model.kpiReferences.items[0].kpiId, 'kpi-revenue');
    assert.equal(result.model.content.widgetCount, 2);
    assert.equal(result.model.content.kpiCount, 2);
  });

  it('projects report references from document, dashboard, and request', () => {
    const builder = createExportModelBuilderRuntime();
    const result = builder.compute(
      createExportModelContext({
        request: sampleRequest(),
        documentModel: sampleDocumentModel(),
        dashboardModel: sampleDashboardModel()
      })
    );

    assert.ok(result.model.reportReferences.referenceCount >= 2);
    assert.ok(
      result.model.reportReferences.items.some((item) => item.source === 'document')
    );
    assert.ok(
      result.model.reportReferences.items.some((item) => item.source === 'dashboard')
    );
  });

  it('records telemetry duration, projection count, and reference count', () => {
    const builder = createExportModelBuilderRuntime();
    const result = builder.compute(
      createExportModelContext({
        request: sampleRequest(),
        documentModel: sampleDocumentModel(),
        dashboardModel: sampleDashboardModel()
      })
    );

    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.ok(result.telemetry.projectionCount >= EXPORT_PART_ORDER.length);
    assert.ok(result.telemetry.referenceCount > 0);
    assert.equal(
      result.telemetry.referenceCount,
      result.model.documentReferences.referenceCount +
        result.model.dashboardReferences.referenceCount +
        result.model.reportReferences.referenceCount +
        result.model.sectionReferences.referenceCount +
        result.model.widgetReferences.referenceCount +
        result.model.kpiReferences.referenceCount
    );
  });

  it('seeds builtin export parts in the registry', () => {
    const registry = createExportRegistryRuntime(true);

    assert.equal(registry.count(), EXPORT_PART_ORDER.length);
    assert.deepEqual(
      registry.getEnabled().map((part) => part.id),
      [...EXPORT_PART_ORDER]
    );
    assert.equal(EXPORT_PART_LABELS.metadata, 'Export Metadata');
  });

  it('warns when no registry parts are enabled', () => {
    const registry = createExportRegistryRuntime(false);
    const builder = createExportModelBuilderRuntime(registry);
    const result = builder.compute(
      createExportModelContext({
        dashboardModel: sampleDashboardModel()
      })
    );

    assert.ok(
      result.warnings.some((warning) => warning.code === 'NO_PARTS_ENABLED')
    );
  });

  it('supports register and unregister on ExportRegistryRuntime', () => {
    const registry = createExportRegistryRuntime(false);
    registry.register({
      id: 'metadata',
      title: 'Custom Metadata',
      order: 1,
      enabled: true
    });
    assert.equal(registry.getById('metadata')?.title, 'Custom Metadata');
    assert.equal(registry.unregister('metadata'), true);
    assert.equal(registry.count(), 0);
  });

  it('builds a PR-106A compatible skeleton ExportModel', () => {
    const builder = createExportModelBuilderRuntime();
    const result = builder.compute(
      createExportModelContext({
        request: sampleRequest(),
        dashboardModel: sampleDashboardModel()
      })
    );

    assert.equal(result.skeletonModel.requestId, 'export-emb-001');
    assert.equal(result.skeletonModel.dashboardModelId, 'dashboard-model-emb-001');
    assert.deepEqual([...result.skeletonModel.formatIds], ['pdf', 'json']);
    assert.equal(result.skeletonModel.status, 'suruyor');
    assert.ok(result.skeletonModel.id.startsWith('export-model-'));
  });

  it('attaches and reads ExportModelResult on pipeline context bag', () => {
    const builder = createExportModelBuilderRuntime();
    const result = builder.compute(
      createExportModelContext({
        request: sampleRequest(),
        dashboardModel: sampleDashboardModel()
      })
    );

    /** @type {any} */
    const context = {
      request: sampleRequest(),
      exportContext: sampleExportContext(),
      stageExecutions: [],
      bag: {},
      startedAt: new Date().toISOString(),
      startedMark: 0
    };

    attachExportModelToPipelineContext(context, result);
    assert.ok(context.bag[PIPELINE_BAG_EXPORT_MODEL_RUNTIME_RESULT_KEY]);
    assert.equal(context.bag.exportModel.requestId, 'export-emb-001');
    const read = readExportModelFromPipelineContext(context);
    assert.equal(read?.model.metadata.id, 'export-emb-001');
  });

  it('attaches and reads ExportModelResult via pipeline result helpers', async () => {
    const runtime = createExportPipelineRuntime({
      initialContext: sampleExportContext()
    });
    const pipelineResult = await runtime.runWithDetails(sampleRequest());
    const builder = createExportModelBuilderRuntime();
    const modelResult = builder.compute(
      createExportModelContext({
        request: sampleRequest(),
        documentModel: sampleDocumentModel(),
        dashboardModel: sampleDashboardModel()
      })
    );

    attachExportModelToPipelineResult(pipelineResult, modelResult);
    const read = readExportModelFromPipelineResult(pipelineResult);
    assert.equal(read?.model.widgetReferences.referenceCount, 2);
    assert.equal(
      pipelineResult.context.bag.exportModel?.dashboardModelId,
      'dashboard-model-emb-001'
    );
  });

  it('applies Export Model Builder to a validated pipeline result', async () => {
    const runtime = createExportPipelineRuntime({
      initialContext: sampleExportContext()
    });
    const pipelineResult = await runtime.runWithDetails(sampleRequest());
    assert.equal(pipelineResult.stageExecutions[0].outcome, 'basarili');

    const modelResult = applyExportModelBuilderToPipelineResult(pipelineResult);

    assert.equal(modelResult.model.sectionReferences.referenceCount, 4);
    assert.ok(
      pipelineResult.context.bag[PIPELINE_BAG_EXPORT_MODEL_RUNTIME_RESULT_KEY]
    );
    assert.equal(
      pipelineResult.context.bag.exportModel?.requestId,
      'export-emb-001'
    );
  });

  it('skips rich projection when pipeline validation failed', async () => {
    const runtime = createExportPipelineRuntime({
      initialContext: sampleExportContext({
        dashboardModel: /** @type {any} */ ({}),
        documentModel: undefined
      })
    });
    const pipelineResult = await runtime.runWithDetails(
      sampleRequest({ documentModelId: undefined })
    );
    assert.equal(pipelineResult.stageExecutions[0].outcome, 'basarisiz');

    const modelResult = applyExportModelBuilderToPipelineResult(pipelineResult);

    assert.ok(
      modelResult.warnings.some((warning) => warning.code === 'VALIDATION_NOT_PASSED')
    );
    assert.equal(modelResult.model.content.hasDashboard, false);
  });

  it('resolves sources from ExportContext when direct inputs are omitted', () => {
    const builder = createExportModelBuilderRuntime();
    const result = builder.compute(
      createExportModelContext({
        request: sampleRequest(),
        exportContext: sampleExportContext()
      })
    );

    assert.equal(result.model.documentReferences.present, true);
    assert.equal(result.model.dashboardReferences.present, true);
    assert.equal(result.model.content.documentSectionCount, 2);
    assert.equal(result.model.content.dashboardSectionCount, 2);
  });

  it('does not invent widgets or KPIs beyond source projection', () => {
    const builder = createExportModelBuilderRuntime();
    const result = builder.compute(
      createExportModelContext({
        dashboardModel: sampleDashboardModel({
          widgets: [
            {
              id: 'w-only',
              widgetCode: 'ONLY',
              kind: 'table',
              title: 'Tablo',
              placement: { col: 0, row: 0, colSpan: 6, rowSpan: 2 }
            }
          ],
          kpis: []
        })
      })
    );

    assert.equal(result.model.widgetReferences.referenceCount, 1);
    assert.equal(result.model.kpiReferences.referenceCount, 0);
    assert.equal(result.model.widgetReferences.items[0].kpiIds.length, 0);
  });

  it('keeps section source tags for document and dashboard sections', () => {
    const builder = createExportModelBuilderRuntime();
    const result = builder.compute(
      createExportModelContext({
        documentModel: sampleDocumentModel(),
        dashboardModel: sampleDashboardModel()
      })
    );

    const documentSections = result.model.sectionReferences.items.filter(
      (item) => item.source === 'document'
    );
    const dashboardSections = result.model.sectionReferences.items.filter(
      (item) => item.source === 'dashboard'
    );

    assert.equal(documentSections.length, 2);
    assert.equal(dashboardSections.length, 2);
    assert.equal(documentSections[0].sourceSectionId, 'sec-1');
    assert.deepEqual([...dashboardSections[0].widgetIds], ['w-1']);
  });

  it('exposes getRegistry on the builder runtime', () => {
    const builder = createExportModelBuilderRuntime();
    assert.equal(builder.getRegistry().count(), EXPORT_PART_ORDER.length);
  });

  it('counts projections as part count plus reference count', () => {
    const builder = createExportModelBuilderRuntime();
    const result = builder.compute(
      createExportModelContext({
        documentModel: sampleDocumentModel(),
        dashboardModel: sampleDashboardModel(),
        request: sampleRequest()
      })
    );

    assert.equal(
      result.telemetry.projectionCount,
      EXPORT_PART_ORDER.length + result.telemetry.referenceCount
    );
  });
});
