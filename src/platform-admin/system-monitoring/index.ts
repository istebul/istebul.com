/**
 * İSTEBUL Platform Admin — System Monitoring (PR-201E).
 *
 * Architecture Freeze v1.0 — additive runtime.
 * PR-201A–201D değiştirilmez.
 * Yalnızca projeksiyon; gerçek monitoring entegrasyonu yok.
 */

export type {
  ServiceStatus,
  HealthStatus,
  SystemRuntimeMetrics,
  SystemIdentity,
  SystemMonitoringDefinition,
  SystemMonitoringProjection,
  SystemMonitoringContext,
  SystemMonitoringSummary,
  SystemMonitoringSummaryItem,
  SystemMonitoringValidationIssue,
  SystemMonitoringTelemetry,
  SystemMonitoringResult
} from './runtime/index';

export {
  toSystemMonitoringProjection,
  createSystemMonitoringContext,
  buildSystemMonitoringSummary,
  buildSystemMonitoringSummaryItems,
  PIPELINE_BAG_SYSTEM_MONITORING_RESULT_KEY,
  SystemMonitoringRegistryRuntime,
  createSystemMonitoringRegistryRuntime,
  SystemMonitoringRuntime,
  createSystemMonitoringRuntime,
  BUILTIN_SYSTEM_MONITORING_DEFINITIONS,
  BUILTIN_SYSTEM_MONITORING_DEFINITION_COUNT,
  getBuiltinSystemMonitoringDefinition,
  validateSystemMonitoringContext,
  resolveRequestedServices
} from './runtime/index';
