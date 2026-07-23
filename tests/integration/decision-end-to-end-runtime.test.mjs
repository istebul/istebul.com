/**
 * End-to-End Decision Runtime — PR-103F (en az 15 entegrasyon testi)
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
  createDecisionRuntimeFacade,
  createDecisionExecutionContext,
  DECISION_SUMMARY_SECTION_ORDER,
  PIPELINE_BAG_POLICY_RUNTIME_RESULT_KEY,
  PIPELINE_BAG_RECOMMENDATION_RUNTIME_RESULT_KEY,
  PIPELINE_BAG_ACTION_PLAN_RUNTIME_RESULT_KEY,
  PIPELINE_BAG_DECISION_SUMMARY_RUNTIME_RESULT_KEY
} = await import('../../src/business/decision/index.ts');

function sampleAnalysisResult(overrides = {}) {
  return {
    requestId: 'analysis-e2e-001',
    datasetId: 'ds-e2e-001',
    status: 'basarili',
    lastStage: 'sonuc-derleme',
    kpiResults: [
      {
        kpiId: 'filled-value-ratio',
        name: 'Filled',
        unit: 'oran',
        value: 0.95,
        confidence: 1
      }
    ],
    findings: [],
    summary: { headline: 'OK', highlights: [] },
    scores: [],
    statistics: {
      entityCount: 2,
      rowCount: 10,
      relationCount: 0,
      kpiResultCount: 1,
      findingCount: 0
    },
    warnings: [],
    completedAt: '2026-07-20T21:00:00.000Z',
    ...overrides
  };
}

function dirtyAnalysisResult() {
  return sampleAnalysisResult({
    kpiResults: [
      {
        kpiId: 'filled-value-ratio',
        name: 'Filled',
        unit: 'oran',
        value: 0.3,
        confidence: 1
      }
    ],
    findings: [
      {
        id: 'f-crit-1',
        code: 'CRIT',
        title: 'Kritik',
        description: 'Kritik bulgu',
        severity: 'kritik',
        ruleId: 'empty-value-ratio-threshold'
      }
    ],
    statistics: {
      entityCount: 0,
      rowCount: 0,
      relationCount: 0,
      kpiResultCount: 1,
      findingCount: 1
    },
    completedAt: undefined
  });
}

function emptyAnalysisResult() {
  return {
    requestId: 'analysis-empty-001',
    datasetId: 'ds-empty-001',
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
    warnings: []
  };
}

function invalidAnalysisResult() {
  return sampleAnalysisResult({
    datasetId: '',
    status: 'basarisiz',
    kpiResults: /** @type {any} */ ('broken')
  });
}

function sampleRequest(overrides = {}) {
  return {
    id: 'decision-e2e-1',
    analysisRequestId: 'analysis-e2e-001',
    datasetId: 'ds-e2e-001',
    locale: 'tr',
    ...overrides
  };
}

function outcomeOf(result, stageId) {
  return result.stageExecutions.find((s) => s.stageId === stageId)?.outcome;
}

