/**
 * İSTEBUL Platform Admin — System Monitoring modeli (PR-201E).
 *
 * Projection-only iskelet. Gerçek health check / metric collector / alert yok.
 */

/**
 * Servis çalışma durumu.
 */
export type ServiceStatus =
  | 'running'
  | 'degraded'
  | 'stopped'
  | 'unknown';

/**
 * Sağlık durumu.
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/**
 * Runtime metrikleri — projeksiyon alanları (gerçek collector yok).
 */
export interface SystemRuntimeMetrics {
  /** CPU kullanım yüzdesi (projeksiyon) */
  cpuPercent: number;
  /** Bellek kullanım yüzdesi (projeksiyon) */
  memoryPercent: number;
  /** İstek gecikmesi (ms) */
  latencyMs: number;
  /** Saniyedeki istek sayısı */
  requestsPerSecond: number;
}

/**
 * System Identity — sistem/servis kimliği.
 */
export interface SystemIdentity {
  /** Benzersiz servis kimliği */
  id: string;
  /** Görünen ad */
  name: string;
  /** Ortam etiketi */
  environment?: 'production' | 'staging' | 'development';
}

/**
 * System Monitoring tanımı — registry kaydı.
 */
export interface SystemMonitoringDefinition {
  identity: SystemIdentity;
  serviceStatus: ServiceStatus;
  healthStatus: HealthStatus;
  runtimeMetrics: SystemRuntimeMetrics;
  warningCount: number;
  errorCount: number;
  lastCheck: string;
}

/**
 * System Monitoring projeksiyonu — runtime çıktısı.
 */
export interface SystemMonitoringProjection {
  identity: SystemIdentity;
  serviceStatus: ServiceStatus;
  healthStatus: HealthStatus;
  runtimeMetrics: SystemRuntimeMetrics;
  warningCount: number;
  errorCount: number;
  lastCheck: string;
  /** Foundation katmanında her zaman true — gerçek monitoring yok */
  projected: true;
}

/**
 * Tanımı projeksiyona dönüştürür.
 */
export function toSystemMonitoringProjection(
  definition: SystemMonitoringDefinition
): SystemMonitoringProjection {
  return {
    identity: { ...definition.identity },
    serviceStatus: definition.serviceStatus,
    healthStatus: definition.healthStatus,
    runtimeMetrics: { ...definition.runtimeMetrics },
    warningCount: definition.warningCount,
    errorCount: definition.errorCount,
    lastCheck: definition.lastCheck,
    projected: true
  };
}
