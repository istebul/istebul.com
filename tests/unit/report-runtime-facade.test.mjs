/**
 * Report Runtime Facade — PR-104F (en az 10 unit test)
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
  createReportRuntimeFacade,
  createReportPipelineRunner,
  createReportExecutionContext,
  resolveReportContext,
  ensureRequestIds,
  createSkippedStageExecution,
  createStageExecution,
  replaceStageExecution,
  mutateReportModel,
  syncReportModelFromBag,
  buildReportExecutionTelemetry
} = await import('../../src/business/report/integration/runtime/index.ts');

function sampleDecisionResult(overrides = {}) {
  return {
    requestId: 'decision-facade-001',
    analysisRequestId: 'analysis-facade-001',
    datasetId: 'ds-facade-001',
    status: 'basarili',
    lastStage: 'karar-derleme',
    summary: { headline: 'OK', highlights: [] },
    recommendations: [],
    actions: [],
    risks: [],
    opportunities: [],
    priorities: [],
    scores: [],
    completedAt: '2026-07-20T22:00:00.000Z',
    ...overrides
  };
}

function sampleRequest(overrides = {}) {
  return {
    id: 'report-facade-1',
    decisionRequestId: 'decision-facade-001',
    reportId: 'report-dna-facade',
    datasetId: 'ds-facade-001',
    locale: 'tr',
    ...overrides
  };
}

describe('ReportRuntimeFacade — unit', () => {
  it('createReportRuntimeFacade fabrika', () => {
    const facade = createReportRuntimeFacade();
    assert.ok(facade);
    assert.equal(typeof facade.execute, 'function');
    assert.equal(typeof facade.run, 'function');
  });

  it('createReportPipelineRunner fabrika', () => {
    const runner = createReportPipelineRunner();
    assert.ok(runner);
    assert.equal(typeof runner.execute, 'function');
  });

  it('createReportExecutionContext — request korunur', () => {
    const ctx = createReportExecutionContext({
      request: sampleRequest(),
      decisionResult: sampleDecisionResult(),
      locale: 'en'
    });
    assert.equal(ctx.request.id, 'report-facade-1');
    assert.equal(ctx.locale, 'en');
  });

  it('resolveReportContext — decisionResult üzerinden üretir', () => {
    const ctx = resolveReportContext(
      createReportExecutionContext({
        request: sampleRequest(),
        decisionResult: sampleDecisionResult()
      })
    );
    assert.equal(ctx.reportJobId, 'report-facade-1');
    assert.equal(ctx.decisionResult.datasetId, 'ds-facade-001');
    assert.equal(ctx.locale, 'tr');
    assert.equal(ctx.currentStage, 'karar-dogrulama');
    assert.equal(ctx.status, 'bekliyor');
  });

  it('resolveReportContext — reportContext varsa birleştirir', () => {
    const ctx = resolveReportContext(
      createReportExecutionContext({
        request: sampleRequest({ reportId: 'rep-1' }),
        reportContext: {
          reportJobId: 'job-existing',
          decisionResult: sampleDecisionResult(),
          reportDnaId: 'old-dna',
          locale: 'tr',
          currentStage: 'bolum-derleme',
          status: 'suruyor'
        },
        locale: 'en'
      })
    );
    assert.equal(ctx.reportJobId, 'job-existing');
    assert.equal(ctx.locale, 'en');
    assert.equal(ctx.reportDnaId, 'rep-1');
    assert.equal(ctx.currentStage, 'karar-dogrulama');
  });

  it('resolveReportContext — decisionResult yoksa hata', () => {
    assert.throws(
      () =>
        resolveReportContext(
          createReportExecutionContext({
            request: sampleRequest()
          })
        ),
      /decisionResult veya reportContext zorunludur/
    );
  });

  it('ensureRequestIds — boş id alanlarını doldurur', () => {
    const request = ensureRequestIds(
      sampleRequest({
        decisionRequestId: '',
        datasetId: '',
        reportId: ''
      }),
      sampleDecisionResult()
    );
    assert.equal(request.decisionRequestId, 'decision-facade-001');
    assert.equal(request.datasetId, 'ds-facade-001');
    assert.equal(request.reportId, 'report-decision-facade-001');
  });

  it('ensureRequestIds — mevcut id alanları korunur', () => {
    const request = ensureRequestIds(
      sampleRequest({
        decisionRequestId: 'keep-decision',
        datasetId: 'keep-ds',
        reportId: 'keep-report'
      }),
      sampleDecisionResult()
    );
    assert.equal(request.decisionRequestId, 'keep-decision');
    assert.equal(request.datasetId, 'keep-ds');
    assert.equal(request.reportId, 'keep-report');
  });

  it('createSkippedStageExecution — atlandi outcome', () => {
    const stage = createSkippedStageExecution(
      'kanit-toplama',
      'Evidence Collection',
      'skipped for test'
    );
    assert.equal(stage.stageId, 'kanit-toplama');
    assert.equal(stage.outcome, 'atlandi');
    assert.equal(stage.detail, 'skipped for test');
    assert.ok(typeof stage.durationMs === 'number');
  });

  it('createStageExecution — basarili outcome', () => {
    const stage = createStageExecution(
      'rapor-derleme',
      'Report Assembly',
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
          'bolum-derleme',
          'Section Assembly',
          'not-implemented',
          'placeholder'
        )
      ]
    };
    replaceStageExecution(
      context,
      createStageExecution(
        'bolum-derleme',
        'Section Assembly',
        'basarili',
        'done'
      )
    );
    assert.equal(context.stageExecutions.length, 1);
    assert.equal(context.stageExecutions[0].outcome, 'basarili');
  });

  it('mutateReportModel ve syncReportModelFromBag', () => {
    const reportModel = {
      id: 'x',
      metadata: {
        id: 'x',
        title: '',
        reportDnaId: 'dna',
        locale: 'tr',
        createdAt: '2026-07-20T22:00:00.000Z',
        version: '1.0.0'
      },
      status: 'bekliyor',
      lastStage: 'karar-dogrulama',
      executiveSummary: { headline: '', body: '', highlights: [] },
      sections: [],
      findings: [],
      recommendations: [],
      appendices: [],
      references: []
    };
    const context = {
      bag: {
        executiveSummary: {
          headline: 'Özet',
          body: 'Gövde',
          highlights: ['A']
        },
        sections: [
          {
            id: 's1',
            sectionCode: 'exec',
            kind: 'ozet',
            title: 'T',
            order: 1,
            content: {}
          }
        ],
        recommendations: [{ id: 'r1', code: 'C', title: 'T', description: 'D' }]
      }
    };
    syncReportModelFromBag(reportModel, context);
    mutateReportModel(reportModel, 'basarili', 'rapor-derleme');
    assert.equal(reportModel.executiveSummary.headline, 'Özet');
    assert.equal(reportModel.sections.length, 1);
    assert.equal(reportModel.recommendations.length, 1);
    assert.equal(reportModel.status, 'basarili');
    assert.equal(reportModel.lastStage, 'rapor-derleme');
  });

  it('buildReportExecutionTelemetry — sayaçlar ve süreler', () => {
    const context = {
      stageExecutions: [
        {
          stageId: 'karar-dogrulama',
          stageName: 'Decision Validation',
          outcome: 'basarili',
          startedAt: '2026-07-20T22:00:00.000Z',
          endedAt: '2026-07-20T22:00:01.000Z',
          durationMs: 12,
          errors: [],
          warnings: [{ code: 'W1', message: 'warn' }]
        },
        {
          stageId: 'rapor-birlestirme',
          stageName: 'Report Composition',
          outcome: 'basarisiz',
          startedAt: '2026-07-20T22:00:01.000Z',
          endedAt: '2026-07-20T22:00:02.000Z',
          durationMs: 8,
          errors: [{ code: 'E1', message: 'fail' }],
          warnings: []
        },
        {
          stageId: 'kanit-toplama',
          stageName: 'Evidence Collection',
          outcome: 'atlandi',
          startedAt: '2026-07-20T22:00:02.000Z',
          endedAt: '2026-07-20T22:00:02.000Z',
          durationMs: 0,
          errors: [],
          warnings: []
        }
      ]
    };
    const telemetry = buildReportExecutionTelemetry(
      context,
      '2026-07-20T22:00:00.000Z',
      '2026-07-20T22:00:03.000Z',
      30,
      {
        reportModelPartCount: 7,
        narrativeCount: 0,
        sectionCount: 0,
        summarySectionCount: 6
      }
    );
    assert.equal(telemetry.totalDurationMs, 30);
    assert.equal(telemetry.summary.stagesSucceeded, 1);
    assert.equal(telemetry.summary.stagesFailed, 1);
    assert.equal(telemetry.summary.stagesSkipped, 1);
    assert.equal(telemetry.summary.success, false);
    assert.equal(telemetry.summary.reportModelPartCount, 7);
    assert.equal(telemetry.summary.summarySectionCount, 6);
    assert.equal(telemetry.stageDurationsMs['rapor-birlestirme'], 8);
    assert.equal(telemetry.stageOutcomes['kanit-toplama'], 'atlandi');
  });
});
