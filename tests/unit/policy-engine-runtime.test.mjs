/**
 * Policy Engine Runtime — PR-103B (en az 20 unit test)
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
  createPolicyEngineRuntime,
  createPolicyRegistryRuntime,
  createPolicyContext,
  createDecisionPipelineRuntime,
  applyPolicyEngineToPipelineResult,
  attachPolicyToPipelineContext,
  readPolicyFromPipelineContext,
  attachPolicyToPipelineResult,
  readPolicyFromPipelineResult,
  BUILTIN_POLICY_DEFINITION_COUNT,
  BUILTIN_POLICY_THRESHOLDS,
  getBuiltinPolicyDefinition,
  POLICY_OUTCOME_LABELS,
  POLICY_SEVERITY_RANK,
  PIPELINE_BAG_POLICY_RUNTIME_RESULT_KEY
} = await import('../../src/business/decision/index.ts');

function sampleAnalysisResult(overrides = {}) {
  return {
    requestId: 'analysis-test-001',
    datasetId: 'ds-001',
    status: 'basarili',
    lastStage: 'sonuc-derleme',
    kpiResults: [
      {
        kpiId: 'filled-value-ratio',
        name: 'Filled Value Ratio',
        unit: 'oran',
        value: 0.95,
        confidence: 1
      },
      {
        kpiId: 'entity-count',
        name: 'Entity Count',
        unit: 'adet',
        value: 2,
        confidence: 1
      }
    ],
    findings: [],
    summary: {
      headline: 'Analiz tamamlandı',
      highlights: ['Kalite iyi']
    },
    scores: [],
    statistics: {
      entityCount: 2,
      rowCount: 10,
      relationCount: 0,
      kpiResultCount: 2,
      findingCount: 0
    },
    warnings: [],
    completedAt: '2026-07-20T17:00:00.000Z',
    ...overrides
  };
}

function sampleDecisionRequest(overrides = {}) {
  return {
    id: 'decision-policy-001',
    analysisRequestId: 'analysis-test-001',
    datasetId: 'ds-001',
    locale: 'tr',
    ...overrides
  };
}

function sampleDecisionContext(analysisResult = sampleAnalysisResult()) {
  return {
    decisionId: 'decision-ctx-policy',
    analysisResult,
    locale: 'tr',
    currentStage: 'risk-degerlendirme',
    status: 'suruyor'
  };
}

function outcomeOf(result, policyId) {
  return result.evaluations.find((item) => item.definition.id === policyId)
    ?.outcome;
}

describe('PolicyEngineRuntime', () => {
  /** @type {ReturnType<typeof createPolicyEngineRuntime>} */
  let engine;

  beforeEach(() => {
    engine = createPolicyEngineRuntime();
  });

  it('seeds builtin policy definitions', () => {
    assert.equal(engine.getRegistry().count(), BUILTIN_POLICY_DEFINITION_COUNT);
    assert.equal(BUILTIN_POLICY_DEFINITION_COUNT, 5);
    assert.ok(getBuiltinPolicyDefinition('minimum-data-quality-score'));
    assert.ok(getBuiltinPolicyDefinition('critical-finding-present'));
    assert.ok(getBuiltinPolicyDefinition('error-rule-present'));
    assert.ok(getBuiltinPolicyDefinition('minimum-dataset-size'));
    assert.ok(getBuiltinPolicyDefinition('required-metadata-available'));
    assert.equal(POLICY_SEVERITY_RANK.CRITICAL, 4);
    assert.equal(POLICY_OUTCOME_LABELS.passed, 'PASSED');
  });

  it('passes all policies for a valid AnalysisResult', () => {
    const result = engine.compute(
      createPolicyContext({ analysisResult: sampleAnalysisResult() })
    );
    assert.equal(result.summary.triggeredCount, 0);
    assert.equal(result.summary.passedCount, 5);
    assert.equal(result.summary.skippedCount, 0);
    assert.equal(result.summary.success, true);
  });

  it('triggers minimum-data-quality-score when score is below threshold', () => {
    const result = engine.compute(
      createPolicyContext({
        analysisResult: sampleAnalysisResult({
          kpiResults: [
            {
              kpiId: 'filled-value-ratio',
              name: 'Filled',
              unit: 'oran',
              value: 0.4,
              confidence: 1
            }
          ]
        })
      })
    );
    assert.equal(outcomeOf(result, 'minimum-data-quality-score'), 'triggered');
    const evaluation = result.triggeredPolicies.find(
      (item) => item.definition.id === 'minimum-data-quality-score'
    );
    assert.ok(evaluation);
    assert.ok(
      typeof evaluation.observedValue === 'number' &&
        evaluation.observedValue < BUILTIN_POLICY_THRESHOLDS.MINIMUM_DATA_QUALITY_SCORE
    );
  });

  it('uses AnalysisScore data-quality when present', () => {
    const result = engine.compute(
      createPolicyContext({
        analysisResult: sampleAnalysisResult({
          scores: [
            {
              id: 'data-quality',
              name: 'Data Quality',
              value: 88,
              maxValue: 100,
              unit: 'puan'
            }
          ],
          kpiResults: []
        })
      })
    );
    assert.equal(outcomeOf(result, 'minimum-data-quality-score'), 'passed');
  });

  it('triggers critical-finding-present for kritik findings', () => {
    const result = engine.compute(
      createPolicyContext({
        analysisResult: sampleAnalysisResult({
          findings: [
            {
              id: 'f-1',
              code: 'CRIT',
              title: 'Kritik',
              description: 'Kritik bulgu',
              severity: 'kritik'
            }
          ],
          statistics: {
            entityCount: 2,
            rowCount: 10,
            relationCount: 0,
            kpiResultCount: 2,
            findingCount: 1
          }
        })
      })
    );
    assert.equal(outcomeOf(result, 'critical-finding-present'), 'triggered');
    assert.equal(outcomeOf(result, 'error-rule-present'), 'passed');
  });

  it('triggers error-rule-present for rule-sourced kritik findings', () => {
    const result = engine.compute(
      createPolicyContext({
        analysisResult: sampleAnalysisResult({
          findings: [
            {
              id: 'f-2',
              code: 'EMPTY_RATIO',
              title: 'Boş oran',
              description: 'Kural bulgusu',
              severity: 'kritik',
              ruleId: 'empty-value-ratio-threshold'
            }
          ]
        })
      })
    );
    assert.equal(outcomeOf(result, 'critical-finding-present'), 'triggered');
    assert.equal(outcomeOf(result, 'error-rule-present'), 'triggered');
  });

  it('triggers required-metadata-available when completedAt is missing', () => {
    const result = engine.compute(
      createPolicyContext({
        analysisResult: sampleAnalysisResult({
          completedAt: undefined
        })
      })
    );
    assert.equal(outcomeOf(result, 'required-metadata-available'), 'triggered');
    const evaluation = result.triggeredPolicies.find(
      (item) => item.definition.id === 'required-metadata-available'
    );
    assert.ok(evaluation?.message.includes('completedAt'));
  });

  it('triggers minimum-dataset-size for empty statistics', () => {
    const result = engine.compute(
      createPolicyContext({
        analysisResult: sampleAnalysisResult({
          statistics: {
            entityCount: 0,
            rowCount: 0,
            relationCount: 0,
            kpiResultCount: 0,
            findingCount: 0
          },
          kpiResults: [
            {
              kpiId: 'filled-value-ratio',
              name: 'Filled',
              unit: 'oran',
              value: 1,
              confidence: 1
            }
          ]
        })
      })
    );
    assert.equal(outcomeOf(result, 'minimum-dataset-size'), 'triggered');
  });

  it('returns empty result when AnalysisResult is missing', () => {
    const result = engine.compute(
      createPolicyContext({
        analysisResult: /** @type {any} */ (null)
      })
    );
    assert.equal(result.summary.evaluatedCount, 0);
    assert.equal(result.summary.success, false);
    assert.ok(
      result.warnings.some((warning) => warning.code === 'ANALYSIS_RESULT_MISSING')
    );
  });

  it('skips unknown policy ids with warning', () => {
    const result = engine.compute(
      createPolicyContext({
        analysisResult: sampleAnalysisResult(),
        policyIds: ['does-not-exist']
      })
    );
    assert.equal(result.summary.skippedCount, 1);
    assert.equal(result.skippedPolicies[0].outcome, 'skipped');
    assert.ok(
      result.warnings.some((warning) => warning.code === 'POLICY_NOT_REGISTERED')
    );
  });

  it('honors policyIds subset', () => {
    const result = engine.compute(
      createPolicyContext({
        analysisResult: sampleAnalysisResult(),
        policyIds: ['critical-finding-present', 'error-rule-present']
      })
    );
    assert.equal(result.summary.evaluatedCount, 2);
    assert.equal(result.summary.passedCount, 2);
  });

  it('records telemetry for duration and policy counts', () => {
    const result = engine.compute(
      createPolicyContext({ analysisResult: sampleAnalysisResult() })
    );
    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.equal(result.telemetry.evaluatedPolicyCount, 5);
    assert.equal(result.telemetry.triggeredPolicyCount, 0);
    assert.equal(result.telemetry.passedPolicyCount, 5);
    assert.equal(result.telemetry.skippedPolicyCount, 0);
  });

  it('supports registry extension and unregister', () => {
    const registry = createPolicyRegistryRuntime(false);
    assert.equal(registry.count(), 0);
    registry.register({
      id: 'custom-policy',
      name: 'Custom',
      description: 'Custom policy',
      category: 'analysis',
      severity: 'INFO',
      operator: 'finding-severity',
      findingSeverity: 'bilgi',
      order: 99,
      enabled: true
    });
    assert.equal(registry.count(), 1);
    assert.equal(registry.unregister('custom-policy'), true);
    assert.equal(registry.count(), 0);
  });

  it('rejects duplicate policy registration', () => {
    const registry = createPolicyRegistryRuntime(true);
    assert.throws(
      () => registry.register(getBuiltinPolicyDefinition('minimum-dataset-size')),
      /zaten kayıtlı/
    );
  });

  it('skips disabled policies', () => {
    const registry = createPolicyRegistryRuntime(false);
    registry.register({
      id: 'disabled-policy',
      name: 'Disabled',
      description: 'Pasif',
      category: 'metadata',
      severity: 'INFO',
      operator: 'present',
      order: 1,
      enabled: false
    });
    const localEngine = createPolicyEngineRuntime(registry);
    const result = localEngine.compute(
      createPolicyContext({
        analysisResult: sampleAnalysisResult(),
        policyIds: ['disabled-policy']
      })
    );
    assert.equal(result.summary.skippedCount, 1);
    assert.equal(result.skippedPolicies[0].skipReason, 'Policy disabled.');
  });

  it('getByCategory filters builtins', () => {
    const analysisPolicies = engine
      .getRegistry()
      .getByCategory('analysis')
      .map((item) => item.id);
    assert.ok(analysisPolicies.includes('critical-finding-present'));
    assert.ok(analysisPolicies.includes('error-rule-present'));
  });

  it('applyPolicyEngineToPipelineResult writes bag after validation', async () => {
    const pipeline = createDecisionPipelineRuntime({
      initialContext: sampleDecisionContext()
    });
    const detailed = await pipeline.runWithDetails(sampleDecisionRequest());
    const policyResult = applyPolicyEngineToPipelineResult(detailed, engine);

    assert.equal(policyResult.summary.success, true);
    assert.equal(
      readPolicyFromPipelineResult(detailed)?.summary.passedCount,
      5
    );
    assert.ok(
      detailed.context.bag[PIPELINE_BAG_POLICY_RUNTIME_RESULT_KEY]
    );
  });

  it('skips Policy Engine when analysis validation failed', async () => {
    const pipeline = createDecisionPipelineRuntime({
      initialContext: sampleDecisionContext(
        sampleAnalysisResult({
          kpiResults: /** @type {any} */ ('broken')
        })
      )
    });
    const detailed = await pipeline.runWithDetails(sampleDecisionRequest());
    const policyResult = applyPolicyEngineToPipelineResult(detailed, engine);

    assert.equal(policyResult.summary.success, false);
    assert.equal(policyResult.summary.evaluatedCount, 0);
    assert.ok(
      policyResult.warnings.some(
        (warning) => warning.code === 'VALIDATION_NOT_PASSED'
      )
    );
  });

  it('attach/read helpers round-trip on pipeline context', async () => {
    const pipeline = createDecisionPipelineRuntime({
      initialContext: sampleDecisionContext()
    });
    const detailed = await pipeline.runWithDetails(sampleDecisionRequest());
    const computed = engine.compute(
      createPolicyContext({
        analysisResult: detailed.context.decisionContext.analysisResult
      })
    );
    attachPolicyToPipelineContext(
      /** @type {any} */ (detailed.context),
      computed
    );
    const read = readPolicyFromPipelineContext(
      /** @type {any} */ (detailed.context)
    );
    assert.equal(read?.summary.passedCount, computed.summary.passedCount);

    attachPolicyToPipelineResult(detailed, computed);
    assert.equal(
      readPolicyFromPipelineResult(detailed)?.telemetry.evaluatedPolicyCount,
      5
    );
  });

  it('mixed outcomes — triggered and passed together', () => {
    const result = engine.compute(
      createPolicyContext({
        analysisResult: sampleAnalysisResult({
          findings: [
            {
              id: 'f-3',
              code: 'X',
              title: 'Kritik',
              description: 'x',
              severity: 'kritik'
            }
          ],
          completedAt: undefined
        })
      })
    );
    assert.ok(result.summary.triggeredCount >= 2);
    assert.ok(result.summary.passedCount >= 1);
    assert.equal(
      result.summary.evaluatedCount,
      result.summary.triggeredCount +
        result.summary.passedCount +
        result.summary.skippedCount
    );
  });

  it('derives quality score from empty-value-ratio when filled is absent', () => {
    const result = engine.compute(
      createPolicyContext({
        analysisResult: sampleAnalysisResult({
          kpiResults: [
            {
              kpiId: 'empty-value-ratio',
              name: 'Empty',
              unit: 'oran',
              value: 0.05,
              confidence: 1
            }
          ]
        })
      })
    );
    assert.equal(outcomeOf(result, 'minimum-data-quality-score'), 'passed');
  });
});
