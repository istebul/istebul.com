/**
 * Decision Runtime Facade — PR-103F (en az 10 unit test)
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
  createDecisionRuntimeFacade,
  createDecisionPipelineRunner,
  createDecisionExecutionContext,
  resolveDecisionContext,
  ensureRequestIds,
  createSkippedStageExecution,
  createStageExecution,
  replaceStageExecution,
  buildDecisionExecutionTelemetry
} = await import('../../src/business/decision/integration/runtime/index.ts');

function sampleAnalysisResult(overrides = {}) {
  return {
    requestId: 'analysis-facade-001',
    datasetId: 'ds-facade-001',
    status: 'basarili',
    lastStage: 'sonuc-derleme',
    kpiResults: [],
    findings: [],
    summary: { headline: 'OK', highlights: [] },
    scores: [],
    statistics: {
      entityCount: 1,
      rowCount: 1,
      relationCount: 0,
      kpiResultCount: 0,
      findingCount: 0
    },
    warnings: [],
    completedAt: '2026-07-20T21:00:00.000Z',
    ...overrides
  };
}

function sampleRequest(overrides = {}) {
  return {
    id: 'decision-facade-1',
    analysisRequestId: 'analysis-facade-001',
    datasetId: 'ds-facade-001',
    locale: 'tr',
    ...overrides
  };
}

describe('DecisionRuntimeFacade — unit', () => {
  it('createDecisionRuntimeFacade fabrika', () => {
    const facade = createDecisionRuntimeFacade();
    assert.ok(facade);
    assert.equal(typeof facade.execute, 'function');
    assert.equal(typeof facade.run, 'function');
  });

  it('createDecisionPipelineRunner fabrika', () => {
    const runner = createDecisionPipelineRunner();
    assert.ok(runner);
    assert.equal(typeof runner.execute, 'function');
  });

  it('createDecisionExecutionContext — request korunur', () => {
    const ctx = createDecisionExecutionContext({
      request: sampleRequest(),
      analysisResult: sampleAnalysisResult(),
      locale: 'en',
      policyIds: ['critical-finding-present']
    });
    assert.equal(ctx.request.id, 'decision-facade-1');
    assert.equal(ctx.locale, 'en');
    assert.deepEqual(ctx.policyIds, ['critical-finding-present']);
  });

  it('resolveDecisionContext — analysisResult üzerinden üretir', () => {
    const ctx = resolveDecisionContext(
      createDecisionExecutionContext({
        request: sampleRequest(),
        analysisResult: sampleAnalysisResult()
      })
    );
    assert.equal(ctx.decisionId, 'decision-facade-1');
    assert.equal(ctx.analysisResult.datasetId, 'ds-facade-001');
    assert.equal(ctx.locale, 'tr');
    assert.equal(ctx.currentStage, 'analiz-sonuc-dogrulama');
    assert.equal(ctx.status, 'bekliyor');
  });

  it('resolveDecisionContext — decisionContext varsa birleştirir', () => {
    const ctx = resolveDecisionContext(
      createDecisionExecutionContext({
        request: sampleRequest({ reportId: 'rep-1' }),
        decisionContext: {
          decisionId: 'decision-existing',
          analysisResult: sampleAnalysisResult(),
          locale: 'tr',
          currentStage: 'oneri-olusturma',
          status: 'suruyor'
        },
        locale: 'en'
      })
    );
    assert.equal(ctx.decisionId, 'decision-existing');
    assert.equal(ctx.locale, 'en');
    assert.equal(ctx.reportId, 'rep-1');
    assert.equal(ctx.currentStage, 'analiz-sonuc-dogrulama');
  });

  it('resolveDecisionContext — analysisResult yoksa hata', () => {
    assert.throws(
      () =>
        resolveDecisionContext(
          createDecisionExecutionContext({
            request: sampleRequest()
          })
        ),
      /analysisResult veya decisionContext zorunludur/
    );
  });

  it('ensureRequestIds — boş id alanlarını doldurur', () => {
    const request = ensureRequestIds(
      sampleRequest({ analysisRequestId: '', datasetId: '' }),
      sampleAnalysisResult()
    );
    assert.equal(request.analysisRequestId, 'analysis-facade-001');
    assert.equal(request.datasetId, 'ds-facade-001');
  });

  it('ensureRequestIds — mevcut id alanları korunur', () => {
    const request = ensureRequestIds(
      sampleRequest({
        analysisRequestId: 'keep-analysis',
        datasetId: 'keep-ds'
      }),
      sampleAnalysisResult()
    );
    assert.equal(request.analysisRequestId, 'keep-analysis');
    assert.equal(request.datasetId, 'keep-ds');
  });

  it('createSkippedStageExecution — atlandi outcome', () => {
    const stage = createSkippedStageExecution(
      'risk-degerlendirme',
      'Risk Evaluation',
      'skipped for test'
    );
    assert.equal(stage.stageId, 'risk-degerlendirme');
    assert.equal(stage.outcome, 'atlandi');
    assert.equal(stage.detail, 'skipped for test');
    assert.ok(typeof stage.durationMs === 'number');
  });

  it('createStageExecution — basarili outcome', () => {
    const stage = createStageExecution(
      'karar-derleme',
      'Decision Assembly',
      'basarili',
      'ok'
    );
    assert.equal(stage.outcome, 'basarili');
    assert.equal(stage.errors.length, 0);
  });

  it('replaceStageExecution — mevcut aşamayı değiştirir', () => {
    const context = {
      stageExecutions: [
        createStageExecution(
          'risk-degerlendirme',
          'Risk Evaluation',
          'not-implemented',
          'placeholder'
        )
      ]
    };
    replaceStageExecution(
      context,
      createStageExecution(
        'risk-degerlendirme',
        'Risk Evaluation',
        'basarili',
        'done'
      )
    );
    assert.equal(context.stageExecutions.length, 1);
    assert.equal(context.stageExecutions[0].outcome, 'basarili');
  });

  it('buildDecisionExecutionTelemetry — sayaçlar ve süreler', () => {
    const context = {
      stageExecutions: [
        {
          stageId: 'analiz-sonuc-dogrulama',
          stageName: 'AnalysisResult Validation',
          outcome: 'basarili',
          startedAt: '2026-07-20T21:00:00.000Z',
          endedAt: '2026-07-20T21:00:01.000Z',
          durationMs: 12,
          errors: [],
          warnings: [{ code: 'W1', message: 'warn' }]
        },
        {
          stageId: 'risk-degerlendirme',
          stageName: 'Risk Evaluation',
          outcome: 'basarisiz',
          startedAt: '2026-07-20T21:00:01.000Z',
          endedAt: '2026-07-20T21:00:02.000Z',
          durationMs: 8,
          errors: [{ code: 'E1', message: 'fail' }],
          warnings: []
        },
        {
          stageId: 'oneri-olusturma',
          stageName: 'Recommendation Building',
          outcome: 'atlandi',
          startedAt: '2026-07-20T21:00:02.000Z',
          endedAt: '2026-07-20T21:00:02.000Z',
          durationMs: 0,
          errors: [],
          warnings: []
        }
      ]
    };
    const telemetry = buildDecisionExecutionTelemetry(
      context,
      '2026-07-20T21:00:00.000Z',
      '2026-07-20T21:00:03.000Z',
      30,
      {
        policyCount: 2,
        recommendationCount: 0,
        actionPlanCount: 0,
        actionCount: 0,
        summarySectionCount: 7
      }
    );
    assert.equal(telemetry.totalDurationMs, 30);
    assert.equal(telemetry.summary.stagesSucceeded, 1);
    assert.equal(telemetry.summary.stagesFailed, 1);
    assert.equal(telemetry.summary.stagesSkipped, 1);
    assert.equal(telemetry.summary.success, false);
    assert.equal(telemetry.summary.policyCount, 2);
    assert.equal(telemetry.summary.summarySectionCount, 7);
    assert.equal(telemetry.stageDurationsMs['risk-degerlendirme'], 8);
    assert.equal(telemetry.stageOutcomes['oneri-olusturma'], 'atlandi');
  });
});
