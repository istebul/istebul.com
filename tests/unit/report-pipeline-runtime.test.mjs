/**
 * Report Pipeline Runtime — PR-104A (en az 12 unit test)
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
  REPORT_PIPELINE_STAGE_COUNT,
  REPORT_PIPELINE_STAGES,
  REPORT_RUNTIME_ERROR_CODES,
  createReportPipelineRuntime
} = await import('../../src/business/report/index.ts');

function sampleRequest(overrides = {}) {
  return {
    id: 'report-test-001',
    decisionRequestId: 'decision-test-001',
    reportId: 'report-dna-1',
    datasetId: 'ds-001',
    locale: 'tr',
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
    recommendations: [
      {
        id: 'rec-1',
        code: 'REC_1',
        title: 'Öneri',
        description: 'Örnek öneri',
        priority: 'orta'
      }
    ],
    actions: [],
    risks: [],
    opportunities: [],
    priorities: [],
    scores: [],
    completedAt: '2026-07-20T22:00:00.000Z',
    ...overrides
  };
}

function sampleContext(overrides = {}) {
  return {
    reportJobId: 'report-job-001',
    decisionResult: sampleDecisionResult(),
    reportDnaId: 'report-dna-1',
    locale: 'tr',
    currentStage: 'karar-dogrulama',
    status: 'bekliyor',
    metadata: { tenant: 'demo' },
    ...overrides
  };
}

describe('ReportPipelineRuntime', () => {
  it('runs all foundation stages in order for a valid DecisionResult', async () => {
    const runtime = createReportPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions.length, REPORT_PIPELINE_STAGE_COUNT);
    assert.deepEqual(
      detailed.stageExecutions.map((stage) => stage.stageId),
      REPORT_PIPELINE_STAGES.map((stage) => stage.id)
    );
  });

  it('implements IReportPipeline.run returning ReportModel', async () => {
    const runtime = createReportPipelineRuntime({
      initialContext: sampleContext()
    });

    const result = await runtime.run(sampleRequest());

    assert.equal(result.id, 'report-test-001');
    assert.equal(result.metadata.reportDnaId, 'report-dna-1');
    assert.equal(result.lastStage, 'rapor-derleme');
    assert.ok(Array.isArray(result.sections));
    assert.ok(Array.isArray(result.findings));
    assert.ok(result.executiveSummary);
  });

  it('executes DecisionResult validation for a valid input', async () => {
    const runtime = createReportPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest());
    const validationStage = detailed.stageExecutions[0];

    assert.equal(validationStage.stageId, 'karar-dogrulama');
    assert.equal(validationStage.outcome, 'basarili');
    assert.equal(detailed.context.bag.decisionValidation?.isValid, true);
    assert.equal(detailed.context.bag.decisionValidation?.counts.error, 0);
  });

  it('marks placeholder stages as not-implemented and still assembles a result', async () => {
    const runtime = createReportPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest());
    const placeholderStages = detailed.stageExecutions.filter((stage) =>
      [
        'bolum-derleme',
        'kanit-toplama',
        'rapor-birlestirme',
        'rapor-inceleme'
      ].includes(stage.stageId)
    );

    assert.equal(placeholderStages.length, 4);
    assert.ok(
      placeholderStages.every((stage) => stage.outcome === 'not-implemented')
    );
    assert.ok(
      placeholderStages.every((stage) =>
        stage.errors.some(
          (error) => error.code === REPORT_RUNTIME_ERROR_CODES.NOT_IMPLEMENTED
        )
      )
    );
    assert.equal(detailed.stageExecutions.at(-1)?.stageId, 'rapor-derleme');
    assert.equal(detailed.stageExecutions.at(-1)?.outcome, 'basarili');
    assert.equal(detailed.reportModel.status, 'basarisiz');
  });

  it('halts after DecisionResult validation failure and skips intermediate stages', async () => {
    const runtime = createReportPipelineRuntime({
      initialContext: sampleContext({
        decisionResult: sampleDecisionResult({
          recommendations: /** @type {any} */ ('broken')
        })
      })
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.deepEqual(
      detailed.stageExecutions.slice(1).map((stage) => stage.outcome),
      ['atlandi', 'atlandi', 'atlandi', 'atlandi', 'basarili']
    );
    assert.equal(detailed.reportModel.status, 'basarisiz');
  });

  it('fails validation when request datasetId and DecisionResult.datasetId mismatch', async () => {
    const runtime = createReportPipelineRuntime({
      initialContext: sampleContext({
        decisionResult: sampleDecisionResult({ datasetId: 'ds-other' })
      })
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) => error.code === REPORT_RUNTIME_ERROR_CODES.DATASET_ID_MISMATCH
      )
    );
  });

  it('fails validation when decisionRequestId mismatches DecisionResult.requestId', async () => {
    const runtime = createReportPipelineRuntime({
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
          REPORT_RUNTIME_ERROR_CODES.DECISION_REQUEST_ID_MISMATCH
      )
    );
  });

  it('records telemetry for total duration, stage durations, outcomes, and summary', async () => {
    const runtime = createReportPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.ok(detailed.totalDurationMs >= 0);
    assert.ok(detailed.telemetry.totalDurationMs >= 0);
    assert.equal(
      detailed.telemetry.stageOutcomes['karar-dogrulama'],
      'basarili'
    );
    assert.equal(detailed.telemetry.stageOutcomes['rapor-derleme'], 'basarili');
    assert.ok(detailed.telemetry.stageDurationsMs['karar-dogrulama'] >= 0);
    assert.equal(detailed.telemetry.summary.stagesExecuted, 6);
    assert.equal(detailed.telemetry.summary.stagesNotImplemented, 4);
    assert.equal(detailed.telemetry.summary.success, false);
  });

  it('fails request validation before the full stage loop when id is missing', async () => {
    const runtime = createReportPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest({ id: '' }));

    assert.equal(detailed.stageExecutions.length, 1);
    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) => error.code === REPORT_RUNTIME_ERROR_CODES.INVALID_REQUEST
      )
    );
  });

  it('returns a structured failure when no context source is available', async () => {
    const runtime = createReportPipelineRuntime();

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions.length, 1);
    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) =>
          error.code === REPORT_RUNTIME_ERROR_CODES.CONTEXT_NOT_AVAILABLE
      )
    );
  });

  it('uses a resolver for run(request) when context is not preloaded', async () => {
    const runtime = createReportPipelineRuntime({
      contextResolver: async (request) =>
        sampleContext({
          reportJobId: `${request.id}-resolved`
        })
    });

    const result = await runtime.run(sampleRequest());

    assert.equal(result.id, 'report-test-001');
    assert.equal(result.metadata.reportDnaId, 'report-dna-1');
  });

  it('preserves validation warnings without failing the decision validation stage', async () => {
    const runtime = createReportPipelineRuntime({
      initialContext: sampleContext({
        decisionResult: sampleDecisionResult({
          recommendations: [],
          status: 'basarisiz'
        })
      })
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions[0].outcome, 'basarili');
    assert.ok(
      (detailed.context.bag.decisionValidation?.counts.warning ?? 0) >= 1
    );
    assert.ok(
      detailed.stageExecutions[0].warnings.some(
        (warning) => warning.code === 'DECISION_STATUS_FAILED'
      )
    );
    assert.ok(
      detailed.stageExecutions[0].warnings.some(
        (warning) => warning.code === 'DECISION_RECOMMENDATIONS_EMPTY'
      )
    );
  });

  it('prefers explicit context over the preloaded initial context', async () => {
    const runtime = createReportPipelineRuntime({
      initialContext: sampleContext({
        decisionResult: sampleDecisionResult({ datasetId: 'ds-initial' })
      })
    });

    const detailed = await runtime.runWithDetails(
      sampleRequest({ datasetId: 'ds-explicit' }),
      sampleContext({
        decisionResult: sampleDecisionResult({
          datasetId: 'ds-explicit',
          requestId: 'decision-test-001'
        })
      })
    );

    assert.equal(
      detailed.context.reportContext.decisionResult.datasetId,
      'ds-explicit'
    );
    assert.equal(detailed.stageExecutions[0].outcome, 'basarili');
  });

  it('fails request validation when decisionRequestId is missing', async () => {
    const runtime = createReportPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(
      sampleRequest({ decisionRequestId: '' })
    );

    assert.equal(detailed.stageExecutions.length, 1);
    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) => error.code === REPORT_RUNTIME_ERROR_CODES.INVALID_REQUEST
      )
    );
  });

  it('fails validation when DecisionResult.summary is missing', async () => {
    const runtime = createReportPipelineRuntime({
      initialContext: sampleContext({
        decisionResult: sampleDecisionResult({
          summary: /** @type {any} */ (null)
        })
      })
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) => error.code === 'DECISION_SUMMARY_REQUIRED'
      )
    );
    assert.equal(detailed.telemetry.summary.stagesSkipped, 4);
  });

  it('stores decisionValidation and reportModel on the report-only pipeline bag', async () => {
    const runtime = createReportPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.ok(detailed.context.bag.decisionValidation);
    assert.ok(detailed.context.bag.reportModel);
    assert.equal(detailed.context.bag.reportModel?.id, 'report-test-001');
  });
});
