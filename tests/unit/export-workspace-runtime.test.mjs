/**
 * Export Workspace Runtime — PR-202D (en az 35 unit test)
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
  createExportWorkspaceRuntime,
  createExportWorkspaceRegistry,
  createExportWorkspaceContext,
  validateExportWorkspaceContext,
  resolveRequestedExportWidgets,
  projectExportWorkspaceWidget,
  projectExportWorkspaceWidgets,
  buildExportWorkspaceSummary,
  buildExportWorkspaceSummaryItems,
  toEmptyExportWidgetProjection,
  BUILTIN_EXPORT_WORKSPACE_WIDGETS,
  BUILTIN_EXPORT_WORKSPACE_WIDGET_COUNT,
  getBuiltinExportWorkspaceWidget,
  PIPELINE_BAG_EXPORT_WORKSPACE_RESULT_KEY,
  createExportWorkspaceLayout,
  EXPORT_WORKSPACE_CSS
} = await import('../../src/business-admin/index.ts');

function sampleExportResult(overrides = {}) {
  return {
    requestId: 'export-req-001',
    status: 'basarili',
    lastStage: 'export-sonuc',
    metadata: {
      id: 'export-meta-001',
      title: 'Demo Export',
      locale: 'tr',
      createdAt: '2026-07-21T10:00:00.000Z',
      version: '1.0.0',
      formatIds: ['pdf', 'json'],
      documentModelId: 'doc-001',
      dashboardModelId: 'dash-001'
    },
    artifacts: [
      {
        id: 'art-pdf',
        formatId: 'pdf',
        fileName: 'demo.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024
      },
      {
        id: 'art-json',
        formatId: 'json',
        fileName: 'demo.json',
        mimeType: 'application/json'
      }
    ],
    summary: {
      headline: 'Export tamamlandı',
      artifactCount: 2,
      formatLabels: ['PDF', 'JSON'],
      warnings: ['küçük uyarı']
    },
    completedAt: '2026-07-21T10:05:00.000Z',
    ...overrides
  };
}

describe('ExportWorkspaceRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = createExportWorkspaceRegistry(true);
  });

  it('seeds all 5 builtin workspace widgets', () => {
    assert.equal(registry.count(), 5);
    assert.equal(BUILTIN_EXPORT_WORKSPACE_WIDGET_COUNT, 5);
    assert.equal(BUILTIN_EXPORT_WORKSPACE_WIDGETS.length, 5);
  });

  it('returns widgets sorted by order', () => {
    const widgets = registry.getAll();
    assert.equal(widgets[0].id, 'exports-overview');
    assert.equal(widgets[widgets.length - 1].id, 'execution-summary');
    for (let i = 1; i < widgets.length; i++) {
      assert.ok(widgets[i].order >= widgets[i - 1].order);
    }
  });

  it('getById returns available-formats widget', () => {
    const widget = registry.getById('available-formats');
    assert.ok(widget);
    assert.equal(widget.name, 'Available Formats');
    assert.equal(widget.kind, 'formats');
  });

  it('getBuiltinExportWorkspaceWidget resolves export-status', () => {
    const widget = getBuiltinExportWorkspaceWidget('export-status');
    assert.ok(widget);
    assert.equal(widget.name, 'Export Status');
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
    assert.equal(registry.count(), 6);
    assert.ok(registry.getById('custom-widget'));
  });

  it('register throws on duplicate id', () => {
    assert.throws(
      () => registry.register(BUILTIN_EXPORT_WORKSPACE_WIDGETS[0]),
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
    assert.ok(registry.unregister('export-status'));
    assert.equal(registry.count(), 4);
    assert.equal(registry.getById('export-status'), undefined);
  });

  it('getByKind filters formats widgets', () => {
    const formats = registry.getByKind('formats');
    assert.equal(formats.length, 1);
    assert.equal(formats[0].id, 'available-formats');
  });

  it('getVisible returns active visible widgets', () => {
    assert.equal(registry.getVisible().length, 5);
  });

  it('clear empties the registry', () => {
    registry.clear();
    assert.equal(registry.count(), 0);
  });
});

describe('ExportWorkspaceContext', () => {
  it('defaults locale to tr', () => {
    const ctx = createExportWorkspaceContext({ tenantId: 'tenant-1' });
    assert.equal(ctx.locale, 'tr');
    assert.equal(ctx.tenantId, 'tenant-1');
  });

  it('accepts exportResult, recentExports and en locale', () => {
    const exportResult = sampleExportResult();
    const ctx = createExportWorkspaceContext({
      tenantId: 'tenant-1',
      locale: 'en',
      exportResult,
      recentExports: [exportResult]
    });
    assert.equal(ctx.locale, 'en');
    assert.equal(ctx.exportResult?.requestId, 'export-req-001');
    assert.equal(ctx.recentExports?.length, 1);
  });
});

describe('validateExportWorkspaceContext', () => {
  let registry;

  beforeEach(() => {
    registry = createExportWorkspaceRegistry(true);
  });

  it('passes for valid context', () => {
    const ctx = createExportWorkspaceContext({ tenantId: 'tenant-1' });
    assert.equal(validateExportWorkspaceContext(ctx, registry).length, 0);
  });

  it('errors on missing tenantId', () => {
    const issues = validateExportWorkspaceContext(
      createExportWorkspaceContext({ tenantId: '  ' }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'MISSING_TENANT_ID'));
  });

  it('errors on invalid exportResult requestId', () => {
    const issues = validateExportWorkspaceContext(
      createExportWorkspaceContext({
        tenantId: 'tenant-1',
        exportResult: sampleExportResult({ requestId: '' })
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'INVALID_EXPORT_RESULT'));
  });

  it('errors on invalid export metadata title', () => {
    const exportResult = sampleExportResult();
    exportResult.metadata = { ...exportResult.metadata, title: undefined };
    const issues = validateExportWorkspaceContext(
      createExportWorkspaceContext({
        tenantId: 'tenant-1',
        exportResult
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'INVALID_EXPORT_METADATA'));
  });

  it('errors on invalid export summary headline', () => {
    const exportResult = sampleExportResult({
      summary: { headline: undefined, artifactCount: 0, formatLabels: [] }
    });
    const issues = validateExportWorkspaceContext(
      createExportWorkspaceContext({
        tenantId: 'tenant-1',
        exportResult
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'INVALID_EXPORT_SUMMARY'));
  });

  it('warns on unknown widget id', () => {
    const issues = validateExportWorkspaceContext(
      createExportWorkspaceContext({
        tenantId: 'tenant-1',
        widgetIds: ['exports-overview', 'ghost']
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'UNKNOWN_WIDGET_ID'));
  });

  it('warns on empty widgetIds', () => {
    const issues = validateExportWorkspaceContext(
      createExportWorkspaceContext({
        tenantId: 'tenant-1',
        widgetIds: []
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'EMPTY_WIDGET_IDS'));
  });

  it('warns on duplicate widget ids', () => {
    const issues = validateExportWorkspaceContext(
      createExportWorkspaceContext({
        tenantId: 'tenant-1',
        widgetIds: ['exports-overview', 'exports-overview']
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'DUPLICATE_WIDGET_ID'));
  });

  it('warns on empty actorId', () => {
    const issues = validateExportWorkspaceContext(
      createExportWorkspaceContext({
        tenantId: 'tenant-1',
        actorId: '   '
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'EMPTY_ACTOR_ID'));
  });

  it('warns when upstream business admin lacks exports module', () => {
    const admin = createBusinessAdminRuntime().execute(
      createBusinessAdminContext({
        tenantId: 'tenant-1',
        moduleIds: ['users']
      })
    );
    const issues = validateExportWorkspaceContext(
      createExportWorkspaceContext({
        tenantId: 'tenant-1',
        businessAdminResult: admin
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'EXPORTS_MODULE_NOT_PROJECTED'));
  });

  it('errors when recentExports is not an array', () => {
    const issues = validateExportWorkspaceContext(
      createExportWorkspaceContext({
        tenantId: 'tenant-1',
        recentExports: /** @type {any} */ ('nope')
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'INVALID_RECENT_EXPORTS'));
  });
});

