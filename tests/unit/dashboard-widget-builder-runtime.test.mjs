/**
 * Widget Builder Runtime — PR-105C (en az 20 unit test)
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
  createWidgetBuilderRuntime,
  createWidgetRegistryRuntime,
  createWidgetContext,
  createDashboardModelBuilderRuntime,
  createDashboardModelContext,
  createDashboardPipelineRuntime,
  applyDashboardModelBuilderToPipelineResult,
  applyWidgetBuilderToPipelineResult,
  attachWidgetToPipelineContext,
  readWidgetFromPipelineContext,
  attachWidgetToPipelineResult,
  readWidgetFromPipelineResult,
  WIDGET_ORDER,
  WIDGET_LABELS,
  BUILTIN_WIDGET_DEFINITION_COUNT,
  getBuiltinWidgetDefinition,
  getBuiltinWidgetDefinitionByCode,
  PIPELINE_BAG_DASHBOARD_WIDGET_RUNTIME_RESULT_KEY
} = await import('../../src/business/dashboard/index.ts');

function sampleReportModel(overrides = {}) {
  return {
    id: 'report-model-wdg-001',
    metadata: {
      id: 'report-model-wdg-001',
      title: 'Örnek rapor',
      reportDnaId: 'report-dna-wdg',
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
    requestId: 'decision-wdg-001',
    analysisRequestId: 'analysis-wdg-001',
    datasetId: 'ds-wdg-001',
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
    id: 'dashboard-wdg-001',
    reportDnaId: 'report-dna-wdg',
    datasetId: 'ds-wdg-001',
    reportModelId: 'report-model-wdg-001',
    decisionRequestId: 'decision-wdg-001',
    analysisRequestId: 'analysis-wdg-001',
    locale: 'tr',
    layoutId: 'layout-wdg',
    themeId: 'theme-wdg',
    ...overrides
  };
}

function sampleDashboardContext(overrides = {}) {
  return {
    dashboardJobId: 'job-wdg-001',
    locale: 'tr',
    layoutId: 'layout-wdg',
    themeId: 'theme-wdg',
    currentStage: 'widget-derleme',
    status: 'suruyor',
    reportModel: sampleReportModel(),
    decisionResult: sampleDecisionResult(),
    ...overrides
  };
}

function buildDashboardModel(overrides = {}) {
  return createDashboardModelBuilderRuntime().compute(
    createDashboardModelContext({
      reportModel: sampleReportModel(overrides.reportModel),
      decisionResult: sampleDecisionResult(overrides.decisionResult),
      request: sampleRequest(overrides.request),
      locale: 'tr'
    })
  );
}

describe('WidgetBuilderRuntime', () => {
  /** @type {ReturnType<typeof createWidgetBuilderRuntime>} */
  let builder;

  beforeEach(() => {
    builder = createWidgetBuilderRuntime();
  });

  it('seeds builtin widget definitions in deterministic order', () => {
    assert.equal(builder.getRegistry().count(), WIDGET_ORDER.length);
    assert.equal(WIDGET_ORDER.length, 6);
    assert.equal(BUILTIN_WIDGET_DEFINITION_COUNT, 6);
    assert.equal(WIDGET_LABELS.overview, 'Overview');
    assert.equal(WIDGET_LABELS['action-plans'], 'Action Plans');
    assert.deepEqual(
      builder.getRegistry().getEnabled().map((item) => item.id),
      [...WIDGET_ORDER]
    );
  });

  it('builds empty DashboardModel widget set with warnings', () => {
    const result = builder.compute(createWidgetContext({}));
    assert.equal(result.widgets.length, 6);
    assert.ok(
      result.warnings.some((warning) => warning.code === 'EMPTY_DASHBOARD_MODEL')
    );
    assert.equal(result.telemetry.registryMappingCount, 0);
    assert.equal(result.telemetry.widgetCount, 6);
  });

  it('maps a full DashboardModel into the complete widget set', () => {
    const modelResult = buildDashboardModel();
    const result = builder.compute(
      createWidgetContext({
        dashboardModelResult: modelResult,
        dashboardModel: modelResult.model,
        locale: 'tr'
      })
    );

    assert.equal(result.widgets.length, 6);
    assert.ok(result.telemetry.registryMappingCount >= 4);
    assert.equal(result.metadata.widgetIds.length, 6);
  });

  it('keeps deterministic widget order', () => {
    const modelResult = buildDashboardModel();
    const result = builder.compute(
      createWidgetContext({
        dashboardModel: modelResult.model,
        locale: 'tr'
      })
    );
    assert.deepEqual(
      result.records.map((item) => item.widgetId),
      [...WIDGET_ORDER]
    );
    assert.deepEqual(
      result.widgets.map((item) => item.id),
      WIDGET_ORDER.map((id) => `widget:${id}`)
    );
  });

  it('builds a single widget when widgetIds is filtered', () => {
    const modelResult = buildDashboardModel();
    const result = builder.compute(
      createWidgetContext({
        dashboardModel: modelResult.model,
        widgetIds: ['recommendations'],
        locale: 'tr'
      })
    );
    assert.equal(result.widgets.length, 1);
    assert.equal(result.records[0].widgetId, 'recommendations');
    assert.equal(result.telemetry.widgetCount, 1);
  });

  it('projects overview payload from report summary and metadata', () => {
    const modelResult = buildDashboardModel();
    const result = builder.compute(
      createWidgetContext({
        dashboardModel: modelResult.model,
        widgetIds: ['overview'],
        locale: 'tr'
      })
    );
    const payload = result.records[0].payload;
    assert.equal(payload.headline, 'Yönetici özeti');
    assert.equal(payload.datasetId, 'ds-wdg-001');
    assert.equal(payload.hasHeadline, true);
  });

  it('projects dataset widget payload', () => {
    const modelResult = buildDashboardModel();
    const result = builder.compute(
      createWidgetContext({
        dashboardModel: modelResult.model,
        widgetIds: ['dataset'],
        locale: 'tr'
      })
    );
    assert.equal(result.records[0].payload.datasetId, 'ds-wdg-001');
    assert.equal(result.records[0].payload.present, true);
    assert.equal(result.records[0].sourcePresent, true);
  });

  it('projects recommendation widget items without inventing text', () => {
    const modelResult = buildDashboardModel();
    const result = builder.compute(
      createWidgetContext({
        dashboardModel: modelResult.model,
        widgetIds: ['recommendations'],
        locale: 'tr'
      })
    );
    const items = /** @type {Array<{ id: string, title: string }>} */ (
      result.records[0].payload.items
    );
    assert.equal(result.records[0].payload.referenceCount, 1);
    assert.equal(items[0].id, 'rec-1');
    assert.equal(items[0].title, 'Kaliteyi artır');
  });

  it('projects action-plans widget from DecisionResult actions', () => {
    const modelResult = buildDashboardModel();
    const result = builder.compute(
      createWidgetContext({
        dashboardModel: modelResult.model,
        widgetIds: ['action-plans'],
        locale: 'tr'
      })
    );
    assert.equal(result.records[0].payload.referenceCount, 1);
    assert.equal(result.records[0].sourcePresent, true);
  });

  it('projects narratives and sections widgets', () => {
    const modelResult = buildDashboardModel();
    const result = builder.compute(
      createWidgetContext({
        dashboardModel: modelResult.model,
        widgetIds: ['narratives', 'sections'],
        locale: 'tr'
      })
    );
    assert.equal(result.widgets.length, 2);
    assert.ok(
      result.records.every((item) => item.sourcePresent === true)
    );
  });

  it('records metadata for generated widgets', () => {
    const modelResult = buildDashboardModel();
    const result = builder.compute(
      createWidgetContext({
        dashboardModel: modelResult.model,
        request: sampleRequest(),
        locale: 'en'
      })
    );
    assert.equal(result.metadata.locale, 'en');
    assert.equal(result.metadata.dashboardModelId, 'dashboard-wdg-001');
    assert.ok(result.metadata.generatedAt);
    assert.equal(result.metadata.widgetIds.length, 6);
    assert.ok(result.metadata.mappedSourceParts.length >= 1);
  });

  it('records telemetry for duration, widget count, and registry mapping count', () => {
    const modelResult = buildDashboardModel();
    const result = builder.compute(
      createWidgetContext({
        dashboardModel: modelResult.model,
        locale: 'tr'
      })
    );
    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.equal(result.telemetry.widgetCount, 6);
    assert.ok(result.telemetry.registryMappingCount >= 1);
    assert.equal(result.telemetry.warningCount, result.warnings.length);
  });

  it('warns when source parts are empty on a sparse DashboardModel', () => {
    const modelResult = createDashboardModelBuilderRuntime().compute(
      createDashboardModelContext({
        reportModel: sampleReportModel({
          executiveSummary: { headline: '', body: '', highlights: [] },
          sections: [],
          findings: [],
          recommendations: [],
          appendices: [],
          references: []
        }),
        request: sampleRequest(),
        locale: 'tr'
      })
    );
    const result = builder.compute(
      createWidgetContext({
        dashboardModel: modelResult.model,
        locale: 'tr'
      })
    );
    assert.ok(
      result.warnings.some((warning) => warning.code === 'SOURCE_PART_EMPTY')
    );
  });

  it('exposes foundation widgets without chart/react render fields', () => {
    const modelResult = buildDashboardModel();
    const result = builder.compute(
      createWidgetContext({
        dashboardModel: modelResult.model,
        locale: 'tr'
      })
    );
    for (const widget of result.widgets) {
      assert.ok(widget.id.startsWith('widget:'));
      assert.ok(widget.widgetCode.startsWith('WDG_'));
      assert.ok(widget.placement);
      assert.equal(widget.placement.col, 0);
      assert.ok(widget.payload);
      assert.equal(Object.prototype.hasOwnProperty.call(widget, 'component'), false);
      assert.equal(Object.prototype.hasOwnProperty.call(widget, 'style'), false);
    }
  });

  it('supports registry extension and unregister', () => {
    const registry = createWidgetRegistryRuntime(false);
    assert.equal(registry.count(), 0);
    registry.register({
      id: 'overview',
      widgetCode: 'WDG_CUSTOM',
      kind: 'text',
      title: 'Custom Overview',
      description: 'custom',
      sourcePartId: 'report-summary',
      order: 1,
      defaultColSpan: 12,
      defaultRowSpan: 1,
      enabled: true
    });
    assert.equal(registry.count(), 1);
    assert.ok(registry.getById('overview'));
    assert.ok(registry.getByCode('WDG_CUSTOM'));
    assert.equal(registry.unregister('overview'), true);
    assert.equal(registry.count(), 0);
  });

  it('warns when no widgets are enabled', () => {
    const emptyBuilder = createWidgetBuilderRuntime(
      createWidgetRegistryRuntime(false)
    );
    const modelResult = buildDashboardModel();
    const result = emptyBuilder.compute(
      createWidgetContext({
        dashboardModel: modelResult.model
      })
    );
    assert.ok(
      result.warnings.some((warning) => warning.code === 'NO_WIDGETS_ENABLED')
    );
    assert.equal(result.widgets.length, 0);
  });

  it('resolves DashboardModel from dashboardModelResult', () => {
    const modelResult = buildDashboardModel();
    const result = builder.compute(
      createWidgetContext({
        dashboardModelResult: modelResult,
        locale: 'tr'
      })
    );
    assert.equal(result.metadata.dashboardModelId, 'dashboard-wdg-001');
    assert.equal(result.widgets.length, 6);
  });

  it('applies builder to a valid pipeline result after model builder', async () => {
    const pipeline = createDashboardPipelineRuntime({
      initialContext: sampleDashboardContext()
    });
    const detailed = await pipeline.runWithDetails(sampleRequest());
    applyDashboardModelBuilderToPipelineResult(detailed);
    const widgetResult = applyWidgetBuilderToPipelineResult(detailed, builder);

    assert.equal(widgetResult.widgets.length, 6);
    assert.equal(
      detailed.context.bag[PIPELINE_BAG_DASHBOARD_WIDGET_RUNTIME_RESULT_KEY],
      widgetResult
    );
    assert.equal(detailed.context.bag.widgets?.length, 6);
    assert.equal(detailed.dashboardModel.lastStage, 'widget-derleme');
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
    const widgetResult = applyWidgetBuilderToPipelineResult(detailed, builder);

    assert.ok(
      widgetResult.warnings.some(
        (warning) => warning.code === 'VALIDATION_NOT_PASSED'
      )
    );
    assert.ok(widgetResult.widgets);
  });

  it('supports attach/read bag bridge helpers', () => {
    const modelResult = buildDashboardModel();
    const result = builder.compute(
      createWidgetContext({
        dashboardModel: modelResult.model,
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

    attachWidgetToPipelineContext(context, result);
    assert.equal(
      readWidgetFromPipelineContext(context)?.telemetry.widgetCount,
      6
    );
    assert.equal(context.bag.widgets?.length, 6);

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

    attachWidgetToPipelineResult(pipelineResult, result);
    assert.ok(readWidgetFromPipelineResult(pipelineResult));
  });

  it('resolves builtin definitions by id and code', () => {
    const byId = getBuiltinWidgetDefinition('overview');
    const byCode = getBuiltinWidgetDefinitionByCode('WDG_OVERVIEW');
    assert.ok(byId);
    assert.equal(byId?.title, 'Overview');
    assert.equal(byCode?.id, 'overview');
  });

  it('does not invent chart or react render metadata', () => {
    const modelResult = buildDashboardModel();
    const result = builder.compute(
      createWidgetContext({
        dashboardModel: modelResult.model,
        locale: 'tr'
      })
    );
    assert.ok(
      result.widgets.every(
        (widget) =>
          widget.kind === 'text' ||
          widget.kind === 'table' ||
          widget.kind === 'list'
      )
    );
    assert.ok(
      result.widgets.every(
        (widget) =>
          widget.kind !== 'line-chart' && widget.kind !== 'bar-chart'
      )
    );
  });
});
