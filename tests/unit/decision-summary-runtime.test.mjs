/**
 * Decision Summary Runtime — PR-103E (en az 20 unit test)
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
  createDecisionSummaryRuntime,
  createDecisionSummaryRegistryRuntime,
  createDecisionSummaryContext,
  createPolicyEngineRuntime,
  createPolicyContext,
  createRecommendationBuilderRuntime,
  createRecommendationContext,
  createActionPlanBuilderRuntime,
  createActionPlanContext,
  createDecisionPipelineRuntime,
  applyPolicyEngineToPipelineResult,
  applyRecommendationBuilderToPipelineResult,
  applyActionPlanBuilderToPipelineResult,
  applyDecisionSummaryToPipelineResult,
  attachDecisionSummaryToPipelineContext,
  readDecisionSummaryFromPipelineContext,
  attachDecisionSummaryToPipelineResult,
  readDecisionSummaryFromPipelineResult,
  DECISION_SUMMARY_SECTION_ORDER,
  DECISION_SUMMARY_SECTION_LABELS,
  PIPELINE_BAG_DECISION_SUMMARY_RUNTIME_RESULT_KEY
} = await import('../../src/business/decision/index.ts');

function sampleAnalysisResult(overrides = {}) {
  return {
    requestId: 'analysis-ds-001',
    datasetId: 'ds-ds-001',
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
    completedAt: '2026-07-20T20:00:00.000Z',
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

function sampleDecisionRequest(overrides = {}) {
  return {
    id: 'decision-ds-001',
    analysisRequestId: 'analysis-ds-001',
    datasetId: 'ds-ds-001',
    locale: 'tr',
    ...overrides
  };
}

function sampleDecisionContext(analysisResult = sampleAnalysisResult()) {
  return {
    decisionId: 'decision-ctx-ds',
    analysisResult,
    locale: 'tr',
    currentStage: 'karar-derleme',
    status: 'suruyor'
  };
}

function buildDecisionTrio(analysisResult, options = {}) {
  const policyResult = createPolicyEngineRuntime().compute(
    createPolicyContext({
      analysisResult,
      ...(options.policyIds ? { policyIds: options.policyIds } : {})
    })
  );
  const recommendationResult = createRecommendationBuilderRuntime().compute(
    createRecommendationContext({
      analysisResult,
      policyResult,
      includeSkippedInfo: options.includeSkippedInfo ?? false
    })
  );
  const actionPlanResult = createActionPlanBuilderRuntime().compute(
    createActionPlanContext({
      recommendationResult,
      includeSkippedInfo: options.includeSkippedInfo ?? false
    })
  );
  return { policyResult, recommendationResult, actionPlanResult };
}

describe('DecisionSummaryRuntime', () => {
  /** @type {ReturnType<typeof createDecisionSummaryRuntime>} */
  let runtime;

  beforeEach(() => {
    runtime = createDecisionSummaryRuntime();
  });

  it('seeds builtin decision summary sections', () => {
    assert.equal(
      runtime.getRegistry().count(),
      DECISION_SUMMARY_SECTION_ORDER.length
    );
    assert.equal(DECISION_SUMMARY_SECTION_ORDER.length, 7);
    assert.equal(
      DECISION_SUMMARY_SECTION_LABELS['policy-summary'],
      'Policy Summary'
    );
  });

  it('builds empty decision summary with warnings', () => {
    const result = runtime.compute(createDecisionSummaryContext({}));
    assert.equal(result.sections.length, 7);
    assert.ok(result.decisionSummary.headline.includes('0 öneri'));
    assert.ok(
      result.warnings.some((warning) => warning.code === 'EMPTY_DECISION_INPUTS')
    );
    assert.equal(result.telemetry.policyTotals, 0);
    assert.equal(result.telemetry.recommendationTotals, 0);
    assert.equal(result.telemetry.actionTotals, 0);
    assert.ok(result.decisionSummary.cautions?.includes('EMPTY_DECISION_INPUTS'));
  });

  it('summarizes policy results', () => {
    const { policyResult } = buildDecisionTrio(dirtyAnalysisResult());
    const result = runtime.compute(
      createDecisionSummaryContext({ policyResult, locale: 'tr' })
    );
    const policySection = result.sections.find(
      (section) => section.id === 'policy-summary'
    );
    assert.ok(policySection);
    assert.equal(
      policySection.metrics.evaluatedCount,
      policyResult.summary.evaluatedCount
    );
    assert.equal(
      policySection.metrics.triggeredCount,
      policyResult.summary.triggeredCount
    );
    assert.equal(result.telemetry.policyTotals, policyResult.summary.evaluatedCount);
  });

  it('summarizes a single recommendation', () => {
    const policyResult = createPolicyEngineRuntime().compute(
      createPolicyContext({
        analysisResult: dirtyAnalysisResult(),
        policyIds: ['critical-finding-present']
      })
    );
    const recommendationResult = createRecommendationBuilderRuntime().compute(
      createRecommendationContext({
        analysisResult: dirtyAnalysisResult(),
        policyResult,
        includeSkippedInfo: false
      })
    );
    assert.equal(recommendationResult.summary.recommendationCount, 1);

    const result = runtime.compute(
      createDecisionSummaryContext({
        recommendationResult,
        locale: 'tr'
      })
    );
    const recommendationSection = result.sections.find(
      (section) => section.id === 'recommendation-summary'
    );
    assert.equal(recommendationSection?.metrics.recommendationCount, 1);
    assert.equal(result.telemetry.recommendationTotals, 1);
    assert.ok(result.decisionSummary.headline.includes('1 öneri'));
  });

  it('summarizes multiple recommendations', () => {
    const { recommendationResult } = buildDecisionTrio(dirtyAnalysisResult());
    assert.ok(recommendationResult.summary.recommendationCount >= 2);

    const result = runtime.compute(
      createDecisionSummaryContext({
        recommendationResult,
        locale: 'tr'
      })
    );
    const recommendationSection = result.sections.find(
      (section) => section.id === 'recommendation-summary'
    );
    assert.equal(
      recommendationSection?.metrics.recommendationCount,
      recommendationResult.summary.recommendationCount
    );
    assert.equal(
      result.telemetry.recommendationTotals,
      recommendationResult.summary.recommendationCount
    );
  });

  it('summarizes action plan results', () => {
    const { recommendationResult, actionPlanResult } = buildDecisionTrio(
      dirtyAnalysisResult()
    );
    assert.ok(actionPlanResult.summary.actionPlanCount >= 1);

    const result = runtime.compute(
      createDecisionSummaryContext({
        recommendationResult,
        actionPlanResult,
        locale: 'tr'
      })
    );
    const actionSection = result.sections.find(
      (section) => section.id === 'action-plan-summary'
    );
    assert.equal(
      actionSection?.metrics.actionPlanCount,
      actionPlanResult.summary.actionPlanCount
    );
    assert.equal(
      actionSection?.metrics.stepCount,
      actionPlanResult.summary.stepCount
    );
    assert.equal(
      result.telemetry.actionTotals,
      actionPlanResult.summary.stepCount
    );
  });

  it('computes severity distribution from recommendations', () => {
    const { recommendationResult } = buildDecisionTrio(dirtyAnalysisResult());
    const result = runtime.compute(
      createDecisionSummaryContext({
        recommendationResult,
        locale: 'tr'
      })
    );
    const severitySection = result.sections.find(
      (section) => section.id === 'severity-distribution'
    );
    assert.ok(severitySection);
    for (const key of ['INFO', 'WARNING', 'ERROR', 'CRITICAL']) {
      assert.equal(
        severitySection.metrics[key],
        recommendationResult.summary.severityCounts[key] ?? 0
      );
    }
  });

  it('computes priority distribution from recommendations and action plans', () => {
    const { recommendationResult, actionPlanResult } = buildDecisionTrio(
      dirtyAnalysisResult()
    );
    const result = runtime.compute(
      createDecisionSummaryContext({
        recommendationResult,
        actionPlanResult,
        locale: 'tr'
      })
    );
    const prioritySection = result.sections.find(
      (section) => section.id === 'priority-distribution'
    );
    assert.ok(prioritySection);
    assert.ok(
      Number(prioritySection.metrics.kritik) +
        Number(prioritySection.metrics.yuksek) +
        Number(prioritySection.metrics.orta) +
        Number(prioritySection.metrics.dusuk) >=
        actionPlanResult.summary.actionPlanCount
    );
  });

  it('records telemetry for duration, section count and totals', () => {
    const trio = buildDecisionTrio(dirtyAnalysisResult());
    const result = runtime.compute(
      createDecisionSummaryContext({
        ...trio,
        decisionContext: sampleDecisionContext(dirtyAnalysisResult()),
        request: sampleDecisionRequest(),
        locale: 'tr'
      })
    );

    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.equal(result.telemetry.sectionCount, 7);
    assert.ok(result.telemetry.policyTotals > 0);
    assert.ok(result.telemetry.recommendationTotals > 0);
    assert.ok(result.telemetry.actionTotals > 0);
    assert.equal(result.telemetry.warningCount, result.warnings.length);
  });

  it('builds decision metadata section from context', () => {
    const result = runtime.compute(
      createDecisionSummaryContext({
        decisionContext: sampleDecisionContext(),
        request: sampleDecisionRequest(),
        locale: 'tr'
      })
    );
    const metadataSection = result.sections.find(
      (section) => section.id === 'decision-metadata'
    );
    assert.equal(metadataSection?.metrics.decisionId, 'decision-ctx-ds');
    assert.equal(metadataSection?.metrics.requestId, 'decision-ds-001');
    assert.equal(metadataSection?.metrics.datasetId, 'ds-ds-001');
    assert.equal(metadataSection?.metrics.locale, 'tr');
  });

  it('builds execution summary section', () => {
    const trio = buildDecisionTrio(dirtyAnalysisResult());
    const result = runtime.compute(
      createDecisionSummaryContext({ ...trio, locale: 'tr' })
    );
    const executionSection = result.sections.find(
      (section) => section.id === 'execution-summary'
    );
    assert.equal(executionSection?.metrics.sectionsBuilt, 7);
    assert.ok(Number(executionSection?.metrics.policyDurationMs) >= 0);
    assert.ok(Number(executionSection?.metrics.recommendationDurationMs) >= 0);
    assert.ok(Number(executionSection?.metrics.actionPlanDurationMs) >= 0);
  });

  it('adds critical caution when CRITICAL recommendations exist', () => {
    const { recommendationResult } = buildDecisionTrio(dirtyAnalysisResult());
    const result = runtime.compute(
      createDecisionSummaryContext({
        recommendationResult,
        locale: 'tr'
      })
    );
    if ((recommendationResult.summary.severityCounts.CRITICAL ?? 0) > 0) {
      assert.ok(
        result.decisionSummary.cautions?.includes(
          'CRITICAL_RECOMMENDATIONS_PRESENT'
        )
      );
    }
  });

  it('sets sourceStages metadata from available runtime results', () => {
    const trio = buildDecisionTrio(dirtyAnalysisResult());
    const result = runtime.compute(
      createDecisionSummaryContext({
        ...trio,
        decisionContext: sampleDecisionContext(dirtyAnalysisResult()),
        locale: 'tr'
      })
    );
    assert.deepEqual(result.metadata.sourceStages, [
      'risk-degerlendirme',
      'oneri-olusturma',
      'oncelik-hesaplama'
    ]);
  });

  it('exposes DecisionSummaryResult record sections and metadata', () => {
    const trio = buildDecisionTrio(dirtyAnalysisResult());
    const result = runtime.compute(
      createDecisionSummaryContext({
        ...trio,
        decisionContext: sampleDecisionContext(dirtyAnalysisResult()),
        locale: 'tr'
      })
    );
    assert.equal(result.record.sections.length, 7);
    assert.equal(
      result.record.decisionSummary.headline,
      result.decisionSummary.headline
    );
    assert.ok(result.metadata.generatedAt);
    assert.equal(result.metadata.locale, 'tr');
  });

  it('supports registry extension and unregister', () => {
    const registry = createDecisionSummaryRegistryRuntime(false);
    assert.equal(registry.count(), 0);
    registry.register({
      id: 'decision-metadata',
      title: 'Custom Metadata',
      order: 1,
      enabled: true
    });
    assert.equal(registry.count(), 1);
    assert.ok(registry.getById('decision-metadata'));
    assert.equal(registry.unregister('decision-metadata'), true);
    assert.equal(registry.count(), 0);
  });

  it('warns when no sections are enabled', () => {
    const registry = createDecisionSummaryRegistryRuntime(false);
    const emptyRuntime = createDecisionSummaryRuntime(registry);
    const result = emptyRuntime.compute(createDecisionSummaryContext({}));
    assert.equal(result.sections.length, 0);
    assert.ok(
      result.warnings.some((warning) => warning.code === 'NO_SECTIONS_ENABLED')
    );
  });

  it('produces objective highlights without narrative advice', () => {
    const trio = buildDecisionTrio(dirtyAnalysisResult());
    const result = runtime.compute(
      createDecisionSummaryContext({ ...trio, locale: 'tr' })
    );
    assert.ok(result.decisionSummary.highlights.length >= 1);
    for (const highlight of result.decisionSummary.highlights) {
      assert.ok(typeof highlight === 'string');
      assert.ok(highlight.includes(':'));
    }
  });

  it('applies decision summary to a valid pipeline result', async () => {
    const pipeline = createDecisionPipelineRuntime({
      initialContext: sampleDecisionContext(dirtyAnalysisResult())
    });
    const detailed = await pipeline.runWithDetails(sampleDecisionRequest());
    applyPolicyEngineToPipelineResult(detailed);
    applyRecommendationBuilderToPipelineResult(detailed);
    applyActionPlanBuilderToPipelineResult(detailed);
    const summaryResult = applyDecisionSummaryToPipelineResult(
      detailed,
      runtime
    );

    assert.equal(summaryResult.sections.length, 7);
    assert.ok(summaryResult.decisionSummary.headline);
    assert.equal(
      detailed.context.bag[PIPELINE_BAG_DECISION_SUMMARY_RUNTIME_RESULT_KEY],
      summaryResult
    );
    assert.equal(
      detailed.decisionResult.summary.headline,
      summaryResult.decisionSummary.headline
    );
    assert.ok(detailed.context.bag.summary?.headline);
  });

  it('skips rich inputs when analysis validation fails', async () => {
    const brokenContext = sampleDecisionContext(
      sampleAnalysisResult({
        datasetId: '',
        status: 'basarisiz',
        kpiResults: /** @type {any} */ ('broken')
      })
    );
    const pipeline = createDecisionPipelineRuntime({
      initialContext: brokenContext
    });
    const detailed = await pipeline.runWithDetails(sampleDecisionRequest());
    applyPolicyEngineToPipelineResult(detailed);
    applyRecommendationBuilderToPipelineResult(detailed);
    applyActionPlanBuilderToPipelineResult(detailed);
    const summaryResult = applyDecisionSummaryToPipelineResult(
      detailed,
      runtime
    );

    assert.ok(
      summaryResult.warnings.some(
        (warning) => warning.code === 'VALIDATION_NOT_PASSED'
      )
    );
    assert.ok(summaryResult.decisionSummary.headline);
  });

  it('supports attach/read bag bridge helpers', () => {
    const trio = buildDecisionTrio(sampleAnalysisResult());
    const result = runtime.compute(
      createDecisionSummaryContext({
        ...trio,
        decisionContext: sampleDecisionContext(),
        request: sampleDecisionRequest(),
        locale: 'tr'
      })
    );
    const context = {
      request: sampleDecisionRequest(),
      decisionContext: sampleDecisionContext(),
      stageExecutions: [],
      bag: {},
      startedAt: new Date().toISOString(),
      startedMark: 0
    };

    attachDecisionSummaryToPipelineContext(context, result);
    assert.equal(
      readDecisionSummaryFromPipelineContext(context)?.sections.length,
      7
    );
    assert.ok(context.bag.summary?.headline);

    const pipelineResult = {
      decisionResult: {
        requestId: 'x',
        analysisRequestId: 'a',
        datasetId: 'ds',
        status: 'basarisiz',
        lastStage: 'karar-derleme',
        summary: { headline: '', highlights: [] },
        recommendations: [],
        actions: [],
        risks: [],
        opportunities: [],
        priorities: [],
        scores: []
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

    attachDecisionSummaryToPipelineResult(pipelineResult, result);
    assert.ok(readDecisionSummaryFromPipelineResult(pipelineResult));
  });

  it('handles empty recommendation and action plan counts as zeros', () => {
    const { policyResult, recommendationResult, actionPlanResult } =
      buildDecisionTrio(sampleAnalysisResult());
    assert.equal(recommendationResult.summary.recommendationCount, 0);
    assert.equal(actionPlanResult.summary.actionPlanCount, 0);

    const result = runtime.compute(
      createDecisionSummaryContext({
        policyResult,
        recommendationResult,
        actionPlanResult,
        locale: 'tr'
      })
    );

    assert.equal(
      result.sections.find((section) => section.id === 'recommendation-summary')
        ?.metrics.recommendationCount,
      0
    );
    assert.equal(
      result.sections.find((section) => section.id === 'action-plan-summary')
        ?.metrics.actionPlanCount,
      0
    );
    assert.equal(result.telemetry.recommendationTotals, 0);
    assert.equal(result.telemetry.actionTotals, 0);
  });
});
