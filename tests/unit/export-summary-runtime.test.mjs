/**
 * Export Summary Runtime — PR-106E (en az 20 unit test)
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
  createExportSummaryRuntime,
  createExportSummaryRegistryRuntime,
  createExportSummaryContext,
  createExportModelBuilderRuntime,
  createExportModelContext,
  createRendererRuntime,
  createRendererContext,
  createFormatRuntime,
  createFormatContext,
  createExportPipelineRuntime,
  applyExportModelBuilderToPipelineResult,
  applyExportRendererToPipelineResult,
  applyExportFormatToPipelineResult,
  applyExportSummaryToPipelineResult,
  attachExportSummaryToPipelineContext,
  readExportSummaryFromPipelineContext,
  attachExportSummaryToPipelineResult,
  readExportSummaryFromPipelineResult,
  EXPORT_SUMMARY_SECTION_ORDER,
  EXPORT_SUMMARY_SECTION_LABELS,
  PIPELINE_BAG_EXPORT_SUMMARY_RUNTIME_RESULT_KEY
} = await import('../../src/business/export/index.ts');

function sampleValidation(overrides = {}) {
  return {
    isValid: true,
    validatedAt: '2026-07-20T22:00:00.000Z',
    results: Object.freeze([]),
    counts: { info: 0, warning: 0, error: 0 },
    ...overrides
  };
}

function sampleDashboardModel() {
  return {
    id: 'dashboard-model-sum-001',
    metadata: {
      id: 'dashboard-model-sum-001',
      title: 'Örnek dashboard',
      reportDnaId: 'report-dna-sum',
      datasetId: 'ds-sum-001',
      locale: 'tr',
      createdAt: '2026-07-20T22:00:00.000Z',
      version: '1.0.0',
      layoutId: 'layout-sum',
      themeId: 'theme-sum'
    },
    status: 'basarili',
    lastStage: 'dashboard-derleme',
    layout: {
      id: 'layout-sum',
      name: 'L',
      columnCount: 12,
      rowHeightToken: 't',
      density: 'standart',
      gapToken: 'g'
    },
    theme: {
      id: 'theme-sum',
      name: 'T',
      description: 'd',
      defaultLayoutId: 'layout-sum',
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
    id: 'document-model-sum-001',
    metadata: {
      id: 'document-model-sum-001',
      title: 'Örnek doküman',
      reportModelId: 'report-model-sum-001',
      reportDnaId: 'report-dna-sum',
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
    id: 'export-sum-001',
    formatIds: ['pdf', 'json'],
    dashboardModelId: 'dashboard-model-sum-001',
    documentModelId: 'document-model-sum-001',
    reportDnaId: 'report-dna-sum',
    locale: 'tr',
    ...overrides
  };
}

function sampleExportContext(overrides = {}) {
  return {
    exportJobId: 'export-job-sum-001',
    locale: 'tr',
    currentStage: 'export-dogrulama',
    status: 'bekliyor',
    dashboardModel: sampleDashboardModel(),
    documentModel: sampleDocumentModel(),
    ...overrides
  };
}

function buildFullStageResults() {
  const modelResult = createExportModelBuilderRuntime().compute(
    createExportModelContext({
      request: sampleRequest(),
      documentModel: sampleDocumentModel(),
      dashboardModel: sampleDashboardModel()
    })
  );
  const rendererResult = createRendererRuntime().compute(
    createRendererContext({ exportModel: modelResult.model })
  );
  const formatResult = createFormatRuntime().compute(
    createFormatContext({
      rendererResult,
      renderDocument: rendererResult.document
    })
  );
  return { modelResult, rendererResult, formatResult };
}

describe('ExportSummaryRuntime', () => {
  it('builds all summary sections for a full pipeline projection', () => {
    const { modelResult, rendererResult, formatResult } = buildFullStageResults();
    const runtime = createExportSummaryRuntime();
    const result = runtime.compute(
      createExportSummaryContext({
        request: sampleRequest(),
        validation: sampleValidation(),
        exportModelResult: modelResult,
        exportModel: modelResult.model,
        rendererResult,
        renderDocument: rendererResult.document,
        formatResult
      })
    );

    assert.equal(result.sections.length, EXPORT_SUMMARY_SECTION_ORDER.length);
    assert.deepEqual(
      result.sections.map((section) => section.id),
      [...EXPORT_SUMMARY_SECTION_ORDER]
    );
    assert.equal(result.summary.counts.validationPassed, true);
    assert.equal(result.summary.counts.exportModelPresent, true);
    assert.ok(result.summary.counts.formatCount >= 1);
  });

  it('projects metadata from request and export model', () => {
    const { modelResult, rendererResult, formatResult } = buildFullStageResults();
    const runtime = createExportSummaryRuntime();
    const result = runtime.compute(
      createExportSummaryContext({
        request: sampleRequest(),
        validation: sampleValidation(),
        exportModelResult: modelResult,
        exportModel: modelResult.model,
        rendererResult,
        renderDocument: rendererResult.document,
        formatResult
      })
    );

    assert.equal(result.metadata.requestId, 'export-sum-001');
    assert.equal(result.metadata.exportModelId, 'export-sum-001');
    assert.ok(result.metadata.renderDocumentId.startsWith('render:'));
    assert.equal(result.metadata.reportDnaId, 'report-dna-sum');
    assert.ok(result.metadata.sourceStages.includes('validation'));
    assert.ok(result.metadata.sourceStages.includes('export-model'));
  });

  it('records successful validation in the validation section', () => {
    const runtime = createExportSummaryRuntime();
    const result = runtime.compute(
      createExportSummaryContext({
        validation: sampleValidation(),
        request: sampleRequest()
      })
    );

    const validationSection = result.sections.find(
      (section) => section.id === 'validation'
    );
    assert.ok(validationSection);
    assert.equal(validationSection.metrics.isValid, true);
    assert.equal(result.summary.counts.validationPassed, true);
  });

  it('records failed validation in the validation section and cautions', () => {
    const runtime = createExportSummaryRuntime();
    const result = runtime.compute(
      createExportSummaryContext({
        validation: sampleValidation({
          isValid: false,
          counts: { info: 0, warning: 0, error: 2 },
          results: Object.freeze([
            { severity: 'error', code: 'SOURCE_REQUIRED', message: 'missing' }
          ])
        }),
        request: sampleRequest()
      })
    );

    const validationSection = result.sections.find(
      (section) => section.id === 'validation'
    );
    assert.equal(validationSection?.metrics.isValid, false);
    assert.equal(validationSection?.metrics.errorCount, 2);
    assert.equal(result.summary.counts.validationPassed, false);
    assert.ok(result.summary.cautions?.includes('VALIDATION_FAILED'));
  });

  it('handles empty ExportModel with caution', () => {
    const runtime = createExportSummaryRuntime();
    const result = runtime.compute(
      createExportSummaryContext({
        validation: sampleValidation(),
        request: sampleRequest()
      })
    );

    const modelSection = result.sections.find(
      (section) => section.id === 'export-model'
    );
    assert.equal(modelSection?.metrics.present, false);
    assert.equal(result.summary.counts.exportModelPresent, false);
    assert.ok(result.summary.cautions?.includes('NO_EXPORT_MODEL'));
  });

  it('warns when all export inputs are missing', () => {
    const runtime = createExportSummaryRuntime();
    const result = runtime.compute(createExportSummaryContext({}));

    assert.ok(
      result.warnings.some((warning) => warning.code === 'EMPTY_EXPORT_INPUTS')
    );
    assert.ok(result.summary.cautions?.includes('EMPTY_EXPORT_INPUTS'));
  });

  it('records telemetry duration, summary item count, and warning count', () => {
    const { modelResult, rendererResult, formatResult } = buildFullStageResults();
    const runtime = createExportSummaryRuntime();
    const result = runtime.compute(
      createExportSummaryContext({
        validation: sampleValidation(),
        exportModelResult: modelResult,
        exportModel: modelResult.model,
        rendererResult,
        renderDocument: rendererResult.document,
        formatResult
      })
    );

    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.ok(result.telemetry.summaryItemCount > 0);
    assert.equal(
      result.telemetry.summaryItemCount,
      result.sections.reduce((sum, section) => sum + section.items.length, 0)
    );
    assert.equal(result.telemetry.summarySectionCount, result.sections.length);
    assert.equal(result.telemetry.warningCount, result.warnings.length);
  });

  it('seeds builtin summary sections in the registry', () => {
    const registry = createExportSummaryRegistryRuntime(true);
    assert.equal(registry.count(), EXPORT_SUMMARY_SECTION_ORDER.length);
    assert.deepEqual(
      registry.getEnabled().map((section) => section.id),
      [...EXPORT_SUMMARY_SECTION_ORDER]
    );
    assert.equal(EXPORT_SUMMARY_SECTION_LABELS.validation, 'Validation');
  });

  it('warns when no summary sections are enabled', () => {
    const registry = createExportSummaryRegistryRuntime(false);
    const runtime = createExportSummaryRuntime(registry);
    const result = runtime.compute(
      createExportSummaryContext({ validation: sampleValidation() })
    );

    assert.ok(
      result.warnings.some((warning) => warning.code === 'NO_SECTIONS_ENABLED')
    );
    assert.equal(result.sections.length, 0);
  });

  it('supports register and unregister on ExportSummaryRegistryRuntime', () => {
    const registry = createExportSummaryRegistryRuntime(false);
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

  it('aggregates stage warning codes into the warnings section', () => {
    const modelResult = createExportModelBuilderRuntime().compute(
      createExportModelContext({ request: sampleRequest() })
    );
    const runtime = createExportSummaryRuntime();
    const result = runtime.compute(
      createExportSummaryContext({
        validation: sampleValidation(),
        exportModelResult: modelResult,
        exportModel: modelResult.model
      })
    );

    const warningsSection = result.sections.find(
      (section) => section.id === 'warnings'
    );
    assert.ok(warningsSection);
    assert.ok((warningsSection.metrics.uniqueCodeCount ?? 0) >= 1);
  });

  it('builds foundationSummary compatible with bag.summary', () => {
    const { modelResult, rendererResult, formatResult } = buildFullStageResults();
    const runtime = createExportSummaryRuntime();
    const result = runtime.compute(
      createExportSummaryContext({
        validation: sampleValidation(),
        exportModelResult: modelResult,
        exportModel: modelResult.model,
        rendererResult,
        renderDocument: rendererResult.document,
        formatResult
      })
    );

    assert.equal(typeof result.foundationSummary.headline, 'string');
    assert.equal(result.foundationSummary.artifactCount, 0);
    assert.ok(Array.isArray(result.foundationSummary.formatLabels));
    assert.ok(result.foundationSummary.formatLabels.length >= 1);
  });

  it('includes renderer and format metrics from prior stages', () => {
    const { modelResult, rendererResult, formatResult } = buildFullStageResults();
    const runtime = createExportSummaryRuntime();
    const result = runtime.compute(
      createExportSummaryContext({
        validation: sampleValidation(),
        exportModelResult: modelResult,
        exportModel: modelResult.model,
        rendererResult,
        renderDocument: rendererResult.document,
        formatResult
      })
    );

    const rendererSection = result.sections.find(
      (section) => section.id === 'renderer'
    );
    const formatSection = result.sections.find(
      (section) => section.id === 'format'
    );
    assert.equal(rendererSection?.metrics.present, true);
    assert.ok((rendererSection?.metrics.sectionCount ?? 0) >= 1);
    assert.equal(formatSection?.metrics.present, true);
    assert.ok((formatSection?.metrics.formatCount ?? 0) >= 1);
  });

  it('records execution durations from prior stage telemetry', () => {
    const { modelResult, rendererResult, formatResult } = buildFullStageResults();
    const runtime = createExportSummaryRuntime();
    const result = runtime.compute(
      createExportSummaryContext({
        validation: sampleValidation(),
        exportModelResult: modelResult,
        exportModel: modelResult.model,
        rendererResult,
        renderDocument: rendererResult.document,
        formatResult,
        pipelineTelemetry: {
          totalDurationMs: 12,
          startedAt: '2026-07-20T22:00:00.000Z',
          endedAt: '2026-07-20T22:00:01.000Z',
          stageDurationsMs: {},
          stageOutcomes: {},
          summary: {
            stagesExecuted: 6,
            stagesSucceeded: 2,
            stagesNotImplemented: 4,
            stagesFailed: 0,
            stagesSkipped: 0,
            success: false,
            warningCount: 0,
            errorCount: 0
          }
        }
      })
    );

    const executionSection = result.sections.find(
      (section) => section.id === 'execution'
    );
    assert.equal(executionSection?.metrics.pipelineDurationMs, 12);
    assert.equal(executionSection?.metrics.stagesSucceeded, 2);
    assert.ok((executionSection?.metrics.modelDurationMs ?? 0) >= 0);
  });

  it('attaches and reads ExportSummaryResult on pipeline context bag', () => {
    const { modelResult, rendererResult, formatResult } = buildFullStageResults();
    const runtime = createExportSummaryRuntime();
    const result = runtime.compute(
      createExportSummaryContext({
        validation: sampleValidation(),
        exportModelResult: modelResult,
        exportModel: modelResult.model,
        rendererResult,
        renderDocument: rendererResult.document,
        formatResult
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

    attachExportSummaryToPipelineContext(context, result);
    assert.ok(context.bag[PIPELINE_BAG_EXPORT_SUMMARY_RUNTIME_RESULT_KEY]);
    assert.equal(typeof context.bag.summary.headline, 'string');
    const read = readExportSummaryFromPipelineContext(context);
    assert.equal(read?.sections.length, EXPORT_SUMMARY_SECTION_ORDER.length);
  });

  it('attaches and reads ExportSummaryResult via pipeline result helpers', async () => {
    const pipelineRuntime = createExportPipelineRuntime({
      initialContext: sampleExportContext()
    });
    const pipelineResult = await pipelineRuntime.runWithDetails(sampleRequest());
    const { modelResult, rendererResult, formatResult } = buildFullStageResults();
    const summaryResult = createExportSummaryRuntime().compute(
      createExportSummaryContext({
        validation: sampleValidation(),
        exportModelResult: modelResult,
        exportModel: modelResult.model,
        rendererResult,
        renderDocument: rendererResult.document,
        formatResult
      })
    );

    attachExportSummaryToPipelineResult(pipelineResult, summaryResult);
    const read = readExportSummaryFromPipelineResult(pipelineResult);
    assert.ok(read?.summary.counts.exportModelPresent);
    assert.equal(typeof pipelineResult.context.bag.summary?.headline, 'string');
  });

  it('applies summary after full validated pipeline stages', async () => {
    const pipelineRuntime = createExportPipelineRuntime({
      initialContext: sampleExportContext()
    });
    const pipelineResult = await pipelineRuntime.runWithDetails(sampleRequest());
    assert.equal(pipelineResult.stageExecutions[0].outcome, 'basarili');

    applyExportModelBuilderToPipelineResult(pipelineResult);
    applyExportRendererToPipelineResult(pipelineResult);
    applyExportFormatToPipelineResult(pipelineResult);
    const summaryResult = applyExportSummaryToPipelineResult(pipelineResult);

    assert.equal(summaryResult.summary.counts.validationPassed, true);
    assert.equal(summaryResult.summary.counts.exportModelPresent, true);
    assert.ok(summaryResult.summary.counts.formatCount >= 1);
    assert.ok(
      pipelineResult.context.bag[PIPELINE_BAG_EXPORT_SUMMARY_RUNTIME_RESULT_KEY]
    );
  });

  it('applies summary with VALIDATION_NOT_PASSED when validation failed', async () => {
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

    const summaryResult = applyExportSummaryToPipelineResult(pipelineResult);
    assert.ok(
      summaryResult.warnings.some(
        (warning) => warning.code === 'VALIDATION_NOT_PASSED'
      )
    );
    assert.equal(summaryResult.summary.counts.validationPassed, false);
  });

  it('exposes getRegistry on the summary runtime', () => {
    const runtime = createExportSummaryRuntime();
    assert.equal(
      runtime.getRegistry().count(),
      EXPORT_SUMMARY_SECTION_ORDER.length
    );
  });

  it('is deterministic across repeated compute calls', () => {
    const { modelResult, rendererResult, formatResult } = buildFullStageResults();
    const runtime = createExportSummaryRuntime();
    const context = createExportSummaryContext({
      validation: sampleValidation(),
      exportModelResult: modelResult,
      exportModel: modelResult.model,
      rendererResult,
      renderDocument: rendererResult.document,
      formatResult
    });
    const first = runtime.compute(context);
    const second = runtime.compute(context);

    assert.deepEqual(
      first.sections.map((section) => ({
        id: section.id,
        order: section.order,
        items: [...section.items]
      })),
      second.sections.map((section) => ({
        id: section.id,
        order: section.order,
        items: [...section.items]
      }))
    );
  });

  it('keeps summary item count aligned with section items', () => {
    const { modelResult, rendererResult, formatResult } = buildFullStageResults();
    const runtime = createExportSummaryRuntime();
    const result = runtime.compute(
      createExportSummaryContext({
        validation: sampleValidation(),
        exportModelResult: modelResult,
        exportModel: modelResult.model,
        rendererResult,
        renderDocument: rendererResult.document,
        formatResult
      })
    );

    assert.equal(
      result.summary.counts.summaryItemCount,
      result.telemetry.summaryItemCount
    );
  });

  it('builds a headline mentioning validation and format counts', () => {
    const { modelResult, rendererResult, formatResult } = buildFullStageResults();
    const runtime = createExportSummaryRuntime();
    const result = runtime.compute(
      createExportSummaryContext({
        validation: sampleValidation(),
        exportModelResult: modelResult,
        exportModel: modelResult.model,
        rendererResult,
        renderDocument: rendererResult.document,
        formatResult
      })
    );

    assert.match(result.summary.headline, /validation geçti/);
    assert.match(result.summary.headline, /format/);
  });
});
