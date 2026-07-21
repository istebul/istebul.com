/**
 * İSTEBUL Business Admin — runtime sonucu (PR-202A).
 */

import type { BusinessAdminModuleProjection } from './BusinessAdminModule';

/**
 * Business doğrulama bulgusu.
 */
export interface BusinessAdminValidationIssue {
  /** Bulgu kodu */
  code: string;
  /** Mesaj */
  message: string;
  /** Önem derecesi */
  severity: 'warning' | 'error';
}

/**
 * Business özet öğesi.
 */
export interface BusinessAdminSummaryItem {
  /** Anahtar */
  key: string;
  /** Etiket */
  label: string;
  /** Değer */
  value: string | number | boolean;
}

/**
 * Yürütme özeti.
 */
export interface BusinessAdminExecutionSummary {
  /** Genel başarı — error severity yoksa true */
  success: boolean;
  /** Projeksiyon üretilen modül sayısı */
  moduleCount: number;
  /** İstenen modül sayısı */
  requestedCount: number;
  /** Bulunamayan modül sayısı */
  unavailableCount: number;
  /** Tenant kimliği */
  tenantId: string;
}

/**
 * Business Admin telemetrisi.
 */
export interface BusinessAdminTelemetry {
  /** Toplam süre (ms) */
  durationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Kayıtlı modül sayısı */
  registeredModuleCount: number;
  /** Özet öğe sayısı */
  summaryItemCount: number;
}

/**
 * Business Admin Runtime çıktısı.
 */
export interface BusinessAdminResult {
  /** Modül projeksiyonları */
  modules: readonly BusinessAdminModuleProjection[];
  /** Yürütme özeti */
  summary: BusinessAdminExecutionSummary;
  /** Business özet öğeleri */
  summaryItems: readonly BusinessAdminSummaryItem[];
  /** Doğrulama bulguları */
  validationIssues: readonly BusinessAdminValidationIssue[];
  /** Telemetri */
  telemetry: BusinessAdminTelemetry;
}

/** Pipeline bag anahtarı — zengin runtime sonucu */
export const PIPELINE_BAG_BUSINESS_ADMIN_RESULT_KEY =
  'businessAdminResult' as const;
