/**
 * İSTEBUL Business Analysis Engine — KPI runtime sonucu (PR-102B).
 *
 * Foundation `KPIResult` (tekil KPI çıktısı) ile karıştırılmamalıdır.
 */

import type { KPIResult as FoundationKPIResult } from '../../models/KPIResult';
import type { KpiCalculation } from './KpiCalculation';

/**
 * KPI uyarısı.
 */
export interface KpiWarning {
  /** Uyarı kodu */
  code: string;
  /** Mesaj */
  message: string;
  /** İlgili KPI */
  kpiId?: string;
}

/**
 * Dataset boyut özeti.
 */
export interface KpiDatasetSize {
  entityCount: number;
  recordCount: number;
  columnCount: number;
  totalFieldCount: number;
}

/**
 * Yürütme özeti.
 */
export interface KpiExecutionSummary {
  /** Hesaplanan KPI sayısı */
  calculatedCount: number;
  /** İstenen KPI sayısı */
  requestedCount: number;
  /** Hesaplanamayan KPI sayısı */
  unavailableCount: number;
  /** Genel başarı — en az bir KPI üretildiyse true */
  success: boolean;
}

/**
 * KPI telemetrisi.
 */
export interface KpiTelemetry {
  /** Toplam süre (ms) */
  durationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Hesaplanan KPI sayısı */
  calculatedKpiCount: number;
  /** Uyarı sayısı */
  warningCount: number;
  /** Dataset boyutu */
  datasetSize: KpiDatasetSize;
}

/**
 * KPI Engine Runtime çıktısı.
 */
export interface KpiResult {
  /** Detaylı hesaplama kayıtları */
  calculations: readonly KpiCalculation[];
  /** Foundation uyumlu KPI sonuçları */
  kpiResults: readonly FoundationKPIResult[];
  /** Yürütme özeti */
  summary: KpiExecutionSummary;
  /** Uyarılar */
  warnings: readonly KpiWarning[];
  /** Telemetri */
  telemetry: KpiTelemetry;
}

/** Pipeline bag anahtarı — zengin runtime sonucu */
export const PIPELINE_BAG_KPI_RUNTIME_RESULT_KEY = 'kpiRuntimeResult' as const;
