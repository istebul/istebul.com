/**
 * Business Admin Runtime — PR-202A (en az 20 unit test)
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
  createBusinessAdminRegistryRuntime,
  createBusinessAdminContext,
  validateBusinessAdminContext,
  resolveRequestedModules,
  buildBusinessAdminSummaryItems,
  toModuleProjection,
  BUILTIN_BUSINESS_ADMIN_MODULES,
  BUILTIN_BUSINESS_ADMIN_MODULE_COUNT,
  getBuiltinBusinessAdminModule,
  PIPELINE_BAG_BUSINESS_ADMIN_RESULT_KEY
} = await import('../../src/business-admin/index.ts');

describe('BusinessAdminRegistryRuntime', () => {
  let registry;

  beforeEach(() => {
    registry = createBusinessAdminRegistryRuntime(true);
  });

  it('seeds all 6 builtin modules', () => {
    assert.equal(registry.count(), 6);
    assert.equal(BUILTIN_BUSINESS_ADMIN_MODULE_COUNT, 6);
    assert.equal(BUILTIN_BUSINESS_ADMIN_MODULES.length, 6);
  });

  it('returns modules sorted by order', () => {
    const modules = registry.getAll();
    assert.equal(modules[0].id, 'dashboard');
    assert.equal(modules[modules.length - 1].id, 'activity');
    for (let i = 1; i < modules.length; i++) {
      assert.ok(modules[i].order >= modules[i - 1].order);
    }
  });

  it('getById returns dashboard module', () => {
    const dashboard = registry.getById('dashboard');
    assert.ok(dashboard);
    assert.equal(dashboard.name, 'Dashboard');
    assert.equal(dashboard.category, 'operations');
  });

  it('getBuiltinBusinessAdminModule resolves business-settings', () => {
    const mod = getBuiltinBusinessAdminModule('business-settings');
    assert.ok(mod);
    assert.equal(mod.name, 'Business Settings');
  });

  it('register adds a new module', () => {
    registry.register({
      id: 'custom-module',
      name: 'Custom',
      description: 'Test module',
      order: 99,
      status: 'coming-soon',
      category: 'monitoring'
    });
    assert.equal(registry.count(), 7);
    assert.ok(registry.getById('custom-module'));
  });

  it('register throws on duplicate id', () => {
    assert.throws(
      () => registry.register(BUILTIN_BUSINESS_ADMIN_MODULES[0]),
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
          status: 'active',
          category: 'operations'
        }),
      /id zorunludur/
    );
  });

  it('unregister removes a module', () => {
    assert.ok(registry.unregister('activity'));
    assert.equal(registry.count(), 5);
    assert.equal(registry.getById('activity'), undefined);
  });

  it('getByCategory filters operations modules', () => {
    const ops = registry.getByCategory('operations');
    assert.ok(ops.length >= 3);
    assert.ok(ops.every((m) => m.category === 'operations'));
  });

  it('clear empties the registry', () => {
    registry.clear();
    assert.equal(registry.count(), 0);
  });
});

describe('BusinessAdminContext', () => {
  it('createBusinessAdminContext defaults locale to tr', () => {
    const ctx = createBusinessAdminContext({ tenantId: 'tenant-1' });
    assert.equal(ctx.locale, 'tr');
    assert.equal(ctx.tenantId, 'tenant-1');
  });

  it('createBusinessAdminContext accepts en locale', () => {
    const ctx = createBusinessAdminContext({
      tenantId: 'tenant-1',
      locale: 'en'
    });
    assert.equal(ctx.locale, 'en');
  });
});

describe('validateBusinessAdminContext', () => {
  let registry;

  beforeEach(() => {
    registry = createBusinessAdminRegistryRuntime(true);
  });

  it('passes for valid default context', () => {
    const ctx = createBusinessAdminContext({ tenantId: 'tenant-1' });
    const issues = validateBusinessAdminContext(ctx, registry);
    assert.equal(issues.length, 0);
  });

  it('errors on missing tenantId', () => {
    const ctx = createBusinessAdminContext({ tenantId: '   ' });
    const issues = validateBusinessAdminContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'MISSING_TENANT_ID'));
    assert.ok(
      issues.some((i) => i.code === 'MISSING_TENANT_ID' && i.severity === 'error')
    );
  });

  it('warns on empty moduleIds array', () => {
    const ctx = createBusinessAdminContext({
      tenantId: 'tenant-1',
      moduleIds: []
    });
    const issues = validateBusinessAdminContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'EMPTY_MODULE_IDS'));
  });

  it('warns on unknown module id', () => {
    const ctx = createBusinessAdminContext({
      tenantId: 'tenant-1',
      moduleIds: ['dashboard', 'nonexistent']
    });
    const issues = validateBusinessAdminContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'UNKNOWN_MODULE_ID'));
  });

  it('warns on empty actorId', () => {
    const ctx = createBusinessAdminContext({
      tenantId: 'tenant-1',
      actorId: '   '
    });
    const issues = validateBusinessAdminContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'EMPTY_ACTOR_ID'));
  });

  it('warns on duplicate module ids', () => {
    const ctx = createBusinessAdminContext({
      tenantId: 'tenant-1',
      moduleIds: ['dashboard', 'dashboard']
    });
    const issues = validateBusinessAdminContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'DUPLICATE_MODULE_ID'));
  });
});

describe('resolveRequestedModules', () => {
  let registry;

  beforeEach(() => {
    registry = createBusinessAdminRegistryRuntime(true);
  });

  it('returns all modules when moduleIds omitted', () => {
    const ctx = createBusinessAdminContext({ tenantId: 'tenant-1' });
    const { modules, requestedCount, unavailableCount } =
      resolveRequestedModules(ctx, registry);
    assert.equal(modules.length, 6);
    assert.equal(requestedCount, 6);
    assert.equal(unavailableCount, 0);
  });

  it('filters to requested module ids', () => {
    const ctx = createBusinessAdminContext({
      tenantId: 'tenant-1',
      moduleIds: ['dashboard', 'users']
    });
    const { modules, requestedCount, unavailableCount } =
      resolveRequestedModules(ctx, registry);
    assert.equal(modules.length, 2);
    assert.equal(requestedCount, 2);
    assert.equal(unavailableCount, 0);
    assert.deepEqual(
      modules.map((m) => m.id),
      ['dashboard', 'users']
    );
  });

  it('counts unavailable modules for unknown ids', () => {
    const ctx = createBusinessAdminContext({
      tenantId: 'tenant-1',
      moduleIds: ['dashboard', 'missing']
    });
    const { modules, unavailableCount } = resolveRequestedModules(
      ctx,
      registry
    );
    assert.equal(modules.length, 1);
    assert.equal(unavailableCount, 1);
  });
});

describe('toModuleProjection', () => {
  it('projects active module as available', () => {
    const mod = getBuiltinBusinessAdminModule('dashboard');
    assert.ok(mod);
    const projection = toModuleProjection(mod);
    assert.equal(projection.moduleId, 'dashboard');
    assert.equal(projection.available, true);
    assert.equal(projection.status, 'active');
  });

  it('projects coming-soon module as unavailable', () => {
    const projection = toModuleProjection({
      id: 'reports',
      name: 'Reports',
      description: 'Test',
      order: 2,
      status: 'coming-soon',
      category: 'monitoring'
    });
    assert.equal(projection.available, false);
  });
});

describe('buildBusinessAdminSummaryItems', () => {
  it('includes tenant, locale and module counts', () => {
    const registry = createBusinessAdminRegistryRuntime(true);
    const ctx = createBusinessAdminContext({
      tenantId: 'tenant-42',
      locale: 'en'
    });
    const modules = registry.getAll();
    const items = buildBusinessAdminSummaryItems(
      ctx,
      modules,
      [],
      registry.count()
    );
    assert.ok(
      items.some((i) => i.key === 'tenant-id' && i.value === 'tenant-42')
    );
    assert.ok(items.some((i) => i.key === 'locale' && i.value === 'en'));
    assert.ok(
      items.some((i) => i.key === 'registered-module-count' && i.value === 6)
    );
    assert.ok(
      items.some((i) => i.key === 'projected-module-count' && i.value === 6)
    );
  });

  it('includes actor-id when present', () => {
    const registry = createBusinessAdminRegistryRuntime(true);
    const ctx = createBusinessAdminContext({
      tenantId: 'tenant-1',
      actorId: 'admin-1'
    });
    const items = buildBusinessAdminSummaryItems(
      ctx,
      registry.getAll(),
      [],
      registry.count()
    );
    assert.ok(items.some((i) => i.key === 'actor-id' && i.value === 'admin-1'));
  });

  it('includes category breakdown', () => {
    const registry = createBusinessAdminRegistryRuntime(true);
    const ctx = createBusinessAdminContext({ tenantId: 'tenant-1' });
    const items = buildBusinessAdminSummaryItems(
      ctx,
      registry.getAll(),
      [],
      registry.count()
    );
    assert.ok(items.some((i) => i.key === 'category-operations'));
    assert.ok(items.some((i) => i.key === 'category-monitoring'));
    assert.ok(items.some((i) => i.key === 'category-configuration'));
  });
});

describe('BusinessAdminRuntime', () => {
  let runtime;

  beforeEach(() => {
    runtime = createBusinessAdminRuntime();
  });

  it('executes full pipeline and returns BusinessAdminResult', () => {
    const ctx = createBusinessAdminContext({ tenantId: 'tenant-1' });
    const result = runtime.execute(ctx);
    assert.equal(result.modules.length, 6);
    assert.equal(result.summary.moduleCount, 6);
    assert.equal(result.summary.success, true);
    assert.equal(result.summary.tenantId, 'tenant-1');
    assert.equal(result.validationIssues.length, 0);
    assert.ok(result.summaryItems.length > 0);
  });

  it('records telemetry with duration and counts', () => {
    const result = runtime.execute(
      createBusinessAdminContext({ tenantId: 'tenant-1' })
    );
    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.equal(result.telemetry.registeredModuleCount, 6);
    assert.equal(result.telemetry.summaryItemCount, result.summaryItems.length);
  });

  it('filters modules by moduleIds', () => {
    const result = runtime.execute(
      createBusinessAdminContext({
        tenantId: 'tenant-1',
        moduleIds: ['reports', 'exports']
      })
    );
    assert.equal(result.modules.length, 2);
    assert.deepEqual(
      result.modules.map((m) => m.moduleId),
      ['reports', 'exports']
    );
  });

  it('exposes registry via getRegistry', () => {
    assert.equal(runtime.getRegistry().count(), 6);
  });

  it('exports pipeline bag key constant', () => {
    assert.equal(
      PIPELINE_BAG_BUSINESS_ADMIN_RESULT_KEY,
      'businessAdminResult'
    );
  });

  it('reports unavailable count for partial module requests', () => {
    const result = runtime.execute(
      createBusinessAdminContext({
        tenantId: 'tenant-1',
        moduleIds: ['dashboard', 'ghost']
      })
    );
    assert.equal(result.summary.unavailableCount, 1);
    assert.equal(result.modules.length, 1);
    assert.ok(
      result.validationIssues.some((i) => i.code === 'UNKNOWN_MODULE_ID')
    );
  });

  it('marks summary unsuccessful when tenantId is missing', () => {
    const result = runtime.execute(
      createBusinessAdminContext({ tenantId: '' })
    );
    assert.equal(result.summary.success, false);
    assert.ok(
      result.validationIssues.some((i) => i.code === 'MISSING_TENANT_ID')
    );
  });
});