describe('DecisionRuntimeFacade — integration', () => {
  /** @type {ReturnType<typeof createDecisionRuntimeFacade>} */
  let facade;

  beforeEach(() => {
    facade = createDecisionRuntimeFacade();
  });

  it('normal akış — uçtan uca başarılı', async () => {
    const result = await facade.execute(
      createDecisionExecutionContext({
        request: sampleRequest(),
        analysisResult: sampleAnalysisResult()
      })
    );
    assert.equal(result.decisionResult.status, 'basarili');
    assert.ok(result.policyResult);
    assert.ok(result.recommendationResult);
    assert.ok(result.actionPlanResult);
    assert.ok(result.decisionSummaryResult);
    assert.equal(outcomeOf(result, 'analiz-sonuc-dogrulama'), 'basarili');
    assert.equal(outcomeOf(result, 'risk-degerlendirme'), 'basarili');
    assert.equal(outcomeOf(result, 'firsat-degerlendirme'), 'atlandi');
    assert.equal(outcomeOf(result, 'oneri-olusturma'), 'basarili');
    assert.equal(outcomeOf(result, 'oncelik-hesaplama'), 'basarili');
    assert.equal(outcomeOf(result, 'karar-derleme'), 'basarili');
  });

  it('validation fail — Policy/Recommendation/Action Plan atlanır', async () => {
    const result = await facade.execute(
      createDecisionExecutionContext({
        request: sampleRequest(),
        analysisResult: invalidAnalysisResult()
      })
    );
    assert.equal(result.decisionResult.status, 'basarisiz');
    assert.equal(outcomeOf(result, 'analiz-sonuc-dogrulama'), 'basarisiz');
    assert.equal(outcomeOf(result, 'risk-degerlendirme'), 'atlandi');
    assert.equal(outcomeOf(result, 'firsat-degerlendirme'), 'atlandi');
    assert.equal(outcomeOf(result, 'oneri-olusturma'), 'atlandi');
    assert.equal(outcomeOf(result, 'oncelik-hesaplama'), 'atlandi');
    assert.equal(result.policyResult, undefined);
    assert.equal(result.recommendationResult, undefined);
    assert.equal(result.actionPlanResult, undefined);
  });

  it('validation fail — Decision Summary yine de üretilir', async () => {
    const result = await facade.execute(
      createDecisionExecutionContext({
        request: sampleRequest(),
        analysisResult: invalidAnalysisResult()
      })
    );
    assert.ok(result.decisionSummaryResult);
    assert.equal(
      result.decisionSummaryResult.sections.length,
      DECISION_SUMMARY_SECTION_ORDER.length
    );
    assert.ok(result.decisionResult.summary.headline);
    assert.equal(outcomeOf(result, 'karar-derleme'), 'basarili');
  });

  it('boş AnalysisResult — geçerli DecisionResult döner', async () => {
    const result = await facade.execute(
      createDecisionExecutionContext({
        request: sampleRequest({
          analysisRequestId: 'analysis-empty-001',
          datasetId: 'ds-empty-001'
        }),
        analysisResult: emptyAnalysisResult()
      })
    );
    assert.ok(result.decisionResult);
    assert.equal(result.decisionResult.requestId, 'decision-e2e-1');
    assert.ok(result.decisionResult.summary);
    assert.ok(Array.isArray(result.decisionResult.recommendations));
    assert.ok(Array.isArray(result.decisionResult.actions));
    assert.ok(result.decisionSummaryResult);
  });

  it('policy triggered — dirty analysis tetikler', async () => {
    const result = await facade.execute(
      createDecisionExecutionContext({
        request: sampleRequest(),
        analysisResult: dirtyAnalysisResult()
      })
    );
    assert.ok(result.policyResult);
    assert.ok(result.policyResult.summary.triggeredCount >= 1);
    assert.ok(result.policyResult.triggeredPolicies.length >= 1);
  });

  it('recommendation üretildi', async () => {
    const result = await facade.execute(
      createDecisionExecutionContext({
        request: sampleRequest(),
        analysisResult: dirtyAnalysisResult()
      })
    );
    assert.ok(result.recommendationResult);
    assert.ok(result.recommendationResult.summary.recommendationCount >= 1);
    assert.ok(result.decisionResult.recommendations.length >= 1);
  });

  it('action plan üretildi', async () => {
    const result = await facade.execute(
      createDecisionExecutionContext({
        request: sampleRequest(),
        analysisResult: dirtyAnalysisResult()
      })
    );
    assert.ok(result.actionPlanResult);
    assert.ok(result.actionPlanResult.summary.actionPlanCount >= 1);
    assert.ok(result.actionPlanResult.summary.stepCount >= 1);
    assert.ok(result.decisionResult.actions.length >= 1);
  });

  it('summary oluşturuldu', async () => {
    const result = await facade.execute(
      createDecisionExecutionContext({
        request: sampleRequest(),
        analysisResult: dirtyAnalysisResult()
      })
    );
    assert.ok(result.decisionSummaryResult);
    assert.equal(
      result.decisionSummaryResult.sections.length,
      DECISION_SUMMARY_SECTION_ORDER.length
    );
    assert.ok(result.decisionResult.summary.headline.includes('öneri'));
    assert.ok(result.decisionResult.summary.highlights.length >= 1);
  });

  it('telemetry doğrulaması — süre ve stage sayaçları', async () => {
    const result = await facade.execute(
      createDecisionExecutionContext({
        request: sampleRequest(),
        analysisResult: dirtyAnalysisResult()
      })
    );
    assert.ok(result.telemetry.totalDurationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.ok(result.telemetry.summary.stagesSucceeded >= 1);
    assert.ok(result.telemetry.summary.stagesSkipped >= 1);
    assert.ok(result.telemetry.summary.policyCount >= 1);
    assert.ok(result.telemetry.summary.recommendationCount >= 1);
    assert.ok(result.telemetry.summary.actionPlanCount >= 1);
    assert.equal(
      result.telemetry.summary.summarySectionCount,
      DECISION_SUMMARY_SECTION_ORDER.length
    );
    assert.ok(result.telemetry.stageDurationsMs['risk-degerlendirme'] >= 0);
    assert.equal(
      result.telemetry.stageOutcomes['firsat-degerlendirme'],
      'atlandi'
    );
  });

  it('facade.run — yalnızca DecisionResult döner', async () => {
    const decisionResult = await facade.run(sampleRequest(), {
      analysisResult: sampleAnalysisResult()
    });
    assert.equal(decisionResult.requestId, 'decision-e2e-1');
    assert.ok(decisionResult.summary.headline);
    assert.equal(decisionResult.status, 'basarili');
  });

  it('pipeline bag anahtarları doldurulur', async () => {
    const result = await facade.execute(
      createDecisionExecutionContext({
        request: sampleRequest(),
        analysisResult: dirtyAnalysisResult()
      })
    );
    const bag = result.pipelineContext.bag;
    assert.ok(bag[PIPELINE_BAG_POLICY_RUNTIME_RESULT_KEY]);
    assert.ok(bag[PIPELINE_BAG_RECOMMENDATION_RUNTIME_RESULT_KEY]);
    assert.ok(bag[PIPELINE_BAG_ACTION_PLAN_RUNTIME_RESULT_KEY]);
    assert.ok(bag[PIPELINE_BAG_DECISION_SUMMARY_RUNTIME_RESULT_KEY]);
    assert.ok(bag.summary?.headline);
    assert.ok(Array.isArray(bag.recommendations));
    assert.ok(Array.isArray(bag.actions));
  });

  it('policyIds alt kümesi uygulanır', async () => {
    const result = await facade.execute(
      createDecisionExecutionContext({
        request: sampleRequest(),
        analysisResult: dirtyAnalysisResult(),
        policyIds: ['critical-finding-present']
      })
    );
    assert.equal(result.policyResult?.summary.evaluatedCount, 1);
    assert.ok(result.recommendationResult?.summary.recommendationCount >= 1);
  });

  it('decisionContext ile yürütme', async () => {
    const result = await facade.execute(
      createDecisionExecutionContext({
        request: sampleRequest(),
        decisionContext: {
          decisionId: 'ctx-e2e',
          analysisResult: dirtyAnalysisResult(),
          locale: 'tr',
          currentStage: 'analiz-sonuc-dogrulama',
          status: 'bekliyor'
        }
      })
    );
    assert.equal(result.pipelineContext.decisionContext.decisionId, 'ctx-e2e');
    assert.ok(result.decisionSummaryResult);
  });

  it('validation fail telemetry — atlanan stage sayısı', async () => {
    const result = await facade.execute(
      createDecisionExecutionContext({
        request: sampleRequest(),
        analysisResult: invalidAnalysisResult()
      })
    );
    assert.ok(result.telemetry.summary.stagesFailed >= 1);
    assert.ok(result.telemetry.summary.stagesSkipped >= 4);
    assert.equal(result.telemetry.summary.policyCount, 0);
    assert.equal(result.telemetry.summary.recommendationCount, 0);
    assert.equal(result.telemetry.summary.actionPlanCount, 0);
    assert.equal(
      result.telemetry.summary.summarySectionCount,
      DECISION_SUMMARY_SECTION_ORDER.length
    );
  });

  it('temiz analysis — recommendation/action sıfır olabilir', async () => {
    const result = await facade.execute(
      createDecisionExecutionContext({
        request: sampleRequest(),
        analysisResult: sampleAnalysisResult()
      })
    );
    assert.equal(result.decisionResult.status, 'basarili');
    assert.equal(result.recommendationResult?.summary.recommendationCount, 0);
    assert.equal(result.actionPlanResult?.summary.actionPlanCount, 0);
    assert.ok(result.decisionSummaryResult?.decisionSummary.headline);
  });

  it('her koşulda geçerli DecisionResult şeması', async () => {
    for (const analysisResult of [
      sampleAnalysisResult(),
      dirtyAnalysisResult(),
      emptyAnalysisResult(),
      invalidAnalysisResult()
    ]) {
      const result = await facade.execute(
        createDecisionExecutionContext({
          request: sampleRequest({
            analysisRequestId: analysisResult.requestId,
            datasetId: analysisResult.datasetId || 'ds-e2e-001'
          }),
          analysisResult
        })
      );
      const dr = result.decisionResult;
      assert.ok(typeof dr.requestId === 'string');
      assert.ok(typeof dr.analysisRequestId === 'string');
      assert.ok(typeof dr.datasetId === 'string');
      assert.ok(['basarili', 'basarisiz'].includes(dr.status));
      assert.ok(dr.summary && typeof dr.summary.headline === 'string');
      assert.ok(Array.isArray(dr.recommendations));
      assert.ok(Array.isArray(dr.actions));
      assert.ok(Array.isArray(dr.risks));
      assert.ok(Array.isArray(dr.opportunities));
      assert.ok(Array.isArray(dr.priorities));
      assert.ok(Array.isArray(dr.scores));
    }
  });
});
