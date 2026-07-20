/**
 * Export Pipeline Runtime — PR-106A (en az 18 unit test)
 */

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
register(
  pathToFileURL(path.join(__dirname, '../helpers/business-ts-resolve.mjs')).href
);

const {
  EXPORT_PIPELINE_STAGE_COUNT,
  EXPORT_PIPELINE_STAGES,
  EXPORT_RUNTIME_ERROR_CODES,
  createExportPipelineRuntime
} = await import('../../src/business/export/index.ts');

function sampleRequest(overrides = {}) {
  return {
    id: 'export-test-001',
    formatIds: ['pdf', 'json'],
    dashboardModelId: 'dashboard-model-001',
    documentModelId: undefined,
    reportDnaId: 'report-dna-1',
    locale: 'tr',
    templateId: 'tpl-1',
    targetId: 'target-1',
    ...overrides
  };
}

function sampleDashboardModel(overrides = {}) {
  return {
    id: 'dashboard-model-001',
    metadata: {
      id: 'dashboard-model-001',
      title: 'Örnek dashboard',
      reportDnaId: 'report-dna-1',
      datasetId: 'ds-001',
      locale: 'tr',
      createdAt: '2026-07-20T22:00:00.000Z',
      version: '1.0.0',
      layoutId: 'layout-1',
      themeId: 'theme-1'
    },
    status: 'basarili',
    lastStage: 'dashboard-derleme',
    layout: {
      id: 'layout-1',
      name: 'Varsayılan',
      columnCount: 12,
      rowHeightToken: 'dashboard.row.height.default',
      density: 'standart',
      gapToken: 'dashboard.gap.default'
    },
    theme: {
      id: 'theme-1',
      name: 'Varsayılan tema',
      description: 'Test teması',
      defaultLayoutId: 'layout-1',
      surfaceColorToken: 'dashboard.color.surface',
      accentColorToken: 'dashboard.color.accent',
      typographyToken: 'dashboard.typography.default',
      version: '1.0.0'
    },
    sections: [
      {
        id: 'sec-1',
        title: 'Bölüm 1',
        order: 1
      }
    ],
    widgets: [
      {
        id: 'w-1',
        widgetCode: 'W_1',
        title: 'Widget'
      }
    ],
    kpis: [
      {
        id: 'kpi-1',
        code: 'KPI_1',
        label: 'KPI'
      }
    ],
    filters: [],
    navigation: { items: [] },
    ...overrides
  };
}

function sampleDocumentModel(overrides = {}) {
  return {
    id: 'document-model-001',
    metadata: {
      id: 'document-model-001',
      title: 'Örnek doküman',
      reportModelId: 'report-model-001',
      reportDnaId: 'report-dna-1',
      locale: 'tr',
      createdAt: '2026-07-20T22:00:00.000Z',
      version: '1.0.0',
      layoutId: 'doc-layout-1',
      themeId: 'doc-theme-1'
    },
    status: 'basarili',
    lastStage: 'dokuman-derleme',
    layout: {
      id: 'doc-layout-1',
      name: 'Doküman yerleşimi'
    },
    style: {
      id: 'doc-style-1',
      name: 'Doküman stili'
    },
    theme: {
      id: 'doc-theme-1',
      name: 'Doküman teması'
    },
    header: { title: 'Başlık' },
    footer: { text: 'Alt bilgi' },
    sections: [
      {
        id: 'doc-sec-1',
        title: 'Bölüm',
        order: 1
      }
    ],
    ...overrides
  };
}

function sampleContext(overrides = {}) {
  return {
    exportJobId: 'export-job-001',
    locale: 'tr',
    currentStage: 'export-dogrulama',
    status: 'bekliyor',
    dashboardModel: sampleDashboardModel(),
    metadata: { tenant: 'demo' },
    ...overrides
  };
}

