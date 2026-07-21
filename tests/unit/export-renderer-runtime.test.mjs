/**
 * Export Renderer Runtime — PR-106C (en az 20 unit test)
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
  createRendererRuntime,
  createRendererRegistryRuntime,
  createRendererContext,
  createExportModelBuilderRuntime,
  createExportModelContext,
  createExportPipelineRuntime,
  applyExportModelBuilderToPipelineResult,
  applyExportRendererToPipelineResult,
  attachRendererToPipelineContext,
  readRendererFromPipelineContext,
  attachRendererToPipelineResult,
  readRendererFromPipelineResult,
  RENDER_PART_ORDER,
  RENDER_PART_LABELS,
  PIPELINE_BAG_EXPORT_RENDERER_RUNTIME_RESULT_KEY
} = await import('../../src/business/export/index.ts');

function sampleExportModel(overrides = {}) {
  return {
    metadata: {
      id: 'export-emb-001',
      requestId: 'export-emb-001',
      title: 'Export veri modeli',
      locale: 'tr',
      formatIds: ['pdf', 'json'],
      documentModelId: 'document-model-emb-001',
      dashboardModelId: 'dashboard-model-emb-001',
      reportDnaId: 'report-dna-emb',
      templateId: 'tpl-emb',
      targetId: 'target-emb',
      createdAt: '2026-07-20T22:00:00.000Z',
      version: '1.0.0',
      tags: []
    },
    content: {
      hasDocument: true,
      hasDashboard: true,
      documentSectionCount: 1,
      dashboardSectionCount: 2,
      widgetCount: 2,
      kpiCount: 2,
      totalReferenceCount: 8,
      present: true
    },
    documentReferences: {
      referenceCount: 1,
      items: [
        {
          id: 'document-model-emb-001',
          title: 'Örnek doküman',
          status: 'basarili',
          sectionCount: 1,
          reportModelId: 'report-model-emb-001',
          reportDnaId: 'report-dna-emb'
        }
      ],
      present: true
    },
    dashboardReferences: {
      referenceCount: 1,
      items: [
        {
          id: 'dashboard-model-emb-001',
          title: 'Örnek dashboard',
          status: 'basarili',
          layoutId: 'layout-emb',
          themeId: 'theme-emb',
          sectionCount: 2,
          widgetCount: 2,
          kpiCount: 2,
          reportDnaId: 'report-dna-emb',
          datasetId: 'ds-emb-001'
        }
      ],
      present: true
    },
    reportReferences: {
      referenceCount: 1,
      items: [
        {
          reportDnaId: 'report-dna-emb',
          reportModelId: 'report-model-emb-001',
          source: 'document'
        }
      ],
      present: true
    },
    sectionReferences: {
      referenceCount: 3,
      items: [
        {
          id: 'doc-sec-1',
          title: 'Giriş',
          order: 1,
          source: 'document',
          sourceSectionId: 'sec-1'
        },
        {
          id: 'dsec-2',
          title: 'KPI',
          order: 3,
          source: 'dashboard',
          widgetIds: ['w-2']
        },
        {
          id: 'dsec-1',
          title: 'Özet',
          order: 2,
          source: 'dashboard',
          widgetIds: ['w-1']
        }
      ],
      present: true
    },
    widgetReferences: {
      referenceCount: 2,
      items: [
        {
          id: 'w-1',
          widgetCode: 'SUMMARY_CARD',
          kind: 'kpi-card',
          title: 'Özet kart',
          kpiIds: ['kpi-revenue']
        },
        {
          id: 'w-2',
          widgetCode: 'TREND_CHART',
          kind: 'line-chart',
          title: 'Trend',
          kpiIds: ['kpi-growth']
        }
      ],
      present: true
    },
    kpiReferences: {
      referenceCount: 2,
      items: [
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
      present: true
    },
    ...overrides
  };
}

function emptyExportModel() {
  return sampleExportModel({
    content: {
      hasDocument: false,
      hasDashboard: false,
      documentSectionCount: 0,
      dashboardSectionCount: 0,
      widgetCount: 0,
      kpiCount: 0,
      totalReferenceCount: 0,
      present: false
    },
    documentReferences: { referenceCount: 0, items: [], present: false },
    dashboardReferences: { referenceCount: 0, items: [], present: false },
    reportReferences: { referenceCount: 0, items: [], present: false },
    sectionReferences: { referenceCount: 0, items: [], present: false },
    widgetReferences: { referenceCount: 0, items: [], present: false },
    kpiReferences: { referenceCount: 0, items: [], present: false }
  });
}

function singleSectionExportModel() {
  return sampleExportModel({
    content: {
      hasDocument: false,
      hasDashboard: true,
      documentSectionCount: 0,
      dashboardSectionCount: 1,
      widgetCount: 1,
      kpiCount: 1,
      totalReferenceCount: 3,
      present: true
    },
    documentReferences: { referenceCount: 0, items: [], present: false },
    sectionReferences: {
      referenceCount: 1,
      items: [
        {
          id: 'dsec-1',
          title: 'Özet',
          order: 1,
          source: 'dashboard',
          widgetIds: ['w-1']
        }
      ],
      present: true
    },
    widgetReferences: {
      referenceCount: 1,
      items: [
        {
          id: 'w-1',
          widgetCode: 'SUMMARY_CARD',
          kind: 'kpi-card',
          title: 'Özet kart',
          kpiIds: ['kpi-revenue']
        }
      ],
      present: true
    },
    kpiReferences: {
      referenceCount: 1,
      items: [
        {
          kpiId: 'kpi-revenue',
          name: 'Gelir',
          unit: 'TRY',
          value: 120000,
          trendLabel: 'yükseliş'
        }
      ],
      present: true
    }
  });
}

function sampleDashboardModel() {
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
      rowHeightToken: 't',
      density: 'standart',
      gapToken: 'g'
    },
    theme: {
      id: 'theme-emb',
      name: 'Tema',
      description: 't',
      defaultLayoutId: 'layout-emb',
      surfaceColorToken: 's',
      accentColorToken: 'a',
      typographyToken: 'ty',
      version: '1.0.0'
    },
    sections: [
      { id: 'dsec-1', title: 'Özet', order: 1, widgetIds: ['w-1'] },
      { id: 'dsec-2', title: 'KPI', order: 2, widgetIds: ['w-2'] }
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
      { kpiId: 'kpi-growth', name: 'Büyüme', unit: '%', value: 8.5 }
    ],
    filters: [],
    navigation: { items: [] }
  };
}

function sampleDocumentModel() {
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
      layoutId: 'doc-layout',
      themeId: 'doc-theme'
    },
    status: 'basarili',
    lastStage: 'dokuman-derleme',
    layout: { id: 'doc-layout', name: 'L' },
    style: { id: 'doc-style', name: 'S' },
    theme: { id: 'doc-theme', name: 'T' },
    header: { title: 'H' },
    footer: { text: 'F' },
    sections: [
      {
        id: 'doc-sec-1',
        sourceSectionId: 'sec-1',
        title: 'Giriş',
        order: 1,
        blocks: []
      }
    ]
  };
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
    ...overrides
  };
}

describe('RendererRuntime', () => {
  it('renders a full RenderDocument from ExportModel', () => {
    const runtime = createRendererRuntime();
    const result = runtime.compute(
      createRendererContext({ exportModel: sampleExportModel() })
    );

    assert.equal(result.document.sections.length, 3);
    assert.equal(result.document.present, true);
    assert.equal(result.document.header.title, 'Export veri modeli');
    assert.equal(result.document.header.documentTitle, 'Örnek doküman');
    assert.equal(result.document.header.dashboardTitle, 'Örnek dashboard');
    assert.ok(result.telemetry.renderedBlockCount > 0);
  });

  it('projects render metadata from ExportModel metadata', () => {
    const runtime = createRendererRuntime();
    const result = runtime.compute(
      createRendererContext({ exportModel: sampleExportModel() })
    );

    assert.equal(result.metadata.exportModelId, 'export-emb-001');
    assert.equal(result.metadata.requestId, 'export-emb-001');
    assert.equal(result.metadata.reportDnaId, 'report-dna-emb');
    assert.deepEqual([...result.metadata.formatIds], ['pdf', 'json']);
    assert.equal(result.metadata.id, 'render:export-emb-001');
    assert.equal(result.document.metadata.id, result.metadata.id);
  });

  it('warns and returns empty sections for empty ExportModel content', () => {
    const runtime = createRendererRuntime();
    const result = runtime.compute(
      createRendererContext({ exportModel: emptyExportModel() })
    );

    assert.ok(
      result.warnings.some((warning) => warning.code === 'EMPTY_EXPORT_CONTENT')
    );
    assert.equal(result.document.sections.length, 0);
    assert.equal(result.telemetry.renderedSectionCount, 0);
    assert.equal(result.telemetry.renderedBlockCount, 0);
    assert.equal(result.document.present, false);
  });

  it('warns when ExportModel input is missing', () => {
    const runtime = createRendererRuntime();
    const result = runtime.compute(createRendererContext({}));

    assert.ok(
      result.warnings.some((warning) => warning.code === 'EMPTY_EXPORT_MODEL')
    );
    assert.equal(result.document.sections.length, 0);
  });

  it('renders a single section with widget and kpi blocks', () => {
    const runtime = createRendererRuntime();
    const result = runtime.compute(
      createRendererContext({ exportModel: singleSectionExportModel() })
    );

    assert.equal(result.document.sections.length, 1);
    assert.equal(result.document.sections[0].id, 'dsec-1');
    assert.equal(result.document.sections[0].blocks.length, 2);
    assert.equal(result.document.sections[0].blocks[0].kind, 'widget');
    assert.equal(result.document.sections[0].blocks[1].kind, 'kpi');
    assert.equal(result.telemetry.renderedSectionCount, 1);
    assert.equal(result.telemetry.renderedBlockCount, 2);
  });

  it('renders sections in deterministic order by order then id', () => {
    const runtime = createRendererRuntime();
    const result = runtime.compute(
      createRendererContext({ exportModel: sampleExportModel() })
    );

    assert.deepEqual(
      result.document.sections.map((section) => section.id),
      ['doc-sec-1', 'dsec-1', 'dsec-2']
    );
    assert.deepEqual(
      result.document.sections.map((section) => section.order),
      [1, 2, 3]
    );
  });

  it('keeps deterministic block order: document then widget then kpi', () => {
    const runtime = createRendererRuntime();
    const result = runtime.compute(
      createRendererContext({ exportModel: sampleExportModel() })
    );

    const documentSection = result.document.sections[0];
    assert.equal(documentSection.source, 'document');
    assert.equal(documentSection.blocks[0].kind, 'document-block');
    assert.equal(documentSection.blocks[0].order, 1);

    const dashboardSection = result.document.sections[1];
    assert.equal(dashboardSection.blocks[0].kind, 'widget');
    assert.equal(dashboardSection.blocks[0].order, 1);
    assert.equal(dashboardSection.blocks[1].kind, 'kpi');
    assert.equal(dashboardSection.blocks[1].order, 2);
  });

  it('records telemetry duration, section count, and block count', () => {
    const runtime = createRendererRuntime();
    const result = runtime.compute(
      createRendererContext({ exportModel: sampleExportModel() })
    );

    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.equal(
      result.telemetry.renderedSectionCount,
      result.document.sections.length
    );
    assert.equal(
      result.telemetry.renderedBlockCount,
      result.document.footer.totalBlockCount
    );
    assert.equal(
      result.telemetry.renderedBlockCount,
      result.document.sections.reduce(
        (sum, section) => sum + section.blocks.length,
        0
      )
    );
  });

  it('builds footer counts from rendered sections and blocks', () => {
    const runtime = createRendererRuntime();
    const result = runtime.compute(
      createRendererContext({ exportModel: sampleExportModel() })
    );

    assert.equal(result.document.footer.documentModelId, 'document-model-emb-001');
    assert.equal(
      result.document.footer.dashboardModelId,
      'dashboard-model-emb-001'
    );
    assert.equal(result.document.footer.totalSectionCount, 3);
    assert.equal(
      result.document.footer.totalBlockCount,
      result.telemetry.renderedBlockCount
    );
    assert.equal(result.document.footer.content.present, true);
  });

  it('seeds builtin render parts in the registry', () => {
    const registry = createRendererRegistryRuntime(true);
    assert.equal(registry.count(), RENDER_PART_ORDER.length);
    assert.deepEqual(
      registry.getEnabled().map((part) => part.id),
      [...RENDER_PART_ORDER]
    );
    assert.equal(RENDER_PART_LABELS.header, 'Header');
  });

  it('warns when no registry parts are enabled', () => {
    const registry = createRendererRegistryRuntime(false);
    const runtime = createRendererRuntime(registry);
    const result = runtime.compute(
      createRendererContext({ exportModel: sampleExportModel() })
    );

    assert.ok(
      result.warnings.some((warning) => warning.code === 'NO_PARTS_ENABLED')
    );
  });

  it('supports register and unregister on RendererRegistryRuntime', () => {
    const registry = createRendererRegistryRuntime(false);
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

  it('accepts ExportModelResult as input source', () => {
    const builder = createExportModelBuilderRuntime();
    const modelResult = builder.compute(
      createExportModelContext({
        request: sampleRequest(),
        documentModel: sampleDocumentModel(),
        dashboardModel: sampleDashboardModel()
      })
    );
    const runtime = createRendererRuntime();
    const result = runtime.compute(
      createRendererContext({ exportModelResult: modelResult })
    );

    assert.ok(result.document.sections.length >= 1);
    assert.equal(result.metadata.exportModelId, 'export-emb-001');
  });

  it('attaches and reads RendererResult on pipeline context bag', () => {
    const runtime = createRendererRuntime();
    const result = runtime.compute(
      createRendererContext({ exportModel: sampleExportModel() })
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

    attachRendererToPipelineContext(context, result);
    assert.ok(context.bag[PIPELINE_BAG_EXPORT_RENDERER_RUNTIME_RESULT_KEY]);
    assert.equal(context.bag.render.documentId, 'render:export-emb-001');
    const read = readRendererFromPipelineContext(context);
    assert.equal(read?.telemetry.renderedSectionCount, 3);
  });

  it('attaches and reads RendererResult via pipeline result helpers', async () => {
    const pipelineRuntime = createExportPipelineRuntime({
      initialContext: sampleExportContext()
    });
    const pipelineResult = await pipelineRuntime.runWithDetails(sampleRequest());
    const renderer = createRendererRuntime();
    const renderResult = renderer.compute(
      createRendererContext({ exportModel: sampleExportModel() })
    );

    attachRendererToPipelineResult(pipelineResult, renderResult);
    const read = readRendererFromPipelineResult(pipelineResult);
    assert.equal(read?.document.sections.length, 3);
    assert.equal(pipelineResult.context.bag.render?.present, true);
  });

  it('applies renderer after export model builder on validated pipeline', async () => {
    const pipelineRuntime = createExportPipelineRuntime({
      initialContext: sampleExportContext()
    });
    const pipelineResult = await pipelineRuntime.runWithDetails(sampleRequest());
    applyExportModelBuilderToPipelineResult(pipelineResult);
    const renderResult = applyExportRendererToPipelineResult(pipelineResult);

    assert.ok(renderResult.document.sections.length >= 1);
    assert.ok(
      pipelineResult.context.bag[PIPELINE_BAG_EXPORT_RENDERER_RUNTIME_RESULT_KEY]
    );
    assert.equal(typeof pipelineResult.context.bag.render?.sectionCount, 'number');
  });

  it('skips rich render when pipeline validation failed', async () => {
    const pipelineRuntime = createExportPipelineRuntime({
      initialContext: sampleExportContext({
        dashboardModel: /** @type {any} */ ({}),
        documentModel: undefined
      })
    });
    const pipelineResult = await pipelineRuntime.runWithDetails(
      sampleRequest({ documentModelId: undefined })
    );
    assert.equal(pipelineResult.stageExecutions[0].outcome, 'basarisiz');

    const renderResult = applyExportRendererToPipelineResult(pipelineResult);
    assert.ok(
      renderResult.warnings.some(
        (warning) => warning.code === 'VALIDATION_NOT_PASSED'
      )
    );
    assert.equal(renderResult.document.sections.length, 0);
  });

  it('does not invent blocks for missing widget or kpi ids', () => {
    const runtime = createRendererRuntime();
    const result = runtime.compute(
      createRendererContext({
        exportModel: sampleExportModel({
          sectionReferences: {
            referenceCount: 1,
            items: [
              {
                id: 'dsec-x',
                title: 'Boş bağ',
                order: 1,
                source: 'dashboard',
                widgetIds: ['missing-widget']
              }
            ],
            present: true
          }
        })
      })
    );

    assert.equal(result.document.sections[0].blocks.length, 0);
  });

  it('projects document-block payload with sourceSectionId', () => {
    const runtime = createRendererRuntime();
    const result = runtime.compute(
      createRendererContext({ exportModel: sampleExportModel() })
    );

    const block = result.document.sections[0].blocks[0];
    assert.equal(block.kind, 'document-block');
    assert.equal(block.payload.sourceSectionId, 'sec-1');
    assert.equal(block.payload.documentId, 'document-model-emb-001');
  });

  it('exposes getRegistry on the renderer runtime', () => {
    const runtime = createRendererRuntime();
    assert.equal(runtime.getRegistry().count(), RENDER_PART_ORDER.length);
  });

  it('is deterministic across repeated compute calls', () => {
    const runtime = createRendererRuntime();
    const context = createRendererContext({ exportModel: sampleExportModel() });
    const first = runtime.compute(context);
    const second = runtime.compute(context);

    assert.deepEqual(
      first.document.sections.map((section) => ({
        id: section.id,
        order: section.order,
        blockIds: section.blocks.map((block) => block.id)
      })),
      second.document.sections.map((section) => ({
        id: section.id,
        order: section.order,
        blockIds: section.blocks.map((block) => block.id)
      }))
    );
  });

  it('carries locale and reportDnaId into header', () => {
    const runtime = createRendererRuntime();
    const result = runtime.compute(
      createRendererContext({ exportModel: sampleExportModel() })
    );

    assert.equal(result.document.header.locale, 'tr');
    assert.equal(result.document.header.reportDnaId, 'report-dna-emb');
  });
});
