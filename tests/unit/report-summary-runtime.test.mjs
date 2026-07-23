/**
 * Report Summary Runtime — PR-104E (en az 20 unit test)
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
  createReportSummaryRuntime,
  createReportSummaryRegistryRuntime,
  createReportSummaryContext,
  createReportModelBuilderRuntime,
  createReportModelContext,
  createNarrativeComposerRuntime,
  createNarrativeContext,
  createReportSectionBuilderRuntime,
  createReportSectionContext,
  createReportPipelineRuntime,
  applyReportModelBuilderToPipelineResult,
  applyNarrativeComposerToPipelineResult,
  applyReportSectionBuilderToPipelineResult,
  applyReportSummaryToPipelineResult,
  attachReportSummaryToPipelineContext,
  readReportSummaryFromPipelineContext,
  attachReportSummaryToPipelineResult,
  readReportSummaryFromPipelineResult,
  REPORT_SUMMARY_SECTION_ORDER,
  REPORT_SUMMARY_SECTION_LABELS,
  PIPELINE_BAG_REPORT_SUMMARY_RUNTIME_RESULT_KEY
} = await import('../../src/business/report/index.ts');

function sampleDecisionResult(overrides = {}) {
  return {
    requestId: 'decision-sum-001',
    analysisRequestId: 'analysis-sum-001',
    datasetId: 'ds-sum-001',
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
      },
      {
        id: 'rec-2',
        code: 'REC_B',
        title: 'İzle',
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
        kind: 'uygula',
        title: 'Uygula',
        description: 'Aksiyonu uygula',
        recommendationId: 'rec-2'
      }
    ],
    risks: [
      { id: 'r1', code: 'R', title: 'Risk', description: 'd', severity: 'orta' }
    ],
    opportunities: [],
    priorities: [],
    scores: [],
    completedAt: '2026-07-20T23:45:00.000Z',
    ...overrides
  };
}

function sampleRequest(overrides = {}) {
  return {
    id: 'report-sum-001',
    decisionRequestId: 'decision-sum-001',
    reportId: 'report-dna-sum',
    datasetId: 'ds-sum-001',
    locale: 'tr',
    ...overrides
  };
}

function sampleReportContext(decisionResult = sampleDecisionResult()) {
  return {
    reportJobId: 'job-sum-001',
    decisionResult,
    reportDnaId: 'report-dna-sum',
    locale: 'tr',
    currentStage: 'rapor-birlestirme',
    status: 'suruyor'
  };
}

function buildFullChain(decisionOverrides = {}) {
  const modelResult = createReportModelBuilderRuntime().compute(
    createReportModelContext({
      decisionResult: sampleDecisionResult(decisionOverrides),
      request: sampleRequest(),
      locale: 'tr'
    })
  );
  const narrativeResult = createNarrativeComposerRuntime().compute(
    createNarrativeContext({
      reportModel: modelResult.model,
      reportModelResult: modelResult,
      locale: 'tr'
    })
  );
  const reportSectionResult = createReportSectionBuilderRuntime().compute(
    createReportSectionContext({
      reportModel: modelResult.model,
      reportModelResult: modelResult,
      narrativeResult,
      locale: 'tr'
    })
  );
  return { modelResult, narrativeResult, reportSectionResult };
}

describe('ReportSummaryRuntime', () => {
  /** @type {ReturnType<typeof createReportSummaryRuntime>} */
  let runtime;

  beforeEach(() => {
    runtime = createReportSummaryRuntime();
  });

  it('seeds builtin report summary sections', () => {
    assert.equal(
      runtime.getRegistry().count(),
      REPORT_SUMMARY_SECTION_ORDER.length
    );
    assert.equal(REPORT_SUMMARY_SECTION_ORDER.length, 6);
    assert.equal(
      REPORT_SUMMARY_SECTION_LABELS['section-summary'],
      'Section Summary'
    );
  });

  it('builds empty report summary with warnings', () => {
    const result = runtime.compute(createReportSummaryContext({}));
    assert.equal(result.sections.length, 6);
    assert.ok(result.reportSummary.headline.includes('0 bölüm'));
    assert.ok(
      result.warnings.some((warning) => warning.code === 'EMPTY_REPORT_INPUTS')
    );
    assert.equal(result.telemetry.sectionCount, 0);
    assert.equal(result.telemetry.narrativeCount, 0);
    assert.equal(result.telemetry.recommendationTotals, 0);
    assert.equal(result.telemetry.actionTotals, 0);
    assert.ok(result.reportSummary.cautions?.includes('EMPTY_REPORT_INPUTS'));
  });

  it('summarizes report metadata from ReportModel', () => {
    const { modelResult } = buildFullChain();
    const result = runtime.compute(
      createReportSummaryContext({
        reportModel: modelResult.model,
        locale: 'tr'
      })
    );
    const meta = result.sections.find((s) => s.id === 'report-metadata');
    assert.ok(meta);
    assert.equal(meta.metrics.reportModelId, modelResult.model.metadata.id);
    assert.equal(meta.metrics.present, true);
    assert.equal(result.metadata.reportModelId, modelResult.model.metadata.id);
  });

  it('summarizes a single section set', () => {
    const modelResult = createReportModelBuilderRuntime().compute(
      createReportModelContext({
        decisionResult: sampleDecisionResult({
          recommendations: [
            {
              id: 'rec-only',
              code: 'REC_ONE',
              title: 'Tek',
              description: 'Tek öneri',
              priorityLevel: 'dusuk'
            }
          ],
          actions: []
        }),
        request: sampleRequest(),
        locale: 'tr'
      })
    );
    const narrativeResult = createNarrativeComposerRuntime().compute(
      createNarrativeContext({
        reportModel: modelResult.model,
        reportModelResult: modelResult,
        locale: 'tr'
      })
    );
    const reportSectionResult = createReportSectionBuilderRuntime().compute(
      createReportSectionContext({
        reportModel: modelResult.model,
        narrativeResult,
        sectionIds: ['executive-summary'],
        locale: 'tr'
      })
    );

    const result = runtime.compute(
      createReportSummaryContext({
        reportModel: modelResult.model,
        narrativeResult,
        reportSectionResult,
        locale: 'tr'
      })
    );

    const sectionSummary = result.sections.find(
      (s) => s.id === 'section-summary'
    );
    assert.ok(sectionSummary);
    assert.equal(sectionSummary.metrics.sectionCount, 1);
    assert.equal(result.telemetry.sectionCount, 1);
    assert.equal(result.reportSummary.counts.sectionCount, 1);
  });

  it('summarizes full section set', () => {
    const chain = buildFullChain();
    const result = runtime.compute(
      createReportSummaryContext({
        reportModel: chain.modelResult.model,
        reportModelResult: chain.modelResult,
        narrativeResult: chain.narrativeResult,
        reportSectionResult: chain.reportSectionResult,
        locale: 'tr'
      })
    );

    const sectionSummary = result.sections.find(
      (s) => s.id === 'section-summary'
    );
    assert.ok(sectionSummary);
    assert.equal(sectionSummary.metrics.sectionCount, 7);
    assert.equal(result.telemetry.sectionCount, 7);
  });

  it('summarizes narrative counts', () => {
    const chain = buildFullChain();
    const result = runtime.compute(
      createReportSummaryContext({
        reportModel: chain.modelResult.model,
        narrativeResult: chain.narrativeResult,
        reportSectionResult: chain.reportSectionResult,
        locale: 'tr'
      })
    );

    const narrativeSummary = result.sections.find(
      (s) => s.id === 'narrative-summary'
    );
    assert.ok(narrativeSummary);
    assert.equal(
      narrativeSummary.metrics.narrativeCount,
      chain.narrativeResult.narratives.length
    );
    assert.equal(
      result.telemetry.narrativeCount,
      chain.narrativeResult.narratives.length
    );
  });

  it('summarizes recommendation totals', () => {
    const chain = buildFullChain();
    const result = runtime.compute(
      createReportSummaryContext({
        reportModel: chain.modelResult.model,
        narrativeResult: chain.narrativeResult,
        reportSectionResult: chain.reportSectionResult,
        locale: 'tr'
      })
    );

    const rec = result.sections.find((s) => s.id === 'recommendation-summary');
    assert.ok(rec);
    assert.equal(rec.metrics.recommendationCount, 2);
    assert.equal(result.telemetry.recommendationTotals, 2);
    assert.equal(result.reportSummary.counts.recommendationCount, 2);
  });

  it('summarizes action plan totals', () => {
    const chain = buildFullChain();
    const result = runtime.compute(
      createReportSummaryContext({
        reportModel: chain.modelResult.model,
        narrativeResult: chain.narrativeResult,
        reportSectionResult: chain.reportSectionResult,
        locale: 'tr'
      })
    );

    const action = result.sections.find((s) => s.id === 'action-plan-summary');
    assert.ok(action);
    assert.equal(action.metrics.actionCount, 2);
    assert.equal(result.telemetry.actionTotals, 2);
    assert.equal(result.reportSummary.counts.actionCount, 2);
  });

  it('includes execution summary with prior durations', () => {
    const chain = buildFullChain();
    const result = runtime.compute(
      createReportSummaryContext({
        reportModel: chain.modelResult.model,
        reportModelResult: chain.modelResult,
        narrativeResult: chain.narrativeResult,
        reportSectionResult: chain.reportSectionResult,
        locale: 'tr'
      })
    );

    const execution = result.sections.find((s) => s.id === 'execution-summary');
    assert.ok(execution);
    assert.equal(execution.metrics.sectionsBuilt, 6);
    assert.equal(
      typeof execution.metrics.modelDurationMs === 'number',
      true
    );
  });

  it('uses deterministic section order', () => {
    const chain = buildFullChain();
    const result = runtime.compute(
      createReportSummaryContext({
        reportModel: chain.modelResult.model,
        narrativeResult: chain.narrativeResult,
        reportSectionResult: chain.reportSectionResult,
        locale: 'tr'
      })
    );

    assert.deepEqual(
      result.sections.map((s) => s.id),
      [...REPORT_SUMMARY_SECTION_ORDER]
    );
    result.sections.forEach((s, index) => {
      assert.equal(s.order, index + 1);
    });
  });

  it('exposes metadata with source stages', () => {
    const chain = buildFullChain();
    const result = runtime.compute(
      createReportSummaryContext({
        reportModel: chain.modelResult.model,
        narrativeResult: chain.narrativeResult,
        reportSectionResult: chain.reportSectionResult,
        request: sampleRequest(),
        locale: 'tr'
      })
    );

    assert.ok(result.metadata.generatedAt);
    assert.equal(result.metadata.locale, 'tr');
    assert.ok(result.metadata.sourceStages.includes('rapor-model'));
    assert.ok(result.metadata.sourceStages.includes('narrative'));
    assert.ok(result.metadata.sourceStages.includes('bolum-derleme'));
    assert.equal(result.metadata.datasetId, 'ds-sum-001');
  });

  it('records telemetry duration and warning count', () => {
    const result = runtime.compute(createReportSummaryContext({}));
    assert.ok(typeof result.telemetry.durationMs === 'number');
    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.ok(result.telemetry.warningCount >= 1);
  });

  it('builds reportSummary record consistently', () => {
    const chain = buildFullChain();
    const result = runtime.compute(
      createReportSummaryContext({
        reportModel: chain.modelResult.model,
        narrativeResult: chain.narrativeResult,
        reportSectionResult: chain.reportSectionResult,
        locale: 'tr'
      })
    );

    assert.equal(result.record.reportSummary, result.reportSummary);
    assert.equal(result.record.sections, result.sections);
    assert.equal(result.record.metadata, result.metadata);
    assert.ok(result.reportSummary.highlights.length >= 1);
  });

  it('warns when registry has no enabled sections', () => {
    const emptyRegistry = createReportSummaryRegistryRuntime(false);
    const emptyRuntime = createReportSummaryRuntime(emptyRegistry);
    const result = emptyRuntime.compute(createReportSummaryContext({}));
    assert.equal(result.sections.length, 0);
    assert.ok(
      result.warnings.some((w) => w.code === 'NO_SECTIONS_ENABLED')
    );
  });

  it('registry register/unregister/getById works', () => {
    const registry = createReportSummaryRegistryRuntime(false);
    registry.register({
      id: 'report-metadata',
      title: 'Meta',
      order: 1,
      enabled: true
    });
    assert.equal(registry.count(), 1);
    assert.equal(registry.getById('report-metadata')?.title, 'Meta');
    assert.equal(registry.unregister('report-metadata'), true);
    assert.equal(registry.count(), 0);
  });

  it('registry rejects duplicate registration', () => {
    const registry = createReportSummaryRegistryRuntime(true);
    assert.throws(() => {
      registry.register({
        id: 'report-metadata',
        title: 'Dup',
        order: 99,
        enabled: true
      });
    });
  });

  it('adds cautions for missing recommendations and actions', () => {
    const modelResult = createReportModelBuilderRuntime().compute(
      createReportModelContext({
        decisionResult: sampleDecisionResult({
          recommendations: [],
          actions: []
        }),
        request: sampleRequest(),
        locale: 'tr'
      })
    );
    const result = runtime.compute(
      createReportSummaryContext({
        reportModel: modelResult.model,
        locale: 'tr'
      })
    );
    assert.ok(result.reportSummary.cautions?.includes('NO_RECOMMENDATIONS'));
    assert.ok(result.reportSummary.cautions?.includes('NO_ACTIONS'));
  });

  it('applies summary through pipeline bag bridge', async () => {
    const pipeline = createReportPipelineRuntime({
      initialContext: sampleReportContext()
    });
    const detailed = await pipeline.runWithDetails(sampleRequest());
    applyReportModelBuilderToPipelineResult(detailed);
    applyNarrativeComposerToPipelineResult(detailed);
    applyReportSectionBuilderToPipelineResult(detailed);
    const summaryResult = applyReportSummaryToPipelineResult(detailed, runtime);

    assert.equal(summaryResult.sections.length, 6);
    assert.equal(
      detailed.context.bag[PIPELINE_BAG_REPORT_SUMMARY_RUNTIME_RESULT_KEY],
      summaryResult
    );
    assert.ok(detailed.context.bag.reportSummary?.headline);
    assert.equal(summaryResult.telemetry.recommendationTotals, 2);
  });

  it('skips rich inputs when decision validation fails', async () => {
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
    applyNarrativeComposerToPipelineResult(detailed);
    applyReportSectionBuilderToPipelineResult(detailed);
    const summaryResult = applyReportSummaryToPipelineResult(detailed, runtime);

    assert.ok(
      summaryResult.warnings.some(
        (warning) => warning.code === 'VALIDATION_NOT_PASSED'
      )
    );
    assert.ok(summaryResult.reportSummary.headline);
  });

  it('supports attach/read bag bridge helpers', () => {
    const chain = buildFullChain();
    const result = runtime.compute(
      createReportSummaryContext({
        reportModel: chain.modelResult.model,
        narrativeResult: chain.narrativeResult,
        reportSectionResult: chain.reportSectionResult,
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

    attachReportSummaryToPipelineContext(context, result);
    assert.equal(
      readReportSummaryFromPipelineContext(context)?.sections.length,
      6
    );
    assert.ok(context.bag.reportSummary?.headline);

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
      },
      summary: {
        stagesExecuted: 0,
        stagesSucceeded: 0,
        stagesNotImplemented: 0,
        stagesFailed: 0,
        stagesSkipped: 0,
        success: false,
        warningCount: 0,
        errorCount: 0
      },
      success: false,
      issues: []
    };

    attachReportSummaryToPipelineResult(pipelineResult, result);
    assert.equal(
      readReportSummaryFromPipelineResult(pipelineResult)?.telemetry
        .sectionCount,
      7
    );
  });

  it('defaults locale via createReportSummaryContext', () => {
    const ctx = createReportSummaryContext({});
    assert.equal(ctx.locale, 'tr');
  });

  it('clears registry', () => {
    const registry = createReportSummaryRegistryRuntime(true);
    assert.ok(registry.count() > 0);
    registry.clear();
    assert.equal(registry.count(), 0);
    assert.equal(registry.getEnabled().length, 0);
  });
});
