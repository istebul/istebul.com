/**
 * Reports Workspace Runtime — PR-202C (en az 35 unit test)
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
  createBusinessAdminRuntime,
  createBusinessAdminContext,
  createReportsWorkspaceRuntime,
  createReportsWorkspaceRegistry,
  createReportsWorkspaceContext,
  validateReportsWorkspaceContext,
  resolveRequestedReportsWidgets,
  projectReportsWorkspaceWidget,
  projectReportsWorkspaceWidgets,
  buildReportsWorkspaceSummary,
  buildReportsWorkspaceSummaryItems,
  toEmptyReportsWidgetProjection,
  BUILTIN_REPORTS_WORKSPACE_WIDGETS,
  BUILTIN_REPORTS_WORKSPACE_WIDGET_COUNT,
  getBuiltinReportsWorkspaceWidget,
  PIPELINE_BAG_REPORTS_WORKSPACE_RESULT_KEY,
  createReportsWorkspaceLayout,
  REPORTS_WORKSPACE_CSS
} = await import('../../src/business-admin/index.ts');

function sampleReportResult(overrides = {}) {
  return {
    id: 'report-model-001',
    metadata: {
      id: 'report-model-001',
      title: 'Demo Rapor',
      description: 'Örnek rapor',
      reportDnaId: 'dna-001',
      locale: 'tr',
      createdAt: '2026-07-21T10:00:00.000Z',
      version: '1.0.0',
      tags: ['analiz', 'karar']
    },
    status: 'basarili',
    lastStage: 'rapor-derleme',
    executiveSummary: {
      headline: 'Genel görünüm olumlu',
      body: 'Rapor özeti gövdesi.',
      highlights: ['Bulgu 1', 'Öneri 1']
    },
    sections: [
      {
        id: 'sec-ozet',
        sectionCode: 'ozet',
        kind: 'ozet',
        title: 'Özet',
        order: 1,
        content: 'Özet içerik'
      },
      {
        id: 'sec-bulgular',
        sectionCode: 'bulgular',
        kind: 'bulgular',
        title: 'Bulgular',
        order: 2,
        content: 'Bulgu içerik'
      },
      {
        id: 'sec-oneriler',
        sectionCode: 'oneriler',
        kind: 'oneriler',
        title: 'Öneriler',
        order: 3
      }
    ],
    findings: [
      {
        id: 'f1',
        code: 'F-1',
        title: 'Bulgu A',
        description: 'Açıklama A',
        severity: 'orta'
      }
    ],
    recommendations: [
      {
        id: 'r1',
        code: 'R-1',
        title: 'Öneri A',
        description: 'Aksiyon A',
        priorityLevel: 'yuksek'
      }
    ],
    appendices: [],
    references: [],
    ...overrides
  };
}

describe('ReportsWorkspaceRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = createReportsWorkspaceRegistry(true);
  });

  it('seeds all 6 builtin workspace widgets', () => {
    assert.equal(registry.count(), 6);
    assert.equal(BUILTIN_REPORTS_WORKSPACE_WIDGET_COUNT, 6);
    assert.equal(BUILTIN_REPORTS_WORKSPACE_WIDGETS.length, 6);
  });

  it('returns widgets sorted by order', () => {
    const widgets = registry.getAll();
    assert.equal(widgets[0].id, 'reports-overview');
    assert.equal(widgets[widgets.length - 1].id, 'execution-summary');
    for (let i = 1; i < widgets.length; i++) {
      assert.ok(widgets[i].order >= widgets[i - 1].order);
    }
  });

  it('getById returns report-details widget', () => {
    const widget = registry.getById('report-details');
    assert.ok(widget);
    assert.equal(widget.name, 'Report Details');
    assert.equal(widget.kind, 'detail');
  });

  it('getBuiltinReportsWorkspaceWidget resolves report-categories', () => {
    const widget = getBuiltinReportsWorkspaceWidget('report-categories');
    assert.ok(widget);
    assert.equal(widget.name, 'Report Categories');
  });

  it('register adds a new widget', () => {
    registry.register({
      id: 'custom-widget',
      name: 'Custom',
      description: 'Test',
      order: 99,
      kind: 'list',
      status: 'coming-soon',
      visible: false
    });
    assert.equal(registry.count(), 7);
    assert.ok(registry.getById('custom-widget'));
  });

  it('register throws on duplicate id', () => {
    assert.throws(
      () => registry.register(BUILTIN_REPORTS_WORKSPACE_WIDGETS[0]),
      /zaten kayıtlı/
    );
  });

  it('register throws on missing id', () => {
    assert.throws(
      () =>
        registry.register({
          id: '',
          name: 'X',
          description: 'Y',
          order: 1,
          kind: 'list',
          status: 'active',
          visible: true
        }),
      /id zorunludur/
    );
  });

  it('register throws on missing name', () => {
    assert.throws(
      () =>
        registry.register({
          id: 'x',
          name: '',
          description: 'Y',
          order: 1,
          kind: 'list',
          status: 'active',
          visible: true
        }),
      /name zorunludur/
    );
  });

  it('unregister removes a widget', () => {
    assert.ok(registry.unregister('report-status'));
    assert.equal(registry.count(), 5);
    assert.equal(registry.getById('report-status'), undefined);
  });

  it('getByKind filters list widgets', () => {
    const lists = registry.getByKind('list');
    assert.equal(lists.length, 1);
    assert.equal(lists[0].id, 'recent-reports');
  });

  it('getVisible returns active visible widgets', () => {
    assert.equal(registry.getVisible().length, 6);
  });

  it('clear empties the registry', () => {
    registry.clear();
    assert.equal(registry.count(), 0);
  });
});

describe('ReportsWorkspaceContext', () => {
  it('defaults locale to tr', () => {
    const ctx = createReportsWorkspaceContext({ tenantId: 'tenant-1' });
    assert.equal(ctx.locale, 'tr');
    assert.equal(ctx.tenantId, 'tenant-1');
  });

  it('accepts reportResult, recentReports and en locale', () => {
    const reportResult = sampleReportResult();
    const ctx = createReportsWorkspaceContext({
      tenantId: 'tenant-1',
      locale: 'en',
      reportResult,
      recentReports: [reportResult]
    });
    assert.equal(ctx.locale, 'en');
    assert.equal(ctx.reportResult?.id, 'report-model-001');
    assert.equal(ctx.recentReports?.length, 1);
  });
});

describe('validateReportsWorkspaceContext', () => {
  let registry;

  beforeEach(() => {
    registry = createReportsWorkspaceRegistry(true);
  });

  it('passes for valid context', () => {
    const ctx = createReportsWorkspaceContext({ tenantId: 'tenant-1' });
    assert.equal(validateReportsWorkspaceContext(ctx, registry).length, 0);
  });

  it('errors on missing tenantId', () => {
    const issues = validateReportsWorkspaceContext(
      createReportsWorkspaceContext({ tenantId: '  ' }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'MISSING_TENANT_ID'));
  });

  it('errors on invalid reportResult id', () => {
    const issues = validateReportsWorkspaceContext(
      createReportsWorkspaceContext({
        tenantId: 'tenant-1',
        reportResult: sampleReportResult({ id: '' })
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'INVALID_REPORT_RESULT'));
  });

  it('errors on invalid report metadata title', () => {
    const report = sampleReportResult();
    report.metadata = { ...report.metadata, title: undefined };
    const issues = validateReportsWorkspaceContext(
      createReportsWorkspaceContext({
        tenantId: 'tenant-1',
        reportResult: report
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'INVALID_REPORT_METADATA'));
  });

  it('errors on invalid executive summary', () => {
    const report = sampleReportResult({
      executiveSummary: { headline: undefined, body: 'x' }
    });
    const issues = validateReportsWorkspaceContext(
      createReportsWorkspaceContext({
        tenantId: 'tenant-1',
        reportResult: report
      }),
      registry
    );
    assert.ok(
      issues.some((i) => i.code === 'INVALID_REPORT_EXECUTIVE_SUMMARY')
    );
  });

  it('warns on unknown widget id', () => {
    const issues = validateReportsWorkspaceContext(
      createReportsWorkspaceContext({
        tenantId: 'tenant-1',
        widgetIds: ['reports-overview', 'ghost']
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'UNKNOWN_WIDGET_ID'));
  });

  it('warns on empty widgetIds', () => {
    const issues = validateReportsWorkspaceContext(
      createReportsWorkspaceContext({
        tenantId: 'tenant-1',
        widgetIds: []
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'EMPTY_WIDGET_IDS'));
  });

  it('warns on duplicate widget ids', () => {
    const issues = validateReportsWorkspaceContext(
      createReportsWorkspaceContext({
        tenantId: 'tenant-1',
        widgetIds: ['reports-overview', 'reports-overview']
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'DUPLICATE_WIDGET_ID'));
  });

  it('warns on empty actorId', () => {
    const issues = validateReportsWorkspaceContext(
      createReportsWorkspaceContext({
        tenantId: 'tenant-1',
        actorId: '   '
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'EMPTY_ACTOR_ID'));
  });

  it('warns when upstream business admin lacks reports module', () => {
    const admin = createBusinessAdminRuntime().execute(
      createBusinessAdminContext({
        tenantId: 'tenant-1',
        moduleIds: ['users']
      })
    );
    const issues = validateReportsWorkspaceContext(
      createReportsWorkspaceContext({
        tenantId: 'tenant-1',
        businessAdminResult: admin
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'REPORTS_MODULE_NOT_PROJECTED'));
  });

  it('errors when recentReports is not an array', () => {
    const issues = validateReportsWorkspaceContext(
      createReportsWorkspaceContext({
        tenantId: 'tenant-1',
        recentReports: /** @type {any} */ ('nope')
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'INVALID_RECENT_REPORTS'));
  });
});

