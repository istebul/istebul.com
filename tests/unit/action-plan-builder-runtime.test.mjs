/**
 * Action Plan Builder Runtime — PR-103D (en az 20 unit test)
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
  createActionPlanBuilderRuntime,
  createActionPlanRegistryRuntime,
  createActionPlanContext,
  createRecommendationBuilderRuntime,
  createRecommendationContext,
  createPolicyEngineRuntime,
  createPolicyContext,
  createDecisionPipelineRuntime,
  applyPolicyEngineToPipelineResult,
  applyRecommendationBuilderToPipelineResult,
  applyActionPlanBuilderToPipelineResult,
  attachActionPlanToPipelineContext,
  readActionPlanFromPipelineContext,
  attachActionPlanToPipelineResult,
  readActionPlanFromPipelineResult,
  BUILTIN_ACTION_PLAN_DEFINITION_COUNT,
  getBuiltinActionPlanDefinition,
  getBuiltinActionPlanDefinitionByRecommendationId,
  PIPELINE_BAG_ACTION_PLAN_RUNTIME_RESULT_KEY
} = await import('../../src/business/decision/index.ts');

function sampleAnalysisResult(overrides = {}) {
  return {
    requestId: 'analysis-ap-001',
    datasetId: 'ds-ap-001',
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
    completedAt: '2026-07-20T19:00:00.000Z',
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
    id: 'decision-ap-001',
    analysisRequestId: 'analysis-ap-001',
    datasetId: 'ds-ap-001',
    locale: 'tr',
    ...overrides
  };
}

function sampleDecisionContext(analysisResult = sampleAnalysisResult()) {
  return {
    decisionId: 'decision-ctx-ap',
    analysisResult,
    locale: 'tr',
    currentStage: 'oneri-olusturma',
    status: 'suruyor'
  };
}

function recommendationFor(analysisResult, options = {}) {
  const policyResult = createPolicyEngineRuntime().compute(
    createPolicyContext({ analysisResult })
  );
  return createRecommendationBuilderRuntime().compute(
    createRecommendationContext({
      analysisResult,
      policyResult,
      includeSkippedInfo: options.includeSkippedInfo ?? false
    })
  );
}

describe('ActionPlanBuilderRuntime', () => {
  /** @type {ReturnType<typeof createActionPlanBuilderRuntime>} */
  let builder;

  beforeEach(() => {
    builder = createActionPlanBuilderRuntime();
  });

  it('seeds builtin action plan definitions', () => {
    assert.equal(
      builder.getRegistry().count(),
      BUILTIN_ACTION_PLAN_DEFINITION_COUNT
    );
    assert.equal(BUILTIN_ACTION_PLAN_DEFINITION_COUNT, 5);
    assert.ok(getBuiltinActionPlanDefinition('plan-critical-finding-present'));
    assert.ok(
      getBuiltinActionPlanDefinitionByRecommendationId(
        'rec-minimum-data-quality-score'
      )
    );
  });

  it('creates an action plan for a single recommendation', () => {
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

    const result = builder.compute(
      createActionPlanContext({
        recommendationResult,
        includeSkippedInfo: false
      })
    );

    assert.equal(result.summary.actionPlanCount, 1);
    assert.ok(result.summary.stepCount >= 1);
    assert.equal(result.actionPlans[0].sourceRecommendation, recommendationResult.records[0].id);
    assert.ok(result.actionPlans[0].steps.length >= 2);
  });

  it('creates multiple action plans for multiple recommendations', () => {
    const recommendationResult = recommendationFor(dirtyAnalysisResult());
    assert.ok(recommendationResult.summary.recommendationCount >= 2);

    const result = builder.compute(
      createActionPlanContext({
        recommendationResult,
        includeSkippedInfo: false
      })
    );

    assert.equal(
      result.summary.actionPlanCount,
      recommendationResult.summary.recommendationCount
    );
    assert.ok(result.actions.length >= result.summary.actionPlanCount);
  });

  it('creates no action plans for empty recommendation list', () => {
    const recommendationResult = recommendationFor(sampleAnalysisResult());
    assert.equal(recommendationResult.summary.recommendationCount, 0);

    const result = builder.compute(
      createActionPlanContext({
        recommendationResult,
        includeSkippedInfo: false
      })
    );

    assert.equal(result.summary.actionPlanCount, 0);
    assert.equal(result.summary.stepCount, 0);
    assert.equal(result.summary.success, true);
    assert.equal(result.actions.length, 0);
  });

  it('maps priority from action plan definition', () => {
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

    const result = builder.compute(
      createActionPlanContext({
        recommendationResult,
        includeSkippedInfo: false
      })
    );

    assert.equal(result.actionPlans[0].priority, 'kritik');
    assert.ok(result.summary.priorityCounts.kritik >= 1);
  });

  it('includes metadata with impact and effort', () => {
    const recommendationResult = recommendationFor(dirtyAnalysisResult());
    const result = builder.compute(
      createActionPlanContext({
        recommendationResult,
        includeSkippedInfo: false
      })
    );

    const plan = result.actionPlans[0];
    assert.ok(typeof plan.estimatedImpact === 'number');
    assert.ok(typeof plan.estimatedEffort === 'number');
    assert.equal(plan.metadata.stepCount, plan.steps.length);
    assert.ok(plan.metadata.recommendationCode);
  });

  it('records telemetry for duration, plan count, step count, priority distribution', () => {
    const recommendationResult = recommendationFor(dirtyAnalysisResult());
    const result = builder.compute(
      createActionPlanContext({
        recommendationResult,
        includeSkippedInfo: false
      })
    );

    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.ok(result.telemetry.actionPlanCount > 0);
    assert.ok(result.telemetry.stepCount > 0);
    assert.ok(Object.keys(result.telemetry.priorityDistribution).length > 0);
  });

  it('warns when RecommendationResult is missing', () => {
    const result = builder.compute(createActionPlanContext({}));
    assert.equal(result.summary.success, false);
    assert.ok(
      result.warnings.some(
        (warning) => warning.code === 'RECOMMENDATION_RESULT_MISSING'
      )
    );
  });

  it('creates optional informational plans for skipped recommendations', () => {
    const policyResult = createPolicyEngineRuntime().compute(
      createPolicyContext({
        analysisResult: sampleAnalysisResult(),
        policyIds: ['does-not-exist', 'critical-finding-present']
      })
    );
    const recommendationResult = createRecommendationBuilderRuntime().compute(
      createRecommendationContext({
        analysisResult: sampleAnalysisResult(),
        policyResult,
        includeSkippedInfo: true
      })
    );
    assert.ok(recommendationResult.summary.informationalCount >= 1);

    const result = builder.compute(
      createActionPlanContext({
        recommendationResult,
        includeSkippedInfo: true
      })
    );

    assert.ok(result.summary.informationalCount >= 1);
    assert.ok(result.records.some((record) => record.informational === true));
  });

  it('omits informational plans when includeSkippedInfo is false', () => {
    const policyResult = createPolicyEngineRuntime().compute(
      createPolicyContext({
        analysisResult: sampleAnalysisResult(),
        policyIds: ['does-not-exist']
      })
    );
    const recommendationResult = createRecommendationBuilderRuntime().compute(
      createRecommendationContext({
        analysisResult: sampleAnalysisResult(),
        policyResult,
        includeSkippedInfo: true
      })
    );

    const result = builder.compute(
      createActionPlanContext({
        recommendationResult,
        includeSkippedInfo: false
      })
    );

    assert.equal(result.summary.informationalCount, 0);
  });

  it('projects foundation DecisionAction from steps', () => {
    const recommendationResult = recommendationFor(dirtyAnalysisResult());
    const result = builder.compute(
      createActionPlanContext({
        recommendationResult,
        includeSkippedInfo: false
      })
    );

    assert.ok(result.actions.length > 0);
    for (const action of result.actions) {
      assert.ok(action.id);
      assert.ok(action.kind);
      assert.ok(action.title);
      assert.ok(action.recommendationId);
    }
  });

  it('supports registry extension and unregister', () => {
    const registry = createActionPlanRegistryRuntime(false);
    assert.equal(registry.count(), 0);
    registry.register({
      id: 'plan-custom',
      code: 'PLAN_CUSTOM',
      title: 'Custom Plan',
      description: 'Custom',
      defaultPriority: 'dusuk',
      estimatedImpact: 10,
      estimatedEffort: 10,
      stepTemplates: [
        {
          order: 1,
          title: 'Adım',
          description: 'Açıklama',
          kind: 'incele'
        }
      ],
      sourceRecommendationId: 'rec-custom',
      order: 99,
      enabled: true
    });
    assert.equal(registry.count(), 1);
    assert.ok(registry.getBySourceRecommendationId('rec-custom'));
    assert.equal(registry.unregister('plan-custom'), true);
    assert.equal(registry.count(), 0);
  });

  it('rejects duplicate action plan registration', () => {
    const registry = createActionPlanRegistryRuntime(true);
    assert.throws(
      () =>
        registry.register(
          getBuiltinActionPlanDefinition('plan-minimum-dataset-size')
        ),
      /zaten kayıtlı/
    );
  });

  it('ActionPlanResult exposes actionPlans list and summary', () => {
    const recommendationResult = recommendationFor(dirtyAnalysisResult());
    const result = builder.compute(
      createActionPlanContext({
        recommendationResult,
        includeSkippedInfo: false
      })
    );
    assert.ok(Array.isArray(result.actionPlans));
    assert.equal(result.actionPlans.length, result.summary.actionPlanCount);
    assert.ok(result.summary.priorityCounts);
  });

  it('applyActionPlanBuilderToPipelineResult after recommendation', async () => {
    const pipeline = createDecisionPipelineRuntime({
      initialContext: sampleDecisionContext(dirtyAnalysisResult())
    });
    const detailed = await pipeline.runWithDetails(sampleDecisionRequest());
    applyPolicyEngineToPipelineResult(detailed);
    applyRecommendationBuilderToPipelineResult(detailed);
    const planResult = applyActionPlanBuilderToPipelineResult(detailed, builder);

    assert.ok(planResult.summary.actionPlanCount > 0);
    assert.ok(
      detailed.context.bag[PIPELINE_BAG_ACTION_PLAN_RUNTIME_RESULT_KEY]
    );
    assert.ok((detailed.context.bag.actions?.length ?? 0) > 0);
    assert.equal(
      detailed.decisionResult.actions.length,
      planResult.actions.length
    );
  });

  it('skips Action Plan Builder when validation failed', async () => {
    const pipeline = createDecisionPipelineRuntime({
      initialContext: sampleDecisionContext(
        sampleAnalysisResult({
          kpiResults: /** @type {any} */ ('broken')
        })
      )
    });
    const detailed = await pipeline.runWithDetails(sampleDecisionRequest());
    const planResult = applyActionPlanBuilderToPipelineResult(detailed, builder);

    assert.equal(planResult.summary.success, false);
    assert.ok(
      planResult.warnings.some(
        (warning) => warning.code === 'VALIDATION_NOT_PASSED'
      )
    );
  });

  it('skips when RecommendationResult missing in bag', async () => {
    const pipeline = createDecisionPipelineRuntime({
      initialContext: sampleDecisionContext()
    });
    const detailed = await pipeline.runWithDetails(sampleDecisionRequest());
    const planResult = applyActionPlanBuilderToPipelineResult(detailed, builder);

    assert.ok(
      planResult.warnings.some(
        (warning) => warning.code === 'RECOMMENDATION_RESULT_MISSING'
      )
    );
  });

  it('attach/read helpers round-trip', async () => {
    const pipeline = createDecisionPipelineRuntime({
      initialContext: sampleDecisionContext(dirtyAnalysisResult())
    });
    const detailed = await pipeline.runWithDetails(sampleDecisionRequest());
    applyPolicyEngineToPipelineResult(detailed);
    applyRecommendationBuilderToPipelineResult(detailed);

    const computed = builder.compute(
      createActionPlanContext({
        recommendationResult: recommendationFor(dirtyAnalysisResult()),
        includeSkippedInfo: false
      })
    );
    attachActionPlanToPipelineContext(
      /** @type {any} */ (detailed.context),
      computed
    );
    assert.equal(
      readActionPlanFromPipelineContext(
        /** @type {any} */ (detailed.context)
      )?.summary.actionPlanCount,
      computed.summary.actionPlanCount
    );
    attachActionPlanToPipelineResult(detailed, computed);
    assert.equal(
      readActionPlanFromPipelineResult(detailed)?.telemetry.stepCount,
      computed.telemetry.stepCount
    );
  });

  it('uses registry title for known source recommendations', () => {
    const policyResult = createPolicyEngineRuntime().compute(
      createPolicyContext({
        analysisResult: dirtyAnalysisResult(),
        policyIds: ['minimum-data-quality-score']
      })
    );
    const recommendationResult = createRecommendationBuilderRuntime().compute(
      createRecommendationContext({
        analysisResult: dirtyAnalysisResult(),
        policyResult,
        includeSkippedInfo: false
      })
    );
    const result = builder.compute(
      createActionPlanContext({
        recommendationResult,
        includeSkippedInfo: false
      })
    );
    assert.equal(result.actionPlans[0].title, 'Data Quality Improvement Plan');
  });

  it('step kinds are valid DecisionActionKind values', () => {
    const recommendationResult = recommendationFor(dirtyAnalysisResult());
    const result = builder.compute(
      createActionPlanContext({
        recommendationResult,
        includeSkippedInfo: false
      })
    );
    const kinds = new Set(
      result.actionPlans.flatMap((plan) => plan.steps.map((step) => step.kind))
    );
    for (const kind of kinds) {
      assert.ok(
        ['incele', 'onayla', 'durdur', 'iyilestir', 'eskalasyon', 'izle'].includes(
          kind
        )
      );
    }
  });

  it('step count equals sum of plan steps for non-informational plans', () => {
    const recommendationResult = recommendationFor(dirtyAnalysisResult());
    const result = builder.compute(
      createActionPlanContext({
        recommendationResult,
        includeSkippedInfo: false
      })
    );
    const expected = result.actionPlans.reduce(
      (sum, plan) => sum + plan.steps.length,
      0
    );
    assert.equal(result.summary.stepCount, expected);
    assert.equal(result.telemetry.stepCount, expected);
  });
});
