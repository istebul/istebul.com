/**
 * KPI Board Runtime — PR-105D (en az 20 unit test)
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
  createKpiBoardRuntime,
  createKpiRegistryRuntime,
  createKpiBoardContext,
  createDashboardModelBuilderRuntime,
  createDashboardModelContext,
  createDashboardPipelineRuntime,
  applyDashboardModelBuilderToPipelineResult,
  applyWidgetBuilderToPipelineResult,
  applyKpiBoardToPipelineResult,
  attachKpiBoardToPipelineContext,
  readKpiBoardFromPipelineContext,
  attachKpiBoardToPipelineResult,
  readKpiBoardFromPipelineResult,
  KPI_ORDER,
  KPI_LABELS,
  BUILTIN_KPI_DEFINITION_COUNT,
  getBuiltinKpiDefinition,
  getBuiltinKpiDefinitionByCode,
  PIPELINE_BAG_DASHBOARD_KPI_BOARD_RUNTIME_RESULT_KEY
} = await import('../../src/business/dashboard/index.ts');

function sampleReportModel(overrides = {}) {
  return {
    id: 'report-model-kpi-001',
    metadata: {
      id: 'report-model-kpi-001',
      title: 'Örnek rapor',
      reportDnaId: 'report-dna-kpi',
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
      },
      {
        id: 'rec-2',
        code: 'REC_B',
        title: 'İzle',
        description: 'Metrikleri izle',
        priorityLevel: 'orta'
      }
    ],
    appendices: [],
    references: [],
    ...overrides
  };
}

function sampleDecisionResult(overrides = {}) {
  return {
    requestId: 'decision-kpi-001',
    analysisRequestId: 'analysis-kpi-001',
    datasetId: 'ds-kpi-001',
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
      },
      {
        id: 'act-2',
        kind: 'iyilestir',
        title: 'Uygula',
        description: 'Uygula',
        recommendationId: 'rec-1'
      },
      {
        id: 'act-3',
        kind: 'izle',
        title: 'İzle',
        description: 'İzle',
        recommendationId: 'rec-2'
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
    id: 'dashboard-kpi-001',
    reportDnaId: 'report-dna-kpi',
    datasetId: 'ds-kpi-001',
    reportModelId: 'report-model-kpi-001',
    decisionRequestId: 'decision-kpi-001',
    analysisRequestId: 'analysis-kpi-001',
    locale: 'tr',
    layoutId: 'layout-kpi',
    themeId: 'theme-kpi',
    ...overrides
  };
}

function sampleDashboardContext(overrides = {}) {
  return {
    dashboardJobId: 'job-kpi-001',
    locale: 'tr',
    layoutId: 'layout-kpi',
    themeId: 'theme-kpi',
    currentStage: 'dashboard-birlestirme',
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
      locale: 'tr',
      dashboardContext: sampleDashboardContext(overrides.dashboardContext)
    })
  );
}

describe('KpiBoardRuntime', () => {
  /** @type {ReturnType<typeof createKpiBoardRuntime>} */
  let runtime;

  beforeEach(() => {
    runtime = createKpiBoardRuntime();
  });

  it('seeds builtin KPI definitions in deterministic order', () => {
    assert.equal(runtime.getRegistry().count(), KPI_ORDER.length);
    assert.equal(KPI_ORDER.length, 6);
    assert.equal(BUILTIN_KPI_DEFINITION_COUNT, 6);
    assert.equal(KPI_LABELS['dataset-overview'], 'Dataset Overview');
    assert.equal(KPI_LABELS['report-status'], 'Report Status');
    assert.deepEqual(
      runtime.getRegistry().getEnabled().map((item) => item.id),
      [...KPI_ORDER]
    );
  });

  it('builds empty DashboardModel KPI set with warnings', () => {
    const result = runtime.compute(createKpiBoardContext({}));
    assert.equal(result.kpis.length, 6);
    assert.ok(
      result.warnings.some((warning) => warning.code === 'EMPTY_DASHBOARD_MODEL')
    );
    assert.equal(result.telemetry.registryMappingCount, 0);
    assert.equal(result.telemetry.kpiCount, 6);
  });

  it('maps a full DashboardModel into the complete KPI set', () => {
    const modelResult = buildDashboardModel();
    const result = runtime.compute(
      createKpiBoardContext({
        dashboardModelResult: modelResult,
        dashboardModel: modelResult.model,
        dashboardContext: sampleDashboardContext(),
        locale: 'tr'
      })
    );

    assert.equal(result.kpis.length, 6);
    assert.ok(result.telemetry.registryMappingCount >= 4);
    assert.equal(result.metadata.kpiIds.length, 6);
  });

  it('keeps deterministic KPI order', () => {
    const modelResult = buildDashboardModel();
    const result = runtime.compute(
      createKpiBoardContext({
        dashboardModel: modelResult.model,
        dashboardContext: sampleDashboardContext(),
        locale: 'tr'
      })
    );
    assert.deepEqual(
      result.records.map((item) => item.kpiId),
      [...KPI_ORDER]
    );
    assert.deepEqual(
      result.kpis.map((item) => item.kpiId),
      KPI_ORDER.map((id) => `kpi:${id}`)
    );
  });

  it('builds a single KPI when kpiIds is filtered', () => {
    const modelResult = buildDashboardModel();
    const result = runtime.compute(
      createKpiBoardContext({
        dashboardModel: modelResult.model,
        kpiIds: ['recommendation-count'],
        locale: 'tr'
      })
    );
    assert.equal(result.kpis.length, 1);
    assert.equal(result.records[0].kpiId, 'recommendation-count');
    assert.equal(result.telemetry.kpiCount, 1);
  });

  it('projects dataset overview from dataset id', () => {
    const modelResult = buildDashboardModel();
    const result = runtime.compute(
      createKpiBoardContext({
        dashboardModel: modelResult.model,
        kpiIds: ['dataset-overview'],
        locale: 'tr'
      })
    );
    assert.equal(result.records[0].value, 'ds-kpi-001');
    assert.equal(result.records[0].unit, 'id');
    assert.equal(result.records[0].sourcePresent, true);
  });

  it('projects section count without inventing analysis', () => {
    const modelResult = buildDashboardModel();
    const result = runtime.compute(
      createKpiBoardContext({
        dashboardModel: modelResult.model,
        kpiIds: ['section-count'],
        locale: 'tr'
      })
    );
    assert.equal(result.records[0].value, 2);
    assert.equal(result.records[0].unit, 'adet');
  });

  it('projects recommendation and action plan counts', () => {
    const modelResult = buildDashboardModel();
    const result = runtime.compute(
      createKpiBoardContext({
        dashboardModel: modelResult.model,
        kpiIds: ['recommendation-count', 'action-plan-count'],
        locale: 'tr'
      })
    );
    assert.equal(result.records[0].value, 2);
    assert.equal(result.records[1].value, 3);
  });

  it('projects narrative count from narrative references', () => {
    const modelResult = buildDashboardModel();
    const result = runtime.compute(
      createKpiBoardContext({
        dashboardModel: modelResult.model,
        kpiIds: ['narrative-count'],
        locale: 'tr'
      })
    );
    assert.ok(/** @type {number} */ (result.records[0].value) >= 1);
    assert.equal(result.records[0].sourcePresent, true);
  });

  it('projects report status from ReportModel status', () => {
    const modelResult = buildDashboardModel();
    const result = runtime.compute(
      createKpiBoardContext({
        dashboardModel: modelResult.model,
        dashboardContext: sampleDashboardContext(),
        kpiIds: ['report-status'],
        locale: 'tr'
      })
    );
    assert.equal(result.records[0].value, 'basarili');
    assert.equal(result.records[0].unit, 'durum');
  });

  it('records metadata for generated KPIs', () => {
    const modelResult = buildDashboardModel();
    const result = runtime.compute(
      createKpiBoardContext({
        dashboardModel: modelResult.model,
        dashboardContext: sampleDashboardContext(),
        request: sampleRequest(),
        locale: 'en'
      })
    );
    assert.equal(result.metadata.locale, 'en');
    assert.equal(result.metadata.dashboardModelId, 'dashboard-kpi-001');
    assert.ok(result.metadata.generatedAt);
    assert.equal(result.metadata.kpiIds.length, 6);
    assert.ok(result.metadata.mappedSourceParts.length >= 1);
  });

  it('records telemetry for duration, KPI count, and registry mapping count', () => {
    const modelResult = buildDashboardModel();
    const result = runtime.compute(
      createKpiBoardContext({
        dashboardModel: modelResult.model,
        dashboardContext: sampleDashboardContext(),
        locale: 'tr'
      })
    );
    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.equal(result.telemetry.kpiCount, 6);
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
    const result = runtime.compute(
      createKpiBoardContext({
        dashboardModel: modelResult.model,
        locale: 'tr'
      })
    );
    assert.ok(
      result.warnings.some((warning) => warning.code === 'SOURCE_PART_EMPTY')
    );
  });

  it('exposes foundation KPIs without chart/react fields', () => {
    const modelResult = buildDashboardModel();
    const result = runtime.compute(
      createKpiBoardContext({
        dashboardModel: modelResult.model,
        dashboardContext: sampleDashboardContext(),
        locale: 'tr'
      })
    );
    for (const kpi of result.kpis) {
      assert.ok(kpi.kpiId.startsWith('kpi:'));
      assert.ok(typeof kpi.name === 'string');
      assert.ok(typeof kpi.unit === 'string');
      assert.equal(Object.prototype.hasOwnProperty.call(kpi, 'chart'), false);
      assert.equal(Object.prototype.hasOwnProperty.call(kpi, 'component'), false);
    }
  });

  it('supports registry extension and unregister', () => {
    const registry = createKpiRegistryRuntime(false);
    assert.equal(registry.count(), 0);
    registry.register({
      id: 'dataset-overview',
      kpiCode: 'KPI_CUSTOM',
      name: 'Custom Dataset',
      description: 'custom',
      unit: 'id',
      sourcePartId: 'dataset',
      order: 1,
      enabled: true
    });
    assert.equal(registry.count(), 1);
    assert.ok(registry.getById('dataset-overview'));
    assert.ok(registry.getByCode('KPI_CUSTOM'));
    assert.equal(registry.unregister('dataset-overview'), true);
    assert.equal(registry.count(), 0);
  });

  it('warns when no KPIs are enabled', () => {
    const emptyRuntime = createKpiBoardRuntime(createKpiRegistryRuntime(false));
    const modelResult = buildDashboardModel();
    const result = emptyRuntime.compute(
      createKpiBoardContext({
        dashboardModel: modelResult.model
      })
    );
    assert.ok(
      result.warnings.some((warning) => warning.code === 'NO_KPIS_ENABLED')
    );
    assert.equal(result.kpis.length, 0);
  });

  it('resolves DashboardModel from dashboardModelResult', () => {
    const modelResult = buildDashboardModel();
    const result = runtime.compute(
      createKpiBoardContext({
        dashboardModelResult: modelResult,
        dashboardContext: sampleDashboardContext(),
        locale: 'tr'
      })
    );
    assert.equal(result.metadata.dashboardModelId, 'dashboard-kpi-001');
    assert.equal(result.kpis.length, 6);
  });

  it('applies KPI board after model and widget builders on pipeline result', async () => {
    const pipeline = createDashboardPipelineRuntime({
      initialContext: sampleDashboardContext()
    });
    const detailed = await pipeline.runWithDetails(sampleRequest());
    applyDashboardModelBuilderToPipelineResult(detailed);
    applyWidgetBuilderToPipelineResult(detailed);
    const kpiResult = applyKpiBoardToPipelineResult(detailed, runtime);

    assert.equal(kpiResult.kpis.length, 6);
    assert.equal(
      detailed.context.bag[PIPELINE_BAG_DASHBOARD_KPI_BOARD_RUNTIME_RESULT_KEY],
      kpiResult
    );
    assert.equal(detailed.context.bag.kpis?.length, 6);
    assert.equal(detailed.dashboardModel.lastStage, 'dashboard-birlestirme');
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
    const kpiResult = applyKpiBoardToPipelineResult(detailed, runtime);

    assert.ok(
      kpiResult.warnings.some(
        (warning) => warning.code === 'VALIDATION_NOT_PASSED'
      )
    );
    assert.ok(kpiResult.kpis);
  });

  it('supports attach/read bag bridge helpers', () => {
    const modelResult = buildDashboardModel();
    const result = runtime.compute(
      createKpiBoardContext({
        dashboardModel: modelResult.model,
        dashboardContext: sampleDashboardContext(),
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

    attachKpiBoardToPipelineContext(context, result);
    assert.equal(
      readKpiBoardFromPipelineContext(context)?.telemetry.kpiCount,
      6
    );
    assert.equal(context.bag.kpis?.length, 6);

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

    attachKpiBoardToPipelineResult(pipelineResult, result);
    assert.ok(readKpiBoardFromPipelineResult(pipelineResult));
  });

  it('resolves builtin definitions by id and code', () => {
    const byId = getBuiltinKpiDefinition('section-count');
    const byCode = getBuiltinKpiDefinitionByCode('KPI_SECTION_COUNT');
    assert.ok(byId);
    assert.equal(byId?.name, 'Section Count');
    assert.equal(byCode?.id, 'section-count');
  });

  it('does not invent new analysis values beyond model projection', () => {
    const modelResult = buildDashboardModel();
    const result = runtime.compute(
      createKpiBoardContext({
        dashboardModel: modelResult.model,
        dashboardContext: sampleDashboardContext(),
        locale: 'tr'
      })
    );
    const byId = Object.fromEntries(
      result.records.map((item) => [item.kpiId, item.value])
    );
    assert.equal(byId['section-count'], modelResult.model.sectionReferences.referenceCount);
    assert.equal(
      byId['recommendation-count'],
      modelResult.model.recommendationReferences.referenceCount
    );
    assert.equal(
      byId['action-plan-count'],
      modelResult.model.actionPlanReferences.referenceCount
    );
    assert.equal(
      byId['narrative-count'],
      modelResult.model.narrativeReferences.referenceCount
    );
  });
});
