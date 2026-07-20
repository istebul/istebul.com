/**
 * Report Section Builder Runtime — PR-104D (en az 20 unit test)
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
  createReportSectionBuilderRuntime,
  createReportSectionRegistryRuntime,
  createReportSectionContext,
  createReportModelBuilderRuntime,
  createReportModelContext,
  createNarrativeComposerRuntime,
  createNarrativeContext,
  createReportPipelineRuntime,
  applyReportModelBuilderToPipelineResult,
  applyNarrativeComposerToPipelineResult,
  applyReportSectionBuilderToPipelineResult,
  attachReportSectionToPipelineContext,
  readReportSectionFromPipelineContext,
  attachReportSectionToPipelineResult,
  readReportSectionFromPipelineResult,
  REPORT_SECTION_ORDER,
  REPORT_SECTION_LABELS,
  BUILTIN_REPORT_SECTION_DEFINITION_COUNT,
  getBuiltinReportSectionDefinition,
  getBuiltinReportSectionDefinitionByCode,
  PIPELINE_BAG_REPORT_SECTION_RUNTIME_RESULT_KEY
} = await import('../../src/business/report/index.ts');

function sampleDecisionResult(overrides = {}) {
  return {
    requestId: 'decision-sec-001',
    analysisRequestId: 'analysis-sec-001',
    datasetId: 'ds-sec-001',
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
    risks: [{ id: 'r1', code: 'R', title: 'Risk', description: 'd', severity: 'orta' }],
    opportunities: [],
    priorities: [],
    scores: [],
    completedAt: '2026-07-20T23:30:00.000Z',
    ...overrides
  };
}

function sampleRequest(overrides = {}) {
  return {
    id: 'report-sec-001',
    decisionRequestId: 'decision-sec-001',
    reportId: 'report-dna-sec',
    datasetId: 'ds-sec-001',
    locale: 'tr',
    ...overrides
  };
}

function sampleReportContext(decisionResult = sampleDecisionResult()) {
  return {
    reportJobId: 'job-sec-001',
    decisionResult,
    reportDnaId: 'report-dna-sec',
    locale: 'tr',
    currentStage: 'bolum-derleme',
    status: 'suruyor'
  };
}

function buildModelAndNarrative(decisionOverrides = {}) {
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
  return { modelResult, narrativeResult };
}

describe('ReportSectionBuilderRuntime', () => {
  /** @type {ReturnType<typeof createReportSectionBuilderRuntime>} */
  let builder;

  beforeEach(() => {
    builder = createReportSectionBuilderRuntime();
  });

  it('seeds builtin report section definitions', () => {
    assert.equal(
      builder.getRegistry().count(),
      BUILTIN_REPORT_SECTION_DEFINITION_COUNT
    );
    assert.equal(BUILTIN_REPORT_SECTION_DEFINITION_COUNT, 7);
    assert.equal(REPORT_SECTION_ORDER.length, 7);
    assert.equal(REPORT_SECTION_LABELS['executive-summary'], 'Executive Summary');
    assert.ok(getBuiltinReportSectionDefinition('recommendations'));
    assert.ok(
      getBuiltinReportSectionDefinitionByCode('SEC_ACTION_PLAN')
    );
  });

  it('builds empty ReportModel sections with warnings', () => {
    const result = builder.compute(createReportSectionContext({}));
    assert.equal(result.sections.length, 7);
    assert.ok(
      result.warnings.some((warning) => warning.code === 'EMPTY_REPORT_MODEL')
    );
    assert.ok(
      result.warnings.some((warning) => warning.code === 'EMPTY_NARRATIVE_RESULT')
    );
    assert.equal(result.telemetry.sectionCount, 7);
    assert.equal(result.telemetry.templateMappingCount, 0);
  });

  it('builds a single section when sectionIds is filtered', () => {
    const { modelResult, narrativeResult } = buildModelAndNarrative();
    const result = builder.compute(
      createReportSectionContext({
        reportModel: modelResult.model,
        narrativeResult,
        sectionIds: ['recommendations'],
        locale: 'tr'
      })
    );
    assert.equal(result.sections.length, 1);
    assert.equal(result.records[0].sectionId, 'recommendations');
    assert.equal(result.sections[0].kind, 'oneriler');
  });

  it('builds the full standard section set', () => {
    const { modelResult, narrativeResult } = buildModelAndNarrative();
    const result = builder.compute(
      createReportSectionContext({
        reportModel: modelResult.model,
        narrativeResult,
        locale: 'tr'
      })
    );
    assert.equal(result.sections.length, 7);
    assert.deepEqual(
      result.records.map((item) => item.sectionId),
      [...REPORT_SECTION_ORDER]
    );
  });

  it('keeps deterministic section ordering', () => {
    const { modelResult, narrativeResult } = buildModelAndNarrative();
    const result = builder.compute(
      createReportSectionContext({
        reportModel: modelResult.model,
        narrativeResult,
        locale: 'tr'
      })
    );
    const orders = result.sections.map((section) => section.order);
    assert.deepEqual(orders, [1, 2, 3, 4, 5, 6, 7]);
    for (let i = 1; i < orders.length; i += 1) {
      assert.ok(orders[i] > orders[i - 1]);
    }
  });

  it('maps executive summary section from narrative + model', () => {
    const { modelResult, narrativeResult } = buildModelAndNarrative();
    const result = builder.compute(
      createReportSectionContext({
        reportModel: modelResult.model,
        narrativeResult,
        locale: 'tr'
      })
    );
    const executive = result.records.find(
      (item) => item.sectionId === 'executive-summary'
    );
    assert.ok(executive);
    assert.equal(executive.content.hasNarrative, true);
    assert.ok(typeof executive.content.narrativeBody === 'string');
    assert.equal(executive.content.recommendationCount, 1);
    assert.equal(executive.sourceTemplateId, 'narrative-executive-summary');
  });

  it('maps recommendations section content from ReportModel', () => {
    const { modelResult, narrativeResult } = buildModelAndNarrative();
    const result = builder.compute(
      createReportSectionContext({
        reportModel: modelResult.model,
        narrativeResult,
        locale: 'tr'
      })
    );
    const recommendations = result.records.find(
      (item) => item.sectionId === 'recommendations'
    );
    assert.equal(recommendations?.content.recommendationCount, 1);
    assert.equal(recommendations?.content.present, true);
    assert.ok(Array.isArray(recommendations?.content.items));
  });

  it('maps action plan and policy and dataset sections', () => {
    const { modelResult, narrativeResult } = buildModelAndNarrative();
    const result = builder.compute(
      createReportSectionContext({
        reportModel: modelResult.model,
        narrativeResult,
        locale: 'tr'
      })
    );
    assert.equal(
      result.records.find((item) => item.sectionId === 'action-plan')?.content
        .actionCount,
      1
    );
    assert.equal(
      result.records.find((item) => item.sectionId === 'policy-analysis')
        ?.content.riskCount,
      1
    );
    assert.equal(
      result.records.find((item) => item.sectionId === 'dataset-overview')
        ?.content.datasetId,
      'ds-sec-001'
    );
  });

  it('maps decision summary and appendix sections', () => {
    const { modelResult, narrativeResult } = buildModelAndNarrative();
    const result = builder.compute(
      createReportSectionContext({
        reportModel: modelResult.model,
        narrativeResult,
        locale: 'tr'
      })
    );
    const decision = result.records.find(
      (item) => item.sectionId === 'decision-summary'
    );
    assert.equal(decision?.content.status, 'basarili');
    assert.equal(decision?.content.requestId, 'decision-sec-001');

    const appendix = result.records.find((item) => item.sectionId === 'appendix');
    assert.equal(appendix?.section.kind, 'ek');
    assert.equal(appendix?.content.datasetId, 'ds-sec-001');
    assert.ok(appendix?.content.reportDnaId);
  });

  it('records metadata with section ids and mapped narrative kinds', () => {
    const { modelResult, narrativeResult } = buildModelAndNarrative();
    const result = builder.compute(
      createReportSectionContext({
        reportModel: modelResult.model,
        narrativeResult,
        locale: 'tr'
      })
    );
    assert.equal(result.metadata.reportModelId, modelResult.model.metadata.id);
    assert.equal(result.metadata.locale, 'tr');
    assert.ok(result.metadata.generatedAt);
    assert.equal(result.metadata.sectionIds.length, 7);
    assert.ok(result.metadata.mappedNarrativeKinds.includes('executive-summary'));
    assert.ok(
      result.metadata.mappedNarrativeKinds.includes('recommendation-overview')
    );
  });

  it('records telemetry for duration, section count, template mapping', () => {
    const { modelResult, narrativeResult } = buildModelAndNarrative();
    const result = builder.compute(
      createReportSectionContext({
        reportModel: modelResult.model,
        narrativeResult,
        locale: 'tr'
      })
    );
    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.equal(result.telemetry.sectionCount, 7);
    assert.equal(result.telemetry.templateMappingCount, 5);
    assert.equal(result.telemetry.warningCount, result.warnings.length);
  });

  it('projects foundation ReportSection list', () => {
    const { modelResult, narrativeResult } = buildModelAndNarrative();
    const result = builder.compute(
      createReportSectionContext({
        reportModel: modelResult.model,
        narrativeResult,
        locale: 'tr'
      })
    );
    assert.equal(result.sections.length, result.records.length);
    for (const section of result.sections) {
      assert.ok(section.id.startsWith('section:'));
      assert.ok(section.sectionCode.startsWith('SEC_'));
      assert.ok(typeof section.content === 'object');
    }
  });

  it('supports registry extension and unregister', () => {
    const registry = createReportSectionRegistryRuntime(false);
    assert.equal(registry.count(), 0);
    registry.register({
      id: 'appendix',
      sectionCode: 'SEC_CUSTOM_APPENDIX',
      kind: 'ek',
      title: 'Custom Appendix',
      description: 'Custom',
      order: 1,
      enabled: true
    });
    assert.equal(registry.count(), 1);
    assert.ok(registry.getByCode('SEC_CUSTOM_APPENDIX'));
    assert.equal(registry.unregister('appendix'), true);
    assert.equal(registry.count(), 0);
  });

  it('warns when no sections are enabled', () => {
    const emptyBuilder = createReportSectionBuilderRuntime(
      createReportSectionRegistryRuntime(false)
    );
    const result = emptyBuilder.compute(
      createReportSectionContext({
        reportModel: buildModelAndNarrative().modelResult.model
      })
    );
    assert.equal(result.sections.length, 0);
    assert.ok(
      result.warnings.some((warning) => warning.code === 'NO_SECTIONS_ENABLED')
    );
  });

  it('warns when narrative mapping is missing for mapped sections', () => {
    const modelResult = createReportModelBuilderRuntime().compute(
      createReportModelContext({
        decisionResult: sampleDecisionResult(),
        request: sampleRequest(),
        locale: 'tr'
      })
    );
    const result = builder.compute(
      createReportSectionContext({
        reportModel: modelResult.model,
        locale: 'tr'
      })
    );
    assert.ok(
      result.warnings.some(
        (warning) => warning.code === 'NARRATIVE_MAPPING_MISSING'
      )
    );
    assert.equal(result.telemetry.templateMappingCount, 0);
  });

  it('applies section builder to a valid pipeline result', async () => {
    const pipeline = createReportPipelineRuntime({
      initialContext: sampleReportContext()
    });
    const detailed = await pipeline.runWithDetails(sampleRequest());
    applyReportModelBuilderToPipelineResult(detailed);
    applyNarrativeComposerToPipelineResult(detailed);
    const sectionResult = applyReportSectionBuilderToPipelineResult(
      detailed,
      builder
    );

    assert.equal(sectionResult.sections.length, 7);
    assert.equal(
      detailed.context.bag[PIPELINE_BAG_REPORT_SECTION_RUNTIME_RESULT_KEY],
      sectionResult
    );
    assert.equal(detailed.context.bag.sections?.length, 7);
    assert.equal(detailed.reportModel.sections.length, 7);
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
    const sectionResult = applyReportSectionBuilderToPipelineResult(
      detailed,
      builder
    );

    assert.ok(
      sectionResult.warnings.some(
        (warning) => warning.code === 'VALIDATION_NOT_PASSED'
      )
    );
    assert.ok(sectionResult.sections.length >= 1);
  });

  it('supports attach/read bag bridge helpers', () => {
    const { modelResult, narrativeResult } = buildModelAndNarrative();
    const result = builder.compute(
      createReportSectionContext({
        reportModel: modelResult.model,
        narrativeResult,
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

    attachReportSectionToPipelineContext(context, result);
    assert.equal(
      readReportSectionFromPipelineContext(context)?.sections.length,
      7
    );
    assert.equal(context.bag.sections?.length, 7);

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

    attachReportSectionToPipelineResult(pipelineResult, result);
    assert.ok(readReportSectionFromPipelineResult(pipelineResult));
  });

  it('does not produce PDF/HTML/DOCX artifacts', () => {
    const { modelResult, narrativeResult } = buildModelAndNarrative();
    const result = builder.compute(
      createReportSectionContext({
        reportModel: modelResult.model,
        narrativeResult,
        locale: 'tr'
      })
    );
    assert.equal('pdf' in result, false);
    assert.equal('html' in result, false);
    assert.equal('docx' in result, false);
    assert.ok(Array.isArray(result.sections));
  });

  it('uses reportModelResult when reportModel is omitted', () => {
    const { modelResult, narrativeResult } = buildModelAndNarrative();
    const result = builder.compute(
      createReportSectionContext({
        reportModelResult: modelResult,
        narrativeResult,
        locale: 'tr'
      })
    );
    assert.equal(result.metadata.reportModelId, modelResult.model.metadata.id);
    assert.equal(result.sections.length, 7);
  });

  it('builds sections for empty decision content', () => {
    const { modelResult, narrativeResult } = buildModelAndNarrative({
      recommendations: [],
      actions: [],
      risks: [],
      summary: { headline: '', highlights: [] }
    });
    const result = builder.compute(
      createReportSectionContext({
        reportModel: modelResult.model,
        narrativeResult,
        locale: 'tr'
      })
    );
    assert.equal(result.sections.length, 7);
    assert.equal(
      result.records.find((item) => item.sectionId === 'recommendations')
        ?.content.recommendationCount,
      0
    );
  });
});
