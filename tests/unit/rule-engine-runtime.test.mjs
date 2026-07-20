/**
 * Rule Engine Runtime — PR-102C (en az 20 unit test)
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
  createRuleEngineRuntime,
  createRuleRegistryRuntime,
  createRuleContext,
  createKpiEngineRuntime,
  createKpiContext,
  createAnalysisPipelineRuntime,
  applyKpiEngineToPipelineResult,
  applyRuleEngineToPipelineResult,
  attachRuleToPipelineContext,
  readRuleFromPipelineContext,
  attachRuleToPipelineResult,
  readRuleFromPipelineResult,
  BUILTIN_RULE_DEFINITION_COUNT,
  BUILTIN_RULE_DEFINITIONS,
  BUILTIN_RULE_THRESHOLDS,
  getBuiltinRuleDefinition,
  RULE_SEVERITY_RANK,
  RULE_OUTCOME_LABELS,
  PIPELINE_BAG_RULE_RUNTIME_RESULT_KEY
} = await import('../../src/business/analysis/index.ts');

function sampleDataset(overrides = {}) {
  return {
    id: 'ds-rule-001',
    metadata: {
      id: 'ds-rule-001',
      title: 'Rule Dataset',
      locale: 'tr',
      createdAt: '2026-07-20T11:00:00.000Z'
    },
    version: {
      schemaVersion: '1.0.0',
      revision: '1',
      effectiveAt: '2026-07-20T11:00:00.000Z'
    },
    source: { type: 'csv', label: 'rule.csv' },
    entities: [
      {
        id: 'ent-1',
        entityType: 'urun',
        name: 'Ürünler',
        layout: 'tablo',
        columns: [
          { id: 'sku', name: 'SKU', dataType: 'metin', required: true, order: 1 },
          {
            id: 'adet',
            name: 'Adet',
            dataType: 'tamsayi',
            required: false,
            order: 2
          }
        ],
        rows: [
          { id: 'r1', values: { sku: 'A1', adet: 10 } },
          { id: 'r2', values: { sku: 'A2', adet: 5 } }
        ]
      }
    ],
    relations: [],
    ...overrides
  };
}

function dirtyDataset() {
  return sampleDataset({
    entities: [
      {
        id: 'ent-1',
        entityType: 'urun',
        name: 'Ürünler',
        layout: 'tablo',
        columns: [
          { id: 'sku', name: 'SKU', dataType: 'metin', required: true, order: 1 },
          {
            id: 'adet',
            name: 'Adet',
            dataType: 'tamsayi',
            required: false,
            order: 2
          }
        ],
        rows: [
          { id: 'r1', values: { sku: '', adet: null } },
          { id: 'r2', values: { sku: '   ', adet: null } },
          { id: 'r3', values: { sku: 'ok', adet: 1 } }
        ]
      }
    ]
  });
}

function sampleAnalysisContext(dataset = sampleDataset()) {
  return {
    analysisId: 'an-rule-1',
    dataset,
    locale: 'tr',
    currentStage: 'kural-degerlendirme',
    status: 'suruyor'
  };
}

function sampleRequest(overrides = {}) {
  return {
    id: 'req-rule-1',
    datasetId: 'ds-rule-001',
    locale: 'tr',
    ...overrides
  };
}

function kpiResultFor(dataset) {
  const kpiEngine = createKpiEngineRuntime();
  return kpiEngine.compute(createKpiContext({ dataset }));
}

describe('RuleEngineRuntime', () => {
  /** @type {ReturnType<typeof createRuleEngineRuntime>} */
  let engine;

  beforeEach(() => {
    engine = createRuleEngineRuntime();
  });

  it('seeds builtin rule definitions', () => {
    assert.equal(engine.getRegistry().count(), BUILTIN_RULE_DEFINITION_COUNT);
    assert.equal(BUILTIN_RULE_DEFINITION_COUNT, 8);
    assert.ok(getBuiltinRuleDefinition('empty-value-ratio-threshold'));
    assert.equal(RULE_SEVERITY_RANK.CRITICAL, 4);
    assert.equal(RULE_OUTCOME_LABELS.passed, 'Geçti');
  });

  it('passes clean dataset rules', () => {
    const kpi = kpiResultFor(sampleDataset());
    const result = engine.compute(
      createRuleContext({
        dataset: sampleDataset(),
        kpiResults: kpi.kpiResults,
        kpiRuntimeResult: kpi
      })
    );

    assert.equal(result.summary.triggeredCount, 0);
    assert.ok(result.summary.passedCount >= 6);
    assert.equal(result.findings.length, 0);
    assert.ok(
      result.passedRules.some((r) => r.definition.id === 'minimum-entity-count')
    );
  });

  it('triggers empty value ratio threshold on dirty data', () => {
    const dataset = dirtyDataset();
    const kpi = kpiResultFor(dataset);
    const result = engine.compute(
      createRuleContext({
        dataset,
        kpiResults: kpi.kpiResults,
        kpiRuntimeResult: kpi,
        ruleIds: ['empty-value-ratio-threshold']
      })
    );

    assert.equal(result.summary.triggeredCount, 1);
    assert.equal(result.triggeredRules[0].outcome, 'triggered');
    assert.ok(
      Number(result.triggeredRules[0].observedValue) >
        BUILTIN_RULE_THRESHOLDS.EMPTY_VALUE_RATIO
    );
  });

  it('triggers null value ratio threshold', () => {
    const dataset = dirtyDataset();
    const kpi = kpiResultFor(dataset);
    const result = engine.compute(
      createRuleContext({
        dataset,
        kpiResults: kpi.kpiResults,
        kpiRuntimeResult: kpi,
        ruleIds: ['null-value-ratio-threshold']
      })
    );

    assert.equal(result.triggeredRules[0].outcome, 'triggered');
    // 2 nulls / 6 fields ≈ 0.3333 > 0.1
    assert.ok(Number(result.triggeredRules[0].observedValue) > 0.1);
  });

  it('triggers filled value ratio threshold when fill is low', () => {
    const dataset = dirtyDataset();
    const kpi = kpiResultFor(dataset);
    const result = engine.compute(
      createRuleContext({
        dataset,
        kpiResults: kpi.kpiResults,
        kpiRuntimeResult: kpi,
        ruleIds: ['filled-value-ratio-threshold']
      })
    );

    assert.equal(result.triggeredRules[0].outcome, 'triggered');
  });

  it('triggers structure rules for empty dataset', () => {
    const dataset = sampleDataset({ entities: [] });
    const kpi = kpiResultFor(dataset);
    const result = engine.compute(
      createRuleContext({
        dataset,
        kpiResults: kpi.kpiResults,
        kpiRuntimeResult: kpi,
        ruleIds: [
          'minimum-entity-count',
          'minimum-record-count',
          'minimum-column-count',
          'entity-name-present'
        ]
      })
    );

    assert.equal(result.summary.triggeredCount, 4);
    assert.ok(
      result.triggeredRules.every((item) => item.outcome === 'triggered')
    );
  });

  it('triggers metadata rule when dataset version missing', () => {
    const dataset = sampleDataset({
      version: {
        schemaVersion: '',
        revision: '',
        effectiveAt: '2026-07-20T11:00:00.000Z'
      }
    });
    const kpi = kpiResultFor(dataset);
    const result = engine.compute(
      createRuleContext({
        dataset,
        kpiResults: kpi.kpiResults,
        kpiRuntimeResult: kpi,
        ruleIds: ['dataset-version-present']
      })
    );

    assert.equal(result.triggeredRules.length, 1);
    assert.equal(result.triggeredRules[0].definition.id, 'dataset-version-present');
  });

  it('passes metadata rules when version and names exist', () => {
    const kpi = kpiResultFor(sampleDataset());
    const result = engine.compute(
      createRuleContext({
        dataset: sampleDataset(),
        kpiResults: kpi.kpiResults,
        kpiRuntimeResult: kpi,
        ruleIds: ['dataset-version-present', 'entity-name-present']
      })
    );

    assert.equal(result.summary.passedCount, 2);
    assert.equal(result.summary.triggeredCount, 0);
  });

  it('skips all rules when KPI runtime failed', () => {
    const failedKpi = {
      calculations: [],
      kpiResults: [],
      summary: {
        calculatedCount: 0,
        requestedCount: 0,
        unavailableCount: 0,
        success: false
      },
      warnings: [{ code: 'VALIDATION_NOT_PASSED', message: 'x' }],
      telemetry: {
        durationMs: 0,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        calculatedKpiCount: 0,
        warningCount: 1,
        datasetSize: {
          entityCount: 0,
          recordCount: 0,
          columnCount: 0,
          totalFieldCount: 0
        }
      }
    };

    const result = engine.compute(
      createRuleContext({
        dataset: sampleDataset(),
        kpiResults: [],
        kpiRuntimeResult: failedKpi
      })
    );

    assert.equal(result.summary.success, false);
    assert.ok(result.skippedRules.length > 0);
    assert.equal(result.summary.triggeredCount, 0);
    assert.ok(result.warnings.some((w) => w.code === 'KPI_FAILED'));
  });

  it('skips unknown rule ids', () => {
    const kpi = kpiResultFor(sampleDataset());
    const result = engine.compute(
      createRuleContext({
        dataset: sampleDataset(),
        kpiResults: kpi.kpiResults,
        kpiRuntimeResult: kpi,
        ruleIds: ['unknown-rule']
      })
    );

    assert.equal(result.summary.skippedCount, 1);
    assert.ok(result.warnings.some((w) => w.code === 'RULE_NOT_REGISTERED'));
  });

  it('skips rule when required KPI is missing', () => {
    const result = engine.compute(
      createRuleContext({
        dataset: sampleDataset(),
        kpiResults: [{ kpiId: 'entity-count', name: 'E', unit: 'adet', value: 1 }],
        ruleIds: ['empty-value-ratio-threshold']
      })
    );

    assert.equal(result.skippedRules[0].outcome, 'skipped');
    assert.ok(result.skippedRules[0].skipReason);
  });

  it('evaluates rules independently (mix of pass and fail)', () => {
    const dataset = dirtyDataset();
    const kpi = kpiResultFor(dataset);
    const result = engine.compute(
      createRuleContext({
        dataset,
        kpiResults: kpi.kpiResults,
        kpiRuntimeResult: kpi,
        ruleIds: [
          'empty-value-ratio-threshold',
          'minimum-entity-count',
          'dataset-version-present'
        ]
      })
    );

    assert.equal(result.summary.evaluatedCount, 3);
    assert.ok(result.triggeredRules.some((r) => r.definition.id === 'empty-value-ratio-threshold'));
    assert.ok(result.passedRules.some((r) => r.definition.id === 'minimum-entity-count'));
    assert.ok(result.passedRules.some((r) => r.definition.id === 'dataset-version-present'));
  });

  it('implements IRuleEngine.evaluate returning findings for triggered rules', async () => {
    const dataset = dirtyDataset();
    const kpi = kpiResultFor(dataset);
    const findings = await engine.evaluate(
      sampleAnalysisContext(dataset),
      dataset,
      kpi.kpiResults,
      ['empty-value-ratio-threshold', 'minimum-entity-count']
    );

    assert.equal(findings.length, 1);
    assert.equal(findings[0].ruleId, 'empty-value-ratio-threshold');
    assert.equal(findings[0].severity, 'uyari');
  });

  it('records telemetry counts and duration', () => {
    const kpi = kpiResultFor(sampleDataset());
    const result = engine.compute(
      createRuleContext({
        dataset: sampleDataset(),
        kpiResults: kpi.kpiResults,
        kpiRuntimeResult: kpi
      })
    );

    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.equal(
      result.telemetry.evaluatedRuleCount,
      result.summary.evaluatedCount
    );
    assert.equal(
      result.telemetry.triggeredRuleCount,
      result.summary.triggeredCount
    );
    assert.equal(result.telemetry.passedRuleCount, result.summary.passedCount);
    assert.equal(result.telemetry.skippedRuleCount, result.summary.skippedCount);
  });

  it('supports registry extension and category lookup', () => {
    const registry = createRuleRegistryRuntime(false);
    registry.register({
      id: 'custom-rule',
      name: 'Custom',
      description: 'Custom rule',
      category: 'data-quality',
      severity: 'INFO',
      kpiId: 'entity-count',
      operator: 'lt',
      threshold: 0,
      order: 99,
      enabled: true
    });
    assert.equal(registry.count(), 1);
    assert.equal(registry.getByCategory('data-quality').length, 1);
    assert.equal(registry.unregister('custom-rule'), true);
  });

  it('rejects duplicate registry registration', () => {
    const registry = createRuleRegistryRuntime(true);
    assert.throws(
      () => registry.register(BUILTIN_RULE_DEFINITIONS[0]),
      /zaten kayıtlı/
    );
  });

  it('skips disabled rules', () => {
    const registry = createRuleRegistryRuntime(false);
    registry.register({
      ...BUILTIN_RULE_DEFINITIONS[3],
      enabled: false
    });
    const localEngine = createRuleEngineRuntime(registry);
    const kpi = kpiResultFor(sampleDataset({ entities: [] }));
    const result = localEngine.compute(
      createRuleContext({
        dataset: sampleDataset({ entities: [] }),
        kpiResults: kpi.kpiResults,
        ruleIds: ['minimum-entity-count']
      })
    );

    assert.equal(result.skippedRules[0].outcome, 'skipped');
    assert.match(String(result.skippedRules[0].skipReason), /disabled/i);
  });

  it('integrates with pipeline bag after validation + KPI', async () => {
    const pipeline = createAnalysisPipelineRuntime({
      initialContext: sampleAnalysisContext()
    });
    const detailed = await pipeline.runWithDetails(sampleRequest());
    applyKpiEngineToPipelineResult(detailed);
    const ruleResult = applyRuleEngineToPipelineResult(detailed, engine);

    assert.equal(ruleResult.summary.success, true);
    assert.ok(detailed.context.bag[PIPELINE_BAG_RULE_RUNTIME_RESULT_KEY]);
    assert.equal(
      readRuleFromPipelineResult(detailed)?.summary.evaluatedCount,
      ruleResult.summary.evaluatedCount
    );
    assert.ok(Array.isArray(detailed.context.bag.findings));
  });

  it('does not run when validation failed', async () => {
    const pipeline = createAnalysisPipelineRuntime({
      initialContext: sampleAnalysisContext(
        sampleDataset({ entities: /** @type {any} */ ('broken') })
      )
    });
    const detailed = await pipeline.runWithDetails(sampleRequest());
    applyKpiEngineToPipelineResult(detailed);
    const ruleResult = applyRuleEngineToPipelineResult(detailed, engine);

    assert.equal(ruleResult.summary.success, false);
    assert.ok(
      ruleResult.warnings.some((w) => w.code === 'VALIDATION_NOT_PASSED')
    );
    assert.equal(ruleResult.summary.evaluatedCount, 0);
  });

  it('returns SKIPPED when KPI stage failed in pipeline', async () => {
    const pipeline = createAnalysisPipelineRuntime({
      initialContext: sampleAnalysisContext()
    });
    const detailed = await pipeline.runWithDetails(sampleRequest());
    // Force KPI failure bag state without re-running KPI engine successfully
    detailed.context.bag.kpiRuntimeResult = {
      calculations: [],
      kpiResults: [],
      summary: {
        calculatedCount: 0,
        requestedCount: 1,
        unavailableCount: 1,
        success: false
      },
      warnings: [],
      telemetry: {
        durationMs: 0,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        calculatedKpiCount: 0,
        warningCount: 0,
        datasetSize: {
          entityCount: 0,
          recordCount: 0,
          columnCount: 0,
          totalFieldCount: 0
        }
      }
    };
    detailed.context.bag.kpiResults = [];

    const ruleResult = applyRuleEngineToPipelineResult(detailed, engine);
    assert.ok(ruleResult.skippedRules.length > 0);
    assert.ok(ruleResult.warnings.some((w) => w.code === 'KPI_FAILED'));
  });

  it('supports attach/read bag bridge helpers', () => {
    const kpi = kpiResultFor(sampleDataset());
    const result = engine.compute(
      createRuleContext({
        dataset: sampleDataset(),
        kpiResults: kpi.kpiResults,
        kpiRuntimeResult: kpi
      })
    );
    const context = {
      request: sampleRequest(),
      analysisContext: sampleAnalysisContext(),
      stageExecutions: [],
      bag: {},
      startedAt: new Date().toISOString(),
      startedMark: 0
    };

    attachRuleToPipelineContext(context, result);
    assert.equal(readRuleFromPipelineContext(context)?.summary.evaluatedCount, 8);
    assert.equal(context.bag.findings?.length, result.findings.length);

    const pipelineResult = {
      analysisResult: {
        requestId: 'x',
        datasetId: 'ds',
        status: 'basarisiz',
        lastStage: 'sonuc-derleme',
        kpiResults: [],
        findings: [],
        scores: [],
        statistics: {
          entityCount: 1,
          rowCount: 1,
          relationCount: 0,
          kpiResultCount: 0,
          findingCount: 0
        },
        warnings: []
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

    attachRuleToPipelineResult(pipelineResult, result);
    assert.ok(readRuleFromPipelineResult(pipelineResult));
  });

  it('honors request ruleIds in pipeline integration', async () => {
    const pipeline = createAnalysisPipelineRuntime({
      initialContext: sampleAnalysisContext()
    });
    const detailed = await pipeline.runWithDetails(
      sampleRequest({
        ruleIds: ['minimum-entity-count', 'dataset-version-present']
      })
    );
    applyKpiEngineToPipelineResult(detailed);
    const ruleResult = applyRuleEngineToPipelineResult(detailed, engine);

    assert.equal(ruleResult.summary.evaluatedCount, 2);
    assert.deepEqual(
      ruleResult.evaluations.map((item) => item.definition.id),
      ['minimum-entity-count', 'dataset-version-present']
    );
  });
});
