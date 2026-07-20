/**
 * Dashboard Summary Runtime — PR-105E (en az 20 unit test)
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
  createDashboardSummaryRuntime,
  createDashboardSummaryRegistryRuntime,
  createDashboardSummaryContext,
  createDashboardModelBuilderRuntime,
  createDashboardModelContext,
  createWidgetBuilderRuntime,
  createWidgetContext,
  createKpiBoardRuntime,
  createKpiBoardContext,
  createDashboardPipelineRuntime,
  applyDashboardModelBuilderToPipelineResult,
  applyWidgetBuilderToPipelineResult,
  applyKpiBoardToPipelineResult,
  applyDashboardSummaryToPipelineResult,
  attachDashboardSummaryToPipelineContext,
  readDashboardSummaryFromPipelineContext,
  attachDashboardSummaryToPipelineResult,
  readDashboardSummaryFromPipelineResult,
  DASHBOARD_SUMMARY_SECTION_ORDER,
  DASHBOARD_SUMMARY_SECTION_LABELS,
  PIPELINE_BAG_DASHBOARD_SUMMARY_RUNTIME_RESULT_KEY
} = await import('../../src/business/dashboard/index.ts');

function sampleReportModel(overrides = {}) {
  return {
    id: 'report-model-sum-001',
    metadata: {
      id: 'report-model-sum-001',
      title: 'Örnek rapor',
      reportDnaId: 'report-dna-sum',
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

function sampleDecisionResult(overrides = {}) {
  return {
    requestId: 'decision-sum-001',
    analysisRequestId: 'analysis-sum-001',
    datasetId: 'ds-sum-001',
    status: 'basarili',
    lastStage: 'karar-derleme',
    summary: { headline: 'Karar', highlights: [] },
    recommendations: [],
    actions: [
      {
        id: 'act-1',
        kind: 'incele',
        title: 'İncele',
        description: 'Öneriyi incele',
        recommendationId: 'rec-1'
      }
    ],
    risks: [],
    opportunities: [],
    priorities: [],
    scores: [],
    ...overrides
  };
}

function sampleRequest(overrides = {}) {
  return {
    id: 'dashboard-sum-001',
    reportDnaId: 'report-dna-sum',
    datasetId: 'ds-sum-001',
    reportModelId: 'report-model-sum-001',
    decisionRequestId: 'decision-sum-001',
    analysisRequestId: 'analysis-sum-001',
    locale: 'tr',
    layoutId: 'layout-sum',
    themeId: 'theme-sum',
    ...overrides
  };
}

function sampleDashboardContext(overrides = {}) {
  return {
    dashboardJobId: 'job-sum-001',
    locale: 'tr',
    layoutId: 'layout-sum',
    themeId: 'theme-sum',
    currentStage: 'dashboard-birlestirme',
    status: 'suruyor',
    reportModel: sampleReportModel(),
    decisionResult: sampleDecisionResult(),
    ...overrides
  };
}

function buildFullDashboardArtifacts() {
  const modelResult = createDashboardModelBuilderRuntime().compute(
    createDashboardModelContext({
      reportModel: sampleReportModel(),
      decisionResult: sampleDecisionResult(),
      request: sampleRequest(),
      dashboardContext: sampleDashboardContext(),
      locale: 'tr'
    })
  );
  const widgetResult = createWidgetBuilderRuntime().compute(
    createWidgetContext({
      dashboardModel: modelResult.model,
      dashboardModelResult: modelResult,
      locale: 'tr'
    })
  );
  const kpiBoardResult = createKpiBoardRuntime().compute(
    createKpiBoardContext({
      dashboardModel: modelResult.model,
      dashboardModelResult: modelResult,
      dashboardContext: sampleDashboardContext(),
      widgetResult,
      locale: 'tr'
    })
  );
  return { modelResult, widgetResult, kpiBoardResult };
}

describe('DashboardSummaryRuntime', () => {
  /** @type {ReturnType<typeof createDashboardSummaryRuntime>} */
  let runtime;

  beforeEach(() => {
    runtime = createDashboardSummaryRuntime();
  });

  it('seeds builtin summary sections in deterministic order', () => {
    assert.equal(
      runtime.getRegistry().count(),
      DASHBOARD_SUMMARY_SECTION_ORDER.length
    );
    assert.equal(DASHBOARD_SUMMARY_SECTION_ORDER.length, 6);
    assert.equal(
      DASHBOARD_SUMMARY_SECTION_LABELS['dashboard-metadata'],
      'Dashboard Metadata'
    );
    assert.equal(
      DASHBOARD_SUMMARY_SECTION_LABELS['execution-summary'],
      'Execution Summary'
    );
    assert.deepEqual(
      runtime.getRegistry().getEnabled().map((item) => item.id),
      [...DASHBOARD_SUMMARY_SECTION_ORDER]
    );
  });

  it('builds empty dashboard summary with warnings', () => {
    const result = runtime.compute(createDashboardSummaryContext({}));
    assert.equal(result.sections.length, 6);
    assert.ok(
      result.warnings.some(
        (warning) => warning.code === 'EMPTY_DASHBOARD_INPUTS'
      )
    );
    assert.equal(result.telemetry.widgetCount, 0);
    assert.equal(result.telemetry.kpiCount, 0);
    assert.ok(result.summary.cautions?.includes('EMPTY_DASHBOARD_INPUTS'));
  });

  it('maps a full dashboard into all summary sections', () => {
    const { modelResult, widgetResult, kpiBoardResult } =
      buildFullDashboardArtifacts();
    const result = runtime.compute(
      createDashboardSummaryContext({
        dashboardModel: modelResult.model,
        dashboardModelResult: modelResult,
        widgetResult,
        kpiBoardResult,
        request: sampleRequest(),
        locale: 'tr'
      })
    );

    assert.equal(result.sections.length, 6);
    assert.equal(result.telemetry.widgetCount, 6);
    assert.equal(result.telemetry.kpiCount, 6);
    assert.equal(result.telemetry.summarySectionCount, 6);
    assert.ok(result.summary.headline.includes('widget'));
  });

  it('keeps deterministic summary section order', () => {
    const { modelResult, widgetResult, kpiBoardResult } =
      buildFullDashboardArtifacts();
    const result = runtime.compute(
      createDashboardSummaryContext({
        dashboardModel: modelResult.model,
        widgetResult,
        kpiBoardResult,
        locale: 'tr'
      })
    );
    assert.deepEqual(
      result.sections.map((item) => item.id),
      [...DASHBOARD_SUMMARY_SECTION_ORDER]
    );
  });

  it('summarizes a single widget filter as widget count 1', () => {
    const modelResult = createDashboardModelBuilderRuntime().compute(
      createDashboardModelContext({
        reportModel: sampleReportModel(),
        decisionResult: sampleDecisionResult(),
        request: sampleRequest(),
        locale: 'tr'
      })
    );
    const widgetResult = createWidgetBuilderRuntime().compute(
      createWidgetContext({
        dashboardModel: modelResult.model,
        widgetIds: ['overview'],
        locale: 'tr'
      })
    );
    const result = runtime.compute(
      createDashboardSummaryContext({
        dashboardModel: modelResult.model,
        widgetResult,
        locale: 'tr'
      })
    );
    assert.equal(result.telemetry.widgetCount, 1);
    assert.equal(result.summary.counts.widgetCount, 1);
    const widgetSection = result.sections.find(
      (item) => item.id === 'widget-summary'
    );
    assert.equal(widgetSection?.metrics.widgetCount, 1);
  });

  it('projects dashboard metadata section', () => {
    const { modelResult } = buildFullDashboardArtifacts();
    const result = runtime.compute(
      createDashboardSummaryContext({
        dashboardModel: modelResult.model,
        request: sampleRequest(),
        locale: 'en'
      })
    );
    const meta = result.sections.find((item) => item.id === 'dashboard-metadata');
    assert.ok(meta);
    assert.equal(meta?.metrics.dashboardModelId, 'dashboard-sum-001');
    assert.equal(meta?.metrics.datasetId, 'ds-sum-001');
    // Model locale is projected objectively; runtime metadata uses context locale
    assert.equal(meta?.metrics.locale, 'tr');
    assert.equal(result.metadata.locale, 'en');
  });

  it('projects widget summary section', () => {
    const { modelResult, widgetResult } = buildFullDashboardArtifacts();
    const result = runtime.compute(
      createDashboardSummaryContext({
        dashboardModel: modelResult.model,
        widgetResult,
        locale: 'tr'
      })
    );
    const section = result.sections.find((item) => item.id === 'widget-summary');
    assert.equal(section?.metrics.widgetCount, 6);
    assert.equal(section?.metrics.present, true);
  });

  it('projects KPI summary section', () => {
    const { modelResult, kpiBoardResult } = buildFullDashboardArtifacts();
    const result = runtime.compute(
      createDashboardSummaryContext({
        dashboardModel: modelResult.model,
        kpiBoardResult,
        locale: 'tr'
      })
    );
    const section = result.sections.find((item) => item.id === 'kpi-summary');
    assert.equal(section?.metrics.kpiCount, 6);
    assert.equal(section?.metrics.present, true);
  });

  it('projects dataset summary section', () => {
    const { modelResult } = buildFullDashboardArtifacts();
    const result = runtime.compute(
      createDashboardSummaryContext({
        dashboardModel: modelResult.model,
        locale: 'tr'
      })
    );
    const section = result.sections.find((item) => item.id === 'dataset-summary');
    assert.equal(section?.metrics.datasetId, 'ds-sum-001');
    assert.equal(section?.metrics.present, true);
  });

  it('projects report summary section from model reportSummary', () => {
    const { modelResult } = buildFullDashboardArtifacts();
    const result = runtime.compute(
      createDashboardSummaryContext({
        dashboardModel: modelResult.model,
        locale: 'tr'
      })
    );
    const section = result.sections.find((item) => item.id === 'report-summary');
    assert.equal(section?.metrics.hasHeadline, true);
    assert.ok(/** @type {number} */ (section?.metrics.headlineLength) > 0);
    assert.equal(section?.metrics.present, true);
  });

  it('projects execution summary with prior stage durations', () => {
    const { modelResult, widgetResult, kpiBoardResult } =
      buildFullDashboardArtifacts();
    const result = runtime.compute(
      createDashboardSummaryContext({
        dashboardModel: modelResult.model,
        dashboardModelResult: modelResult,
        widgetResult,
        kpiBoardResult,
        locale: 'tr'
      })
    );
    const section = result.sections.find(
      (item) => item.id === 'execution-summary'
    );
    assert.equal(section?.metrics.sectionsBuilt, 6);
    assert.ok(typeof section?.metrics.modelDurationMs === 'number');
    assert.ok(typeof section?.metrics.widgetDurationMs === 'number');
    assert.ok(typeof section?.metrics.kpiDurationMs === 'number');
  });

  it('records metadata and source stages', () => {
    const { modelResult, widgetResult, kpiBoardResult } =
      buildFullDashboardArtifacts();
    const result = runtime.compute(
      createDashboardSummaryContext({
        dashboardModel: modelResult.model,
        widgetResult,
        kpiBoardResult,
        request: sampleRequest(),
        locale: 'en'
      })
    );
    assert.equal(result.metadata.locale, 'en');
    assert.equal(result.metadata.dashboardModelId, 'dashboard-sum-001');
    assert.ok(result.metadata.generatedAt);
    assert.deepEqual(result.metadata.sourceStages, [
      'dashboard-model',
      'widget-builder',
      'kpi-board'
    ]);
  });

  it('records telemetry for duration, widget count, KPI count, and section count', () => {
    const { modelResult, widgetResult, kpiBoardResult } =
      buildFullDashboardArtifacts();
    const result = runtime.compute(
      createDashboardSummaryContext({
        dashboardModel: modelResult.model,
        widgetResult,
        kpiBoardResult,
        locale: 'tr'
      })
    );
    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.equal(result.telemetry.widgetCount, 6);
    assert.equal(result.telemetry.kpiCount, 6);
    assert.equal(result.telemetry.summarySectionCount, 6);
    assert.equal(result.telemetry.warningCount, result.warnings.length);
  });

  it('supports registry extension and unregister', () => {
    const registry = createDashboardSummaryRegistryRuntime(false);
    assert.equal(registry.count(), 0);
    registry.register({
      id: 'dashboard-metadata',
      title: 'Custom Metadata',
      order: 1,
      enabled: true
    });
    assert.equal(registry.count(), 1);
    assert.ok(registry.getById('dashboard-metadata'));
    assert.equal(registry.unregister('dashboard-metadata'), true);
    assert.equal(registry.count(), 0);
  });

  it('warns when no summary sections are enabled', () => {
    const emptyRuntime = createDashboardSummaryRuntime(
      createDashboardSummaryRegistryRuntime(false)
    );
    const { modelResult } = buildFullDashboardArtifacts();
    const result = emptyRuntime.compute(
      createDashboardSummaryContext({
        dashboardModel: modelResult.model
      })
    );
    assert.ok(
      result.warnings.some((warning) => warning.code === 'NO_SECTIONS_ENABLED')
    );
    assert.equal(result.sections.length, 0);
  });

  it('adds NO_WIDGETS and NO_KPIS cautions when those stages are absent', () => {
    const { modelResult } = buildFullDashboardArtifacts();
    const result = runtime.compute(
      createDashboardSummaryContext({
        dashboardModel: modelResult.model,
        locale: 'tr'
      })
    );
    assert.ok(result.summary.cautions?.includes('NO_WIDGETS'));
    assert.ok(result.summary.cautions?.includes('NO_KPIS'));
  });

  it('applies summary after model, widget, and KPI board on pipeline result', async () => {
    const pipeline = createDashboardPipelineRuntime({
      initialContext: sampleDashboardContext()
    });
    const detailed = await pipeline.runWithDetails(sampleRequest());
    applyDashboardModelBuilderToPipelineResult(detailed);
    applyWidgetBuilderToPipelineResult(detailed);
    applyKpiBoardToPipelineResult(detailed);
    const summaryResult = applyDashboardSummaryToPipelineResult(
      detailed,
      runtime
    );

    assert.equal(summaryResult.sections.length, 6);
    assert.equal(summaryResult.telemetry.widgetCount, 6);
    assert.equal(summaryResult.telemetry.kpiCount, 6);
    assert.equal(
      detailed.context.bag[PIPELINE_BAG_DASHBOARD_SUMMARY_RUNTIME_RESULT_KEY],
      summaryResult
    );
    assert.ok(detailed.context.bag.dashboardSummary);
  });

  it('skips rich mapping when source validation fails', async () => {
    const brokenContext = sampleDashboardContext({
      reportModel: sampleReportModel({
        sections: /** @type {any} */ ('broken')
      })
    });
    const pipeline = createDashboardPipelineRuntime({
      initialContext: brokenContext
    });
    const detailed = await pipeline.runWithDetails(sampleRequest());
    const summaryResult = applyDashboardSummaryToPipelineResult(
      detailed,
      runtime
    );

    assert.ok(
      summaryResult.warnings.some(
        (warning) => warning.code === 'VALIDATION_NOT_PASSED'
      )
    );
    assert.ok(summaryResult.summary);
  });

  it('supports attach/read bag bridge helpers', () => {
    const { modelResult, widgetResult, kpiBoardResult } =
      buildFullDashboardArtifacts();
    const result = runtime.compute(
      createDashboardSummaryContext({
        dashboardModel: modelResult.model,
        widgetResult,
        kpiBoardResult,
        locale: 'tr'
      })
    );
    const context = {
      request: sampleRequest(),
      dashboardContext: sampleDashboardContext(),
      stageExecutions: [],
      bag: {},
      startedAt: new Date().toISOString(),
      startedMark: 0
    };

    attachDashboardSummaryToPipelineContext(context, result);
    assert.equal(
      readDashboardSummaryFromPipelineContext(context)?.telemetry
        .summarySectionCount,
      6
    );
    assert.ok(context.bag.dashboardSummary);

    const pipelineResult = {
      dashboardModel: {
        id: 'x',
        metadata: {
          id: 'x',
          title: '',
          reportDnaId: 'dna',
          datasetId: 'ds',
          locale: 'tr',
          createdAt: context.startedAt,
          version: '1.0.0',
          layoutId: 'layout',
          themeId: 'theme'
        },
        status: 'basarisiz',
        lastStage: 'dashboard-derleme',
        layout: {
          id: 'layout',
          name: 'L',
          columnCount: 12,
          rowHeightToken: 'r',
          density: 'standart',
          gapToken: 'g'
        },
        theme: {
          id: 'theme',
          name: 'T',
          description: 'd',
          defaultLayoutId: 'layout',
          surfaceColorToken: 's',
          accentColorToken: 'a',
          typographyToken: 't',
          version: '1.0.0'
        },
        sections: [],
        widgets: [],
        kpis: [],
        filters: [],
        navigation: { items: [] }
      },
      context,
      stageExecutions: [],
      totalDurationMs: 1,
      telemetry: {
        totalDurationMs: 1,
        startedAt: context.startedAt,
        endedAt: context.startedAt,
        stageDurationsMs: {},
        stageOutcomes: {},
        summary: {
          stagesExecuted: 0,
          stagesSucceeded: 0,
          stagesNotImplemented: 0,
          stagesFailed: 0,
          stagesSkipped: 0,
          success: false,
          warningCount: 0,
          errorCount: 0
        }
      }
    };

    attachDashboardSummaryToPipelineResult(pipelineResult, result);
    assert.ok(readDashboardSummaryFromPipelineResult(pipelineResult));
  });

  it('defaults locale to tr when omitted', () => {
    const result = runtime.compute(createDashboardSummaryContext({}));
    assert.equal(result.metadata.locale, 'tr');
  });

  it('does not invent analysis beyond objective counts', () => {
    const { modelResult, widgetResult, kpiBoardResult } =
      buildFullDashboardArtifacts();
    const result = runtime.compute(
      createDashboardSummaryContext({
        dashboardModel: modelResult.model,
        widgetResult,
        kpiBoardResult,
        locale: 'tr'
      })
    );
    assert.equal(result.summary.counts.widgetCount, widgetResult.widgets.length);
    assert.equal(result.summary.counts.kpiCount, kpiBoardResult.kpis.length);
    assert.equal(
      result.summary.counts.datasetPresent,
      modelResult.model.dataset.present
    );
  });

  it('clears registry when clear is called', () => {
    const registry = createDashboardSummaryRegistryRuntime(true);
    assert.ok(registry.count() > 0);
    registry.clear();
    assert.equal(registry.count(), 0);
  });
});
