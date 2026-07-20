/**
 * Dashboard Model Builder Runtime — PR-105B (en az 20 unit test)
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
  createDashboardModelBuilderRuntime,
  createDashboardRegistryRuntime,
  createDashboardModelContext,
  createDashboardPipelineRuntime,
  applyDashboardModelBuilderToPipelineResult,
  attachDashboardModelToPipelineContext,
  readDashboardModelFromPipelineContext,
  attachDashboardModelToPipelineResult,
  readDashboardModelFromPipelineResult,
  DASHBOARD_PART_ORDER,
  DASHBOARD_PART_LABELS,
  PIPELINE_BAG_DASHBOARD_MODEL_RUNTIME_RESULT_KEY
} = await import('../../src/business/dashboard/index.ts');

function sampleReportModel(overrides = {}) {
  return {
    id: 'report-model-dmb-001',
    metadata: {
      id: 'report-model-dmb-001',
      title: 'Örnek rapor',
      reportDnaId: 'report-dna-dmb',
      locale: 'tr',
      createdAt: '2026-07-20T22:00:00.000Z',
      version: '1.0.0'
    },
    status: 'basarili',
    lastStage: 'rapor-derleme',
    executiveSummary: {
      headline: 'Yönetici özeti',
      body: 'Özet gövde metni',
      highlights: ['Bulgu 1', 'Öneri 1']
    },
    sections: [
      {
        id: 'sec-1',
        sectionCode: 'SEC_SUMMARY',
        kind: 'ozet',
        title: 'Özet',
        order: 1,
        content: {}
      },
      {
        id: 'sec-2',
        sectionCode: 'SEC_FINDINGS',
        kind: 'bulgular',
        title: 'Bulgular',
        order: 2,
        content: {}
      }
    ],
    findings: [
      {
        id: 'find-1',
        code: 'FIND_1',
        title: 'Kalite bulgusu',
        description: 'Veri kalitesi düşük',
        severity: 'uyari'
      }
    ],
    recommendations: [
      {
        id: 'rec-1',
        code: 'REC_QUALITY',
        title: 'Kaliteyi artır',
        description: 'Veri kalitesini iyileştirin.',
        priorityLevel: 'yuksek',
        sourceRecommendationId: 'dec-rec-1'
      },
      {
        id: 'rec-2',
        code: 'REC_MONITOR',
        title: 'İzleme ekle',
        description: 'Metrikleri izleyin.',
        priorityLevel: 'orta'
      }
    ],
    appendices: [
      {
        id: 'app-1',
        title: 'Ek A',
        description: 'Detay tablosu'
      }
    ],
    references: [
      {
        id: 'ref-1',
        kind: 'dataset',
        label: 'Kaynak dataset'
      }
    ],
    ...overrides
  };
}

function emptyReportModel() {
  return sampleReportModel({
    executiveSummary: { headline: '', body: '', highlights: [] },
    sections: [],
    findings: [],
    recommendations: [],
    appendices: [],
    references: []
  });
}

function sampleDecisionResult(overrides = {}) {
  return {
    requestId: 'decision-dmb-001',
    analysisRequestId: 'analysis-dmb-001',
    datasetId: 'ds-dmb-001',
    status: 'basarili',
    lastStage: 'karar-derleme',
    summary: {
      headline: 'Karar özeti',
      highlights: []
    },
    recommendations: [],
    actions: [
      {
        id: 'act-1',
        kind: 'incele',
        title: 'İncele',
        description: 'Öneriyi incele',
        recommendationId: 'rec-1'
      },
      {
        id: 'act-2',
        kind: 'iyilestir',
        title: 'Uygula',
        description: 'İyileştirme uygula',
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
    id: 'dashboard-dmb-001',
    reportDnaId: 'report-dna-dmb',
    datasetId: 'ds-dmb-001',
    reportModelId: 'report-model-dmb-001',
    decisionRequestId: 'decision-dmb-001',
    analysisRequestId: 'analysis-dmb-001',
    locale: 'tr',
    layoutId: 'layout-dmb',
    themeId: 'theme-dmb',
    ...overrides
  };
}

function sampleDashboardContext(overrides = {}) {
  return {
    dashboardJobId: 'job-dmb-001',
    locale: 'tr',
    layoutId: 'layout-dmb',
    themeId: 'theme-dmb',
    currentStage: 'dashboard-birlestirme',
    status: 'suruyor',
    reportModel: sampleReportModel(),
    decisionResult: sampleDecisionResult(),
    ...overrides
  };
}

describe('DashboardModelBuilderRuntime', () => {
  /** @type {ReturnType<typeof createDashboardModelBuilderRuntime>} */
  let builder;

  beforeEach(() => {
    builder = createDashboardModelBuilderRuntime();
  });

  it('seeds builtin dashboard model parts', () => {
    assert.equal(builder.getRegistry().count(), DASHBOARD_PART_ORDER.length);
    assert.equal(DASHBOARD_PART_ORDER.length, 7);
    assert.equal(DASHBOARD_PART_LABELS.metadata, 'Dashboard Metadata');
    assert.equal(
      DASHBOARD_PART_LABELS['section-references'],
      'Section References'
    );
  });

  it('builds empty ReportResult model with warnings', () => {
    const result = builder.compute(createDashboardModelContext({}));
    assert.ok(result.model);
    assert.equal(result.model.sectionReferences.referenceCount, 0);
    assert.equal(result.model.recommendationReferences.referenceCount, 0);
    assert.ok(
      result.warnings.some((warning) => warning.code === 'EMPTY_REPORT_RESULT')
    );
    assert.equal(result.telemetry.referenceCount, 0);
  });

  it('maps a full ReportResult into DashboardModel parts', () => {
    const reportModel = sampleReportModel();
    const result = builder.compute(
      createDashboardModelContext({
        reportModel,
        request: sampleRequest(),
        locale: 'tr'
      })
    );

    assert.equal(result.model.dataset.datasetId, 'ds-dmb-001');
    assert.equal(result.model.reportSummary.hasHeadline, true);
    assert.equal(result.model.sectionReferences.referenceCount, 2);
    assert.equal(result.model.recommendationReferences.referenceCount, 2);
    assert.ok(result.model.narrativeReferences.referenceCount >= 1);
  });

  it('projects report summary without inventing narrative', () => {
    const result = builder.compute(
      createDashboardModelContext({
        reportModel: sampleReportModel(),
        locale: 'tr'
      })
    );
    assert.equal(result.model.reportSummary.headline, 'Yönetici özeti');
    assert.equal(result.model.reportSummary.body, 'Özet gövde metni');
    assert.equal(result.model.reportSummary.highlightCount, 2);
    assert.ok(result.model.reportSummary.headlineLength > 0);
    assert.ok(result.model.reportSummary.bodyLength > 0);
  });

  it('projects section references from ReportResult sections', () => {
    const result = builder.compute(
      createDashboardModelContext({
        reportModel: sampleReportModel(),
        locale: 'tr'
      })
    );
    assert.equal(result.model.sectionReferences.present, true);
    assert.equal(result.model.sectionReferences.items[0].id, 'sec-1');
    assert.equal(result.model.sectionReferences.items[0].sectionCode, 'SEC_SUMMARY');
    assert.equal(result.model.sectionReferences.items[1].kind, 'bulgular');
  });

  it('projects narrative references from findings, appendices and references', () => {
    const result = builder.compute(
      createDashboardModelContext({
        reportModel: sampleReportModel(),
        locale: 'tr'
      })
    );
    assert.equal(result.model.narrativeReferences.present, true);
    assert.ok(result.model.narrativeReferences.kindCounts.finding >= 1);
    assert.ok(result.model.narrativeReferences.kindCounts.appendix >= 1);
    assert.ok(result.model.narrativeReferences.kindCounts.reference >= 1);
    assert.ok(
      result.model.narrativeReferences.kindCounts['executive-summary'] >= 1
    );
  });

  it('projects recommendation references without inventing text', () => {
    const result = builder.compute(
      createDashboardModelContext({
        reportModel: sampleReportModel(),
        locale: 'tr'
      })
    );
    const item = result.model.recommendationReferences.items[0];
    assert.equal(item.id, 'rec-1');
    assert.equal(item.code, 'REC_QUALITY');
    assert.equal(item.title, 'Kaliteyi artır');
    assert.equal(item.priorityLevel, 'yuksek');
    assert.equal(item.sourceRecommendationId, 'dec-rec-1');
    assert.equal(result.model.recommendationReferences.priorityCounts.yuksek, 1);
    assert.equal(result.model.recommendationReferences.priorityCounts.orta, 1);
  });

  it('projects action plan references from DecisionResult when present', () => {
    const result = builder.compute(
      createDashboardModelContext({
        reportModel: sampleReportModel(),
        decisionResult: sampleDecisionResult(),
        locale: 'tr'
      })
    );
    assert.equal(result.model.actionPlanReferences.referenceCount, 2);
    assert.equal(result.model.actionPlanReferences.kindCounts.incele, 1);
    assert.equal(result.model.actionPlanReferences.kindCounts.iyilestir, 1);
    assert.equal(
      result.model.actionPlanReferences.items[0].recommendationId,
      'rec-1'
    );
  });

  it('keeps action plan references empty when DecisionResult is absent', () => {
    const result = builder.compute(
      createDashboardModelContext({
        reportModel: sampleReportModel(),
        locale: 'tr'
      })
    );
    assert.equal(result.model.actionPlanReferences.present, false);
    assert.equal(result.model.actionPlanReferences.referenceCount, 0);
  });

  it('maps metadata from request and ReportResult', () => {
    const result = builder.compute(
      createDashboardModelContext({
        reportModel: sampleReportModel(),
        request: sampleRequest(),
        dashboardContext: sampleDashboardContext(),
        locale: 'en'
      })
    );
    assert.equal(result.metadata.id, 'dashboard-dmb-001');
    assert.equal(result.metadata.reportDnaId, 'report-dna-dmb');
    assert.equal(result.metadata.locale, 'en');
    assert.equal(result.metadata.datasetId, 'ds-dmb-001');
    assert.equal(result.metadata.reportModelId, 'report-model-dmb-001');
    assert.equal(result.metadata.layoutId, 'layout-dmb');
    assert.equal(result.metadata.themeId, 'theme-dmb');
    assert.ok(result.metadata.createdAt);
    assert.ok(result.metadata.version);
  });

  it('maps dataset information', () => {
    const result = builder.compute(
      createDashboardModelContext({
        reportModel: sampleReportModel(),
        request: sampleRequest(),
        locale: 'tr'
      })
    );
    assert.equal(result.model.dataset.present, true);
    assert.equal(result.model.dataset.datasetId, 'ds-dmb-001');
    assert.equal(result.model.dataset.reportModelId, 'report-model-dmb-001');
    assert.equal(result.model.dataset.analysisRequestId, 'analysis-dmb-001');
  });

  it('records telemetry for duration, projection count, and reference count', () => {
    const result = builder.compute(
      createDashboardModelContext({
        reportModel: sampleReportModel(),
        decisionResult: sampleDecisionResult(),
        request: sampleRequest(),
        locale: 'tr'
      })
    );
    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.ok(result.telemetry.projectionCount >= 7);
    assert.ok(result.telemetry.referenceCount >= 2);
    assert.equal(
      result.telemetry.referenceCount,
      result.model.sectionReferences.referenceCount +
        result.model.narrativeReferences.referenceCount +
        result.model.recommendationReferences.referenceCount +
        result.model.actionPlanReferences.referenceCount
    );
    assert.equal(result.telemetry.warningCount, result.warnings.length);
  });

  it('warns on empty ReportResult content', () => {
    const result = builder.compute(
      createDashboardModelContext({
        reportModel: emptyReportModel(),
        locale: 'tr'
      })
    );
    assert.ok(
      result.warnings.some((warning) => warning.code === 'EMPTY_REPORT_CONTENT')
    );
    assert.equal(result.model.sectionReferences.present, false);
    assert.equal(result.model.recommendationReferences.present, false);
  });

  it('projects foundation DashboardModel with empty widgets and kpis', () => {
    const result = builder.compute(
      createDashboardModelContext({
        reportModel: sampleReportModel(),
        request: sampleRequest(),
        locale: 'tr'
      })
    );
    assert.equal(result.foundationModel.widgets.length, 0);
    assert.equal(result.foundationModel.kpis.length, 0);
    assert.equal(result.foundationModel.filters.length, 0);
    assert.equal(result.foundationModel.sections.length, 2);
    assert.equal(result.foundationModel.lastStage, 'dashboard-birlestirme');
    assert.equal(result.foundationModel.status, 'suruyor');
  });

  it('supports registry extension and unregister', () => {
    const registry = createDashboardRegistryRuntime(false);
    assert.equal(registry.count(), 0);
    registry.register({
      id: 'metadata',
      title: 'Custom Metadata',
      order: 1,
      enabled: true
    });
    assert.equal(registry.count(), 1);
    assert.ok(registry.getById('metadata'));
    assert.equal(registry.unregister('metadata'), true);
    assert.equal(registry.count(), 0);
  });

  it('warns when no parts are enabled', () => {
    const emptyBuilder = createDashboardModelBuilderRuntime(
      createDashboardRegistryRuntime(false)
    );
    const result = emptyBuilder.compute(
      createDashboardModelContext({
        reportModel: sampleReportModel()
      })
    );
    assert.ok(
      result.warnings.some((warning) => warning.code === 'NO_PARTS_ENABLED')
    );
  });

  it('reads reportModel from dashboardContext when not passed directly', () => {
    const result = builder.compute(
      createDashboardModelContext({
        dashboardContext: sampleDashboardContext(),
        request: sampleRequest(),
        locale: 'tr'
      })
    );
    assert.equal(result.model.dataset.reportModelId, 'report-model-dmb-001');
    assert.equal(result.model.recommendationReferences.referenceCount, 2);
    assert.equal(result.model.actionPlanReferences.referenceCount, 2);
  });

  it('applies builder to a valid pipeline result', async () => {
    const pipeline = createDashboardPipelineRuntime({
      initialContext: sampleDashboardContext()
    });
    const detailed = await pipeline.runWithDetails(sampleRequest());
    const modelResult = applyDashboardModelBuilderToPipelineResult(
      detailed,
      builder
    );

    assert.equal(modelResult.model.recommendationReferences.referenceCount, 2);
    assert.equal(
      detailed.context.bag[PIPELINE_BAG_DASHBOARD_MODEL_RUNTIME_RESULT_KEY],
      modelResult
    );
    assert.ok(detailed.context.bag.dashboardModel);
    assert.equal(detailed.context.bag.dashboardModel?.sections.length, 2);
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
    const modelResult = applyDashboardModelBuilderToPipelineResult(
      detailed,
      builder
    );

    assert.ok(
      modelResult.warnings.some(
        (warning) => warning.code === 'VALIDATION_NOT_PASSED'
      )
    );
    assert.ok(modelResult.model);
  });

  it('supports attach/read bag bridge helpers', () => {
    const result = builder.compute(
      createDashboardModelContext({
        reportModel: sampleReportModel(),
        request: sampleRequest(),
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

    attachDashboardModelToPipelineContext(context, result);
    assert.equal(
      readDashboardModelFromPipelineContext(context)?.model
        .recommendationReferences.referenceCount,
      2
    );
    assert.ok(context.bag.dashboardModel?.id);

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

    attachDashboardModelToPipelineResult(pipelineResult, result);
    assert.ok(readDashboardModelFromPipelineResult(pipelineResult));
  });

  it('does not create widgets or kpis', () => {
    const result = builder.compute(
      createDashboardModelContext({
        reportModel: sampleReportModel(),
        locale: 'tr'
      })
    );
    assert.equal(result.foundationModel.widgets.length, 0);
    assert.equal(result.foundationModel.kpis.length, 0);
    assert.equal(result.foundationModel.filters.length, 0);
  });

  it('handles single recommendation reference mapping', () => {
    const result = builder.compute(
      createDashboardModelContext({
        reportModel: sampleReportModel({
          recommendations: [
            {
              id: 'rec-only',
              code: 'ONLY',
              title: 'Tek',
              description: 'Tek öneri',
              priorityLevel: 'kritik'
            }
          ],
          sections: [],
          findings: [],
          appendices: [],
          references: [],
          executiveSummary: { headline: '', body: '', highlights: [] }
        }),
        locale: 'tr'
      })
    );
    assert.equal(result.model.recommendationReferences.referenceCount, 1);
    assert.equal(
      result.model.recommendationReferences.items[0].priorityLevel,
      'kritik'
    );
    assert.equal(result.telemetry.referenceCount, 1);
  });
});