describe('resolveRequestedReportsWidgets', () => {
  let registry;

  beforeEach(() => {
    registry = createReportsWorkspaceRegistry(true);
  });

  it('returns all widgets when widgetIds omitted', () => {
    const { widgets, requestedCount, unavailableCount } =
      resolveRequestedReportsWidgets(
        createReportsWorkspaceContext({ tenantId: 'tenant-1' }),
        registry
      );
    assert.equal(widgets.length, 6);
    assert.equal(requestedCount, 6);
    assert.equal(unavailableCount, 0);
  });

  it('filters to requested widget ids', () => {
    const { widgets, unavailableCount } = resolveRequestedReportsWidgets(
      createReportsWorkspaceContext({
        tenantId: 'tenant-1',
        widgetIds: ['reports-overview', 'report-details']
      }),
      registry
    );
    assert.equal(widgets.length, 2);
    assert.equal(unavailableCount, 0);
    assert.deepEqual(
      widgets.map((w) => w.id),
      ['reports-overview', 'report-details']
    );
  });

  it('counts unavailable widgets', () => {
    const { widgets, unavailableCount } = resolveRequestedReportsWidgets(
      createReportsWorkspaceContext({
        tenantId: 'tenant-1',
        widgetIds: ['reports-overview', 'missing']
      }),
      registry
    );
    assert.equal(widgets.length, 1);
    assert.equal(unavailableCount, 1);
  });
});

