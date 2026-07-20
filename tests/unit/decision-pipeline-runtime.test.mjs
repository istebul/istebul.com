/**
 * Decision Pipeline Runtime — PR-103A (en az 12 unit test)
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
  DECISION_PIPELINE_STAGE_COUNT,
  DECISION_PIPELINE_STAGES,
  DECISION_RUNTIME_ERROR_CODES,
  createDecisionPipelineRuntime
} = await import('../../src/business/decision/index.ts');

function sampleRequest(overrides = {}) {
  return {
    id: 'decision-test-001',
    analysisRequestId: 'analysis-test-001',
    datasetId: 'ds-001',
    locale: 'tr',
    reportId: 'report-1',
    ...overrides
  };
}

function sampleAnalysisResult(overrides = {}) {
  return {
    requestId: 'analysis-test-001',
    datasetId: 'ds-001',
    status: 'basarili',
    lastStage: 'sonuc-derleme',
    kpiResults: [
      {
        kpiId: 'entity-count',
        name: 'Entity Count',
        unit: 'adet',
        value: 1,
        confidence: 1
      }
    ],
    findings: [
      {
        id: 'f-1',
        code: 'EMPTY_RATIO',
        title: 'Boş oran',
        description: 'Örnek bulgu',
        severity: 'uyari'
      }
    ],
    summary: {
      headline: 'Analiz tamamlandı',
      highlights: ['1 KPI']
    },
    scores: [],
    statistics: {
      entityCount: 1,
      rowCount: 2,
      relationCount: 0,
      kpiResultCount: 1,
      findingCount: 1
    },
    warnings: [],
    completedAt: '2026-07-20T16:00:00.000Z',
    ...overrides
  };
}

function sampleContext(overrides = {}) {
  return {
    decisionId: 'decision-ctx-001',
    analysisResult: sampleAnalysisResult(),
    locale: 'tr',
    currentStage: 'analiz-sonuc-dogrulama',
    status: 'bekliyor',
    metadata: { tenant: 'demo' },
    ...overrides
  };
}

describe('DecisionPipelineRuntime', () => {
  it('runs all foundation stages in order for a valid AnalysisResult', async () => {
    const runtime = createDecisionPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions.length, DECISION_PIPELINE_STAGE_COUNT);
    assert.deepEqual(
      detailed.stageExecutions.map((stage) => stage.stageId),
      DECISION_PIPELINE_STAGES.map((stage) => stage.id)
    );
  });

  it('implements IDecisionPipeline.run returning DecisionResult', async () => {
    const runtime = createDecisionPipelineRuntime({
      initialContext: sampleContext()
    });

    const result = await runtime.run(sampleRequest());

    assert.equal(result.requestId, 'decision-test-001');
    assert.equal(result.analysisRequestId, 'analysis-test-001');
    assert.equal(result.datasetId, 'ds-001');
    assert.equal(result.lastStage, 'karar-derleme');
    assert.ok(result.completedAt);
    assert.ok(Array.isArray(result.recommendations));
    assert.ok(Array.isArray(result.risks));
  });

  it('executes AnalysisResult validation for a valid input', async () => {
    const runtime = createDecisionPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest());
    const validationStage = detailed.stageExecutions[0];

    assert.equal(validationStage.stageId, 'analiz-sonuc-dogrulama');
    assert.equal(validationStage.outcome, 'basarili');
    assert.equal(detailed.context.bag.analysisValidation?.isValid, true);
    assert.equal(detailed.context.bag.analysisValidation?.counts.error, 0);
  });

  it('marks placeholder stages as not-implemented and still assembles a result', async () => {
    const runtime = createDecisionPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest());
    const placeholderStages = detailed.stageExecutions.filter((stage) =>
      [
        'risk-degerlendirme',
        'firsat-degerlendirme',
        'oneri-olusturma',
        'oncelik-hesaplama'
      ].includes(stage.stageId)
    );

    assert.equal(placeholderStages.length, 4);
    assert.ok(
      placeholderStages.every((stage) => stage.outcome === 'not-implemented')
    );
    assert.ok(
      placeholderStages.every((stage) =>
        stage.errors.some(
          (error) => error.code === DECISION_RUNTIME_ERROR_CODES.NOT_IMPLEMENTED
        )
      )
    );
    assert.equal(detailed.stageExecutions.at(-1)?.stageId, 'karar-derleme');
    assert.equal(detailed.stageExecutions.at(-1)?.outcome, 'basarili');
    assert.equal(detailed.decisionResult.status, 'basarisiz');
  });

  it('halts after AnalysisResult validation failure and skips intermediate stages', async () => {
    const runtime = createDecisionPipelineRuntime({
      initialContext: sampleContext({
        analysisResult: sampleAnalysisResult({
          kpiResults: /** @type {any} */ ('broken')
        })
      })
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.deepEqual(
      detailed.stageExecutions.slice(1).map((stage) => stage.outcome),
      ['atlandi', 'atlandi', 'atlandi', 'atlandi', 'basarili']
    );
    assert.equal(detailed.decisionResult.status, 'basarisiz');
  });

  it('fails validation when request datasetId and AnalysisResult.datasetId mismatch', async () => {
    const runtime = createDecisionPipelineRuntime({
      initialContext: sampleContext({
        analysisResult: sampleAnalysisResult({ datasetId: 'ds-other' })
      })
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) => error.code === DECISION_RUNTIME_ERROR_CODES.DATASET_ID_MISMATCH
      )
    );
  });

  it('fails validation when analysisRequestId mismatches AnalysisResult.requestId', async () => {
    const runtime = createDecisionPipelineRuntime({
      initialContext: sampleContext({
        analysisResult: sampleAnalysisResult({ requestId: 'other-analysis' })
      })
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) =>
          error.code ===
          DECISION_RUNTIME_ERROR_CODES.ANALYSIS_REQUEST_ID_MISMATCH
      )
    );
  });

  it('records telemetry for total duration, stage durations, outcomes, and summary', async () => {
    const runtime = createDecisionPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.ok(detailed.totalDurationMs >= 0);
    assert.ok(detailed.telemetry.totalDurationMs >= 0);
    assert.equal(
      detailed.telemetry.stageOutcomes['analiz-sonuc-dogrulama'],
      'basarili'
    );
    assert.equal(
      detailed.telemetry.stageOutcomes['karar-derleme'],
      'basarili'
    );
    assert.ok(
      detailed.telemetry.stageDurationsMs['analiz-sonuc-dogrulama'] >= 0
    );
    assert.equal(detailed.telemetry.summary.stagesExecuted, 6);
    assert.equal(detailed.telemetry.summary.stagesNotImplemented, 4);
    assert.equal(detailed.telemetry.summary.success, false);
  });

  it('fails request validation before the full stage loop when id is missing', async () => {
    const runtime = createDecisionPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest({ id: '' }));

    assert.equal(detailed.stageExecutions.length, 1);
    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) => error.code === DECISION_RUNTIME_ERROR_CODES.INVALID_REQUEST
      )
    );
  });

  it('returns a structured failure when no context source is available', async () => {
    const runtime = createDecisionPipelineRuntime();

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions.length, 1);
    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) =>
          error.code === DECISION_RUNTIME_ERROR_CODES.CONTEXT_NOT_AVAILABLE
      )
    );
  });

  it('uses a resolver for run(request) when context is not preloaded', async () => {
    const runtime = createDecisionPipelineRuntime({
      contextResolver: async (request) =>
        sampleContext({
          decisionId: `${request.id}-resolved`
        })
    });

    const result = await runtime.run(sampleRequest());

    assert.equal(result.requestId, 'decision-test-001');
    assert.equal(result.datasetId, 'ds-001');
  });

  it('preserves validation warnings without failing the analysis validation stage', async () => {
    const runtime = createDecisionPipelineRuntime({
      initialContext: sampleContext({
        analysisResult: sampleAnalysisResult({
          findings: [],
          status: 'basarisiz'
        })
      })
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions[0].outcome, 'basarili');
    assert.ok(
      (detailed.context.bag.analysisValidation?.counts.warning ?? 0) >= 1
    );
    assert.ok(
      detailed.stageExecutions[0].warnings.some(
        (warning) => warning.code === 'ANALYSIS_STATUS_FAILED'
      )
    );
    assert.ok(
      detailed.stageExecutions[0].warnings.some(
        (warning) => warning.code === 'ANALYSIS_FINDINGS_EMPTY'
      )
    );
  });

  it('prefers explicit context over the preloaded initial context', async () => {
    const runtime = createDecisionPipelineRuntime({
      initialContext: sampleContext({
        analysisResult: sampleAnalysisResult({ datasetId: 'ds-initial' })
      })
    });

    const detailed = await runtime.runWithDetails(
      sampleRequest({ datasetId: 'ds-explicit' }),
      sampleContext({
        analysisResult: sampleAnalysisResult({
          datasetId: 'ds-explicit',
          requestId: 'analysis-test-001'
        })
      })
    );

    assert.equal(
      detailed.context.decisionContext.analysisResult.datasetId,
      'ds-explicit'
    );
    assert.equal(detailed.stageExecutions[0].outcome, 'basarili');
  });

  it('fails request validation when analysisRequestId is missing', async () => {
    const runtime = createDecisionPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(
      sampleRequest({ analysisRequestId: '' })
    );

    assert.equal(detailed.stageExecutions.length, 1);
    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) => error.code === DECISION_RUNTIME_ERROR_CODES.INVALID_REQUEST
      )
    );
  });

  it('fails validation when AnalysisResult.statistics is missing', async () => {
    const runtime = createDecisionPipelineRuntime({
      initialContext: sampleContext({
        analysisResult: sampleAnalysisResult({
          statistics: /** @type {any} */ (null)
        })
      })
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) => error.code === 'ANALYSIS_STATISTICS_REQUIRED'
      )
    );
    assert.equal(detailed.telemetry.summary.stagesSkipped, 4);
  });
});
