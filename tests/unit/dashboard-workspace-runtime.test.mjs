/**
 * Dashboard Workspace Runtime — PR-202B (en az 20 unit test)
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
  createDashboardWorkspaceRuntime,
  createDashboardWorkspaceRegistry,
  createDashboardWorkspaceContext,
  validateDashboardWorkspaceContext,
  resolveRequestedWidgets,
  projectWorkspaceWidget,
  projectWorkspaceWidgets,
  buildDashboardWorkspaceSummary,
  buildDashboardWorkspaceSummaryItems,
  toEmptyWidgetProjection,
  BUILTIN_DASHBOARD_WORKSPACE_WIDGETS,
  BUILTIN_DASHBOARD_WORKSPACE_WIDGET_COUNT,
  getBuiltinDashboardWorkspaceWidget,
  PIPELINE_BAG_DASHBOARD_WORKSPACE_RESULT_KEY,
  createDashboardWorkspaceLayout,
  DASHBOARD_WORKSPACE_CSS
} = await import('../../src/business-admin/index.ts');

function sampleDashboardResult(overrides = {}) {
  return {
    id: 'dashboard-model-001',
    metadata: {
      id: 'dashboard-model-001',
      title: 'Demo Dashboard',
      description: 'Örnek dashboard',
      locale: 'tr',
      createdAt: '2026-07-21T10:00:00.000Z',
      version: '1.0.0'
    },
    status: 'ready',
    lastStage: 'summary',
    sections: [
      {
        id: 'sec-analysis',
        title: 'Analiz',
        order: 1,
        widgetIds: ['w-analysis'],
        description: 'Son analizler'
      },
      {
        id: 'sec-decision',
        title: 'Karar',
        order: 2,
        widgetIds: ['w-decision']
      }
    ],
    widgets: [
      {
        id: 'w-analysis',
        widgetCode: 'recent-analysis',
        kind: 'list',
        title: 'Analiz A',
        payload: {
          items: [
            { id: 'a1', title: 'Analiz 1', subtitle: 'bugün', status: 'done' }
          ]
        }
      },
      {
        id: 'w-decision',
        widgetCode: 'recent-decisions',
        kind: 'list',
        title: 'Karar B',
        payload: {
          items: [{ id: 'd1', title: 'Karar 1', status: 'approved' }]
        }
      },
      {
        id: 'w-report',
        widgetCode: 'report-table',
        kind: 'table',
        title: 'Rapor C'
      },
      {
        id: 'w-export',
        widgetCode: 'export-list',
        kind: 'list',
        title: 'Export D',
        payload: {
          items: [{ id: 'e1', title: 'Export 1' }]
        }
      }
    ],
    kpis: [
      {
        kpiId: 'kpi-revenue',
        name: 'Gelir',
        unit: 'TRY',
        value: 12000,
        trendLabel: 'yükseliş'
      },
      {
        kpiId: 'kpi-orders',
        name: 'Sipariş',
        unit: 'adet',
        value: 42
      }
    ],
    ...overrides
  };
}

describe('DashboardWorkspaceRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = createDashboardWorkspaceRegistry(true);
  });

  it('seeds all 7 builtin workspace widgets', () => {
    assert.equal(registry.count(), 7);
    assert.equal(BUILTIN_DASHBOARD_WORKSPACE_WIDGET_COUNT, 7);
    assert.equal(BUILTIN_DASHBOARD_WORKSPACE_WIDGETS.length, 7);
  });

  it('returns widgets sorted by order', () => {
    const widgets = registry.getAll();
    assert.equal(widgets[0].id, 'overview');
    assert.equal(widgets[widgets.length - 1].id, 'execution-summary');
    for (let i = 1; i < widgets.length; i++) {
      assert.ok(widgets[i].order >= widgets[i - 1].order);
    }
  });

  it('getById returns kpi-cards widget', () => {
    const widget = registry.getById('kpi-cards');
    assert.ok(widget);
    assert.equal(widget.name, 'KPI Cards');
    assert.equal(widget.kind, 'kpi-cards');
  });

  it('getBuiltinDashboardWorkspaceWidget resolves recent-reports', () => {
    const widget = getBuiltinDashboardWorkspaceWidget('recent-reports');
    assert.ok(widget);
    assert.equal(widget.name, 'Recent Reports');
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
    assert.equal(registry.count(), 8);
    assert.ok(registry.getById('custom-widget'));
  });

  it('register throws on duplicate id', () => {
    assert.throws(
      () => registry.register(BUILTIN_DASHBOARD_WORKSPACE_WIDGETS[0]),
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

  it('getByKind filters list widgets', () => {
    const lists = registry.getByKind('list');
    assert.equal(lists.length, 4);
    assert.ok(lists.every((item) => item.kind === 'list'));
  });

  it('getVisible returns active visible widgets', () => {
    const visible = registry.getVisible();
    assert.equal(visible.length, 7);
  });
});

describe('DashboardWorkspaceContext', () => {
  it('createDashboardWorkspaceContext defaults locale to tr', () => {
    const ctx = createDashboardWorkspaceContext({ tenantId: 'tenant-1' });
    assert.equal(ctx.locale, 'tr');
    assert.equal(ctx.tenantId, 'tenant-1');
  });

  it('accepts dashboardResult and en locale', () => {
    const dashboardResult = sampleDashboardResult();
    const ctx = createDashboardWorkspaceContext({
      tenantId: 'tenant-1',
      locale: 'en',
      dashboardResult
    });
    assert.equal(ctx.locale, 'en');
    assert.equal(ctx.dashboardResult?.id, 'dashboard-model-001');
  });
});

describe('validateDashboardWorkspaceContext', () => {
  let registry;

  beforeEach(() => {
    registry = createDashboardWorkspaceRegistry(true);
  });

  it('passes for valid context', () => {
    const ctx = createDashboardWorkspaceContext({ tenantId: 'tenant-1' });
    const issues = validateDashboardWorkspaceContext(ctx, registry);
    assert.equal(issues.length, 0);
  });

  it('errors on missing tenantId', () => {
    const ctx = createDashboardWorkspaceContext({ tenantId: '  ' });
    const issues = validateDashboardWorkspaceContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'MISSING_TENANT_ID'));
  });

  it('errors on invalid dashboardResult id', () => {
    const ctx = createDashboardWorkspaceContext({
      tenantId: 'tenant-1',
      dashboardResult: sampleDashboardResult({ id: '' })
    });
    const issues = validateDashboardWorkspaceContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'INVALID_DASHBOARD_RESULT'));
  });

  it('warns on unknown widget id', () => {
    const ctx = createDashboardWorkspaceContext({
      tenantId: 'tenant-1',
      widgetIds: ['overview', 'ghost']
    });
    const issues = validateDashboardWorkspaceContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'UNKNOWN_WIDGET_ID'));
  });

  it('warns when upstream business admin lacks dashboard module', () => {
    const admin = createBusinessAdminRuntime().execute(
      createBusinessAdminContext({
        tenantId: 'tenant-1',
        moduleIds: ['users']
      })
    );
    const ctx = createDashboardWorkspaceContext({
      tenantId: 'tenant-1',
      businessAdminResult: admin
    });
    const issues = validateDashboardWorkspaceContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'DASHBOARD_MODULE_NOT_PROJECTED'));
  });
});

describe('resolveRequestedWidgets', () => {
  let registry;

  beforeEach(() => {
    registry = createDashboardWorkspaceRegistry(true);
  });

  it('returns all widgets when widgetIds omitted', () => {
    const ctx = createDashboardWorkspaceContext({ tenantId: 'tenant-1' });
    const { widgets, requestedCount, unavailableCount } =
      resolveRequestedWidgets(ctx, registry);
    assert.equal(widgets.length, 7);
    assert.equal(requestedCount, 7);
    assert.equal(unavailableCount, 0);
  });

  it('filters to requested widget ids', () => {
    const ctx = createDashboardWorkspaceContext({
      tenantId: 'tenant-1',
      widgetIds: ['overview', 'kpi-cards']
    });
    const { widgets, unavailableCount } = resolveRequestedWidgets(
      ctx,
      registry
    );
    assert.equal(widgets.length, 2);
    assert.equal(unavailableCount, 0);
    assert.deepEqual(
      widgets.map((w) => w.id),
      ['overview', 'kpi-cards']
    );
  });
});

describe('Workspace Projection', () => {
  it('projects empty widgets without dashboardResult', () => {
    const def = getBuiltinDashboardWorkspaceWidget('overview');
    assert.ok(def);
    const projection = projectWorkspaceWidget(def);
    assert.equal(projection.projected, true);
    assert.equal(projection.itemCount, 0);
    assert.equal(projection.overview, undefined);
  });

  it('projects overview from DashboardResult', () => {
    const def = getBuiltinDashboardWorkspaceWidget('overview');
    assert.ok(def);
    const projection = projectWorkspaceWidget(def, sampleDashboardResult());
    assert.ok(projection.overview);
    assert.equal(projection.overview.title, 'Demo Dashboard');
    assert.equal(projection.overview.kpiCount, 2);
    assert.equal(projection.title, 'Demo Dashboard');
  });

  it('projects kpi-cards from DashboardResult', () => {
    const def = getBuiltinDashboardWorkspaceWidget('kpi-cards');
    assert.ok(def);
    const projection = projectWorkspaceWidget(def, sampleDashboardResult());
    assert.equal(projection.kpis.length, 2);
    assert.equal(projection.kpis[0].kpiId, 'kpi-revenue');
    assert.equal(projection.itemCount, 2);
  });

  it('projects recent lists from DashboardResult payloads', () => {
    const dashboard = sampleDashboardResult();
    const projections = projectWorkspaceWidgets(
      [
        getBuiltinDashboardWorkspaceWidget('recent-analysis'),
        getBuiltinDashboardWorkspaceWidget('recent-decisions'),
        getBuiltinDashboardWorkspaceWidget('recent-reports'),
        getBuiltinDashboardWorkspaceWidget('recent-exports')
      ].filter(Boolean),
      dashboard
    );
    assert.equal(projections[0].items[0].title, 'Analiz 1');
    assert.equal(projections[1].items[0].title, 'Karar 1');
    assert.equal(projections[2].items[0].title, 'Rapor C');
    assert.equal(projections[3].items[0].title, 'Export 1');
  });

  it('projects execution-summary from DashboardResult', () => {
    const def = getBuiltinDashboardWorkspaceWidget('execution-summary');
    assert.ok(def);
    const projection = projectWorkspaceWidget(def, sampleDashboardResult());
    assert.ok(projection.execution);
    assert.equal(projection.execution.hasDashboardResult, true);
    assert.equal(projection.execution.status, 'ready');
  });

  it('toEmptyWidgetProjection marks active widgets visible', () => {
    const def = getBuiltinDashboardWorkspaceWidget('overview');
    assert.ok(def);
    const projection = toEmptyWidgetProjection(def);
    assert.equal(projection.visible, true);
    assert.equal(projection.projected, true);
  });
});

describe('Workspace Summary', () => {
  it('buildDashboardWorkspaceSummary counts visible widgets', () => {
    const registry = createDashboardWorkspaceRegistry(true);
    const projections = projectWorkspaceWidgets(registry.getAll());
    const summary = buildDashboardWorkspaceSummary(
      projections,
      7,
      0,
      false,
      'tenant-1',
      false
    );
    assert.equal(summary.success, true);
    assert.equal(summary.widgetCount, 7);
    assert.equal(summary.visibleWidgetCount, 7);
    assert.equal(summary.hasDashboardResult, false);
  });

  it('buildDashboardWorkspaceSummaryItems includes tenant and counts', () => {
    const summary = buildDashboardWorkspaceSummary(
      [],
      0,
      0,
      true,
      'tenant-9',
      true
    );
    const items = buildDashboardWorkspaceSummaryItems(
      summary,
      'en',
      'actor-1'
    );
    assert.ok(items.some((i) => i.key === 'tenant-id' && i.value === 'tenant-9'));
    assert.ok(items.some((i) => i.key === 'locale' && i.value === 'en'));
    assert.ok(items.some((i) => i.key === 'actor-id' && i.value === 'actor-1'));
    assert.ok(
      items.some((i) => i.key === 'has-dashboard-result' && i.value === true)
    );
  });
});

describe('DashboardWorkspaceRuntime', () => {
  let runtime;

  beforeEach(() => {
    runtime = createDashboardWorkspaceRuntime();
  });

  it('executes full pipeline and returns DashboardWorkspaceResult', () => {
    const result = runtime.execute(
      createDashboardWorkspaceContext({
        tenantId: 'tenant-1',
        dashboardResult: sampleDashboardResult()
      })
    );
    assert.equal(result.widgets.length, 7);
    assert.equal(result.summary.success, true);
    assert.equal(result.summary.hasDashboardResult, true);
    assert.equal(result.validationIssues.length, 0);
    assert.ok(result.summaryItems.length > 0);
  });

  it('records telemetry with duration, visible widgets, summary items', () => {
    const result = runtime.execute(
      createDashboardWorkspaceContext({ tenantId: 'tenant-1' })
    );
    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.equal(result.telemetry.visibleWidgetCount, 7);
    assert.equal(
      result.telemetry.summaryItemCount,
      result.summaryItems.length
    );
  });

  it('filters widgets by widgetIds', () => {
    const result = runtime.execute(
      createDashboardWorkspaceContext({
        tenantId: 'tenant-1',
        widgetIds: ['overview', 'execution-summary']
      })
    );
    assert.equal(result.widgets.length, 2);
    assert.deepEqual(
      result.widgets.map((w) => w.widgetId),
      ['overview', 'execution-summary']
    );
  });

  it('reports unavailable count for unknown widget ids', () => {
    const result = runtime.execute(
      createDashboardWorkspaceContext({
        tenantId: 'tenant-1',
        widgetIds: ['overview', 'ghost']
      })
    );
    assert.equal(result.summary.unavailableCount, 1);
    assert.equal(result.widgets.length, 1);
  });

  it('exports pipeline bag key constant', () => {
    assert.equal(
      PIPELINE_BAG_DASHBOARD_WORKSPACE_RESULT_KEY,
      'dashboardWorkspaceResult'
    );
  });

  it('exposes registry via getRegistry', () => {
    assert.equal(runtime.getRegistry().count(), 7);
  });

  it('marks unsuccessful when tenantId missing', () => {
    const result = runtime.execute(
      createDashboardWorkspaceContext({ tenantId: '' })
    );
    assert.equal(result.summary.success, false);
    assert.ok(
      result.validationIssues.some((i) => i.code === 'MISSING_TENANT_ID')
    );
  });
});

describe('Responsive layout skeleton', () => {
  it('exports non-empty responsive CSS with mobile breakpoint', () => {
    assert.ok(DASHBOARD_WORKSPACE_CSS.includes('.ib-ba-dw'));
    assert.ok(DASHBOARD_WORKSPACE_CSS.includes('@media (max-width: 640px)'));
  });

  it('createDashboardWorkspaceLayout builds header/overview/cards/lists/summary', () => {
    const previousDocument = globalThis.document;
    const store = new Map();

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
      querySelector() {
        return null;
      }
    }

    globalThis.document = {
      createElement(tag) {
        return new FakeElement(tag);
      },
      getElementById(id) {
        return store.get(id) ?? null;
      },
      head: {
        appendChild(node) {
          store.set(node.id, node);
        }
      }
    };

    try {
      const result = createDashboardWorkspaceRuntime().execute(
        createDashboardWorkspaceContext({
          tenantId: 'tenant-1',
          dashboardResult: sampleDashboardResult()
        })
      );
      const layout = createDashboardWorkspaceLayout(result);
      assert.equal(layout.className, 'ib-ba-dw');
      assert.equal(layout.children.length, 5);
      assert.equal(layout.children[0].className, 'ib-ba-dw__header');
      assert.equal(layout.children[1].className, 'ib-ba-dw__overview');
      assert.equal(layout.children[2].className, 'ib-ba-dw__cards');
      assert.equal(layout.children[3].className, 'ib-ba-dw__lists');
      assert.equal(layout.children[4].className, 'ib-ba-dw__summary');
    } finally {
      globalThis.document = previousDocument;
    }
  });
});