describe('resolveRequestedExportWidgets', () => {
  let registry;

  beforeEach(() => {
    registry = createExportWorkspaceRegistry(true);
  });

  it('returns all widgets when widgetIds omitted', () => {
    const { widgets, requestedCount, unavailableCount } =
      resolveRequestedExportWidgets(
        createExportWorkspaceContext({ tenantId: 'tenant-1' }),
        registry
      );
    assert.equal(widgets.length, 5);
    assert.equal(requestedCount, 5);
    assert.equal(unavailableCount, 0);
  });

  it('filters to requested widget ids', () => {
    const { widgets, unavailableCount } = resolveRequestedExportWidgets(
      createExportWorkspaceContext({
        tenantId: 'tenant-1',
        widgetIds: ['exports-overview', 'available-formats']
      }),
      registry
    );
    assert.equal(widgets.length, 2);
    assert.equal(unavailableCount, 0);
    assert.deepEqual(
      widgets.map((w) => w.id),
      ['exports-overview', 'available-formats']
    );
  });

  it('counts unavailable widgets', () => {
    const { widgets, unavailableCount } = resolveRequestedExportWidgets(
      createExportWorkspaceContext({
        tenantId: 'tenant-1',
        widgetIds: ['exports-overview', 'missing']
      }),
      registry
    );
    assert.equal(widgets.length, 1);
    assert.equal(unavailableCount, 1);
  });
});

