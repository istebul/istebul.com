/**
 * Export Format Runtime — PR-106D (en az 20 unit test)
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
  createFormatRuntime,
  createFormatRegistryRuntime,
  createFormatContext,
  createRendererRuntime,
  createRendererContext,
  createExportModelBuilderRuntime,
  createExportModelContext,
  createExportPipelineRuntime,
  applyExportModelBuilderToPipelineResult,
  applyExportRendererToPipelineResult,
  applyExportFormatToPipelineResult,
  attachFormatToPipelineContext,
  readFormatFromPipelineContext,
  attachFormatToPipelineResult,
  readFormatFromPipelineResult,
  toExportFormats,
  FORMAT_REPRESENTATION_ORDER,
  FORMAT_REPRESENTATION_LABELS,
  PIPELINE_BAG_EXPORT_FORMAT_RUNTIME_RESULT_KEY
} = await import('../../src/business/export/index.ts');

function sampleRenderDocument(overrides = {}) {
  return {
    metadata: {
      id: 'render:export-fmt-001',
      exportModelId: 'export-fmt-001',
      requestId: 'export-fmt-001',
      title: 'Export veri modeli',
      locale: 'tr',
      formatIds: ['pdf', 'word', 'json'],
      documentModelId: 'document-model-fmt-001',
      dashboardModelId: 'dashboard-model-fmt-001',
      reportDnaId: 'report-dna-fmt',
      templateId: 'tpl-fmt',
      targetId: 'target-fmt',
      createdAt: '2026-07-20T22:00:00.000Z',
      version: '1.0.0'
    },
    header: {
      title: 'Export veri modeli',
      documentTitle: 'Örnek doküman',
      dashboardTitle: 'Örnek dashboard',
      locale: 'tr',
      reportDnaId: 'report-dna-fmt'
    },
    sections: [
      {
        id: 'doc-sec-1',
        title: 'Giriş',
        order: 1,
        source: 'document',
        sourceSectionId: 'sec-1',
        blocks: [
          {
            id: 'block:document:doc-sec-1',
            kind: 'document-block',
            order: 1,
            title: 'Giriş',
            source: {
              type: 'section',
              sectionId: 'doc-sec-1',
              source: 'document'
            },
            payload: { sourceSectionId: 'sec-1', documentId: 'document-model-fmt-001' }
          }
        ]
      },
      {
        id: 'dsec-1',
        title: 'Özet',
        order: 2,
        source: 'dashboard',
        widgetIds: ['w-1'],
        blocks: [
          {
            id: 'block:widget:w-1',
            kind: 'widget',
            order: 1,
            title: 'Özet kart',
            source: { type: 'widget', widgetId: 'w-1' },
            payload: {
              widgetCode: 'SUMMARY_CARD',
              kind: 'kpi-card',
              kpiIds: ['kpi-revenue'],
              sectionId: 'dsec-1'
            }
          },
          {
            id: 'block:kpi:kpi-revenue:w-1:2',
            kind: 'kpi',
            order: 2,
            title: 'Gelir',
            source: { type: 'kpi', kpiId: 'kpi-revenue' },
            payload: {
              unit: 'TRY',
              value: 120000,
              trendLabel: 'yükseliş',
              widgetId: 'w-1'
            }
          }
        ]
      }
    ],
    footer: {
      documentModelId: 'document-model-fmt-001',
      dashboardModelId: 'dashboard-model-fmt-001',
      totalSectionCount: 2,
      totalBlockCount: 3,
      content: {
        hasDocument: true,
        hasDashboard: true,
        documentSectionCount: 1,
        dashboardSectionCount: 1,
        widgetCount: 1,
        kpiCount: 1,
        totalReferenceCount: 5,
        present: true
      }
    },
    present: true,
    ...overrides
  };
}

function emptyRenderDocument() {
  return sampleRenderDocument({
    sections: [],
    present: false,
    footer: {
      documentModelId: 'document-model-fmt-001',
      dashboardModelId: 'dashboard-model-fmt-001',
      totalSectionCount: 0,
      totalBlockCount: 0,
      content: {
        hasDocument: false,
        hasDashboard: false,
        documentSectionCount: 0,
        dashboardSectionCount: 0,
        widgetCount: 0,
        kpiCount: 0,
        totalReferenceCount: 0,
        present: false
      }
    }
  });
}

function singleSectionRenderDocument() {
  return sampleRenderDocument({
    sections: [
      {
        id: 'dsec-1',
        title: 'Özet',
        order: 1,
        source: 'dashboard',
        widgetIds: ['w-1'],
        blocks: [
          {
            id: 'block:widget:w-1',
            kind: 'widget',
            order: 1,
            title: 'Özet kart',
            source: { type: 'widget', widgetId: 'w-1' },
            payload: { widgetCode: 'SUMMARY_CARD', kind: 'kpi-card', kpiIds: [], sectionId: 'dsec-1' }
          }
        ]
      }
    ],
    footer: {
      documentModelId: '',
      dashboardModelId: 'dashboard-model-fmt-001',
      totalSectionCount: 1,
      totalBlockCount: 1,
      content: {
        hasDocument: false,
        hasDashboard: true,
        documentSectionCount: 0,
        dashboardSectionCount: 1,
        widgetCount: 1,
        kpiCount: 0,
        totalReferenceCount: 2,
        present: true
      }
    }
  });
}

function sampleDashboardModel() {
  return {
    id: 'dashboard-model-fmt-001',
    metadata: {
      id: 'dashboard-model-fmt-001',
      title: 'Örnek dashboard',
      reportDnaId: 'report-dna-fmt',
      datasetId: 'ds-fmt-001',
      locale: 'tr',
      createdAt: '2026-07-20T22:00:00.000Z',
      version: '1.0.0',
      layoutId: 'layout-fmt',
      themeId: 'theme-fmt'
    },
    status: 'basarili',
    lastStage: 'dashboard-derleme',
    layout: {
      id: 'layout-fmt',
      name: 'L',
      columnCount: 12,
      rowHeightToken: 't',
      density: 'standart',
      gapToken: 'g'
    },
    theme: {
      id: 'theme-fmt',
      name: 'T',
      description: 'd',
      defaultLayoutId: 'layout-fmt',
      surfaceColorToken: 's',
      accentColorToken: 'a',
      typographyToken: 'ty',
      version: '1.0.0'
    },
    sections: [{ id: 'dsec-1', title: 'Özet', order: 1, widgetIds: ['w-1'] }],
    widgets: [
      {
        id: 'w-1',
        widgetCode: 'SUMMARY_CARD',
        kind: 'kpi-card',
        title: 'Özet kart',
        placement: { col: 0, row: 0, colSpan: 4, rowSpan: 2 },
        kpiIds: ['kpi-revenue']
      }
    ],
    kpis: [
      {
        kpiId: 'kpi-revenue',
        name: 'Gelir',
        unit: 'TRY',
        value: 120000,
        trendLabel: 'yükseliş'
      }
    ],
    filters: [],
    navigation: { items: [] }
  };
}

function sampleDocumentModel() {
  return {
    id: 'document-model-fmt-001',
    metadata: {
      id: 'document-model-fmt-001',
      title: 'Örnek doküman',
      reportModelId: 'report-model-fmt-001',
      reportDnaId: 'report-dna-fmt',
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
    id: 'export-fmt-001',
    formatIds: ['pdf', 'word', 'json'],
    dashboardModelId: 'dashboard-model-fmt-001',
    documentModelId: 'document-model-fmt-001',
    reportDnaId: 'report-dna-fmt',
    locale: 'tr',
    ...overrides
  };
}

function sampleExportContext(overrides = {}) {
  return {
    exportJobId: 'export-job-fmt-001',
    locale: 'tr',
    currentStage: 'export-dogrulama',
    status: 'bekliyor',
    dashboardModel: sampleDashboardModel(),
    documentModel: sampleDocumentModel(),
    ...overrides
  };
}

describe('FormatRuntime', () => {
  it('builds all five format representations when no filter is set', () => {
    const runtime = createFormatRuntime();
    const result = runtime.compute(
      createFormatContext({
        renderDocument: sampleRenderDocument({
          metadata: {
            ...sampleRenderDocument().metadata,
            formatIds: []
          }
        })
      })
    );

    assert.equal(result.documents.length, 5);
    assert.deepEqual(
      result.documents.map((document) => document.formatId),
      [...FORMAT_REPRESENTATION_ORDER]
    );
  });

  it('projects metadata from RenderDocument', () => {
    const runtime = createFormatRuntime();
    const result = runtime.compute(
      createFormatContext({ renderDocument: sampleRenderDocument() })
    );

    assert.equal(result.metadata.renderDocumentId, 'render:export-fmt-001');
    assert.equal(result.metadata.requestId, 'export-fmt-001');
    assert.equal(result.metadata.reportDnaId, 'report-dna-fmt');
    assert.equal(result.metadata.title, 'Export veri modeli');
    assert.equal(result.metadata.locale, 'tr');
  });

  it('warns for empty RenderDocument content', () => {
    const runtime = createFormatRuntime();
    const result = runtime.compute(
      createFormatContext({ renderDocument: emptyRenderDocument() })
    );

    assert.ok(
      result.warnings.some((warning) => warning.code === 'EMPTY_RENDER_CONTENT')
    );
    assert.ok(result.documents.length >= 1);
    assert.equal(result.documents[0].present, false);
  });

  it('warns when RenderDocument input is missing', () => {
    const runtime = createFormatRuntime();
    const result = runtime.compute(createFormatContext({}));

    assert.ok(
      result.warnings.some((warning) => warning.code === 'EMPTY_RENDER_DOCUMENT')
    );
  });

  it('formats a single-section RenderDocument', () => {
    const runtime = createFormatRuntime();
    const result = runtime.compute(
      createFormatContext({
        renderDocument: singleSectionRenderDocument(),
        formatIds: ['pdf', 'html', 'docx', 'markdown', 'json']
      })
    );

    assert.equal(result.documents.length, 5);
    for (const document of result.documents) {
      assert.equal(document.representation.outline.length, 1);
      assert.equal(document.representation.blockCount, 1);
      assert.equal(document.representation.headings[0], 'Özet');
    }
  });

  it('keeps deterministic format order across representations', () => {
    const runtime = createFormatRuntime();
    const result = runtime.compute(
      createFormatContext({
        renderDocument: sampleRenderDocument(),
        formatIds: ['json', 'pdf', 'markdown', 'html', 'docx']
      })
    );

    assert.deepEqual(
      result.documents.map((document) => document.formatId),
      ['pdf', 'html', 'docx', 'markdown', 'json']
    );
    assert.deepEqual(
      result.documents.map((document) => document.order),
      [1, 2, 3, 4, 5]
    );
  });

  it('maps request word formatId to docx representation', () => {
    const runtime = createFormatRuntime();
    const result = runtime.compute(
      createFormatContext({
        renderDocument: sampleRenderDocument({
          metadata: {
            ...sampleRenderDocument().metadata,
            formatIds: []
          }
        }),
        request: sampleRequest({ formatIds: ['word'] })
      })
    );

    assert.equal(result.documents.length, 1);
    assert.equal(result.documents[0].formatId, 'docx');
    assert.equal(result.documents[0].fileExtension, '.docx');
  });

  it('filters representations from RenderDocument formatIds', () => {
    const runtime = createFormatRuntime();
    const result = runtime.compute(
      createFormatContext({ renderDocument: sampleRenderDocument() })
    );

    assert.deepEqual(
      result.documents.map((document) => document.formatId),
      ['pdf', 'docx', 'json']
    );
  });

  it('records telemetry duration, format count, and representation count', () => {
    const runtime = createFormatRuntime();
    const result = runtime.compute(
      createFormatContext({
        renderDocument: sampleRenderDocument(),
        formatIds: [...FORMAT_REPRESENTATION_ORDER]
      })
    );

    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.equal(result.telemetry.formatCount, 5);
    assert.equal(result.telemetry.representationCount, 5);
    assert.equal(result.telemetry.formatCount, result.documents.length);
  });

  it('seeds builtin format definitions in the registry', () => {
    const registry = createFormatRegistryRuntime(true);
    assert.equal(registry.count(), FORMAT_REPRESENTATION_ORDER.length);
    assert.deepEqual(registry.listKinds(), [...FORMAT_REPRESENTATION_ORDER]);
    assert.equal(FORMAT_REPRESENTATION_LABELS.pdf, 'PDF Representation');
  });

  it('warns when no formats are enabled', () => {
    const registry = createFormatRegistryRuntime(false);
    const runtime = createFormatRuntime(registry);
    const result = runtime.compute(
      createFormatContext({ renderDocument: sampleRenderDocument() })
    );

    assert.ok(
      result.warnings.some((warning) => warning.code === 'NO_FORMATS_ENABLED')
    );
    assert.equal(result.documents.length, 0);
  });

  it('supports register and unregister on FormatRegistryRuntime', () => {
    const registry = createFormatRegistryRuntime(false);
    registry.register({
      id: 'pdf',
      name: 'Custom PDF',
      mimeType: 'application/pdf',
      fileExtension: '.pdf',
      order: 1,
      enabled: true
    });
    assert.equal(registry.getById('pdf')?.name, 'Custom PDF');
    assert.equal(registry.unregister('pdf'), true);
    assert.equal(registry.count(), 0);
  });

  it('builds distinct representation models per format kind', () => {
    const runtime = createFormatRuntime();
    const result = runtime.compute(
      createFormatContext({
        renderDocument: sampleRenderDocument(),
        formatIds: [...FORMAT_REPRESENTATION_ORDER]
      })
    );

    const byId = Object.fromEntries(
      result.documents.map((document) => [document.formatId, document])
    );
    assert.match(byId.pdf.representation.bodySummary, /PDF model/);
    assert.match(byId.html.representation.bodySummary, /HTML model/);
    assert.match(byId.docx.representation.bodySummary, /DOCX model/);
    assert.match(byId.markdown.representation.bodySummary, /Markdown model/);
    assert.match(byId.json.representation.bodySummary, /JSON model/);
    assert.equal(byId.pdf.representation.hints.pageSize, 'A4');
    assert.equal(byId.html.representation.hints.rootElement, 'article');
    assert.equal(byId.json.representation.hints.schemaHint, 'export-format-document-v1');
  });

  it('projects ExportFormat bag entries via toExportFormats', () => {
    const runtime = createFormatRuntime();
    const result = runtime.compute(
      createFormatContext({
        renderDocument: sampleRenderDocument(),
        formatIds: [...FORMAT_REPRESENTATION_ORDER]
      })
    );
    const exportFormats = toExportFormats(result.documents);

    assert.deepEqual(
      exportFormats.map((format) => format.id),
      ['pdf', 'word', 'json']
    );
    assert.equal(exportFormats.find((format) => format.id === 'word')?.fileExtension, '.docx');
  });

  it('accepts RendererResult as input source', () => {
    const modelBuilder = createExportModelBuilderRuntime();
    const modelResult = modelBuilder.compute(
      createExportModelContext({
        request: sampleRequest(),
        documentModel: sampleDocumentModel(),
        dashboardModel: sampleDashboardModel()
      })
    );
    const renderer = createRendererRuntime();
    const rendererResult = renderer.compute(
      createRendererContext({ exportModel: modelResult.model })
    );
    const formatRuntime = createFormatRuntime();
    const result = formatRuntime.compute(
      createFormatContext({ rendererResult })
    );

    assert.ok(result.documents.length >= 1);
    assert.equal(result.metadata.requestId, 'export-fmt-001');
  });

  it('attaches and reads FormatResult on pipeline context bag', () => {
    const runtime = createFormatRuntime();
    const result = runtime.compute(
      createFormatContext({ renderDocument: sampleRenderDocument() })
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

    attachFormatToPipelineContext(context, result);
    assert.ok(context.bag[PIPELINE_BAG_EXPORT_FORMAT_RUNTIME_RESULT_KEY]);
    assert.ok(Array.isArray(context.bag.format));
    assert.ok(context.bag.format.some((format) => format.id === 'pdf'));
    const read = readFormatFromPipelineContext(context);
    assert.equal(read?.telemetry.formatCount, result.documents.length);
  });

  it('attaches and reads FormatResult via pipeline result helpers', async () => {
    const pipelineRuntime = createExportPipelineRuntime({
      initialContext: sampleExportContext()
    });
    const pipelineResult = await pipelineRuntime.runWithDetails(sampleRequest());
    const formatRuntime = createFormatRuntime();
    const formatResult = formatRuntime.compute(
      createFormatContext({ renderDocument: sampleRenderDocument() })
    );

    attachFormatToPipelineResult(pipelineResult, formatResult);
    const read = readFormatFromPipelineResult(pipelineResult);
    assert.ok(read?.documents.length >= 1);
    assert.ok(Array.isArray(pipelineResult.context.bag.format));
  });

  it('applies format after model builder and renderer on validated pipeline', async () => {
    const pipelineRuntime = createExportPipelineRuntime({
      initialContext: sampleExportContext()
    });
    const pipelineResult = await pipelineRuntime.runWithDetails(sampleRequest());
    applyExportModelBuilderToPipelineResult(pipelineResult);
    applyExportRendererToPipelineResult(pipelineResult);
    const formatResult = applyExportFormatToPipelineResult(pipelineResult);

    assert.ok(formatResult.documents.length >= 1);
    assert.ok(
      pipelineResult.context.bag[PIPELINE_BAG_EXPORT_FORMAT_RUNTIME_RESULT_KEY]
    );
    assert.ok(Array.isArray(pipelineResult.context.bag.format));
  });

  it('skips rich format when pipeline validation failed', async () => {
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

    const formatResult = applyExportFormatToPipelineResult(pipelineResult);
    assert.ok(
      formatResult.warnings.some(
        (warning) => warning.code === 'VALIDATION_NOT_PASSED'
      )
    );
  });

  it('exposes getRegistry on the format runtime', () => {
    const runtime = createFormatRuntime();
    assert.equal(runtime.getRegistry().count(), FORMAT_REPRESENTATION_ORDER.length);
  });

  it('is deterministic across repeated compute calls', () => {
    const runtime = createFormatRuntime();
    const context = createFormatContext({
      renderDocument: sampleRenderDocument(),
      formatIds: [...FORMAT_REPRESENTATION_ORDER]
    });
    const first = runtime.compute(context);
    const second = runtime.compute(context);

    assert.deepEqual(
      first.documents.map((document) => ({
        formatId: document.formatId,
        order: document.order,
        headings: [...document.representation.headings]
      })),
      second.documents.map((document) => ({
        formatId: document.formatId,
        order: document.order,
        headings: [...document.representation.headings]
      }))
    );
  });

  it('does not invent section outline beyond RenderDocument sections', () => {
    const runtime = createFormatRuntime();
    const result = runtime.compute(
      createFormatContext({
        renderDocument: singleSectionRenderDocument(),
        formatIds: ['pdf']
      })
    );

    assert.equal(result.documents[0].representation.outline.length, 1);
    assert.equal(result.documents[0].representation.outline[0].children?.length, 1);
  });
});
