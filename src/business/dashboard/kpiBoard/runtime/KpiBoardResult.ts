/**
 * İSTEBUL Business Dashboard Engine — KPI Board runtime sonucu (PR-105D).
 */

import type { DashboardKPI } from '../../models/DashboardKPI';
import type { KpiRecord } from './KpiRecord';

/**
 * KPI uyarısı.
 */
export interface KpiBoardWarning {
  code: string;
  message: string;
  kpiId?: string;
}

/**
 * KPI Board telemetrisi.
 */
export interface KpiBoardTelemetry {
  /** Execution duration (ms) */
  durationMs: number;
  startedAt: string;
  endedAt: string;
  /** KPI count */
  kpiCount: number;
  /** Registry mapping count */
  registryMappingCount: number;
  warningCount: number;
}

/**
 * KPI Board metadata.
 */
export interface KpiBoardMetadata {
  dashboardModelId: string;
  locale: 'tr' | 'en';
  generatedAt: string;
  kpiIds: readonly string[];
  mappedSourceParts: readonly string[];
}

/**
 * KPI Board Runtime çıktısı.
 */
export interface KpiBoardResult {
  /** Zengin KPI kayıtları */
  records: readonly KpiRecord[];
  /** Foundation DashboardKPI listesi */
  kpis: readonly DashboardKPI[];
  /** Metadata */
  metadata: KpiBoardMetadata;
  /** Uyarılar */
  warnings: readonly KpiBoardWarning[];
  /** Telemetri */
  telemetry: KpiBoardTelemetry;
}

/** Pipeline bag anahtarı — Dashboard Engine */
export const PIPELINE_BAG_DASHBOARD_KPI_BOARD_RUNTIME_RESULT_KEY =
  'dashboardKpiBoardRuntimeResult' as const;
