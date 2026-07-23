/**
 * End-to-End Report Runtime — PR-104F (en az 15 entegrasyon testi)
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
  createReportRuntimeFacade,
  createReportExecutionContext,
  REPORT_SUMMARY_SECTION_ORDER,
  REPORT_SECTION_ORDER,
  REPORT_PART_ORDER,
  PIPELINE_BAG_REPORT_MODEL_RUNTIME_RESULT_KEY,
  PIPELINE_BAG_NARRATIVE_RUNTIME_RESULT_KEY,
  PIPELINE_BAG_REPORT_SECTION_RUNTIME_RESULT_KEY,
  PIPELINE_BAG_REPORT_SUMMARY_RUNTIME_RESULT_KEY
} = await import('../../src/business/report/index.ts');

function sampleDecisionResult(overrides = {}) {
  return {
    requestId: 'decision-e2e-001',
    analysisRequestId: 'analysis-e2e-001',
    datasetId: 'ds-e2e-001',
    status: 'basarili',
    lastStage: 'karar-derleme',
    summary: {
      headline: 'Karar tamamlandı',
      highlights: ['Öneri var'],
      cautions: ['Dikkat']
    },
    recommendations: [
      {
        id: 'rec-1',
        code: 'REC_A',
        title: 'Kaliteyi artır',
        description: 'Veri kalitesini iyileştirin.',
        priorityLevel: 'yuksek'
      }
    ],
    actions: [
      {
        id: 'act-1',
        kind: 'incele',
        title: 'İncele',
        description: 'Öneriyi incele',
        recommendationId: 'rec-1'
      }
    ],
    risks: [
      { id: 'r1', code: 'R', title: 'Risk', description: 'd', severity: 'orta' }
    ],
    opportunities: [],
    priorities: [],
    scores: [],
    completedAt: '2026-07-20T22:00:00.000Z',
    ...overrides
  };
}

function emptyDecisionResult() {
  return {
    requestId: 'decision-empty-001',
    analysisRequestId: 'analysis-empty-001',
    datasetId: 'ds-empty-001',
    status: 'basarili',
    lastStage: 'karar-derleme',
    summary: { headline: 'Boş karar', highlights: [] },
    recommendations: [],
    actions: [],
    risks: [],
    opportunities: [],
    priorities: [],
    scores: []
  };
}

function invalidDecisionResult() {
  return sampleDecisionResult({
    datasetId: '',
    status: 'basarisiz',
    recommendations: /** @type {any} */ ('broken')
  });
}

function sampleRequest(overrides = {}) {
  return {
    id: 'report-e2e-1',
    decisionRequestId: 'decision-e2e-001',
    reportId: 'report-dna-e2e',
    datasetId: 'ds-e2e-001',
    locale: 'tr',
    ...overrides
  };
}

function outcomeOf(result, stageId) {
  return result.stageExecutions.find((s) => s.stageId === stageId)?.outcome;
}

