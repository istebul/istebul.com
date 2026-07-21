/**
 * Platform Admin Runtime — PR-201A (en az 20 unit test)
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
  createPlatformAdminRuntime,
  createPlatformAdminRegistryRuntime,
  createPlatformAdminContext,
  validatePlatformContext,
  resolveRequestedModules,
  buildPlatformSummaryItems,
  toModuleProjection,
  BUILTIN_PLATFORM_ADMIN_MODULES,
  BUILTIN_PLATFORM_ADMIN_MODULE_COUNT,
  getBuiltinPlatformAdminModule,
  PIPELINE_BAG_PLATFORM_ADMIN_RESULT_KEY
} = await import('../../src/platform-admin/index.ts');

describe('PlatformAdminRegistryRuntime', () => {
  let registry;

  beforeEach(() => {
    registry = createPlatformAdminRegistryRuntime(true);
  });

  it('seeds all 8 builtin modules', () => {
    assert.equal(registry.count(), 8);
    assert.equal(BUILTIN_PLATFORM_ADMIN_MODULE_COUNT, 8);
    assert.equal(BUILTIN_PLATFORM_ADMIN_MODULES.length, 8);
  });

  it('returns modules sorted by order', () => {
    const modules = registry.getAll();
    assert.equal(modules[0].id, 'tenant');
    assert.equal(modules[modules.length - 1].id, 'ai-limits');
    for (let i = 1; i < modules.length; i++) {
      assert.ok(modules[i].order >= modules[i - 1].order);
    }
  });

  it('getById returns tenant module', () => {
    const tenant = registry.getById('tenant');
    assert.ok(tenant);
    assert.equal(tenant.name, 'Tenant');
    assert.equal(tenant.category, 'operations');
  });

  it('getBuiltinPlatformAdminModule resolves feature-flags', () => {
    const mod = getBuiltinPlatformAdminModule('feature-flags');
    assert.ok(mod);
    assert.equal(mod.name, 'Feature Flags');
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
    assert.equal(registry.count(), 9);
    assert.ok(registry.getById('custom-module'));
  });

  it('register throws on duplicate id', () => {
    assert.throws(
      () => registry.register(BUILTIN_PLATFORM_ADMIN_MODULES[0]),
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
    assert.ok(registry.unregister('logs'));
    assert.equal(registry.count(), 7);
    assert.equal(registry.getById('logs'), undefined);
  });

  it('getByCategory filters operations modules', () => {
    const ops = registry.getByCategory('operations');
    assert.ok(ops.length >= 3);
    assert.ok(ops.every((m) => m.category === 'operations'));
  });
});

describe('PlatformAdminContext', () => {
  it('createPlatformAdminContext defaults locale to tr', () => {
    const ctx = createPlatformAdminContext();
    assert.equal(ctx.locale, 'tr');
  });

  it('createPlatformAdminContext accepts en locale', () => {
    const ctx = createPlatformAdminContext({ locale: 'en' });
    assert.equal(ctx.locale, 'en');
  });
});

describe('validatePlatformContext', () => {
  let registry;

  beforeEach(() => {
    registry = createPlatformAdminRegistryRuntime(true);
  });

  it('passes for valid default context', () => {
    const ctx = createPlatformAdminContext();
    const issues = validatePlatformContext(ctx, registry);
    assert.equal(issues.length, 0);
  });

  it('warns on empty moduleIds array', () => {
    const ctx = createPlatformAdminContext({ moduleIds: [] });
    const issues = validatePlatformContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'EMPTY_MODULE_IDS'));
  });

  it('warns on unknown module id', () => {
    const ctx = createPlatformAdminContext({
      moduleIds: ['tenant', 'nonexistent']
    });
    const issues = validatePlatformContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'UNKNOWN_MODULE_ID'));
  });

  it('warns on empty actorId', () => {
    const ctx = createPlatformAdminContext({ actorId: '   ' });
    const issues = validatePlatformContext(ctx, registry);
    assert.ok(issues.some((i) => i.code === 'EMPTY_ACTOR_ID'));
  });
});

describe('resolveRequestedModules', () => {
  let registry;

  beforeEach(() => {
    registry = createPlatformAdminRegistryRuntime(true);
  });

  it('returns all modules when moduleIds omitted', () => {
    const ctx = createPlatformAdminContext();
    const { modules, requestedCount, unavailableCount } =
      resolveRequestedModules(ctx, registry);
    assert.equal(modules.length, 8);
    assert.equal(requestedCount, 8);
    assert.equal(unavailableCount, 0);
  });

  it('filters to requested module ids', () => {
    const ctx = createPlatformAdminContext({
      moduleIds: ['tenant', 'users']
    });
    const { modules, requestedCount, unavailableCount } =
      resolveRequestedModules(ctx, registry);
    assert.equal(modules.length, 2);
    assert.equal(requestedCount, 2);
    assert.equal(unavailableCount, 0);
    assert.deepEqual(
      modules.map((m) => m.id),
      ['tenant', 'users']
    );
  });

  it('counts unavailable modules for unknown ids', () => {
    const ctx = createPlatformAdminContext({
      moduleIds: ['tenant', 'missing']
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
    const mod = getBuiltinPlatformAdminModule('tenant');
    assert.ok(mod);
    const projection = toModuleProjection(mod);
    assert.equal(projection.moduleId, 'tenant');
    assert.equal(projection.available, true);
    assert.equal(projection.status, 'active');
  });
});

describe('buildPlatformSummaryItems', () => {
  it('includes locale and module counts', () => {
    const registry = createPlatformAdminRegistryRuntime(true);
    const ctx = createPlatformAdminContext({ locale: 'en' });
    const modules = registry.getAll();
    const items = buildPlatformSummaryItems(ctx, modules, [], registry.count());
    assert.ok(items.some((i) => i.key === 'locale' && i.value === 'en'));
    assert.ok(
      items.some((i) => i.key === 'registered-module-count' && i.value === 8)
    );
    assert.ok(
      items.some((i) => i.key === 'projected-module-count' && i.value === 8)
    );
  });

  it('includes actor-id when present', () => {
    const registry = createPlatformAdminRegistryRuntime(true);
    const ctx = createPlatformAdminContext({ actorId: 'admin-1' });
    const items = buildPlatformSummaryItems(
      ctx,
      registry.getAll(),
      [],
      registry.count()
    );
    assert.ok(items.some((i) => i.key === 'actor-id' && i.value === 'admin-1'));
  });
});

describe('PlatformAdminRuntime', () => {
  let runtime;

  beforeEach(() => {
    runtime = createPlatformAdminRuntime();
  });

  it('executes full pipeline and returns PlatformAdminResult', () => {
    const ctx = createPlatformAdminContext();
    const result = runtime.execute(ctx);
    assert.equal(result.modules.length, 8);
    assert.equal(result.summary.moduleCount, 8);
    assert.equal(result.summary.success, true);
    assert.equal(result.validationIssues.length, 0);
    assert.ok(result.summaryItems.length > 0);
  });

  it('records telemetry with duration and counts', () => {
    const result = runtime.execute(createPlatformAdminContext());
    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.equal(result.telemetry.registeredModuleCount, 8);
    assert.equal(result.telemetry.summaryItemCount, result.summaryItems.length);
  });

  it('filters modules by moduleIds', () => {
    const result = runtime.execute(
      createPlatformAdminContext({ moduleIds: ['system', 'logs'] })
    );
    assert.equal(result.modules.length, 2);
    assert.deepEqual(
      result.modules.map((m) => m.moduleId),
      ['system', 'logs']
    );
  });

  it('exposes registry via getRegistry', () => {
    assert.equal(runtime.getRegistry().count(), 8);
  });

  it('exports pipeline bag key constant', () => {
    assert.equal(
      PIPELINE_BAG_PLATFORM_ADMIN_RESULT_KEY,
      'platformAdminResult'
    );
  });

  it('reports unavailable count for partial module requests', () => {
    const result = runtime.execute(
      createPlatformAdminContext({ moduleIds: ['tenant', 'ghost'] })
    );
    assert.equal(result.summary.unavailableCount, 1);
    assert.equal(result.modules.length, 1);
    assert.ok(
      result.validationIssues.some((i) => i.code === 'UNKNOWN_MODULE_ID')
    );
  });
});