describe('Workspace Projection', () => {
  it('projects empty widgets without exportResult', () => {
    const def = getBuiltinExportWorkspaceWidget('exports-overview');
    assert.ok(def);
    const projection = projectExportWorkspaceWidget(
      def,
      createExportWorkspaceContext({ tenantId: 'tenant-1' })
    );
    assert.equal(projection.projected, true);
    assert.equal(projection.itemCount, 0);
    assert.equal(projection.overview, undefined);
  });

  it('projects exports-overview from ExportResult', () => {
    const def = getBuiltinExportWorkspaceWidget('exports-overview');
    assert.ok(def);
    const projection = projectExportWorkspaceWidget(
      def,
      createExportWorkspaceContext({
        tenantId: 'tenant-1',
        exportResult: sampleExportResult()
      })
    );
    assert.ok(projection.overview);
    assert.equal(projection.overview.title, 'Demo Export');
    assert.equal(projection.overview.artifactCount, 2);
    assert.equal(projection.overview.headline, 'Export tamamlandı');
    assert.equal(projection.overview.warningCount, 1);
  });

  it('projects recent-exports from exportResult alone', () => {
    const def = getBuiltinExportWorkspaceWidget('recent-exports');
    assert.ok(def);
    const projection = projectExportWorkspaceWidget(
      def,
      createExportWorkspaceContext({
        tenantId: 'tenant-1',
        exportResult: sampleExportResult()
      })
    );
    assert.equal(projection.itemCount, 1);
    assert.equal(projection.items[0].title, 'Demo Export');
  });

  it('projects recent-exports from recentExports list', () => {
    const def = getBuiltinExportWorkspaceWidget('recent-exports');
    assert.ok(def);
    const projection = projectExportWorkspaceWidget(
      def,
      createExportWorkspaceContext({
        tenantId: 'tenant-1',
        recentExports: [
          sampleExportResult({
            requestId: 'e1',
            metadata: { ...sampleExportResult().metadata, title: 'E1' }
          }),
          sampleExportResult({
            requestId: 'e2',
            metadata: { ...sampleExportResult().metadata, title: 'E2' }
          })
        ]
      })
    );
    assert.equal(projection.itemCount, 2);
    assert.deepEqual(
      projection.items.map((i) => i.title),
      ['E1', 'E2']
    );
  });

  it('projects available-formats from formatLabels', () => {
    const def = getBuiltinExportWorkspaceWidget('available-formats');
    assert.ok(def);
    const projection = projectExportWorkspaceWidget(
      def,
      createExportWorkspaceContext({
        tenantId: 'tenant-1',
        exportResult: sampleExportResult()
      })
    );
    assert.equal(projection.itemCount, 2);
    assert.equal(projection.items[0].title, 'PDF');
    assert.equal(projection.items[1].title, 'JSON');
  });

  it('projects available-formats from artifacts when labels empty', () => {
    const def = getBuiltinExportWorkspaceWidget('available-formats');
    assert.ok(def);
    const projection = projectExportWorkspaceWidget(
      def,
      createExportWorkspaceContext({
        tenantId: 'tenant-1',
        exportResult: sampleExportResult({
          summary: {
            headline: 'x',
            artifactCount: 2,
            formatLabels: []
          }
        })
      })
    );
    assert.equal(projection.itemCount, 2);
    assert.equal(projection.items[0].title, 'demo.pdf');
  });

  it('projects export-status from ExportResult', () => {
    const def = getBuiltinExportWorkspaceWidget('export-status');
    assert.ok(def);
    const projection = projectExportWorkspaceWidget(
      def,
      createExportWorkspaceContext({
        tenantId: 'tenant-1',
        exportResult: sampleExportResult()
      })
    );
    assert.ok(projection.exportStatus);
    assert.equal(projection.exportStatus.status, 'basarili');
    assert.equal(projection.exportStatus.lastStage, 'export-sonuc');
    assert.equal(projection.exportStatus.completedAt, '2026-07-21T10:05:00.000Z');
  });

  it('projects execution-summary with export count', () => {
    const def = getBuiltinExportWorkspaceWidget('execution-summary');
    assert.ok(def);
    const projection = projectExportWorkspaceWidget(
      def,
      createExportWorkspaceContext({
        tenantId: 'tenant-1',
        exportResult: sampleExportResult(),
        recentExports: [
          sampleExportResult({ requestId: 'a' }),
          sampleExportResult({ requestId: 'b' })
        ]
      })
    );
    assert.ok(projection.execution);
    assert.equal(projection.execution.exportCount, 2);
    assert.equal(projection.execution.hasExportResult, true);
  });

  it('toEmptyExportWidgetProjection marks active widgets visible', () => {
    const def = getBuiltinExportWorkspaceWidget('exports-overview');
    assert.ok(def);
    const projection = toEmptyExportWidgetProjection(def);
    assert.equal(projection.visible, true);
    assert.equal(projection.projected, true);
  });

  it('projectExportWorkspaceWidgets returns frozen list of 5', () => {
    const registry = createExportWorkspaceRegistry(true);
    const projections = projectExportWorkspaceWidgets(
      registry.getAll(),
      createExportWorkspaceContext({
        tenantId: 'tenant-1',
        exportResult: sampleExportResult()
      })
    );
    assert.equal(projections.length, 5);
    assert.ok(Object.isFrozen(projections));
  });
});