describe('ReportRuntimeFacade — integration', () => {
  /** @type {ReturnType<typeof createReportRuntimeFacade>} */
  let facade;

  beforeEach(() => {
    facade = createReportRuntimeFacade();
  });

  it('normal akış — uçtan uca başarılı', async () => {
    const result = await facade.execute(
      createReportExecutionContext({
        request: sampleRequest(),
        decisionResult: sampleDecisionResult()
      })
    );
    assert.equal(result.reportModel.status, 'basarili');
    assert.ok(result.reportModelResult);
    assert.ok(result.narrativeResult);
    assert.ok(result.reportSectionResult);
    assert.ok(result.reportSummaryResult);
    assert.equal(outcomeOf(result, 'karar-dogrulama'), 'basarili');
    assert.equal(outcomeOf(result, 'rapor-birlestirme'), 'basarili');
    assert.equal(outcomeOf(result, 'bolum-derleme'), 'basarili');
    assert.equal(outcomeOf(result, 'kanit-toplama'), 'atlandi');
    assert.equal(outcomeOf(result, 'rapor-inceleme'), 'atlandi');
    assert.equal(outcomeOf(result, 'rapor-derleme'), 'basarili');
  });

  it('validation fail — Model/Narrative/Section atlanır', async () => {
    const result = await facade.execute(
      createReportExecutionContext({
        request: sampleRequest(),
        decisionResult: invalidDecisionResult()
      })
    );
    assert.equal(result.reportModel.status, 'basarisiz');
    assert.equal(outcomeOf(result, 'karar-dogrulama'), 'basarisiz');
    assert.equal(outcomeOf(result, 'bolum-derleme'), 'atlandi');
    assert.equal(outcomeOf(result, 'kanit-toplama'), 'atlandi');
    assert.equal(outcomeOf(result, 'rapor-birlestirme'), 'atlandi');
    assert.equal(outcomeOf(result, 'rapor-inceleme'), 'atlandi');
    assert.equal(result.reportModelResult, undefined);
    assert.equal(result.narrativeResult, undefined);
    assert.equal(result.reportSectionResult, undefined);
  });

  it('validation fail — Report Summary yine de üretilir', async () => {
    const result = await facade.execute(
      createReportExecutionContext({
        request: sampleRequest(),
        decisionResult: invalidDecisionResult()
      })
    );
    assert.ok(result.reportSummaryResult);
    assert.equal(
      result.reportSummaryResult.sections.length,
      REPORT_SUMMARY_SECTION_ORDER.length
    );
    assert.ok(result.reportSummaryResult.reportSummary.headline);
    assert.equal(outcomeOf(result, 'rapor-derleme'), 'basarili');
  });

  it('boş DecisionResult — geçerli ReportModel döner', async () => {
    const result = await facade.execute(
      createReportExecutionContext({
        request: sampleRequest({
          decisionRequestId: 'decision-empty-001',
          datasetId: 'ds-empty-001'
        }),
        decisionResult: emptyDecisionResult()
      })
    );
    assert.ok(result.reportModel);
    assert.equal(result.reportModel.id, 'report-e2e-1');
    assert.ok(result.reportModel.executiveSummary);
    assert.ok(Array.isArray(result.reportModel.sections));
    assert.ok(Array.isArray(result.reportModel.recommendations));
    assert.ok(result.reportSummaryResult);
  });

  it('ReportModel oluşturuldu', async () => {
    const result = await facade.execute(
      createReportExecutionContext({
        request: sampleRequest(),
        decisionResult: sampleDecisionResult()
      })
    );
    assert.ok(result.reportModelResult);
    assert.ok(result.reportModelResult.model.metadata.id);
    assert.equal(
      result.telemetry.summary.reportModelPartCount,
      REPORT_PART_ORDER.length
    );
  });

  it('Narrative oluşturuldu', async () => {
    const result = await facade.execute(
      createReportExecutionContext({
        request: sampleRequest(),
        decisionResult: sampleDecisionResult()
      })
    );
    assert.ok(result.narrativeResult);
    assert.ok(result.narrativeResult.narratives.length >= 1);
    assert.ok(result.reportModel.executiveSummary.headline.length >= 0);
    assert.ok(result.telemetry.summary.narrativeCount >= 1);
  });

  it('Section oluşturuldu', async () => {
    const result = await facade.execute(
      createReportExecutionContext({
        request: sampleRequest(),
        decisionResult: sampleDecisionResult()
      })
    );
    assert.ok(result.reportSectionResult);
    assert.equal(
      result.reportSectionResult.sections.length,
      REPORT_SECTION_ORDER.length
    );
    assert.equal(
      result.reportModel.sections.length,
      REPORT_SECTION_ORDER.length
    );
    assert.equal(
      result.telemetry.summary.sectionCount,
      REPORT_SECTION_ORDER.length
    );
  });

  it('Summary oluşturuldu', async () => {
    const result = await facade.execute(
      createReportExecutionContext({
        request: sampleRequest(),
        decisionResult: sampleDecisionResult()
      })
    );
    assert.ok(result.reportSummaryResult);
    assert.equal(
      result.reportSummaryResult.sections.length,
      REPORT_SUMMARY_SECTION_ORDER.length
    );
    assert.ok(result.reportSummaryResult.reportSummary.headline.includes('bölüm'));
    assert.equal(
      result.telemetry.summary.summarySectionCount,
      REPORT_SUMMARY_SECTION_ORDER.length
    );
  });

  it('telemetry doğrulaması — süre ve stage sayaçları', async () => {
    const result = await facade.execute(
      createReportExecutionContext({
        request: sampleRequest(),
        decisionResult: sampleDecisionResult()
      })
    );
    assert.ok(result.telemetry.totalDurationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.ok(result.telemetry.summary.stagesSucceeded >= 1);
    assert.ok(result.telemetry.summary.stagesSkipped >= 1);
    assert.equal(
      result.telemetry.summary.reportModelPartCount,
      REPORT_PART_ORDER.length
    );
    assert.ok(result.telemetry.summary.narrativeCount >= 1);
    assert.equal(
      result.telemetry.summary.sectionCount,
      REPORT_SECTION_ORDER.length
    );
    assert.ok(result.telemetry.stageDurationsMs['rapor-birlestirme'] >= 0);
    assert.equal(result.telemetry.stageOutcomes['kanit-toplama'], 'atlandi');
  });

  it('facade.run — yalnızca ReportModel döner', async () => {
    const reportModel = await facade.run(sampleRequest(), {
      decisionResult: sampleDecisionResult()
    });
    assert.equal(reportModel.id, 'report-e2e-1');
    assert.ok(reportModel.executiveSummary);
    assert.equal(reportModel.status, 'basarili');
    assert.equal(reportModel.lastStage, 'rapor-derleme');
  });

  it('pipeline bag anahtarları doldurulur', async () => {
    const result = await facade.execute(
      createReportExecutionContext({
        request: sampleRequest(),
        decisionResult: sampleDecisionResult()
      })
    );
    const bag = result.pipelineContext.bag;
    assert.ok(bag[PIPELINE_BAG_REPORT_MODEL_RUNTIME_RESULT_KEY]);
    assert.ok(bag[PIPELINE_BAG_NARRATIVE_RUNTIME_RESULT_KEY]);
    assert.ok(bag[PIPELINE_BAG_REPORT_SECTION_RUNTIME_RESULT_KEY]);
    assert.ok(bag[PIPELINE_BAG_REPORT_SUMMARY_RUNTIME_RESULT_KEY]);
    assert.ok(bag.executiveSummary);
    assert.ok(Array.isArray(bag.sections));
    assert.ok(bag.reportSummary?.headline);
  });

  it('reportContext ile yürütme', async () => {
    const result = await facade.execute(
      createReportExecutionContext({
        request: sampleRequest(),
        reportContext: {
          reportJobId: 'ctx-e2e',
          decisionResult: sampleDecisionResult(),
          reportDnaId: 'report-dna-e2e',
          locale: 'tr',
          currentStage: 'karar-dogrulama',
          status: 'bekliyor'
        }
      })
    );
    assert.equal(result.pipelineContext.reportContext.reportJobId, 'ctx-e2e');
    assert.ok(result.reportSummaryResult);
  });

  it('validation fail telemetry — atlanan stage sayısı', async () => {
    const result = await facade.execute(
      createReportExecutionContext({
        request: sampleRequest(),
        decisionResult: invalidDecisionResult()
      })
    );
    assert.ok(result.telemetry.summary.stagesFailed >= 1);
    assert.ok(result.telemetry.summary.stagesSkipped >= 4);
    assert.equal(result.telemetry.summary.reportModelPartCount, 0);
    assert.equal(result.telemetry.summary.narrativeCount, 0);
    assert.equal(result.telemetry.summary.sectionCount, 0);
    assert.equal(
      result.telemetry.summary.summarySectionCount,
      REPORT_SUMMARY_SECTION_ORDER.length
    );
  });

  it('her koşulda geçerli ReportModel şeması', async () => {
    for (const decisionResult of [
      sampleDecisionResult(),
      emptyDecisionResult(),
      invalidDecisionResult()
    ]) {
      const result = await facade.execute(
        createReportExecutionContext({
          request: sampleRequest({
            decisionRequestId: decisionResult.requestId || 'decision-e2e-001',
            datasetId: decisionResult.datasetId || 'ds-e2e-001'
          }),
          decisionResult
        })
      );
      const rm = result.reportModel;
      assert.ok(typeof rm.id === 'string');
      assert.ok(rm.metadata && typeof rm.metadata.id === 'string');
      assert.ok(['basarili', 'basarisiz'].includes(rm.status));
      assert.ok(rm.executiveSummary && typeof rm.executiveSummary.headline === 'string');
      assert.ok(Array.isArray(rm.sections));
      assert.ok(Array.isArray(rm.findings));
      assert.ok(Array.isArray(rm.recommendations));
      assert.ok(Array.isArray(rm.appendices));
      assert.ok(Array.isArray(rm.references));
    }
  });

  it('başarılı stage sayısı ve pipeline özeti', async () => {
    const result = await facade.execute(
      createReportExecutionContext({
        request: sampleRequest(),
        decisionResult: sampleDecisionResult()
      })
    );
    assert.equal(result.telemetry.summary.stagesExecuted, 6);
    assert.ok(result.telemetry.summary.stagesSucceeded >= 4);
    assert.equal(result.telemetry.summary.stagesSkipped, 2);
    assert.equal(result.telemetry.summary.stagesNotImplemented, 0);
    assert.equal(result.telemetry.summary.success, true);
  });

  it('initialBag mevcut bag mimarisine merge edilir', async () => {
    const result = await facade.execute(
      createReportExecutionContext({
        request: sampleRequest(),
        decisionResult: sampleDecisionResult(),
        initialBag: { customFlag: true }
      })
    );
    assert.equal(result.pipelineContext.bag.customFlag, true);
    assert.ok(result.pipelineContext.bag.decisionValidation);
  });
});
