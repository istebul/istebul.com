/**
 * Narrative Composer Runtime — PR-104C (en az 20 unit test)
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
  createNarrativeComposerRuntime,
  createNarrativeRegistryRuntime,
  createNarrativeContext,
  createReportModelBuilderRuntime,
  createReportModelContext,
  createReportPipelineRuntime,
  applyReportModelBuilderToPipelineResult,
  applyNarrativeComposerToPipelineResult,
  attachNarrativeToPipelineContext,
  readNarrativeFromPipelineContext,
  attachNarrativeToPipelineResult,
  readNarrativeFromPipelineResult,
  NARRATIVE_KIND_ORDER,
  NARRATIVE_KIND_LABELS,
  BUILTIN_NARRATIVE_TEMPLATE_COUNT,
  getBuiltinNarrativeTemplate,
  getBuiltinNarrativeTemplateByKind,
  PIPELINE_BAG_NARRATIVE_RUNTIME_RESULT_KEY
} = await import('../../src/business/report/index.ts');

function sampleDecisionResult(overrides = {}) {
  return {
    requestId: 'decision-nar-001',
    analysisRequestId: 'analysis-nar-001',
    datasetId: 'ds-nar-001',
    status: 'basarili',
    lastStage: 'karar-derleme',
    summary: {
      headline: 'Karar tamamlandı',
      highlights: ['Öneri var'],
      cautions: []
    },
    recommendations: [
      {
        id: 'rec-1',
        code: 'REC_A',
        title: 'Kaliteyi artır',
        description: 'Veri kalitesini iyileştirin.',
        priorityLevel: 'yuksek'
      },
      {
        id: 'rec-2',
        code: 'REC_B',
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
        description: 'Uygula',
        recommendationId: 'rec-1'
      }
    ],
    risks: [{ id: 'r1', code: 'R', title: 'Risk', description: 'd', severity: 'orta' }],
    opportunities: [],
    priorities: [],
    scores: [],
    completedAt: '2026-07-20T23:00:00.000Z',
    ...overrides
  };
}

function sampleRequest(overrides = {}) {
  return {
    id: 'report-nar-001',
    decisionRequestId: 'decision-nar-001',
    reportId: 'report-dna-nar',
    datasetId: 'ds-nar-001',
    locale: 'tr',
    ...overrides
  };
}

function sampleReportContext(decisionResult = sampleDecisionResult()) {
  return {
    reportJobId: 'job-nar-001',
    decisionResult,
    reportDnaId: 'report-dna-nar',
    locale: 'tr',
    currentStage: 'rapor-birlestirme',
    status: 'suruyor'
  };
}

function buildReportModel(decisionOverrides = {}) {
  return createReportModelBuilderRuntime().compute(
    createReportModelContext({
      decisionResult: sampleDecisionResult(decisionOverrides),
      request: sampleRequest(),
      locale: 'tr'
    })
  );
}

describe('NarrativeComposerRuntime', () => {
  /** @type {ReturnType<typeof createNarrativeComposerRuntime>} */
  let composer;

  beforeEach(() => {
    composer = createNarrativeComposerRuntime();
  });

  it('seeds builtin narrative templates', () => {
    assert.equal(
      composer.getRegistry().count(),
      BUILTIN_NARRATIVE_TEMPLATE_COUNT
    );
    assert.equal(BUILTIN_NARRATIVE_TEMPLATE_COUNT, 5);
    assert.equal(NARRATIVE_KIND_ORDER.length, 5);
    assert.equal(
      NARRATIVE_KIND_LABELS['executive-summary'],
      'Executive Summary'
    );
    assert.ok(getBuiltinNarrativeTemplate('narrative-executive-summary'));
    assert.ok(getBuiltinNarrativeTemplateByKind('dataset-overview'));
  });

  it('builds narratives for empty ReportModel with warnings', () => {
    const result = composer.compute(createNarrativeContext({}));
    assert.equal(result.narratives.length, 5);
    assert.ok(
      result.warnings.some((warning) => warning.code === 'EMPTY_REPORT_MODEL')
    );
    assert.ok(result.narratives[0].body.includes('0 öneri'));
    assert.equal(result.telemetry.narrativeCount, 5);
  });

  it('composes executive summary from ReportModel', () => {
    const modelResult = buildReportModel();
    const result = composer.compute(
      createNarrativeContext({
        reportModelResult: modelResult,
        reportModel: modelResult.model,
        locale: 'tr'
      })
    );
    const executive = result.narratives.find(
      (item) => item.kind === 'executive-summary'
    );
    assert.ok(executive);
    assert.ok(executive.body.includes('2 öneri'));
    assert.ok(executive.body.includes('2 aksiyon'));
    assert.ok(executive.body.includes('ds-nar-001'));
  });

  it('composes recommendation overview for a single recommendation', () => {
    const modelResult = buildReportModel({
      recommendations: [
        {
          id: 'rec-only',
          code: 'ONLY',
          title: 'Tek öneri',
          description: 'Tek',
          priorityLevel: 'kritik'
        }
      ],
      actions: []
    });
    const result = composer.compute(
      createNarrativeContext({
        reportModel: modelResult.model,
        locale: 'tr'
      })
    );
    const recommendation = result.narratives.find(
      (item) => item.kind === 'recommendation-overview'
    );
    assert.ok(recommendation);
    assert.ok(recommendation.body.includes('1 öneri'));
    assert.ok(recommendation.body.includes('Tek öneri'));
    assert.ok(recommendation.body.includes('kritik: 1'));
  });

  it('composes recommendation overview for multiple recommendations', () => {
    const modelResult = buildReportModel();
    const result = composer.compute(
      createNarrativeContext({
        reportModel: modelResult.model,
        locale: 'tr'
      })
    );
    const recommendation = result.narratives.find(
      (item) => item.kind === 'recommendation-overview'
    );
    assert.ok(recommendation.body.includes('2 öneri'));
    assert.ok(recommendation.body.includes('Kaliteyi artır'));
    assert.ok(recommendation.body.includes('İzleme ekle'));
  });

  it('composes policy overview from risk/opportunity/priority counts', () => {
    const modelResult = buildReportModel();
    const result = composer.compute(
      createNarrativeContext({
        reportModel: modelResult.model,
        locale: 'tr'
      })
    );
    const policy = result.narratives.find(
      (item) => item.kind === 'policy-overview'
    );
    assert.ok(policy);
    assert.ok(policy.body.includes('1 risk'));
    assert.ok(policy.highlights.some((item) => item.includes('Risk: 1')));
  });

  it('composes action plan overview', () => {
    const modelResult = buildReportModel();
    const result = composer.compute(
      createNarrativeContext({
        reportModel: modelResult.model,
        locale: 'tr'
      })
    );
    const actionPlan = result.narratives.find(
      (item) => item.kind === 'action-plan-overview'
    );
    assert.ok(actionPlan);
    assert.ok(actionPlan.body.includes('2 aksiyon'));
    assert.ok(actionPlan.body.includes('incele: 1'));
    assert.ok(actionPlan.body.includes('iyileştir: 1'));
  });

  it('composes dataset overview', () => {
    const modelResult = buildReportModel();
    const result = composer.compute(
      createNarrativeContext({
        reportModel: modelResult.model,
        locale: 'tr'
      })
    );
    const dataset = result.narratives.find(
      (item) => item.kind === 'dataset-overview'
    );
    assert.ok(dataset);
    assert.ok(dataset.body.includes('ds-nar-001'));
    assert.ok(dataset.body.includes('analysis-nar-001'));
  });

  it('selects templates by narrativeKinds filter', () => {
    const modelResult = buildReportModel();
    const result = composer.compute(
      createNarrativeContext({
        reportModel: modelResult.model,
        narrativeKinds: ['executive-summary', 'dataset-overview'],
        locale: 'tr'
      })
    );
    assert.equal(result.narratives.length, 2);
    assert.deepEqual(
      result.narratives.map((item) => item.kind).sort(),
      ['dataset-overview', 'executive-summary']
    );
  });

  it('records metadata with template ids and report model id', () => {
    const modelResult = buildReportModel();
    const result = composer.compute(
      createNarrativeContext({
        reportModel: modelResult.model,
        locale: 'tr'
      })
    );
    assert.equal(result.metadata.reportModelId, modelResult.model.metadata.id);
    assert.equal(result.metadata.locale, 'tr');
    assert.ok(result.metadata.generatedAt);
    assert.equal(result.metadata.templateIds.length, 5);
    assert.ok(
      result.metadata.templateIds.includes('narrative-executive-summary')
    );
  });

  it('records telemetry for duration, narrative count, and template usage', () => {
    const modelResult = buildReportModel();
    const result = composer.compute(
      createNarrativeContext({
        reportModel: modelResult.model,
        locale: 'tr'
      })
    );
    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.equal(result.telemetry.narrativeCount, 5);
    assert.equal(
      result.telemetry.templateUsage['narrative-executive-summary'],
      1
    );
    assert.equal(result.telemetry.kindDistribution['policy-overview'], 1);
    assert.equal(result.telemetry.warningCount, result.warnings.length);
  });

  it('supports registry extension and unregister', () => {
    const registry = createNarrativeRegistryRuntime(false);
    assert.equal(registry.count(), 0);
    registry.register({
      id: 'custom-exec',
      kind: 'executive-summary',
      title: 'Custom',
      bodyTemplate: 'Custom {{recommendationCount}}',
      highlightTemplates: [],
      locale: 'tr',
      order: 1,
      enabled: true
    });
    assert.equal(registry.count(), 1);
    assert.ok(registry.getById('custom-exec'));
    assert.equal(registry.getByKind('executive-summary').length, 1);
    assert.equal(registry.unregister('custom-exec'), true);
    assert.equal(registry.count(), 0);
  });

  it('warns when no templates are enabled', () => {
    const emptyComposer = createNarrativeComposerRuntime(
      createNarrativeRegistryRuntime(false)
    );
    const result = emptyComposer.compute(
      createNarrativeContext({
        reportModel: buildReportModel().model
      })
    );
    assert.equal(result.narratives.length, 0);
    assert.ok(
      result.warnings.some((warning) => warning.code === 'NO_TEMPLATES_ENABLED')
    );
  });

  it('fills placeholders without inventing new analysis', () => {
    const modelResult = buildReportModel();
    const result = composer.compute(
      createNarrativeContext({
        reportModel: modelResult.model,
        locale: 'tr'
      })
    );
    for (const narrative of result.narratives) {
      assert.equal(narrative.body.includes('{{'), false);
      assert.equal(narrative.highlights.some((h) => h.includes('{{')), false);
    }
  });

  it('uses reportModelResult.model when reportModel is omitted', () => {
    const modelResult = buildReportModel();
    const result = composer.compute(
      createNarrativeContext({
        reportModelResult: modelResult,
        locale: 'tr'
      })
    );
    assert.equal(result.narratives.length, 5);
    assert.equal(result.metadata.reportModelId, modelResult.model.metadata.id);
  });

  it('applies narrative composer to a valid pipeline result', async () => {
    const pipeline = createReportPipelineRuntime({
      initialContext: sampleReportContext()
    });
    const detailed = await pipeline.runWithDetails(sampleRequest());
    applyReportModelBuilderToPipelineResult(detailed);
    const narrativeResult = applyNarrativeComposerToPipelineResult(
      detailed,
      composer
    );

    assert.equal(narrativeResult.narratives.length, 5);
    assert.equal(
      detailed.context.bag[PIPELINE_BAG_NARRATIVE_RUNTIME_RESULT_KEY],
      narrativeResult
    );
    assert.ok(detailed.context.bag.executiveSummary?.body);
    assert.equal(
      detailed.reportModel.executiveSummary.body,
      narrativeResult.narratives.find((n) => n.kind === 'executive-summary')
        ?.body
    );
  });

  it('skips rich model when decision validation fails', async () => {
    const brokenContext = sampleReportContext(
      sampleDecisionResult({
        recommendations: /** @type {any} */ ('broken')
      })
    );
    const pipeline = createReportPipelineRuntime({
      initialContext: brokenContext
    });
    const detailed = await pipeline.runWithDetails(sampleRequest());
    applyReportModelBuilderToPipelineResult(detailed);
    const narrativeResult = applyNarrativeComposerToPipelineResult(
      detailed,
      composer
    );

    assert.ok(
      narrativeResult.warnings.some(
        (warning) => warning.code === 'VALIDATION_NOT_PASSED'
      )
    );
    assert.ok(narrativeResult.narratives.length >= 1);
  });

  it('warns when ReportModelResult is missing on pipeline bag', async () => {
    const pipeline = createReportPipelineRuntime({
      initialContext: sampleReportContext()
    });
    const detailed = await pipeline.runWithDetails(sampleRequest());
    const narrativeResult = applyNarrativeComposerToPipelineResult(
      detailed,
      composer
    );
    assert.ok(
      narrativeResult.warnings.some(
        (warning) => warning.code === 'REPORT_MODEL_RESULT_MISSING'
      )
    );
  });

  it('supports attach/read bag bridge helpers', () => {
    const modelResult = buildReportModel();
    const result = composer.compute(
      createNarrativeContext({
        reportModel: modelResult.model,
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

    attachNarrativeToPipelineContext(context, result);
    assert.equal(
      readNarrativeFromPipelineContext(context)?.narratives.length,
      5
    );
    assert.ok(context.bag.executiveSummary?.body);

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

    attachNarrativeToPipelineResult(pipelineResult, result);
    assert.ok(readNarrativeFromPipelineResult(pipelineResult));
  });

  it('keeps narrative order aligned with NARRATIVE_KIND_ORDER', () => {
    const result = composer.compute(
      createNarrativeContext({
        reportModel: buildReportModel().model,
        locale: 'tr'
      })
    );
    assert.deepEqual(
      result.narratives.map((item) => item.kind),
      [...NARRATIVE_KIND_ORDER]
    );
  });

  it('records templateId on each narrative record', () => {
    const result = composer.compute(
      createNarrativeContext({
        reportModel: buildReportModel().model,
        locale: 'tr'
      })
    );
    for (const narrative of result.narratives) {
      assert.ok(narrative.templateId.startsWith('narrative-'));
      assert.ok(narrative.id.includes(narrative.templateId));
    }
  });
});
