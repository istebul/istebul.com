/**
 * Recommendation Builder Runtime — PR-103C (en az 20 unit test)
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
  createRecommendationBuilderRuntime,
  createRecommendationRegistryRuntime,
  createRecommendationContext,
  createPolicyEngineRuntime,
  createPolicyContext,
  createDecisionPipelineRuntime,
  applyPolicyEngineToPipelineResult,
  applyRecommendationBuilderToPipelineResult,
  attachRecommendationToPipelineContext,
  readRecommendationFromPipelineContext,
  attachRecommendationToPipelineResult,
  readRecommendationFromPipelineResult,
  BUILTIN_RECOMMENDATION_DEFINITION_COUNT,
  getBuiltinRecommendationDefinition,
  getBuiltinRecommendationDefinitionByPolicyId,
  RECOMMENDATION_CATEGORY_LABELS,
  RECOMMENDATION_SEVERITY_RANK,
  PIPELINE_BAG_RECOMMENDATION_RUNTIME_RESULT_KEY
} = await import('../../src/business/decision/index.ts');

function sampleAnalysisResult(overrides = {}) {
  return {
    requestId: 'analysis-rec-001',
    datasetId: 'ds-rec-001',
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
    completedAt: '2026-07-20T18:00:00.000Z',
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
    id: 'decision-rec-001',
    analysisRequestId: 'analysis-rec-001',
    datasetId: 'ds-rec-001',
    locale: 'tr',
    ...overrides
  };
}

function sampleDecisionContext(analysisResult = sampleAnalysisResult()) {
  return {
    decisionId: 'decision-ctx-rec',
    analysisResult,
    locale: 'tr',
    currentStage: 'oneri-olusturma',
    status: 'suruyor'
  };
}

function policyFor(analysisResult) {
  const policyEngine = createPolicyEngineRuntime();
  return policyEngine.compute(
    createPolicyContext({ analysisResult })
  );
}

describe('RecommendationBuilderRuntime', () => {
  /** @type {ReturnType<typeof createRecommendationBuilderRuntime>} */
  let builder;

  beforeEach(() => {
    builder = createRecommendationBuilderRuntime();
  });

  it('seeds builtin recommendation definitions', () => {
    assert.equal(
      builder.getRegistry().count(),
      BUILTIN_RECOMMENDATION_DEFINITION_COUNT
    );
    assert.equal(BUILTIN_RECOMMENDATION_DEFINITION_COUNT, 5);
    assert.ok(getBuiltinRecommendationDefinition('rec-critical-finding-present'));
    assert.ok(
      getBuiltinRecommendationDefinitionByPolicyId('minimum-data-quality-score')
    );
    assert.equal(RECOMMENDATION_SEVERITY_RANK.CRITICAL, 4);
    assert.equal(RECOMMENDATION_CATEGORY_LABELS.analysis, 'Analysis');
  });

  it('creates recommendations from triggered policies', () => {
    const policyResult = policyFor(dirtyAnalysisResult());
    assert.ok(policyResult.summary.triggeredCount > 0);

    const result = builder.compute(
      createRecommendationContext({
        analysisResult: dirtyAnalysisResult(),
        policyResult,
        includeSkippedInfo: false
      })
    );

    assert.ok(result.summary.recommendationCount > 0);
    assert.ok(result.recommendations.length > 0);
    assert.ok(
      result.records.every(
        (record) => record.sourcePolicy && record.informational !== true
      )
    );
  });

  it('does not create recommendations for passed policies', () => {
    const policyResult = policyFor(sampleAnalysisResult());
    assert.equal(policyResult.summary.triggeredCount, 0);
    assert.ok(policyResult.summary.passedCount > 0);

    const result = builder.compute(
      createRecommendationContext({
        analysisResult: sampleAnalysisResult(),
        policyResult,
        includeSkippedInfo: false
      })
    );

    assert.equal(result.summary.recommendationCount, 0);
    assert.equal(result.records.length, 0);
    assert.equal(result.summary.success, true);
  });

  it('creates optional informational records for skipped policies', () => {
    const registry = createRecommendationRegistryRuntime(false);
    // Use a policy result with skipped entries
    const policyEngine = createPolicyEngineRuntime();
    const policyResult = policyEngine.compute(
      createPolicyContext({
        analysisResult: sampleAnalysisResult(),
        policyIds: ['does-not-exist', 'critical-finding-present']
      })
    );
    assert.ok(policyResult.summary.skippedCount >= 1);

    const result = builder.compute(
      createRecommendationContext({
        analysisResult: sampleAnalysisResult(),
        policyResult,
        includeSkippedInfo: true
      })
    );

    assert.ok(result.summary.informationalCount >= 1);
    assert.ok(result.records.some((record) => record.informational === true));
    assert.ok(
      result.records.some((record) => record.category === 'informational')
    );
    void registry;
  });

  it('omits skipped informational when includeSkippedInfo is false', () => {
    const policyEngine = createPolicyEngineRuntime();
    const policyResult = policyEngine.compute(
      createPolicyContext({
        analysisResult: sampleAnalysisResult(),
        policyIds: ['does-not-exist']
      })
    );

    const result = builder.compute(
      createRecommendationContext({
        analysisResult: sampleAnalysisResult(),
        policyResult,
        includeSkippedInfo: false
      })
    );

    assert.equal(result.summary.informationalCount, 0);
    assert.equal(result.records.length, 0);
  });

  it('maps categories from policy categories', () => {
    const result = builder.compute(
      createRecommendationContext({
        analysisResult: dirtyAnalysisResult(),
        policyResult: policyFor(dirtyAnalysisResult()),
        includeSkippedInfo: false
      })
    );

    const categories = new Set(result.records.map((record) => record.category));
    assert.ok(categories.size >= 1);
    for (const category of categories) {
      assert.ok(
        ['data-quality', 'analysis', 'dataset', 'metadata'].includes(category)
      );
    }
  });

  it('maps priority from policy severity', () => {
    const result = builder.compute(
      createRecommendationContext({
        analysisResult: dirtyAnalysisResult(),
        policyResult: policyFor(dirtyAnalysisResult()),
        includeSkippedInfo: false
      })
    );

    const critical = result.records.find(
      (record) => record.sourcePolicy === 'critical-finding-present'
    );
    assert.ok(critical);
    assert.equal(critical.severity, 'CRITICAL');
    assert.equal(critical.priority, 'kritik');
    assert.equal(critical.recommendation.priorityLevel, 'kritik');
  });

  it('includes metadata with observedValue and threshold', () => {
    const result = builder.compute(
      createRecommendationContext({
        analysisResult: dirtyAnalysisResult(),
        policyResult: policyFor(dirtyAnalysisResult()),
        includeSkippedInfo: false
      })
    );

    const quality = result.records.find(
      (record) => record.sourcePolicy === 'minimum-data-quality-score'
    );
    assert.ok(quality);
    assert.equal(quality.metadata.outcome, 'triggered');
    assert.ok('observedValue' in quality.metadata);
    assert.ok('threshold' in quality.metadata);
    assert.equal(quality.metadata.policyCategory, 'data-quality');
  });

  it('sets optional sourceFinding for finding-based policies', () => {
    const result = builder.compute(
      createRecommendationContext({
        analysisResult: dirtyAnalysisResult(),
        policyResult: policyFor(dirtyAnalysisResult()),
        includeSkippedInfo: false
      })
    );

    const critical = result.records.find(
      (record) => record.sourcePolicy === 'critical-finding-present'
    );
    assert.ok(critical);
    assert.equal(critical.sourceFinding, 'f-crit-1');
  });

  it('records telemetry with duration and distributions', () => {
    const result = builder.compute(
      createRecommendationContext({
        analysisResult: dirtyAnalysisResult(),
        policyResult: policyFor(dirtyAnalysisResult()),
        includeSkippedInfo: false
      })
    );

    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.ok(result.telemetry.recommendationCount > 0);
    assert.ok(result.telemetry.categoryCount > 0);
    assert.ok(
      Object.keys(result.telemetry.severityDistribution).length > 0
    );
    assert.ok(
      Object.keys(result.telemetry.categoryDistribution).length > 0
    );
  });

  it('warns when PolicyResult is missing', () => {
    const result = builder.compute(
      createRecommendationContext({
        analysisResult: sampleAnalysisResult()
      })
    );
    assert.equal(result.summary.success, false);
    assert.ok(
      result.warnings.some((warning) => warning.code === 'POLICY_RESULT_MISSING')
    );
  });

  it('implements IRecommendationBuilder.build returning empty without policy', async () => {
    const recommendations = await builder.build(
      sampleDecisionContext(),
      sampleAnalysisResult(),
      [],
      []
    );
    assert.deepEqual(recommendations, []);
  });

  it('supports registry extension and unregister', () => {
    const registry = createRecommendationRegistryRuntime(false);
    assert.equal(registry.count(), 0);
    registry.register({
      id: 'rec-custom',
      code: 'CUSTOM',
      title: 'Custom',
      description: 'Custom recommendation',
      category: 'analysis',
      defaultSeverity: 'INFO',
      defaultPriority: 'dusuk',
      sourcePolicyId: 'custom-policy',
      order: 99,
      enabled: true
    });
    assert.equal(registry.count(), 1);
    assert.ok(registry.getBySourcePolicyId('custom-policy'));
    assert.equal(registry.unregister('rec-custom'), true);
    assert.equal(registry.count(), 0);
  });

  it('rejects duplicate recommendation registration', () => {
    const registry = createRecommendationRegistryRuntime(true);
    assert.throws(
      () =>
        registry.register(
          getBuiltinRecommendationDefinition('rec-minimum-dataset-size')
        ),
      /zaten kayıtlı/
    );
  });

  it('getByCategory filters builtins', () => {
    const analysis = builder
      .getRegistry()
      .getByCategory('analysis')
      .map((item) => item.id);
    assert.ok(analysis.includes('rec-critical-finding-present'));
    assert.ok(analysis.includes('rec-error-rule-present'));
  });

  it('RecommendationResult exposes recommendations list and summary', () => {
    const result = builder.compute(
      createRecommendationContext({
        analysisResult: dirtyAnalysisResult(),
        policyResult: policyFor(dirtyAnalysisResult()),
        includeSkippedInfo: false
      })
    );
    assert.ok(Array.isArray(result.recommendations));
    assert.equal(
      result.recommendations.length,
      result.summary.recommendationCount
    );
    assert.ok(result.summary.categoryCounts);
    assert.ok(result.summary.severityCounts);
  });

  it('applyRecommendationBuilderToPipelineResult after policy', async () => {
    const pipeline = createDecisionPipelineRuntime({
      initialContext: sampleDecisionContext(dirtyAnalysisResult())
    });
    const detailed = await pipeline.runWithDetails(
      sampleDecisionRequest({
        analysisRequestId: 'analysis-rec-001',
        datasetId: 'ds-rec-001'
      })
    );
    applyPolicyEngineToPipelineResult(detailed);
    const recResult = applyRecommendationBuilderToPipelineResult(
      detailed,
      builder
    );

    assert.ok(recResult.summary.recommendationCount > 0);
    assert.ok(
      detailed.context.bag[PIPELINE_BAG_RECOMMENDATION_RUNTIME_RESULT_KEY]
    );
    assert.ok((detailed.context.bag.recommendations?.length ?? 0) > 0);
    assert.equal(
      detailed.decisionResult.recommendations.length,
      recResult.recommendations.length
    );
  });

  it('skips Recommendation Builder when validation failed', async () => {
    const pipeline = createDecisionPipelineRuntime({
      initialContext: sampleDecisionContext(
        sampleAnalysisResult({
          kpiResults: /** @type {any} */ ('broken')
        })
      )
    });
    const detailed = await pipeline.runWithDetails(sampleDecisionRequest());
    const recResult = applyRecommendationBuilderToPipelineResult(
      detailed,
      builder
    );

    assert.equal(recResult.summary.success, false);
    assert.ok(
      recResult.warnings.some(
        (warning) => warning.code === 'VALIDATION_NOT_PASSED'
      )
    );
  });

  it('skips when PolicyResult missing in bag', async () => {
    const pipeline = createDecisionPipelineRuntime({
      initialContext: sampleDecisionContext()
    });
    const detailed = await pipeline.runWithDetails(sampleDecisionRequest());
    const recResult = applyRecommendationBuilderToPipelineResult(
      detailed,
      builder
    );

    assert.ok(
      recResult.warnings.some(
        (warning) => warning.code === 'POLICY_RESULT_MISSING'
      )
    );
  });

  it('attach/read helpers round-trip', async () => {
    const pipeline = createDecisionPipelineRuntime({
      initialContext: sampleDecisionContext(dirtyAnalysisResult())
    });
    const detailed = await pipeline.runWithDetails(
      sampleDecisionRequest({
        analysisRequestId: 'analysis-rec-001',
        datasetId: 'ds-rec-001'
      })
    );
    applyPolicyEngineToPipelineResult(detailed);
    const computed = builder.compute(
      createRecommendationContext({
        analysisResult: dirtyAnalysisResult(),
        policyResult: policyFor(dirtyAnalysisResult()),
        includeSkippedInfo: false
      })
    );
    attachRecommendationToPipelineContext(
      /** @type {any} */ (detailed.context),
      computed
    );
    assert.equal(
      readRecommendationFromPipelineContext(
        /** @type {any} */ (detailed.context)
      )?.summary.recommendationCount,
      computed.summary.recommendationCount
    );
    attachRecommendationToPipelineResult(detailed, computed);
    assert.equal(
      readRecommendationFromPipelineResult(detailed)?.telemetry
        .recommendationCount,
      computed.telemetry.recommendationCount
    );
  });

  it('uses registry title and code for known source policies', () => {
    const result = builder.compute(
      createRecommendationContext({
        analysisResult: dirtyAnalysisResult(),
        policyResult: policyFor(dirtyAnalysisResult()),
        includeSkippedInfo: false
      })
    );
    const quality = result.records.find(
      (record) => record.sourcePolicy === 'minimum-data-quality-score'
    );
    assert.ok(quality);
    assert.equal(quality.title, 'Improve Data Quality Score');
    assert.equal(quality.recommendation.code, 'MINIMUM_DATA_QUALITY_SCORE');
  });

  it('mixed triggered and skipped produce both record types', () => {
    const policyEngine = createPolicyEngineRuntime();
    const policyResult = policyEngine.compute(
      createPolicyContext({
        analysisResult: dirtyAnalysisResult(),
        policyIds: [
          'minimum-data-quality-score',
          'does-not-exist',
          'critical-finding-present'
        ]
      })
    );

    const result = builder.compute(
      createRecommendationContext({
        analysisResult: dirtyAnalysisResult(),
        policyResult,
        includeSkippedInfo: true
      })
    );

    assert.ok(result.summary.recommendationCount >= 1);
    assert.ok(result.summary.informationalCount >= 1);
    assert.ok(result.records.some((record) => !record.informational));
    assert.ok(result.records.some((record) => record.informational));
  });
});
