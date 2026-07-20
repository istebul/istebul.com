/**
 * Finding Builder Runtime — PR-102D (en az 20 unit test)
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
  createFindingBuilderRuntime,
  createFindingRegistryRuntime,
  createFindingContext,
  createKpiEngineRuntime,
  createKpiContext,
  createRuleEngineRuntime,
  createRuleContext,
  createAnalysisPipelineRuntime,
  applyKpiEngineToPipelineResult,
  applyRuleEngineToPipelineResult,
  applyFindingBuilderToPipelineResult,
  attachFindingToPipelineContext,
  readFindingFromPipelineContext,
  attachFindingToPipelineResult,
  readFindingFromPipelineResult,
  BUILTIN_FINDING_DEFINITION_COUNT,
  BUILTIN_FINDING_DEFINITIONS,
  getBuiltinFindingDefinition,
  getBuiltinFindingDefinitionByRuleId,
  FINDING_CATEGORY_LABELS,
  FINDING_SEVERITY_RANK,
  PIPELINE_BAG_FINDING_RUNTIME_RESULT_KEY
} = await import('../../src/business/analysis/index.ts');

function sampleDataset(overrides = {}) {
  return {
    id: 'ds-finding-001',
    metadata: {
      id: 'ds-finding-001',
      title: 'Finding Dataset',
      locale: 'tr',
      createdAt: '2026-07-20T12:00:00.000Z'
    },
    version: {
      schemaVersion: '1.0.0',
      revision: '1',
      effectiveAt: '2026-07-20T12:00:00.000Z'
    },
    source: { type: 'csv', label: 'finding.csv' },
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
    analysisId: 'an-finding-1',
    dataset,
    locale: 'tr',
    currentStage: 'bulgu-uretimi',
    status: 'suruyor'
  };
}

function sampleRequest(overrides = {}) {
  return {
    id: 'req-finding-1',
    datasetId: 'ds-finding-001',
    locale: 'tr',
    ...overrides
  };
}

function runRuleResult(dataset, ruleIds) {
  const kpi = createKpiEngineRuntime().compute(
    createKpiContext({ dataset })
  );
  return createRuleEngineRuntime().compute(
    createRuleContext({
      dataset,
      kpiResults: kpi.kpiResults,
      kpiRuntimeResult: kpi,
      ruleIds
    })
  );
}

describe('FindingBuilderRuntime', () => {
  /** @type {ReturnType<typeof createFindingBuilderRuntime>} */
  let builder;

  beforeEach(() => {
    builder = createFindingBuilderRuntime();
  });

  it('seeds builtin finding definitions', () => {
    assert.equal(
      builder.getRegistry().count(),
      BUILTIN_FINDING_DEFINITION_COUNT
    );
    assert.equal(BUILTIN_FINDING_DEFINITION_COUNT, 8);
    assert.ok(getBuiltinFindingDefinition('finding-empty-value-ratio-threshold'));
    assert.equal(
      getBuiltinFindingDefinitionByRuleId('minimum-entity-count')?.code,
      'MINIMUM_ENTITY_COUNT'
    );
    assert.equal(FINDING_CATEGORY_LABELS['data-quality'], 'Data Quality');
    assert.equal(FINDING_SEVERITY_RANK.ERROR, 3);
  });

  it('creates findings for triggered rules', () => {
    const ruleResult = runRuleResult(dirtyDataset(), [
      'empty-value-ratio-threshold'
    ]);
    assert.ok(ruleResult.triggeredRules.length >= 1);

    const result = builder.compute(
      createFindingContext({
        ruleResult,
        includeSkippedInfo: false
      })
    );

    assert.equal(result.findings.length, ruleResult.triggeredRules.length);
    assert.equal(result.records[0].sourceRule, 'empty-value-ratio-threshold');
    assert.equal(result.records[0].category, 'data-quality');
    assert.equal(result.records[0].severity, 'WARNING');
    assert.equal(result.records[0].informational, false);
  });

  it('does not create findings for passed rules', () => {
    const ruleResult = runRuleResult(sampleDataset(), [
      'minimum-entity-count',
      'dataset-version-present'
    ]);
    assert.equal(ruleResult.summary.triggeredCount, 0);
    assert.ok(ruleResult.passedRules.length >= 2);

    const result = builder.compute(
      createFindingContext({
        ruleResult,
        includeSkippedInfo: false
      })
    );

    assert.equal(result.findings.length, 0);
    assert.equal(result.records.length, 0);
  });

  it('creates optional informational records for skipped rules', () => {
    const ruleResult = createRuleEngineRuntime().compute(
      createRuleContext({
        dataset: sampleDataset(),
        kpiResults: [{ kpiId: 'entity-count', name: 'E', unit: 'adet', value: 1 }],
        ruleIds: ['empty-value-ratio-threshold']
      })
    );
    assert.equal(ruleResult.skippedRules.length, 1);

    const withInfo = builder.compute(
      createFindingContext({
        ruleResult,
        includeSkippedInfo: true
      })
    );
    assert.equal(withInfo.records.length, 1);
    assert.equal(withInfo.records[0].informational, true);
    assert.equal(withInfo.records[0].category, 'informational');
    assert.equal(withInfo.records[0].severity, 'INFO');
    assert.equal(withInfo.findings.length, 0);
    assert.equal(withInfo.summary.informationalCount, 1);

    const withoutInfo = builder.compute(
      createFindingContext({
        ruleResult,
        includeSkippedInfo: false
      })
    );
    assert.equal(withoutInfo.records.length, 0);
  });

  it('includes metadata with observed value and threshold', () => {
    const ruleResult = runRuleResult(dirtyDataset(), [
      'empty-value-ratio-threshold'
    ]);
    const result = builder.compute(
      createFindingContext({ ruleResult, includeSkippedInfo: false })
    );

    assert.equal(result.records[0].metadata.outcome, 'triggered');
    assert.ok(result.records[0].metadata.observedValue !== undefined);
    assert.equal(result.records[0].metadata.threshold, 0.2);
    assert.equal(result.records[0].sourceKpi, 'empty-value-ratio');
  });

  it('maps categories from rule definitions', () => {
    const ruleResult = runRuleResult(sampleDataset({ entities: [] }), [
      'minimum-entity-count',
      'entity-name-present'
    ]);
    const result = builder.compute(
      createFindingContext({ ruleResult, includeSkippedInfo: false })
    );

    const categories = result.records.map((r) => r.category).sort();
    assert.deepEqual(categories, ['dataset-structure', 'metadata']);
    assert.equal(result.summary.categoryCounts['dataset-structure'], 1);
    assert.equal(result.summary.categoryCounts.metadata, 1);
  });

  it('maps severities correctly', () => {
    const ruleResult = runRuleResult(sampleDataset({ entities: [] }), [
      'minimum-entity-count',
      'minimum-record-count'
    ]);
    const result = builder.compute(
      createFindingContext({ ruleResult, includeSkippedInfo: false })
    );

    const entityFinding = result.records.find(
      (r) => r.sourceRule === 'minimum-entity-count'
    );
    const recordFinding = result.records.find(
      (r) => r.sourceRule === 'minimum-record-count'
    );
    assert.equal(entityFinding?.severity, 'ERROR');
    assert.equal(entityFinding?.finding.severity, 'kritik');
    assert.equal(recordFinding?.severity, 'WARNING');
    assert.equal(recordFinding?.finding.severity, 'uyari');
  });

  it('records telemetry duration, finding count, category count, severity distribution', () => {
    const ruleResult = runRuleResult(dirtyDataset(), [
      'empty-value-ratio-threshold',
      'null-value-ratio-threshold'
    ]);
    const result = builder.compute(
      createFindingContext({ ruleResult, includeSkippedInfo: false })
    );

    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.equal(result.telemetry.findingCount, result.findings.length);
    assert.ok(result.telemetry.categoryCount >= 1);
    assert.ok(result.telemetry.severityDistribution.WARNING >= 1);
  });

  it('implements IFindingBuilder.build', async () => {
    const ruleResult = runRuleResult(dirtyDataset(), [
      'empty-value-ratio-threshold'
    ]);
    const findings = await builder.build(
      sampleAnalysisContext(dirtyDataset()),
      [],
      ruleResult.findings
    );

    assert.equal(findings.length, 1);
    assert.equal(findings[0].ruleId, 'empty-value-ratio-threshold');
  });

  it('warns when rule result and rule findings are missing', () => {
    const result = builder.compute(createFindingContext({}));
    assert.equal(result.summary.success, false);
    assert.ok(result.warnings.some((w) => w.code === 'RULE_RESULT_MISSING'));
  });

  it('supports registry extension and lookup', () => {
    const registry = createFindingRegistryRuntime(false);
    registry.register({
      id: 'custom-finding',
      code: 'CUSTOM',
      title: 'Custom',
      description: 'Custom finding',
      category: 'data-quality',
      defaultSeverity: 'INFO',
      sourceRuleId: 'custom-rule',
      order: 99,
      enabled: true
    });
    assert.equal(registry.count(), 1);
    assert.equal(registry.getBySourceRuleId('custom-rule')?.id, 'custom-finding');
    assert.equal(registry.getByCategory('data-quality').length, 1);
    assert.equal(registry.unregister('custom-finding'), true);
  });

  it('rejects duplicate registry registration', () => {
    const registry = createFindingRegistryRuntime(true);
    assert.throws(
      () => registry.register(BUILTIN_FINDING_DEFINITIONS[0]),
      /zaten kayıtlı/
    );
  });

  it('produces finding list and summary in FindingResult', () => {
    const ruleResult = runRuleResult(dirtyDataset());
    const result = builder.compute(
      createFindingContext({ ruleResult, includeSkippedInfo: false })
    );

    assert.ok(Array.isArray(result.findings));
    assert.ok(result.summary.findingCount >= 1);
    assert.equal(result.summary.findingCount, result.findings.length);
    assert.equal(typeof result.summary.warningCount, 'number');
  });

  it('integrates with pipeline bag after validation + KPI + Rule', async () => {
    const pipeline = createAnalysisPipelineRuntime({
      initialContext: sampleAnalysisContext(dirtyDataset())
    });
    const detailed = await pipeline.runWithDetails(
      sampleRequest({ datasetId: dirtyDataset().id })
    );
    applyKpiEngineToPipelineResult(detailed);
    applyRuleEngineToPipelineResult(detailed);
    const findingResult = applyFindingBuilderToPipelineResult(
      detailed,
      builder
    );

    assert.ok(findingResult.summary.findingCount >= 1);
    assert.ok(detailed.context.bag[PIPELINE_BAG_FINDING_RUNTIME_RESULT_KEY]);
    assert.equal(
      readFindingFromPipelineResult(detailed)?.summary.findingCount,
      findingResult.summary.findingCount
    );
    assert.ok(detailed.analysisResult.findings.length >= 1);
  });

  it('does not run when validation failed', async () => {
    const pipeline = createAnalysisPipelineRuntime({
      initialContext: sampleAnalysisContext(
        sampleDataset({ entities: /** @type {any} */ ('broken') })
      )
    });
    const detailed = await pipeline.runWithDetails(sampleRequest());
    applyKpiEngineToPipelineResult(detailed);
    applyRuleEngineToPipelineResult(detailed);
    const findingResult = applyFindingBuilderToPipelineResult(
      detailed,
      builder
    );

    assert.equal(findingResult.summary.success, false);
    assert.ok(
      findingResult.warnings.some((w) => w.code === 'VALIDATION_NOT_PASSED')
    );
  });

  it('skips when rule result is missing in pipeline bag', async () => {
    const pipeline = createAnalysisPipelineRuntime({
      initialContext: sampleAnalysisContext()
    });
    const detailed = await pipeline.runWithDetails(sampleRequest());
    applyKpiEngineToPipelineResult(detailed);
    // intentionally skip rule engine
    const findingResult = applyFindingBuilderToPipelineResult(
      detailed,
      builder
    );

    assert.ok(
      findingResult.warnings.some((w) => w.code === 'RULE_RESULT_MISSING')
    );
  });

  it('supports attach/read bag bridge helpers', () => {
    const ruleResult = runRuleResult(dirtyDataset(), [
      'empty-value-ratio-threshold'
    ]);
    const result = builder.compute(
      createFindingContext({ ruleResult, includeSkippedInfo: false })
    );
    const context = {
      request: sampleRequest(),
      analysisContext: sampleAnalysisContext(),
      stageExecutions: [],
      bag: {},
      startedAt: new Date().toISOString(),
      startedMark: 0
    };

    attachFindingToPipelineContext(context, result);
    assert.equal(
      readFindingFromPipelineContext(context)?.summary.findingCount,
      1
    );
    assert.equal(context.bag.findings?.length, 1);

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

    attachFindingToPipelineResult(pipelineResult, result);
    assert.ok(readFindingFromPipelineResult(pipelineResult));
  });

  it('keeps entity reference optional and unset by default', () => {
    const ruleResult = runRuleResult(dirtyDataset(), [
      'empty-value-ratio-threshold'
    ]);
    const result = builder.compute(
      createFindingContext({ ruleResult, includeSkippedInfo: false })
    );

    assert.equal(result.records[0].entityReference, undefined);
    assert.equal(result.records[0].finding.entityId, undefined);
  });

  it('mixes triggered findings and skipped info records', () => {
    const ruleResult = createRuleEngineRuntime().compute(
      createRuleContext({
        dataset: dirtyDataset(),
        kpiResults: createKpiEngineRuntime().compute(
          createKpiContext({ dataset: dirtyDataset() })
        ).kpiResults,
        ruleIds: ['empty-value-ratio-threshold', 'unknown-rule']
      })
    );

    const result = builder.compute(
      createFindingContext({ ruleResult, includeSkippedInfo: true })
    );

    assert.ok(result.findings.length >= 1);
    assert.ok(result.summary.informationalCount >= 1);
    assert.ok(result.records.some((r) => r.informational === true));
    assert.ok(result.records.some((r) => r.informational === false));
  });

  it('uses registry title/code for known source rules', () => {
    const ruleResult = runRuleResult(sampleDataset({ entities: [] }), [
      'minimum-entity-count'
    ]);
    const result = builder.compute(
      createFindingContext({ ruleResult, includeSkippedInfo: false })
    );

    assert.equal(result.records[0].title, 'Minimum Entity Count');
    assert.equal(result.records[0].finding.code, 'MINIMUM_ENTITY_COUNT');
    assert.equal(result.records[0].sourceRule, 'minimum-entity-count');
  });

  it('counts warningCount in summary and telemetry', () => {
    const result = builder.compute(createFindingContext({}));
    assert.equal(result.summary.warningCount, 1);
    assert.equal(result.telemetry.warningCount, 1);
  });
});