describe('Workspace Summary', () => {
  it('counts visible exports from recent-exports widget', () => {
    const registry = createExportWorkspaceRegistry(true);
    const projections = projectExportWorkspaceWidgets(
      registry.getAll(),
      createExportWorkspaceContext({
        tenantId: 'tenant-1',
        recentExports: [
          sampleExportResult({ requestId: 'a' }),
          sampleExportResult({ requestId: 'b' }),
          sampleExportResult({ requestId: 'c' })
        ]
      })
    );
    const summary = buildExportWorkspaceSummary(
      projections,
      5,
      0,
      false,
      'tenant-1',
      true
    );
    assert.equal(summary.visibleExportCount, 3);
    assert.equal(summary.visibleWidgetCount, 5);
    assert.equal(summary.success, true);
  });

  it('buildExportWorkspaceSummaryItems includes export count and actor', () => {
    const summary = buildExportWorkspaceSummary(
      [],
      0,
      0,
      true,
      'tenant-9',
      true
    );
    const items = buildExportWorkspaceSummaryItems(summary, 'en', 'actor-1');
    assert.ok(items.some((i) => i.key === 'tenant-id' && i.value === 'tenant-9'));
    assert.ok(
      items.some((i) => i.key === 'visible-export-count' && i.value === 0)
    );
    assert.ok(items.some((i) => i.key === 'actor-id' && i.value === 'actor-1'));
    assert.ok(
      items.some((i) => i.key === 'has-export-result' && i.value === true)
    );
  });
});

