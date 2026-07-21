/**
 * İSTEBUL Platform Admin — SystemMonitoringResult (PR-201E).
 */

import type { SystemMonitoringProjection } from './SystemMonitoring';
import type {
  SystemMonitoringSummary,
  SystemMonitoringSummaryItem
} from './SystemMonitoringSummary';

/**
 * System Monitoring doğrulama bulgusu.
 */
export interface SystemMonitoringValidationIssue {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

/**
 * System Monitoring telemetrisi.
 */
export interface SystemMonitoringTelemetry {
  /** Toplam süre (ms) */
  durationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Servis sayısı */
  serviceCount: number;
  /** Özet öğe sayısı */
  summaryItemCount: number;
}

/**
 * System Monitoring Runtime çıktısı.
 */
export interface SystemMonitoringResult {
  /** Servis monitoring projeksiyonları */
  services: readonly SystemMonitoringProjection[];
  /** Yürütme özeti */
  summary: SystemMonitoringSummary;
  /** Düz özet öğeleri */
  summaryItems: readonly SystemMonitoringSummaryItem[];
  /** Doğrulama bulguları */
  validationIssues: readonly SystemMonitoringValidationIssue[];
  /** Telemetri */
  telemetry: SystemMonitoringTelemetry;
}

/** Pipeline bag anahtarı */
export const PIPELINE_BAG_SYSTEM_MONITORING_RESULT_KEY =
  'systemMonitoringResult' as const;