describe('Workspace Projection', () => {
  it('projects empty widgets without reportResult', () => {
    const def = getBuiltinReportsWorkspaceWidget('reports-overview');
    assert.ok(def);
    const projection = projectReportsWorkspaceWidget(
      def,
      createReportsWorkspaceContext({ tenantId: 'tenant-1' })
    );
    assert.equal(projection.projected, true);
    assert.equal(projection.itemCount, 0);
    assert.equal(projection.overview, undefined);
  });

  it('projects reports-overview from ReportResult', () => {
    const def = getBuiltinReportsWorkspaceWidget('reports-overview');
    assert.ok(def);
    const projection = projectReportsWorkspaceWidget(
      def,
      createReportsWorkspaceContext({
        tenantId: 'tenant-1',
        reportResult: sampleReportResult()
      })
    );
    assert.ok(projection.overview);
    assert.equal(projection.overview.title, 'Demo Rapor');
    assert.equal(projection.overview.findingCount, 1);
    assert.equal(projection.overview.headline, 'Genel görünüm olumlu');
  });

  it('projects recent-reports from reportResult alone', () => {
    const def = getBuiltinReportsWorkspaceWidget('recent-reports');
    assert.ok(def);
    const projection = projectReportsWorkspaceWidget(
      def,
      createReportsWorkspaceContext({
        tenantId: 'tenant-1',
        reportResult: sampleReportResult()
      })
    );
    assert.equal(projection.itemCount, 1);
    assert.equal(projection.items[0].title, 'Demo Rapor');
  });

  it('projects recent-reports from recentReports list', () => {
    const def = getBuiltinReportsWorkspaceWidget('recent-reports');
    assert.ok(def);
    const projection = projectReportsWorkspaceWidget(
      def,
      createReportsWorkspaceContext({
        tenantId: 'tenant-1',
        recentReports: [
          sampleReportResult({ id: 'r1', metadata: { ...sampleReportResult().metadata, title: 'R1' } }),
          sampleReportResult({ id: 'r2', metadata: { ...sampleReportResult().metadata, title: 'R2' } })
        ]
      })
    );
    assert.equal(projection.itemCount, 2);
    assert.deepEqual(
      projection.items.map((i) => i.title),
      ['R1', 'R2']
    );
  });

  it('projects report-categories from section kinds and tags', () => {
    const def = getBuiltinReportsWorkspaceWidget('report-categories');
    assert.ok(def);
    const projection = projectReportsWorkspaceWidget(
      def,
      createReportsWorkspaceContext({
        tenantId: 'tenant-1',
        reportResult: sampleReportResult()
      })
    );
    assert.ok(projection.itemCount >= 3);
    assert.ok(projection.items.some((i) => i.category === 'ozet'));
    assert.ok(projection.items.some((i) => i.category === 'tag:analiz'));
  });

  it('projects report-details with sections findings recommendations', () => {
    const def = getBuiltinReportsWorkspaceWidget('report-details');
    assert.ok(def);
    const projection = projectReportsWorkspaceWidget(
      def,
      createReportsWorkspaceContext({
        tenantId: 'tenant-1',
        reportResult: sampleReportResult()
      })
    );
    assert.ok(projection.detail);
    assert.equal(projection.detail.sections.length, 3);
    assert.equal(projection.detail.findings[0].title, 'Bulgu A');
    assert.equal(projection.detail.recommendations[0].title, 'Öneri A');
    assert.equal(projection.detail.highlights.length, 2);
  });

  it('projects report-status from ReportResult', () => {
    const def = getBuiltinReportsWorkspaceWidget('report-status');
    assert.ok(def);
    const projection = projectReportsWorkspaceWidget(
      def,
      createReportsWorkspaceContext({
        tenantId: 'tenant-1',
        reportResult: sampleReportResult()
      })
    );
    assert.ok(projection.reportStatus);
    assert.equal(projection.reportStatus.status, 'basarili');
    assert.equal(projection.reportStatus.lastStage, 'rapor-derleme');
  });

  it('projects execution-summary with report count', () => {
    const def = getBuiltinReportsWorkspaceWidget('execution-summary');
    assert.ok(def);
    const projection = projectReportsWorkspaceWidget(
      def,
      createReportsWorkspaceContext({
        tenantId: 'tenant-1',
        reportResult: sampleReportResult(),
        recentReports: [
          sampleReportResult({ id: 'a' }),
          sampleReportResult({ id: 'b' })
        ]
      })
    );
    assert.ok(projection.execution);
    assert.equal(projection.execution.reportCount, 2);
    assert.equal(projection.execution.hasReportResult, true);
  });

  it('toEmptyReportsWidgetProjection marks active widgets visible', () => {
    const def = getBuiltinReportsWorkspaceWidget('reports-overview');
    assert.ok(def);
    const projection = toEmptyReportsWidgetProjection(def);
    assert.equal(projection.visible, true);
    assert.equal(projection.projected, true);
  });

  it('projectReportsWorkspaceWidgets returns frozen list of 6', () => {
    const registry = createReportsWorkspaceRegistry(true);
    const projections = projectReportsWorkspaceWidgets(
      registry.getAll(),
      createReportsWorkspaceContext({
        tenantId: 'tenant-1',
        reportResult: sampleReportResult()
      })
    );
    assert.equal(projections.length, 6);
    assert.ok(Object.isFrozen(projections));
  });
});

