/**
 * İSTEBUL Platform Admin — SystemMonitoringSummary (PR-201E).
 */

import type {
  SystemMonitoringProjection,
  ServiceStatus,
  HealthStatus
} from './SystemMonitoring';

/**
 * System Monitoring Summary — yürütme özeti.
 */
export interface SystemMonitoringSummary {
  /** Genel başarı */
  success: boolean;
  /** Projeksiyon üretilen servis sayısı */
  serviceCount: number;
  /** İstenen servis sayısı */
  requestedCount: number;
  /** Bulunamayan servis sayısı */
  unavailableCount: number;
  /** Toplam uyarı sayısı */
  totalWarningCount: number;
  /** Toplam hata sayısı */
  totalErrorCount: number;
  /** Servis durumu bazlı sayılar */
  serviceStatusCounts: Readonly<Record<ServiceStatus, number>>;
  /** Sağlık durumu bazlı sayılar */
  healthStatusCounts: Readonly<Record<HealthStatus, number>>;
}

/**
 * Özet öğesi — telemetry / UI için düz liste.
 */
export interface SystemMonitoringSummaryItem {
  key: string;
  label: string;
  value: string | number | boolean;
}

function emptyServiceStatusCounts(): Record<ServiceStatus, number> {
  return {
    running: 0,
    degraded: 0,
    stopped: 0,
    unknown: 0
  };
}

function emptyHealthStatusCounts(): Record<HealthStatus, number> {
  return {
    healthy: 0,
    degraded: 0,
    unhealthy: 0,
    unknown: 0
  };
}

/**
 * Monitoring projeksiyonlarından SystemMonitoringSummary üretir.
 */
export function buildSystemMonitoringSummary(
  projections: readonly SystemMonitoringProjection[],
  requestedCount: number,
  unavailableCount: number,
  hasErrors: boolean
): SystemMonitoringSummary {
  const serviceStatusCounts = emptyServiceStatusCounts();
  const healthStatusCounts = emptyHealthStatusCounts();
  let totalWarningCount = 0;
  let totalErrorCount = 0;

  for (const item of projections) {
    serviceStatusCounts[item.serviceStatus] += 1;
    healthStatusCounts[item.healthStatus] += 1;
    totalWarningCount += item.warningCount;
    totalErrorCount += item.errorCount;
  }

  return {
    success: !hasErrors && projections.length > 0,
    serviceCount: projections.length,
    requestedCount,
    unavailableCount,
    totalWarningCount,
    totalErrorCount,
    serviceStatusCounts: Object.freeze(serviceStatusCounts),
    healthStatusCounts: Object.freeze(healthStatusCounts)
  };
}

/**
 * Düz özet öğeleri üretir.
 */
export function buildSystemMonitoringSummaryItems(
  summary: SystemMonitoringSummary,
  locale: 'tr' | 'en',
  actorId?: string
): readonly SystemMonitoringSummaryItem[] {
  const items: SystemMonitoringSummaryItem[] = [
    { key: 'locale', label: 'Locale', value: locale },
    {
      key: 'service-count',
      label: 'Service Count',
      value: summary.serviceCount
    },
    {
      key: 'requested-count',
      label: 'Requested Count',
      value: summary.requestedCount
    },
    {
      key: 'unavailable-count',
      label: 'Unavailable Count',
      value: summary.unavailableCount
    },
    {
      key: 'success',
      label: 'Success',
      value: summary.success
    },
    {
      key: 'total-warning-count',
      label: 'Total Warning Count',
      value: summary.totalWarningCount
    },
    {
      key: 'total-error-count',
      label: 'Total Error Count',
      value: summary.totalErrorCount
    },
    {
      key: 'service-running',
      label: 'Service: running',
      value: summary.serviceStatusCounts.running
    },
    {
      key: 'service-degraded',
      label: 'Service: degraded',
      value: summary.serviceStatusCounts.degraded
    },
    {
      key: 'service-stopped',
      label: 'Service: stopped',
      value: summary.serviceStatusCounts.stopped
    },
    {
      key: 'health-healthy',
      label: 'Health: healthy',
      value: summary.healthStatusCounts.healthy
    },
    {
      key: 'health-degraded',
      label: 'Health: degraded',
      value: summary.healthStatusCounts.degraded
    },
    {
      key: 'health-unhealthy',
      label: 'Health: unhealthy',
      value: summary.healthStatusCounts.unhealthy
    }
  ];

  if (actorId) {
    items.push({ key: 'actor-id', label: 'Actor ID', value: actorId });
  }

  return Object.freeze(items);
}
