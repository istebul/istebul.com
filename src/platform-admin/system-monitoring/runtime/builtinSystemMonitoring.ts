/**
 * İSTEBUL Platform Admin — yerleşik system monitoring tanımları (PR-201E).
 *
 * Projection-only örnek kayıtlar. Gerçek monitoring entegrasyonu yok.
 */

import type { SystemMonitoringDefinition } from './SystemMonitoring';

/**
 * Yerleşik system monitoring iskeletleri.
 */
export const BUILTIN_SYSTEM_MONITORING_DEFINITIONS: readonly SystemMonitoringDefinition[] =
  Object.freeze([
    {
      identity: {
        id: 'svc-api-gateway',
        name: 'API Gateway',
        environment: 'production'
      },
      serviceStatus: 'running',
      healthStatus: 'healthy',
      runtimeMetrics: {
        cpuPercent: 22,
        memoryPercent: 48,
        latencyMs: 45,
        requestsPerSecond: 120
      },
      warningCount: 0,
      errorCount: 0,
      lastCheck: '2026-07-21T12:00:00.000Z'
    },
    {
      identity: {
        id: 'svc-ai-proxy',
        name: 'AI Proxy',
        environment: 'production'
      },
      serviceStatus: 'running',
      healthStatus: 'degraded',
      runtimeMetrics: {
        cpuPercent: 68,
        memoryPercent: 72,
        latencyMs: 320,
        requestsPerSecond: 35
      },
      warningCount: 3,
      errorCount: 1,
      lastCheck: '2026-07-21T12:00:00.000Z'
    },
    {
      identity: {
        id: 'svc-auth',
        name: 'Auth Service',
        environment: 'production'
      },
      serviceStatus: 'running',
      healthStatus: 'healthy',
      runtimeMetrics: {
        cpuPercent: 15,
        memoryPercent: 40,
        latencyMs: 28,
        requestsPerSecond: 80
      },
      warningCount: 0,
      errorCount: 0,
      lastCheck: '2026-07-21T11:59:30.000Z'
    },
    {
      identity: {
        id: 'svc-worker-queue',
        name: 'Worker Queue',
        environment: 'production'
      },
      serviceStatus: 'degraded',
      healthStatus: 'degraded',
      runtimeMetrics: {
        cpuPercent: 81,
        memoryPercent: 85,
        latencyMs: 900,
        requestsPerSecond: 12
      },
      warningCount: 5,
      errorCount: 2,
      lastCheck: '2026-07-21T11:58:00.000Z'
    },
    {
      identity: {
        id: 'svc-storage',
        name: 'Object Storage',
        environment: 'production'
      },
      serviceStatus: 'running',
      healthStatus: 'healthy',
      runtimeMetrics: {
        cpuPercent: 10,
        memoryPercent: 30,
        latencyMs: 60,
        requestsPerSecond: 50
      },
      warningCount: 1,
      errorCount: 0,
      lastCheck: '2026-07-21T12:00:00.000Z'
    },
    {
      identity: {
        id: 'svc-edge-cache',
        name: 'Edge Cache',
        environment: 'staging'
      },
      serviceStatus: 'stopped',
      healthStatus: 'unhealthy',
      runtimeMetrics: {
        cpuPercent: 0,
        memoryPercent: 0,
        latencyMs: 0,
        requestsPerSecond: 0
      },
      warningCount: 0,
      errorCount: 4,
      lastCheck: '2026-07-21T11:45:00.000Z'
    }
  ]);

/** Yerleşik system monitoring kaydı sayısı */
export const BUILTIN_SYSTEM_MONITORING_DEFINITION_COUNT =
  BUILTIN_SYSTEM_MONITORING_DEFINITIONS.length;

/**
 * Yerleşik system monitoring tanımını id ile döndürür.
 */
export function getBuiltinSystemMonitoringDefinition(
  serviceId: string
): SystemMonitoringDefinition | undefined {
  return BUILTIN_SYSTEM_MONITORING_DEFINITIONS.find(
    (item) => item.identity.id === serviceId
  );
}