describe('Workspace Summary', () => {
  it('counts visible reports from recent-reports widget', () => {
    const registry = createReportsWorkspaceRegistry(true);
    const projections = projectReportsWorkspaceWidgets(
      registry.getAll(),
      createReportsWorkspaceContext({
        tenantId: 'tenant-1',
        recentReports: [
          sampleReportResult({ id: 'a' }),
          sampleReportResult({ id: 'b' }),
          sampleReportResult({ id: 'c' })
        ]
      })
    );
    const summary = buildReportsWorkspaceSummary(
      projections,
      6,
      0,
      false,
      'tenant-1',
      true
    );
    assert.equal(summary.visibleReportCount, 3);
    assert.equal(summary.visibleWidgetCount, 6);
    assert.equal(summary.success, true);
  });

  it('buildReportsWorkspaceSummaryItems includes report count and actor', () => {
    const summary = buildReportsWorkspaceSummary(
      [],
      0,
      0,
      true,
      'tenant-9',
      true
    );
    const items = buildReportsWorkspaceSummaryItems(summary, 'en', 'actor-1');
    assert.ok(items.some((i) => i.key === 'tenant-id' && i.value === 'tenant-9'));
    assert.ok(
      items.some((i) => i.key === 'visible-report-count' && i.value === 0)
    );
    assert.ok(items.some((i) => i.key === 'actor-id' && i.value === 'actor-1'));
    assert.ok(items.some((i) => i.key === 'has-report-result' && i.value === true));
  });
});