describe('ExportPipelineRuntime', () => {
  it('runs all foundation stages in order for a valid DashboardResult', async () => {
    const runtime = createExportPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions.length, EXPORT_PIPELINE_STAGE_COUNT);
    assert.deepEqual(
      detailed.stageExecutions.map((stage) => stage.stageId),
      EXPORT_PIPELINE_STAGES.map((stage) => stage.id)
    );
  });

  it('implements IExportPipeline.run returning ExportResult', async () => {
    const runtime = createExportPipelineRuntime({
      initialContext: sampleContext()
    });

    const result = await runtime.run(sampleRequest());

    assert.equal(result.requestId, 'export-test-001');
    assert.equal(result.lastStage, 'export-sonuc');
    assert.ok(result.metadata);
    assert.equal(result.metadata.dashboardModelId, 'dashboard-model-001');
    assert.deepEqual([...result.metadata.formatIds], ['pdf', 'json']);
    assert.ok(Array.isArray(result.artifacts));
    assert.equal(result.artifacts.length, 0);
    assert.ok(result.summary);
    assert.equal(typeof result.summary.headline, 'string');
    assert.ok(result.completedAt);
  });

  it('executes Export Validation successfully for a valid DashboardResult', async () => {
    const runtime = createExportPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest());
    const validationStage = detailed.stageExecutions[0];

    assert.equal(validationStage.stageId, 'export-dogrulama');
    assert.equal(validationStage.outcome, 'basarili');
    assert.equal(detailed.context.bag.validation?.isValid, true);
    assert.equal(detailed.context.bag.validation?.counts.error, 0);
  });

  it('creates a skeleton ExportModel when validation succeeds', async () => {
    const runtime = createExportPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.ok(detailed.context.bag.exportModel);
    assert.equal(detailed.context.bag.exportModel?.requestId, 'export-test-001');
    assert.equal(
      detailed.context.bag.exportModel?.dashboardModelId,
      'dashboard-model-001'
    );
    assert.deepEqual(
      [...(detailed.context.bag.exportModel?.formatIds ?? [])],
      ['pdf', 'json']
    );
    assert.equal(detailed.context.bag.exportModel?.status, 'suruyor');
  });

  it('marks placeholder stages as not-implemented and still assembles ExportResult', async () => {
    const runtime = createExportPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest());
    const placeholderStages = detailed.stageExecutions.filter((stage) =>
      [
        'format-cozumu',
        'sablon-cozumu',
        'export-birlestirme',
        'artifact-derleme'
      ].includes(stage.stageId)
    );

    assert.equal(placeholderStages.length, 4);
    assert.ok(
      placeholderStages.every((stage) => stage.outcome === 'not-implemented')
    );
    assert.ok(
      placeholderStages.every((stage) =>
        stage.errors.some(
          (error) => error.code === EXPORT_RUNTIME_ERROR_CODES.NOT_IMPLEMENTED
        )
      )
    );
    assert.equal(detailed.stageExecutions.at(-1)?.stageId, 'export-sonuc');
    assert.equal(detailed.stageExecutions.at(-1)?.outcome, 'basarili');
    assert.equal(detailed.exportResult.status, 'basarisiz');
    assert.equal(detailed.exportResult.requestId, 'export-test-001');
  });

  it('fails validation for an empty DashboardResult missing required fields', async () => {
    const runtime = createExportPipelineRuntime({
      initialContext: sampleContext({
        dashboardModel: /** @type {any} */ ({})
      })
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) => error.code === 'DASHBOARD_MODEL_ID_REQUIRED'
      )
    );
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) => error.code === 'DASHBOARD_METADATA_REQUIRED'
      )
    );
    assert.equal(detailed.context.bag.exportModel, undefined);
    assert.equal(detailed.telemetry.summary.stagesSkipped, 4);
    assert.ok(detailed.exportResult);
    assert.equal(detailed.exportResult.status, 'basarisiz');
  });

  it('fails validation when no Document/Dashboard source is present', async () => {
    const runtime = createExportPipelineRuntime({
      initialContext: sampleContext({
        dashboardModel: undefined,
        documentModel: undefined
      })
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) => error.code === EXPORT_RUNTIME_ERROR_CODES.SOURCE_REQUIRED
      )
    );
  });

  it('halts after validation failure and skips intermediate stages', async () => {
    const runtime = createExportPipelineRuntime({
      initialContext: sampleContext({
        dashboardModel: sampleDashboardModel({
          widgets: /** @type {any} */ ('broken')
        })
      })
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.deepEqual(
      detailed.stageExecutions.slice(1).map((stage) => stage.outcome),
      ['atlandi', 'atlandi', 'atlandi', 'atlandi', 'basarili']
    );
    assert.equal(detailed.exportResult.status, 'basarisiz');
    assert.equal(detailed.exportResult.lastStage, 'export-sonuc');
  });

  it('fails validation when dashboardModelId mismatches DashboardModel.id', async () => {
    const runtime = createExportPipelineRuntime({
      initialContext: sampleContext({
        dashboardModel: sampleDashboardModel({ id: 'other-dashboard' })
      })
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) =>
          error.code === EXPORT_RUNTIME_ERROR_CODES.DASHBOARD_MODEL_ID_MISMATCH
      )
    );
  });

  it('fails validation when documentModelId mismatches DocumentModel.id', async () => {
    const runtime = createExportPipelineRuntime({
      initialContext: sampleContext({
        dashboardModel: undefined,
        documentModel: sampleDocumentModel({ id: 'other-document' })
      })
    });

    const detailed = await runtime.runWithDetails(
      sampleRequest({
        dashboardModelId: undefined,
        documentModelId: 'document-model-001'
      })
    );

    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) =>
          error.code === EXPORT_RUNTIME_ERROR_CODES.DOCUMENT_MODEL_ID_MISMATCH
      )
    );
  });

  it('validates a DocumentModel source successfully', async () => {
    const runtime = createExportPipelineRuntime({
      initialContext: sampleContext({
        dashboardModel: undefined,
        documentModel: sampleDocumentModel()
      })
    });

    const detailed = await runtime.runWithDetails(
      sampleRequest({
        dashboardModelId: undefined,
        documentModelId: 'document-model-001'
      })
    );

    assert.equal(detailed.stageExecutions[0].outcome, 'basarili');
    assert.equal(
      detailed.context.bag.exportModel?.documentModelId,
      'document-model-001'
    );
  });

  it('records telemetry for total duration, stage durations, outcomes, and summary', async () => {
    const runtime = createExportPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.ok(detailed.totalDurationMs >= 0);
    assert.ok(detailed.telemetry.totalDurationMs >= 0);
    assert.equal(
      detailed.telemetry.stageOutcomes['export-dogrulama'],
      'basarili'
    );
    assert.equal(detailed.telemetry.stageOutcomes['export-sonuc'], 'basarili');
    assert.ok(detailed.telemetry.stageDurationsMs['export-dogrulama'] >= 0);
    assert.equal(detailed.telemetry.summary.stagesExecuted, 6);
    assert.equal(detailed.telemetry.summary.stagesSucceeded, 2);
    assert.equal(detailed.telemetry.summary.stagesNotImplemented, 4);
    assert.equal(detailed.telemetry.summary.stagesFailed, 0);
    assert.equal(detailed.telemetry.summary.stagesSkipped, 0);
    assert.equal(detailed.telemetry.summary.success, false);
  });

  it('records skipped stage counts in telemetry after validation failure', async () => {
    const runtime = createExportPipelineRuntime({
      initialContext: sampleContext({
        dashboardModel: /** @type {any} */ ({})
      })
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.telemetry.summary.stagesFailed, 1);
    assert.equal(detailed.telemetry.summary.stagesSkipped, 4);
    assert.equal(detailed.telemetry.summary.stagesSucceeded, 1);
    assert.equal(detailed.telemetry.summary.stagesNotImplemented, 0);
  });

  it('fails request validation before the full stage loop when id is missing', async () => {
    const runtime = createExportPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest({ id: '' }));

    assert.equal(detailed.stageExecutions.length, 1);
    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) => error.code === EXPORT_RUNTIME_ERROR_CODES.INVALID_REQUEST
      )
    );
    assert.ok(detailed.exportResult);
  });

  it('fails request validation when formatIds is empty', async () => {
    const runtime = createExportPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(
      sampleRequest({ formatIds: [] })
    );

    assert.equal(detailed.stageExecutions.length, 1);
    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) => error.code === EXPORT_RUNTIME_ERROR_CODES.INVALID_REQUEST
      )
    );
  });

  it('returns a structured failure when no context source is available', async () => {
    const runtime = createExportPipelineRuntime();

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions.length, 1);
    assert.equal(detailed.stageExecutions[0].outcome, 'basarisiz');
    assert.ok(
      detailed.stageExecutions[0].errors.some(
        (error) =>
          error.code === EXPORT_RUNTIME_ERROR_CODES.CONTEXT_NOT_AVAILABLE
      )
    );
  });

  it('uses a resolver for run(request) when context is not preloaded', async () => {
    const runtime = createExportPipelineRuntime({
      contextResolver: async (request) =>
        sampleContext({
          exportJobId: `${request.id}-resolved`
        })
    });

    const result = await runtime.run(sampleRequest());

    assert.equal(result.requestId, 'export-test-001');
    assert.equal(result.metadata.dashboardModelId, 'dashboard-model-001');
  });

  it('preserves validation warnings without failing the validation stage', async () => {
    const runtime = createExportPipelineRuntime({
      initialContext: sampleContext({
        dashboardModel: sampleDashboardModel({
          status: 'basarisiz',
          sections: [],
          widgets: [],
          kpis: []
        })
      })
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.equal(detailed.stageExecutions[0].outcome, 'basarili');
    assert.ok((detailed.context.bag.validation?.counts.warning ?? 0) >= 1);
    assert.ok(
      detailed.stageExecutions[0].warnings.some(
        (warning) => warning.code === 'DASHBOARD_STATUS_FAILED'
      )
    );
    assert.ok(
      detailed.stageExecutions[0].warnings.some(
        (warning) => warning.code === 'DASHBOARD_CONTENT_EMPTY'
      )
    );
    assert.ok(detailed.context.bag.exportModel);
  });

  it('prefers explicit context over the preloaded initial context', async () => {
    const runtime = createExportPipelineRuntime({
      initialContext: sampleContext({
        dashboardModel: sampleDashboardModel({ id: 'dashboard-initial' })
      })
    });

    const detailed = await runtime.runWithDetails(
      sampleRequest({ dashboardModelId: 'dashboard-explicit' }),
      sampleContext({
        dashboardModel: sampleDashboardModel({
          id: 'dashboard-explicit',
          metadata: {
            id: 'dashboard-explicit',
            title: 'Explicit',
            reportDnaId: 'report-dna-1',
            datasetId: 'ds-001',
            locale: 'tr',
            createdAt: '2026-07-20T22:00:00.000Z',
            version: '1.0.0',
            layoutId: 'layout-1',
            themeId: 'theme-1'
          }
        })
      })
    );

    assert.equal(
      detailed.context.exportContext.dashboardModel?.id,
      'dashboard-explicit'
    );
    assert.equal(detailed.stageExecutions[0].outcome, 'basarili');
  });

  it('stores export-only bag keys without borrowing other engine bags', async () => {
    const runtime = createExportPipelineRuntime({
      initialContext: sampleContext()
    });

    const detailed = await runtime.runWithDetails(sampleRequest());

    assert.ok(detailed.context.bag.validation);
    assert.ok(detailed.context.bag.exportModel);
    assert.ok(detailed.context.bag.summary);
    assert.ok(detailed.context.bag.exportResult);
    assert.equal(
      Object.prototype.hasOwnProperty.call(detailed.context.bag, 'sourceValidation'),
      false
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(detailed.context.bag, 'decisionValidation'),
      false
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(detailed.context.bag, 'dashboardModel'),
      false
    );
  });

  it('always returns a structurally valid ExportResult even on hard failure', async () => {
    const runtime = createExportPipelineRuntime({
      initialContext: sampleContext({
        dashboardModel: undefined,
        documentModel: undefined
      })
    });

    const detailed = await runtime.runWithDetails(sampleRequest());
    const result = detailed.exportResult;

    assert.equal(result.requestId, 'export-test-001');
    assert.equal(result.status, 'basarisiz');
    assert.equal(result.lastStage, 'export-sonuc');
    assert.ok(result.metadata);
    assert.equal(typeof result.metadata.title, 'string');
    assert.ok(Array.isArray(result.metadata.formatIds));
    assert.ok(Array.isArray(result.artifacts));
    assert.ok(result.summary);
    assert.equal(typeof result.summary.artifactCount, 'number');
    assert.ok(Array.isArray(result.summary.formatLabels));
  });
});