describe('ExportWorkspaceRuntime', () => {
  let runtime;

  beforeEach(() => {
    runtime = createExportWorkspaceRuntime();
  });

  it('executes full pipeline and returns ExportWorkspaceResult', () => {
    const result = runtime.execute(
      createExportWorkspaceContext({
        tenantId: 'tenant-1',
        exportResult: sampleExportResult()
      })
    );
    assert.equal(result.widgets.length, 5);
    assert.equal(result.summary.success, true);
    assert.equal(result.summary.hasExportResult, true);
    assert.equal(result.validationIssues.length, 0);
    assert.ok(result.summaryItems.length > 0);
  });

  it('records telemetry with duration, visible exports, summary items', () => {
    const result = runtime.execute(
      createExportWorkspaceContext({
        tenantId: 'tenant-1',
        recentExports: [
          sampleExportResult({ requestId: 'a' }),
          sampleExportResult({ requestId: 'b' })
        ]
      })
    );
    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.equal(result.telemetry.visibleExportCount, 2);
    assert.equal(
      result.telemetry.summaryItemCount,
      result.summaryItems.length
    );
  });

  it('filters widgets by widgetIds', () => {
    const result = runtime.execute(
      createExportWorkspaceContext({
        tenantId: 'tenant-1',
        widgetIds: ['exports-overview', 'execution-summary']
      })
    );
    assert.equal(result.widgets.length, 2);
    assert.deepEqual(
      result.widgets.map((w) => w.widgetId),
      ['exports-overview', 'execution-summary']
    );
  });

  it('reports unavailable count for unknown widget ids', () => {
    const result = runtime.execute(
      createExportWorkspaceContext({
        tenantId: 'tenant-1',
        widgetIds: ['exports-overview', 'ghost']
      })
    );
    assert.equal(result.summary.unavailableCount, 1);
    assert.equal(result.widgets.length, 1);
  });

  it('exports pipeline bag key constant', () => {
    assert.equal(
      PIPELINE_BAG_EXPORT_WORKSPACE_RESULT_KEY,
      'exportWorkspaceResult'
    );
  });

  it('exposes registry via getRegistry', () => {
    assert.equal(runtime.getRegistry().count(), 5);
  });

  it('marks unsuccessful when tenantId missing', () => {
    const result = runtime.execute(
      createExportWorkspaceContext({ tenantId: '' })
    );
    assert.equal(result.summary.success, false);
    assert.ok(
      result.validationIssues.some((i) => i.code === 'MISSING_TENANT_ID')
    );
  });

  it('sets hasExportResult when only recentExports provided', () => {
    const result = runtime.execute(
      createExportWorkspaceContext({
        tenantId: 'tenant-1',
        recentExports: [sampleExportResult()]
      })
    );
    assert.equal(result.summary.hasExportResult, true);
    assert.equal(result.summary.visibleExportCount, 1);
  });
});

describe('Responsive layout skeleton', () => {
  it('exports non-empty responsive CSS with mobile breakpoint', () => {
    assert.ok(EXPORT_WORKSPACE_CSS.includes('.ib-ba-ew'));
    assert.ok(EXPORT_WORKSPACE_CSS.includes('@media (max-width: 640px)'));
  });

  it('createExportWorkspaceLayout builds header/overview/formats/recent/status/summary', () => {
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
      const result = createExportWorkspaceRuntime().execute(
        createExportWorkspaceContext({
          tenantId: 'tenant-1',
          exportResult: sampleExportResult()
        })
      );
      const layout = createExportWorkspaceLayout(result);
      assert.equal(layout.className, 'ib-ba-ew');
      assert.equal(layout.children.length, 6);
      assert.equal(layout.children[0].className, 'ib-ba-ew__header');
      assert.equal(layout.children[1].className, 'ib-ba-ew__overview');
      assert.equal(layout.children[2].className, 'ib-ba-ew__formats');
      assert.equal(layout.children[3].className, 'ib-ba-ew__recent');
      assert.equal(layout.children[4].className, 'ib-ba-ew__status');
      assert.equal(layout.children[5].className, 'ib-ba-ew__summary');
    } finally {
      globalThis.document = previousDocument;
    }
  });
});