describe('ReportsWorkspaceRuntime', () => {
  let runtime;

  beforeEach(() => {
    runtime = createReportsWorkspaceRuntime();
  });

  it('executes full pipeline and returns ReportsWorkspaceResult', () => {
    const result = runtime.execute(
      createReportsWorkspaceContext({
        tenantId: 'tenant-1',
        reportResult: sampleReportResult()
      })
    );
    assert.equal(result.widgets.length, 6);
    assert.equal(result.summary.success, true);
    assert.equal(result.summary.hasReportResult, true);
    assert.equal(result.validationIssues.length, 0);
    assert.ok(result.summaryItems.length > 0);
  });

  it('records telemetry with duration, visible reports, summary items', () => {
    const result = runtime.execute(
      createReportsWorkspaceContext({
        tenantId: 'tenant-1',
        recentReports: [
          sampleReportResult({ id: 'a' }),
          sampleReportResult({ id: 'b' })
        ]
      })
    );
    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.equal(result.telemetry.visibleReportCount, 2);
    assert.equal(
      result.telemetry.summaryItemCount,
      result.summaryItems.length
    );
  });

  it('filters widgets by widgetIds', () => {
    const result = runtime.execute(
      createReportsWorkspaceContext({
        tenantId: 'tenant-1',
        widgetIds: ['reports-overview', 'execution-summary']
      })
    );
    assert.equal(result.widgets.length, 2);
    assert.deepEqual(
      result.widgets.map((w) => w.widgetId),
      ['reports-overview', 'execution-summary']
    );
  });

  it('reports unavailable count for unknown widget ids', () => {
    const result = runtime.execute(
      createReportsWorkspaceContext({
        tenantId: 'tenant-1',
        widgetIds: ['reports-overview', 'ghost']
      })
    );
    assert.equal(result.summary.unavailableCount, 1);
    assert.equal(result.widgets.length, 1);
  });

  it('exports pipeline bag key constant', () => {
    assert.equal(
      PIPELINE_BAG_REPORTS_WORKSPACE_RESULT_KEY,
      'reportsWorkspaceResult'
    );
  });

  it('exposes registry via getRegistry', () => {
    assert.equal(runtime.getRegistry().count(), 6);
  });

  it('marks unsuccessful when tenantId missing', () => {
    const result = runtime.execute(
      createReportsWorkspaceContext({ tenantId: '' })
    );
    assert.equal(result.summary.success, false);
    assert.ok(
      result.validationIssues.some((i) => i.code === 'MISSING_TENANT_ID')
    );
  });

  it('sets hasReportResult when only recentReports provided', () => {
    const result = runtime.execute(
      createReportsWorkspaceContext({
        tenantId: 'tenant-1',
        recentReports: [sampleReportResult()]
      })
    );
    assert.equal(result.summary.hasReportResult, true);
    assert.equal(result.summary.visibleReportCount, 1);
  });
});

describe('Responsive layout skeleton', () => {
  it('exports non-empty responsive CSS with mobile breakpoint', () => {
    assert.ok(REPORTS_WORKSPACE_CSS.includes('.ib-ba-rw'));
    assert.ok(REPORTS_WORKSPACE_CSS.includes('@media (max-width: 640px)'));
  });

  it('createReportsWorkspaceLayout builds header/overview/list/detail/summary', () => {
    const previousDocument = globalThis.document;

    class FakeElement {
      constructor(tagName) {
        this.tagName = String(tagName).toUpperCase();
        this.className = '';
        this.textContent = '';
        this.children = [];
        this.attributes = new Map();
      }
      setAttribute(name, value) {
        this.attributes.set(name, value);
      }
      append(...nodes) {
        this.children.push(...nodes);
      }
    }

    globalThis.document = {
      createElement(tag) {
        return new FakeElement(tag);
      }
    };

    try {
      const result = createReportsWorkspaceRuntime().execute(
        createReportsWorkspaceContext({
          tenantId: 'tenant-1',
          reportResult: sampleReportResult()
        })
      );
      const layout = createReportsWorkspaceLayout(result);
      assert.equal(layout.className, 'ib-ba-rw');
      assert.equal(layout.children.length, 5);
      assert.equal(layout.children[0].className, 'ib-ba-rw__header');
      assert.equal(layout.children[1].className, 'ib-ba-rw__overview');
      assert.equal(layout.children[2].className, 'ib-ba-rw__list');
      assert.equal(layout.children[3].className, 'ib-ba-rw__detail');
      assert.equal(layout.children[4].className, 'ib-ba-rw__summary');
    } finally {
      globalThis.document = previousDocument;
    }
  });
});
