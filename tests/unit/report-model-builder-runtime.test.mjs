/**
 * Report Model Builder Runtime — PR-104B (en az 20 unit test)
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
  createReportModelBuilderRuntime,
  createReportRegistryRuntime,
  createReportModelContext,
  createReportPipelineRuntime,
  applyReportModelBuilderToPipelineResult,
  attachReportModelToPipelineContext,
  readReportModelFromPipelineContext,
  attachReportModelToPipelineResult,
  readReportModelFromPipelineResult,
  REPORT_PART_ORDER,
  REPORT_PART_LABELS,
  PIPELINE_BAG_REPORT_MODEL_RUNTIME_RESULT_KEY
} = await import('../../src/business/report/index.ts');

function sampleDecisionResult(overrides = {}) {
  return {
    requestId: 'decision-rmb-001',
    analysisRequestId: 'analysis-rmb-001',
    datasetId: 'ds-rmb-001',
    status: 'basarili',
    lastStage: 'karar-derleme',
    summary: {
      headline: 'Karar özeti',
      highlights: ['Öneri 1', 'Aksiyon 1'],
      cautions: ['Dikkat']
    },
    recommendations: [
      {
        id: 'rec-1',
        code: 'REC_QUALITY',
        title: 'Kaliteyi artır',
        description: 'Veri kalitesini iyileştirin.',
        priorityLevel: 'yuksek',
        relatedRiskIds: ['risk-1'],
        relatedOpportunityIds: []
      },
      {
        id: 'rec-2',
        code: 'REC_MONITOR',
        title: 'İzleme ekle',
        description: 'Metrikleri izleyin.',
        priorityLevel: 'orta'
      }
    ],
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
      },
      {
        id: 'act-3',
        kind: 'izle',
        title: 'İzle',
        description: 'Sonucu izle',
        recommendationId: 'rec-2'
      }
    ],
    risks: [{ id: 'risk-1', code: 'R1', title: 'Risk', description: 'd', severity: 'orta' }],
    opportunities: [
      {
        id: 'opp-1',
        code: 'O1',
        title: 'Fırsat',
        description: 'd',
        impact: 'orta'
      }
    ],
    priorities: [
      {
        id: 'pri-1',
        level: 'yuksek',
        score: 80,
        rationale: 'önemli'
      }
    ],
    scores: [{ id: 'score-1', label: 'genel', value: 0.7 }],
    completedAt: '2026-07-20T22:30:00.000Z',
    ...overrides
  };
}

function emptyDecisionResult() {
  return sampleDecisionResult({
    recommendations: [],
    actions: [],
    risks: [],
    opportunities: [],
    priorities: [],
    scores: [],
    summary: { headline: '', highlights: [] },
    completedAt: undefined
  });
}

function sampleRequest(overrides = {}) {
  return {
    id: 'report-rmb-001',
    decisionRequestId: 'decision-rmb-001',
    reportId: 'report-dna-rmb',
    datasetId: 'ds-rmb-001',
    locale: 'tr',
    ...overrides
  };
}

function sampleReportContext(decisionResult = sampleDecisionResult()) {
  return {
    reportJobId: 'job-rmb-001',
    decisionResult,
    reportDnaId: 'report-dna-rmb',
    locale: 'tr',
    currentStage: 'bolum-derleme',
    status: 'suruyor'
  };
}

describe('ReportModelBuilderRuntime', () => {
  /** @type {ReturnType<typeof createReportModelBuilderRuntime>} */
  let builder;

  beforeEach(() => {
    builder = createReportModelBuilderRuntime();
  });

  it('seeds builtin report model parts', () => {
    assert.equal(builder.getRegistry().count(), REPORT_PART_ORDER.length);
    assert.equal(REPORT_PART_ORDER.length, 7);
    assert.equal(REPORT_PART_LABELS.metadata, 'Metadata');
    assert.equal(REPORT_PART_LABELS.recommendation, 'Recommendation Information');
  });

  it('builds empty DecisionResult model with warnings', () => {
    const result = builder.compute(createReportModelContext({}));
    assert.ok(result.model);
    assert.equal(result.model.recommendation.recommendationCount, 0);
    assert.equal(result.model.actionPlan.actionCount, 0);
    assert.ok(
      result.warnings.some((warning) => warning.code === 'EMPTY_DECISION_RESULT')
    );
    assert.equal(result.telemetry.recommendationCount, 0);
    assert.equal(result.telemetry.actionCount, 0);
  });

  it('maps a normal DecisionResult into ReportModel parts', () => {
    const decisionResult = sampleDecisionResult();
    const result = builder.compute(
      createReportModelContext({
        decisionResult,
        request: sampleRequest(),
        locale: 'tr'
      })
    );

    assert.equal(result.model.dataset.datasetId, 'ds-rmb-001');
    assert.equal(result.model.decision.requestId, 'decision-rmb-001');
    assert.equal(result.model.decision.status, 'basarili');
    assert.equal(result.model.recommendation.recommendationCount, 2);
    assert.equal(result.model.actionPlan.actionCount, 3);
    assert.equal(result.model.summary.hasHeadline, true);
  });

  it('maps recommendation fields without inventing narrative', () => {
    const result = builder.compute(
      createReportModelContext({
        decisionResult: sampleDecisionResult(),
        locale: 'tr'
      })
    );
    const item = result.model.recommendation.items[0];
    assert.equal(item.id, 'rec-1');
    assert.equal(item.code, 'REC_QUALITY');
    assert.equal(item.title, 'Kaliteyi artır');
    assert.equal(item.priorityLevel, 'yuksek');
    assert.deepEqual(item.relatedRiskIds, ['risk-1']);
    assert.equal(result.model.recommendation.priorityCounts.yuksek, 1);
    assert.equal(result.model.recommendation.priorityCounts.orta, 1);
  });

  it('maps action fields and kind distribution', () => {
    const result = builder.compute(
      createReportModelContext({
        decisionResult: sampleDecisionResult(),
        locale: 'tr'
      })
    );
    assert.equal(result.model.actionPlan.items.length, 3);
    assert.equal(result.model.actionPlan.kindCounts.incele, 1);
    assert.equal(result.model.actionPlan.kindCounts.iyilestir, 1);
    assert.equal(result.model.actionPlan.kindCounts.izle, 1);
    assert.equal(result.model.actionPlan.items[0].recommendationId, 'rec-1');
  });

  it('maps metadata from request and decision', () => {
    const result = builder.compute(
      createReportModelContext({
        decisionResult: sampleDecisionResult(),
        request: sampleRequest(),
        reportContext: sampleReportContext(),
        locale: 'en'
      })
    );
    assert.equal(result.metadata.id, 'report-rmb-001');
    assert.equal(result.metadata.reportDnaId, 'report-dna-rmb');
    assert.equal(result.metadata.locale, 'en');
    assert.equal(result.metadata.decisionRequestId, 'decision-rmb-001');
    assert.equal(result.metadata.datasetId, 'ds-rmb-001');
    assert.equal(result.metadata.analysisRequestId, 'analysis-rmb-001');
    assert.ok(result.metadata.createdAt);
    assert.ok(result.metadata.version);
  });

  it('maps dataset information', () => {
    const result = builder.compute(
      createReportModelContext({
        decisionResult: sampleDecisionResult(),
        locale: 'tr'
      })
    );
    assert.equal(result.model.dataset.present, true);
    assert.equal(result.model.dataset.datasetId, 'ds-rmb-001');
    assert.equal(result.model.dataset.analysisRequestId, 'analysis-rmb-001');
  });

  it('maps decision information counts', () => {
    const result = builder.compute(
      createReportModelContext({
        decisionResult: sampleDecisionResult(),
        locale: 'tr'
      })
    );
    assert.equal(result.model.decision.riskCount, 1);
    assert.equal(result.model.decision.opportunityCount, 1);
    assert.equal(result.model.decision.priorityCount, 1);
    assert.equal(result.model.decision.scoreCount, 1);
    assert.equal(result.model.decision.completedAt, '2026-07-20T22:30:00.000Z');
  });

  it('maps policy information from risks/opportunities/priorities', () => {
    const result = builder.compute(
      createReportModelContext({
        decisionResult: sampleDecisionResult(),
        locale: 'tr'
      })
    );
    assert.equal(result.model.policy.present, true);
    assert.equal(result.model.policy.riskCount, 1);
    assert.equal(result.model.policy.opportunityCount, 1);
    assert.equal(result.model.policy.priorityCount, 1);
  });

  it('maps summary information structurally', () => {
    const result = builder.compute(
      createReportModelContext({
        decisionResult: sampleDecisionResult(),
        locale: 'tr'
      })
    );
    assert.equal(result.model.summary.present, true);
    assert.equal(result.model.summary.headline, 'Karar özeti');
    assert.equal(result.model.summary.highlightCount, 2);
    assert.equal(result.model.summary.cautionCount, 1);
    assert.ok(result.model.summary.headlineLength > 0);
  });

  it('records telemetry for duration, mapped entities, recommendations, actions', () => {
    const result = builder.compute(
      createReportModelContext({
        decisionResult: sampleDecisionResult(),
        request: sampleRequest(),
        locale: 'tr'
      })
    );
    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.ok(result.telemetry.mappedEntityCount >= 7);
    assert.equal(result.telemetry.recommendationCount, 2);
    assert.equal(result.telemetry.actionCount, 3);
    assert.equal(result.telemetry.warningCount, result.warnings.length);
  });

  it('warns on empty decision content when recommendations and actions are empty', () => {
    const result = builder.compute(
      createReportModelContext({
        decisionResult: emptyDecisionResult(),
        locale: 'tr'
      })
    );
    assert.ok(
      result.warnings.some((warning) => warning.code === 'EMPTY_DECISION_CONTENT')
    );
    assert.equal(result.model.recommendation.present, false);
    assert.equal(result.model.actionPlan.present, false);
  });

  it('projects foundation ReportModel with empty sections', () => {
    const result = builder.compute(
      createReportModelContext({
        decisionResult: sampleDecisionResult(),
        request: sampleRequest(),
        locale: 'tr'
      })
    );
    assert.equal(result.foundationModel.sections.length, 0);
    assert.equal(result.foundationModel.findings.length, 0);
    assert.equal(result.foundationModel.executiveSummary.headline, '');
    assert.equal(result.foundationModel.recommendations.length, 2);
    assert.equal(result.foundationModel.lastStage, 'bolum-derleme');
  });

  it('supports registry extension and unregister', () => {
    const registry = createReportRegistryRuntime(false);
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
    const emptyBuilder = createReportModelBuilderRuntime(
      createReportRegistryRuntime(false)
    );
    const result = emptyBuilder.compute(
      createReportModelContext({
        decisionResult: sampleDecisionResult()
      })
    );
    assert.ok(
      result.warnings.some((warning) => warning.code === 'NO_PARTS_ENABLED')
    );
  });

  it('reads decisionResult from reportContext when not passed directly', () => {
    const result = builder.compute(
      createReportModelContext({
        reportContext: sampleReportContext(),
        request: sampleRequest(),
        locale: 'tr'
      })
    );
    assert.equal(result.model.decision.requestId, 'decision-rmb-001');
    assert.equal(result.model.recommendation.recommendationCount, 2);
  });

  it('applies builder to a valid pipeline result', async () => {
    const pipeline = createReportPipelineRuntime({
      initialContext: sampleReportContext()
    });
    const detailed = await pipeline.runWithDetails(sampleRequest());
    const modelResult = applyReportModelBuilderToPipelineResult(
      detailed,
      builder
    );

    assert.equal(modelResult.model.recommendation.recommendationCount, 2);
    assert.equal(
      detailed.context.bag[PIPELINE_BAG_REPORT_MODEL_RUNTIME_RESULT_KEY],
      modelResult
    );
    assert.ok(detailed.context.bag.reportModel);
    assert.equal(detailed.context.bag.reportModel?.recommendations.length, 2);
  });

  it('skips rich mapping when decision validation fails', async () => {
    const brokenContext = sampleReportContext(
      sampleDecisionResult({
        recommendations: /** @type {any} */ ('broken')
      })
    );
    const pipeline = createReportPipelineRuntime({
      initialContext: brokenContext
    });
    const detailed = await pipeline.runWithDetails(sampleRequest());
    const modelResult = applyReportModelBuilderToPipelineResult(
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
      createReportModelContext({
        decisionResult: sampleDecisionResult(),
        request: sampleRequest(),
        locale: 'tr'
      })
    );
    const context = {
      request: sampleRequest(),
      reportContext: sampleReportContext(),
      stageExecutions: [],
      bag: {},
      startedAt: new Date().toISOString(),
      startedMark: 0
    };

    attachReportModelToPipelineContext(context, result);
    assert.equal(
      readReportModelFromPipelineContext(context)?.model.recommendation
        .recommendationCount,
      2
    );
    assert.ok(context.bag.reportModel?.id);

    const pipelineResult = {
      reportModel: {
        id: 'x',
        metadata: {
          id: 'x',
          title: '',
          reportDnaId: 'dna',
          locale: 'tr',
          createdAt: context.startedAt,
          version: '1.0.0'
        },
        status: 'basarisiz',
        lastStage: 'rapor-derleme',
        executiveSummary: { headline: '', body: '', highlights: [] },
        sections: [],
        findings: [],
        recommendations: [],
        appendices: [],
        references: []
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

    attachReportModelToPipelineResult(pipelineResult, result);
    assert.ok(readReportModelFromPipelineResult(pipelineResult));
  });

  it('does not create narrative section content', () => {
    const result = builder.compute(
      createReportModelContext({
        decisionResult: sampleDecisionResult(),
        locale: 'tr'
      })
    );
    assert.equal(result.foundationModel.sections.length, 0);
    assert.equal(result.foundationModel.executiveSummary.body, '');
    assert.equal(result.foundationModel.appendices.length, 0);
  });

  it('handles single recommendation mapping', () => {
    const result = builder.compute(
      createReportModelContext({
        decisionResult: sampleDecisionResult({
          recommendations: [
            {
              id: 'rec-only',
              code: 'ONLY',
              title: 'Tek',
              description: 'Tek öneri',
              priorityLevel: 'kritik'
            }
          ],
          actions: []
        }),
        locale: 'tr'
      })
    );
    assert.equal(result.model.recommendation.recommendationCount, 1);
    assert.equal(result.model.recommendation.items[0].priorityLevel, 'kritik');
    assert.equal(result.telemetry.actionCount, 0);
  });
});
