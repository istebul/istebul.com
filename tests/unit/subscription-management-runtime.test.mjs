/**
 * Subscription Management Runtime — PR-201D (en az 20 unit test)
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
  createPlatformAdminContext,
  createSubscriptionManagementRuntime,
  createSubscriptionRegistryRuntime,
  createSubscriptionManagementContext,
  validateSubscriptionManagementContext,
  resolveRequestedSubscriptions,
  buildSubscriptionSummary,
  buildSubscriptionSummaryItems,
  toSubscriptionProjection,
  BUILTIN_SUBSCRIPTION_DEFINITIONS,
  BUILTIN_SUBSCRIPTION_DEFINITION_COUNT,
  getBuiltinSubscriptionDefinition,
  PIPELINE_BAG_SUBSCRIPTION_MANAGEMENT_RESULT_KEY
} = await import('../../src/platform-admin/index.ts');

describe('SubscriptionRegistryRuntime', () => {
  let registry;

  beforeEach(() => {
    registry = createSubscriptionRegistryRuntime(true);
  });

  it('seeds all builtin subscriptions', () => {
    assert.equal(registry.count(), BUILTIN_SUBSCRIPTION_DEFINITION_COUNT);
    assert.equal(BUILTIN_SUBSCRIPTION_DEFINITIONS.length, 6);
  });

  it('getById returns demo subscription', () => {
    const sub = registry.getById('sub-demo-001');
    assert.ok(sub);
    assert.equal(sub.plan, 'pro');
    assert.equal(sub.status, 'active');
    assert.equal(sub.billingCycle, 'monthly');
  });

  it('getBuiltinSubscriptionDefinition resolves enterprise', () => {
    const sub = getBuiltinSubscriptionDefinition('sub-ent-004');
    assert.ok(sub);
    assert.equal(sub.plan, 'enterprise');
    assert.equal(sub.billingCycle, 'yearly');
  });

  it('register adds a new subscription', () => {
    registry.register({
      identity: { id: 'sub-custom-099', label: 'Custom' },
      tenantReference: { tenantId: 'tenant-demo-001' },
      plan: 'free',
      status: 'paused',
      billingCycle: 'none',
      usageLimits: {
        maxUsers: 1,
        maxAiRequestsPerMonth: 10,
        maxStorageMb: 64
      },
      renewalDate: '2026-12-01T00:00:00.000Z',
      createdAt: '2026-07-21T00:00:00.000Z',
      updatedAt: '2026-07-21T00:00:00.000Z'
    });
    assert.equal(registry.count(), BUILTIN_SUBSCRIPTION_DEFINITION_COUNT + 1);
  });

  it('register throws on duplicate id', () => {
    assert.throws(
      () => registry.register(BUILTIN_SUBSCRIPTION_DEFINITIONS[0]),
      /zaten kayıtlı/
    );
  });

  it('register throws on missing id', () => {
    assert.throws(
      () =>
        registry.register({
          identity: { id: '' },
          tenantReference: { tenantId: 't1' },
          plan: 'free',
          status: 'active',
          billingCycle: 'none',
          usageLimits: {
            maxUsers: 1,
            maxAiRequestsPerMonth: 1,
            maxStorageMb: 1
          },
          renewalDate: '2026-07-21T00:00:00.000Z',
          createdAt: '2026-07-21T00:00:00.000Z',
          updatedAt: '2026-07-21T00:00:00.000Z'
        }),
      /identity.id zorunludur/
    );
  });

  it('unregister removes a subscription', () => {
    assert.ok(registry.unregister('sub-cancel-006'));
    assert.equal(
      registry.count(),
      BUILTIN_SUBSCRIPTION_DEFINITION_COUNT - 1
    );
    assert.equal(registry.getById('sub-cancel-006'), undefined);
  });

  it('getByTenantId filters subscriptions for a tenant', () => {
    const subs = registry.getByTenantId('tenant-demo-001');
    assert.equal(subs.length, 2);
    assert.ok(
      subs.every((s) => s.tenantReference.tenantId === 'tenant-demo-001')
    );
  });
});

describe('SubscriptionManagementContext', () => {
  it('defaults locale to tr', () => {
    const ctx = createSubscriptionManagementContext();
    assert.equal(ctx.locale, 'tr');
  });

  it('accepts en locale and actorId', () => {
    const ctx = createSubscriptionManagementContext({
      locale: 'en',
      actorId: 'ops-1'
    });
    assert.equal(ctx.locale, 'en');
    assert.equal(ctx.actorId, 'ops-1');
  });
});

describe('validateSubscriptionManagementContext', () => {
  let registry;

  beforeEach(() => {
    registry = createSubscriptionRegistryRuntime(true);
  });

  it('passes for valid default context', () => {
    const issues = validateSubscriptionManagementContext(
      createSubscriptionManagementContext(),
      registry
    );
    assert.equal(issues.length, 0);
  });

  it('warns on empty subscriptionIds', () => {
    const issues = validateSubscriptionManagementContext(
      createSubscriptionManagementContext({ subscriptionIds: [] }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'EMPTY_SUBSCRIPTION_IDS'));
  });

  it('warns on unknown subscription id', () => {
    const issues = validateSubscriptionManagementContext(
      createSubscriptionManagementContext({
        subscriptionIds: ['sub-demo-001', 'missing']
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'UNKNOWN_SUBSCRIPTION_ID'));
  });

  it('warns when platform admin result lacks subscriptions module', () => {
    const platform = createPlatformAdminRuntime().execute(
      createPlatformAdminContext({ moduleIds: ['users'] })
    );
    const issues = validateSubscriptionManagementContext(
      createSubscriptionManagementContext({ platformAdminResult: platform }),
      registry
    );
    assert.ok(
      issues.some((i) => i.code === 'SUBSCRIPTIONS_MODULE_NOT_PROJECTED')
    );
  });
});

describe('resolveRequestedSubscriptions', () => {
  let registry;

  beforeEach(() => {
    registry = createSubscriptionRegistryRuntime(true);
  });

  it('returns all subscriptions when subscriptionIds omitted', () => {
    const { subscriptions, requestedCount, unavailableCount } =
      resolveRequestedSubscriptions(
        createSubscriptionManagementContext(),
        registry
      );
    assert.equal(subscriptions.length, BUILTIN_SUBSCRIPTION_DEFINITION_COUNT);
    assert.equal(requestedCount, BUILTIN_SUBSCRIPTION_DEFINITION_COUNT);
    assert.equal(unavailableCount, 0);
  });

  it('filters to requested subscription ids', () => {
    const { subscriptions, requestedCount, unavailableCount } =
      resolveRequestedSubscriptions(
        createSubscriptionManagementContext({
          subscriptionIds: ['sub-demo-001', 'sub-trial-002']
        }),
        registry
      );
    assert.equal(subscriptions.length, 2);
    assert.equal(requestedCount, 2);
    assert.equal(unavailableCount, 0);
  });

  it('filters by tenantId', () => {
    const { subscriptions } = resolveRequestedSubscriptions(
      createSubscriptionManagementContext({ tenantId: 'tenant-demo-001' }),
      registry
    );
    assert.equal(subscriptions.length, 2);
    assert.ok(
      subscriptions.every(
        (s) => s.tenantReference.tenantId === 'tenant-demo-001'
      )
    );
  });

  it('counts unavailable subscriptions for unknown ids', () => {
    const { subscriptions, unavailableCount } = resolveRequestedSubscriptions(
      createSubscriptionManagementContext({
        subscriptionIds: ['sub-demo-001', 'ghost']
      }),
      registry
    );
    assert.equal(subscriptions.length, 1);
    assert.equal(unavailableCount, 1);
  });
});

describe('toSubscriptionProjection', () => {
  it('projects full subscription model fields', () => {
    const def = getBuiltinSubscriptionDefinition('sub-demo-001');
    assert.ok(def);
    const projection = toSubscriptionProjection(def);
    assert.equal(projection.projected, true);
    assert.equal(projection.identity.id, 'sub-demo-001');
    assert.equal(projection.tenantReference.tenantId, 'tenant-demo-001');
    assert.equal(projection.plan, 'pro');
    assert.equal(projection.status, 'active');
    assert.equal(projection.billingCycle, 'monthly');
    assert.equal(projection.usageLimits.maxUsers, 50);
    assert.ok(projection.renewalDate);
    assert.ok(projection.createdAt);
    assert.ok(projection.updatedAt);
  });
});

describe('SubscriptionSummary', () => {
  it('buildSubscriptionSummary aggregates status and plan counts', () => {
    const registry = createSubscriptionRegistryRuntime(true);
    const projections = registry.getAll().map(toSubscriptionProjection);
    const summary = buildSubscriptionSummary(
      projections,
      projections.length,
      0,
      false
    );
    assert.equal(summary.success, true);
    assert.equal(summary.subscriptionCount, projections.length);
    assert.ok(summary.statusCounts.active >= 1);
    assert.ok((summary.planCounts.pro ?? 0) >= 1);
  });

  it('buildSubscriptionSummaryItems includes subscription-count', () => {
    const summary = buildSubscriptionSummary([], 0, 0, false);
    const items = buildSubscriptionSummaryItems(summary, 'tr');
    assert.ok(items.some((i) => i.key === 'subscription-count'));
    assert.ok(items.some((i) => i.key === 'locale' && i.value === 'tr'));
  });
});

describe('SubscriptionManagementRuntime', () => {
  let runtime;

  beforeEach(() => {
    runtime = createSubscriptionManagementRuntime();
  });

  it('executes full pipeline and returns SubscriptionManagementResult', () => {
    const result = runtime.execute(createSubscriptionManagementContext());
    assert.equal(
      result.subscriptions.length,
      BUILTIN_SUBSCRIPTION_DEFINITION_COUNT
    );
    assert.equal(
      result.summary.subscriptionCount,
      BUILTIN_SUBSCRIPTION_DEFINITION_COUNT
    );
    assert.equal(result.summary.success, true);
    assert.equal(result.validationIssues.length, 0);
    assert.ok(result.summaryItems.length > 0);
  });

  it('records telemetry with duration, subscription count, summary items', () => {
    const result = runtime.execute(createSubscriptionManagementContext());
    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.equal(
      result.telemetry.subscriptionCount,
      result.subscriptions.length
    );
    assert.equal(
      result.telemetry.summaryItemCount,
      result.summaryItems.length
    );
  });

  it('filters subscriptions by subscriptionIds', () => {
    const result = runtime.execute(
      createSubscriptionManagementContext({
        subscriptionIds: ['sub-ent-004', 'sub-susp-005']
      })
    );
    assert.equal(result.subscriptions.length, 2);
    assert.deepEqual(
      result.subscriptions.map((s) => s.identity.id).sort(),
      ['sub-ent-004', 'sub-susp-005']
    );
  });

  it('accepts upstream PlatformAdminResult', () => {
    const platform = createPlatformAdminRuntime().execute(
      createPlatformAdminContext({ moduleIds: ['subscriptions'] })
    );
    const result = runtime.execute(
      createSubscriptionManagementContext({ platformAdminResult: platform })
    );
    assert.equal(result.summary.success, true);
    assert.equal(
      result.subscriptions.length,
      BUILTIN_SUBSCRIPTION_DEFINITION_COUNT
    );
    assert.ok(
      !result.validationIssues.some(
        (i) => i.code === 'SUBSCRIPTIONS_MODULE_NOT_PROJECTED'
      )
    );
  });

  it('exposes registry via getRegistry', () => {
    assert.equal(
      runtime.getRegistry().count(),
      BUILTIN_SUBSCRIPTION_DEFINITION_COUNT
    );
  });

  it('exports pipeline bag key constant', () => {
    assert.equal(
      PIPELINE_BAG_SUBSCRIPTION_MANAGEMENT_RESULT_KEY,
      'subscriptionManagementResult'
    );
  });

  it('reports unavailable count for partial subscription requests', () => {
    const result = runtime.execute(
      createSubscriptionManagementContext({
        subscriptionIds: ['sub-demo-001', 'ghost']
      })
    );
    assert.equal(result.summary.unavailableCount, 1);
    assert.equal(result.subscriptions.length, 1);
    assert.ok(
      result.validationIssues.some((i) => i.code === 'UNKNOWN_SUBSCRIPTION_ID')
    );
  });
});
