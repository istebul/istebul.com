/**
 * Dashboard Pipeline Runtime — PR-105A (en az 15 unit test)
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
  DASHBOARD_PIPELINE_STAGE_COUNT,
  DASHBOARD_PIPELINE_STAGES,
  DASHBOARD_RUNTIME_ERROR_CODES,
  createDashboardPipelineRuntime
} = await import('../../src/business/dashboard/index.ts');

function sampleRequest(overrides = {}) {
  return {
    id: 'dashboard-test-001',
    reportDnaId: 'report-dna-1',
    datasetId: 'ds-001',
    reportModelId: 'report-model-001',
    decisionRequestId: 'decision-test-001',
    analysisRequestId: 'analysis-test-001',
    locale: 'tr',
    layoutId: 'layout-1',
    themeId: 'theme-1',
    ...overrides
  };
}

function sampleReportModel(overrides = {}) {
  return {
    id: 'report-model-001',
    metadata: {
      id: 'report-model-001',
      title: 'Örnek rapor',
      reportDnaId: 'report-dna-1',
      locale: 'tr',
      createdAt: '2026-07-20T22:00:00.000Z',
      version: '1.0.0'
    },
    status: 'basarili',
    lastStage: 'rapor-derleme',
    executiveSummary: {
      headline: 'Yönetici özeti',
      body: 'Özet gövde',
      highlights: ['1 bulgu']
    },
    sections: [
      {
        id: 'sec-1',
        sectionCode: 'SEC_1',
        kind: 'ozet',
        title: 'Bölüm 1',
        order: 1,
        content: {}
      }
    ],
    findings: [
      {
        id: 'find-1',
        code: 'FIND_1',
        title: 'Bulgu',
        description: 'Örnek bulgu',
        severity: 'bilgi'
      }
    ],
    recommendations: [
      {
        id: 'rec-1',
        code: 'REC_1',
        title: 'Öneri',
        description: 'Örnek öneri',
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
    requestId: 'decision-test-001',
    analysisRequestId: 'analysis-test-001',
    datasetId: 'ds-001',
    status: 'basarili',
    lastStage: 'karar-derleme',
    summary: {
      headline: 'Karar tamamlandı',
      highlights: ['1 öneri']
    },
    recommendations: [],
    actions: [],
    risks: [],
    opportunities: [],
    priorities: [],
    scores: [],
    ...overrides
  };
}

function sampleAnalysisResult(overrides = {}) {
  return {
    requestId: 'analysis-test-001',
    datasetId: 'ds-001',
    status: 'basarili',
    lastStage: 'sonuc-derleme',
    kpiResults: [],
    findings: [],
    scores: [],
    statistics: {
      entityCount: 0,
      rowCount: 0,
      relationCount: 0,
      kpiResultCount: 0,
      findingCount: 0
    },
    warnings: [],
    ...overrides
  };
}

function sampleContext(overrides = {}) {
  return {
    dashboardJobId: 'dashboard-job-001',
    locale: 'tr',
    layoutId: 'layout-1',
    themeId: 'theme-1',
    currentStage: 'dashboard-dogrulama',
    status: 'bekliyor',
    reportModel: sampleReportModel(),
    metadata: { tenant: 'demo' },
    ...overrides
  };
}

describe('DashboardPipelineRuntime', () => {
  it('runs all foundation stages in order for a valid ReportResult', async () => {
    const runtime = createDashboardPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions.length, DASHBOARD_PIPELINE_STAGE_COUNT);
    assert.deepEqual(
      detailed.stageExecutions.map((stage) => stage.stageId),
      DASHBOARD_PIPELINE_STAGES.map((stage) => stage.id)
    );
  });

  it('implements IDashboardPipeline.run returning DashboardModel', async () => {
    const runtime = createDashboardPipelineRuntime({
      initialContext: sampleContext()
    });

    const result = await runtime.run(sampleRequest());

    assert.equal(result.id, 'dashboard-test-001');
    assert.equal(result.metadata.reportDnaId, 'report-dna-1');
    assert.equal(result.metadata.datasetId, 'ds-001');
    assert.equal(result.lastStage, 'dashboard-derleme');
    assert.ok(Array.isArray(result.widgets));
    assert.ok(Array.isArray(result.kpis));
    assert.ok(result.layout);
    assert.ok(result.theme);
    assert.ok(result.navigation);
  });

  it('executes Dashboard Validation for a valid ReportResult', async () => {
    const runtime = createDashboardPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest());
    const validationStage = detailed.stageExecutions[0];

    assert.equal(validationStage.stageId, 'dashboard-dogrulama');
    assert.equal(validationStage.outcome, 'basarili');
    assert.equal(detailed.context.bag.sourceValidation?.isValid, true);
    assert.equal(detailed.context.bag.sourceValidation?.counts.error, 0);
  });

  it('marks placeholder stages as not-implemented and still assembles a result', async () => {
    const runtime = createDashboardPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest());
    const placeholderStages = detailed.stageExecutions.filter((stage) =>
      [
        'widget-derleme',
        'yerlesim-cozumu',
        'filtre-cozumu',
        'dashboard-birlestirme'
      ].includes(stage.stageId)
    );

    assert.equal(placeholderStages.length, 4);
    assert.ok(
      placeholderStages.every((stage) => stage.outcome === 'not-implemented')
    );
    assert.ok(
      placeholderStages.every((stage) =>
        stage.errors.some(
          (error) => error.code === DASHBOARD_RUNTIME_ERROR_CODES.NOT_IMPLEMENTED
        )
      )
    );
    assert.equal(detailed.stageExecutions.at(-1)?.stageId, 'dashboard-derleme');
    assert.equal(detailed.stageExecutions.at(-1)?.outcome, 'basarili');
    assert.equal(detailed.dashboardModel.status, 'basarisiz');
  });

  it('halts after validation failure and skips intermediate stages', async () => {
    const runtime = createDashboardPipelineRuntime({
      initialContext: sampleContext({
        reportModel: sampleReportModel({
          sections: /** @type {any} */ ('broken')
        })
      })
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.deepEqual(
      detailed.stageExecutions.slice(1).map((stage) => stage.outcome),
      ['atlandi', 'atlandi', 'atlandi', 'atlandi', 'basarili']
    );
    assert.equal(detailed.dashboardModel.status, 'basarisiz');
  });

  it('fails validation for an empty ReportResult missing required fields', async () => {
    const runtime = createDashboardPipelineRuntime({
      initialContext: sampleContext({
        reportModel: /** @type {any} */ ({})
      })
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) => error.code === 'REPORT_MODEL_ID_REQUIRED'
      )
    );
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) => error.code === 'REPORT_METADATA_REQUIRED'
      )
    );
    assert.equal(detailed.telemetry.summary.stagesSkipped, 4);
  });

  it('fails validation when no Analysis/Decision/Report source is present', async () => {
    const runtime = createDashboardPipelineRuntime({
      initialContext: sampleContext({
        reportModel: undefined,
        decisionResult: undefined,
        analysisResult: undefined
      })
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) => error.code === DASHBOARD_RUNTIME_ERROR_CODES.SOURCE_REQUIRED
      )
    );
  });

  it('fails validation when reportModelId mismatches ReportModel.id', async () => {
    const runtime = createDashboardPipelineRuntime({
      initialContext: sampleContext({
        reportModel: sampleReportModel({ id: 'other-report' })
      })
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) =>
          error.code === DASHBOARD_RUNTIME_ERROR_CODES.REPORT_MODEL_ID_MISMATCH
      )
    );
  });

  it('fails validation when decisionRequestId mismatches DecisionResult.requestId', async () => {
    const runtime = createDashboardPipelineRuntime({
      initialContext: sampleContext({
        decisionResult: sampleDecisionResult({ requestId: 'other-decision' })
      })
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) =>
          error.code ===
          DASHBOARD_RUNTIME_ERROR_CODES.DECISION_REQUEST_ID_MISMATCH
      )
    );
  });

  it('fails validation when datasetId mismatches AnalysisResult.datasetId', async () => {
    const runtime = createDashboardPipelineRuntime({
      initialContext: sampleContext({
        analysisResult: sampleAnalysisResult({ datasetId: 'ds-other' })
      })
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) => error.code === DASHBOARD_RUNTIME_ERROR_CODES.DATASET_ID_MISMATCH
      )
    );
  });

  it('records telemetry for total duration, stage durations, outcomes, and summary', async () => {
    const runtime = createDashboardPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.ok(detailed.totalDurationMs >= 0);
    assert.ok(detailed.telemetry.totalDurationMs >= 0);
    assert.equal(
      detailed.telemetry.stageOutcomes['dashboard-dogrulama'],
      'basarili'
    );
    assert.equal(
      detailed.telemetry.stageOutcomes['dashboard-derleme'],
      'basarili'
    );
    assert.ok(detailed.telemetry.stageDurationsMs['dashboard-dogrulama'] >= 0);
    assert.equal(detailed.telemetry.summary.stagesExecuted, 6);
    assert.equal(detailed.telemetry.summary.stagesNotImplemented, 4);
    assert.equal(detailed.telemetry.summary.success, false);
  });

  it('fails request validation before the full stage loop when id is missing', async () => {
    const runtime = createDashboardPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest({ id: '' }));

    assert.equal(detailed.stageExecutions.length, 1);
    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) => error.code === DASHBOARD_RUNTIME_ERROR_CODES.INVALID_REQUEST
      )
    );
  });

  it('returns a structured failure when no context source is available', async () => {
    const runtime = createDashboardPipelineRuntime();

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions.length, 1);
    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) =>
          error.code === DASHBOARD_RUNTIME_ERROR_CODES.CONTEXT_NOT_AVAILABLE
      )
    );
  });

  it('uses a resolver for run(request) when context is not preloaded', async () => {
    const runtime = createDashboardPipelineRuntime({
      contextResolver: async (request) =>
        sampleContext({
          dashboardJobId: `${request.id}-resolved`
        })
    });

    const result = await runtime.run(sampleRequest());

    assert.equal(result.id, 'dashboard-test-001');
    assert.equal(result.metadata.reportDnaId, 'report-dna-1');
  });

  it('preserves validation warnings without failing the validation stage', async () => {
    const runtime = createDashboardPipelineRuntime({
      initialContext: sampleContext({
        reportModel: sampleReportModel({
          status: 'basarisiz',
          sections: [],
          findings: [],
          recommendations: []
        })
      })
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions[0].outcome, 'basarili');
    assert.ok(
      (detailed.context.bag.sourceValidation?.counts.warning ?? 0) >= 1
    );
    assert.ok(
      detailed.stageExecutions[0].warnings.some(
        (warning) => warning.code === 'REPORT_STATUS_FAILED'
      )
    );
    assert.ok(
      detailed.stageExecutions[0].warnings.some(
        (warning) => warning.code === 'REPORT_CONTENT_EMPTY'
      )
    );
  });

  it('prefers explicit context over the preloaded initial context', async () => {
    const runtime = createDashboardPipelineRuntime({
      initialContext: sampleContext({
        reportModel: sampleReportModel({ id: 'report-initial' })
      })
    });

    const detailed = await runtime.runWithDetails(
      sampleRequest({ reportModelId: 'report-explicit' }),
      sampleContext({
        reportModel: sampleReportModel({
          id: 'report-explicit',
          metadata: {
            id: 'report-explicit',
            title: 'Explicit',
            reportDnaId: 'report-dna-1',
            locale: 'tr',
            createdAt: '2026-07-20T22:00:00.000Z',
            version: '1.0.0'
          }
        })
      })
    );

    assert.equal(
      detailed.context.dashboardContext.reportModel?.id,
      'report-explicit'
    );
    assert.equal(detailed.stageExecutions[0].outcome, 'basarili');
  });

  it('fails request validation when reportDnaId is missing', async () => {
    const runtime = createDashboardPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(
      sampleRequest({ reportDnaId: '' })
    );

    assert.equal(detailed.stageExecutions.length, 1);
    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) => error.code === DASHBOARD_RUNTIME_ERROR_CODES.INVALID_REQUEST
      )
    );
  });

  it('stores sourceValidation and dashboardModel on the dashboard-only pipeline bag', async () => {
    const runtime = createDashboardPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.ok(detailed.context.bag.sourceValidation);
    assert.ok(detailed.context.bag.dashboardModel);
    assert.equal(detailed.context.bag.dashboardModel?.id, 'dashboard-test-001');
    assert.equal(
      Object.prototype.hasOwnProperty.call(
        detailed.context.bag,
        'decisionValidation'
      ),
      false
    );
  });
});
