/**
 * System Monitoring Runtime — PR-201E (en az 20 unit test)
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
  createSystemMonitoringRuntime,
  createSystemMonitoringRegistryRuntime,
  createSystemMonitoringContext,
  validateSystemMonitoringContext,
  resolveRequestedServices,
  buildSystemMonitoringSummary,
  buildSystemMonitoringSummaryItems,
  toSystemMonitoringProjection,
  BUILTIN_SYSTEM_MONITORING_DEFINITIONS,
  BUILTIN_SYSTEM_MONITORING_DEFINITION_COUNT,
  getBuiltinSystemMonitoringDefinition,
  PIPELINE_BAG_SYSTEM_MONITORING_RESULT_KEY
} = await import('../../src/platform-admin/index.ts');

describe('SystemMonitoringRegistryRuntime', () => {
  let registry;

  beforeEach(() => {
    registry = createSystemMonitoringRegistryRuntime(true);
  });

  it('seeds all builtin services', () => {
    assert.equal(registry.count(), BUILTIN_SYSTEM_MONITORING_DEFINITION_COUNT);
    assert.equal(BUILTIN_SYSTEM_MONITORING_DEFINITIONS.length, 6);
  });

  it('getById returns api gateway', () => {
    const svc = registry.getById('svc-api-gateway');
    assert.ok(svc);
    assert.equal(svc.identity.name, 'API Gateway');
    assert.equal(svc.serviceStatus, 'running');
    assert.equal(svc.healthStatus, 'healthy');
  });

  it('getBuiltinSystemMonitoringDefinition resolves ai proxy', () => {
    const svc = getBuiltinSystemMonitoringDefinition('svc-ai-proxy');
    assert.ok(svc);
    assert.equal(svc.healthStatus, 'degraded');
    assert.ok(svc.warningCount >= 1);
  });

  it('register adds a new service', () => {
    registry.register({
      identity: { id: 'svc-custom-099', name: 'Custom' },
      serviceStatus: 'unknown',
      healthStatus: 'unknown',
      runtimeMetrics: {
        cpuPercent: 0,
        memoryPercent: 0,
        latencyMs: 0,
        requestsPerSecond: 0
      },
      warningCount: 0,
      errorCount: 0,
      lastCheck: '2026-07-21T00:00:00.000Z'
    });
    assert.equal(
      registry.count(),
      BUILTIN_SYSTEM_MONITORING_DEFINITION_COUNT + 1
    );
  });

  it('register throws on duplicate id', () => {
    assert.throws(
      () => registry.register(BUILTIN_SYSTEM_MONITORING_DEFINITIONS[0]),
      /zaten kayıtlı/
    );
  });

  it('register throws on missing id', () => {
    assert.throws(
      () =>
        registry.register({
          identity: { id: '', name: 'X' },
          serviceStatus: 'running',
          healthStatus: 'healthy',
          runtimeMetrics: {
            cpuPercent: 0,
            memoryPercent: 0,
            latencyMs: 0,
            requestsPerSecond: 0
          },
          warningCount: 0,
          errorCount: 0,
          lastCheck: '2026-07-21T00:00:00.000Z'
        }),
      /identity.id zorunludur/
    );
  });

  it('unregister removes a service', () => {
    assert.ok(registry.unregister('svc-edge-cache'));
    assert.equal(
      registry.count(),
      BUILTIN_SYSTEM_MONITORING_DEFINITION_COUNT - 1
    );
    assert.equal(registry.getById('svc-edge-cache'), undefined);
  });

  it('getByHealthStatus filters healthy services', () => {
    const healthy = registry.getByHealthStatus('healthy');
    assert.ok(healthy.length >= 2);
    assert.ok(healthy.every((s) => s.healthStatus === 'healthy'));
  });
});

describe('SystemMonitoringContext', () => {
  it('defaults locale to tr', () => {
    const ctx = createSystemMonitoringContext();
    assert.equal(ctx.locale, 'tr');
  });

  it('accepts en locale and actorId', () => {
    const ctx = createSystemMonitoringContext({
      locale: 'en',
      actorId: 'ops-1'
    });
    assert.equal(ctx.locale, 'en');
    assert.equal(ctx.actorId, 'ops-1');
  });
});

describe('validateSystemMonitoringContext', () => {
  let registry;

  beforeEach(() => {
    registry = createSystemMonitoringRegistryRuntime(true);
  });

  it('passes for valid default context', () => {
    const issues = validateSystemMonitoringContext(
      createSystemMonitoringContext(),
      registry
    );
    assert.equal(issues.length, 0);
  });

  it('warns on empty serviceIds', () => {
    const issues = validateSystemMonitoringContext(
      createSystemMonitoringContext({ serviceIds: [] }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'EMPTY_SERVICE_IDS'));
  });

  it('warns on unknown service id', () => {
    const issues = validateSystemMonitoringContext(
      createSystemMonitoringContext({
        serviceIds: ['svc-api-gateway', 'missing']
      }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'UNKNOWN_SERVICE_ID'));
  });

  it('warns when platform admin result lacks system module', () => {
    const platform = createPlatformAdminRuntime().execute(
      createPlatformAdminContext({ moduleIds: ['users'] })
    );
    const issues = validateSystemMonitoringContext(
      createSystemMonitoringContext({ platformAdminResult: platform }),
      registry
    );
    assert.ok(issues.some((i) => i.code === 'SYSTEM_MODULE_NOT_PROJECTED'));
  });
});

describe('resolveRequestedServices', () => {
  let registry;

  beforeEach(() => {
    registry = createSystemMonitoringRegistryRuntime(true);
  });

  it('returns all services when serviceIds omitted', () => {
    const { services, requestedCount, unavailableCount } =
      resolveRequestedServices(createSystemMonitoringContext(), registry);
    assert.equal(services.length, BUILTIN_SYSTEM_MONITORING_DEFINITION_COUNT);
    assert.equal(
      requestedCount,
      BUILTIN_SYSTEM_MONITORING_DEFINITION_COUNT
    );
    assert.equal(unavailableCount, 0);
  });

  it('filters to requested service ids', () => {
    const { services, requestedCount, unavailableCount } =
      resolveRequestedServices(
        createSystemMonitoringContext({
          serviceIds: ['svc-api-gateway', 'svc-auth']
        }),
        registry
      );
    assert.equal(services.length, 2);
    assert.equal(requestedCount, 2);
    assert.equal(unavailableCount, 0);
  });

  it('counts unavailable services for unknown ids', () => {
    const { services, unavailableCount } = resolveRequestedServices(
      createSystemMonitoringContext({
        serviceIds: ['svc-api-gateway', 'ghost']
      }),
      registry
    );
    assert.equal(services.length, 1);
    assert.equal(unavailableCount, 1);
  });
});

describe('toSystemMonitoringProjection', () => {
  it('projects full monitoring model fields', () => {
    const def = getBuiltinSystemMonitoringDefinition('svc-api-gateway');
    assert.ok(def);
    const projection = toSystemMonitoringProjection(def);
    assert.equal(projection.projected, true);
    assert.equal(projection.identity.id, 'svc-api-gateway');
    assert.equal(projection.serviceStatus, 'running');
    assert.equal(projection.healthStatus, 'healthy');
    assert.equal(projection.runtimeMetrics.cpuPercent, 22);
    assert.equal(projection.warningCount, 0);
    assert.equal(projection.errorCount, 0);
    assert.ok(projection.lastCheck);
  });
});

describe('SystemMonitoringSummary', () => {
  it('buildSystemMonitoringSummary aggregates status and counts', () => {
    const registry = createSystemMonitoringRegistryRuntime(true);
    const projections = registry.getAll().map(toSystemMonitoringProjection);
    const summary = buildSystemMonitoringSummary(
      projections,
      projections.length,
      0,
      false
    );
    assert.equal(summary.success, true);
    assert.equal(summary.serviceCount, projections.length);
    assert.ok(summary.serviceStatusCounts.running >= 1);
    assert.ok(summary.totalWarningCount >= 0);
    assert.ok(summary.totalErrorCount >= 0);
  });

  it('buildSystemMonitoringSummaryItems includes service-count', () => {
    const summary = buildSystemMonitoringSummary([], 0, 0, false);
    const items = buildSystemMonitoringSummaryItems(summary, 'tr');
    assert.ok(items.some((i) => i.key === 'service-count'));
    assert.ok(items.some((i) => i.key === 'locale' && i.value === 'tr'));
  });
});

describe('SystemMonitoringRuntime', () => {
  let runtime;

  beforeEach(() => {
    runtime = createSystemMonitoringRuntime();
  });

  it('executes full pipeline and returns SystemMonitoringResult', () => {
    const result = runtime.execute(createSystemMonitoringContext());
    assert.equal(
      result.services.length,
      BUILTIN_SYSTEM_MONITORING_DEFINITION_COUNT
    );
    assert.equal(
      result.summary.serviceCount,
      BUILTIN_SYSTEM_MONITORING_DEFINITION_COUNT
    );
    assert.equal(result.summary.success, true);
    assert.equal(result.validationIssues.length, 0);
    assert.ok(result.summaryItems.length > 0);
  });

  it('records telemetry with duration, service count, summary items', () => {
    const result = runtime.execute(createSystemMonitoringContext());
    assert.ok(result.telemetry.durationMs >= 0);
    assert.ok(result.telemetry.startedAt);
    assert.ok(result.telemetry.endedAt);
    assert.equal(result.telemetry.serviceCount, result.services.length);
    assert.equal(
      result.telemetry.summaryItemCount,
      result.summaryItems.length
    );
  });

  it('filters services by serviceIds', () => {
    const result = runtime.execute(
      createSystemMonitoringContext({
        serviceIds: ['svc-ai-proxy', 'svc-worker-queue']
      })
    );
    assert.equal(result.services.length, 2);
    assert.deepEqual(
      result.services.map((s) => s.identity.id).sort(),
      ['svc-ai-proxy', 'svc-worker-queue']
    );
  });

  it('accepts upstream PlatformAdminResult', () => {
    const platform = createPlatformAdminRuntime().execute(
      createPlatformAdminContext({ moduleIds: ['system'] })
    );
    const result = runtime.execute(
      createSystemMonitoringContext({ platformAdminResult: platform })
    );
    assert.equal(result.summary.success, true);
    assert.equal(
      result.services.length,
      BUILTIN_SYSTEM_MONITORING_DEFINITION_COUNT
    );
    assert.ok(
      !result.validationIssues.some(
        (i) => i.code === 'SYSTEM_MODULE_NOT_PROJECTED'
      )
    );
  });

  it('exposes registry via getRegistry', () => {
    assert.equal(
      runtime.getRegistry().count(),
      BUILTIN_SYSTEM_MONITORING_DEFINITION_COUNT
    );
  });

  it('exports pipeline bag key constant', () => {
    assert.equal(
      PIPELINE_BAG_SYSTEM_MONITORING_RESULT_KEY,
      'systemMonitoringResult'
    );
  });

  it('reports unavailable count for partial service requests', () => {
    const result = runtime.execute(
      createSystemMonitoringContext({
        serviceIds: ['svc-api-gateway', 'ghost']
      })
    );
    assert.equal(result.summary.unavailableCount, 1);
    assert.equal(result.services.length, 1);
    assert.ok(
      result.validationIssues.some((i) => i.code === 'UNKNOWN_SERVICE_ID')
    );
  });
});
