/**
 * İSTEBUL Platform Admin — runtime sonucu (PR-201A).
 */

import type { PlatformAdminModuleProjection } from './PlatformAdminModule';

/**
 * Platform doğrulama bulgusu.
 */
export interface PlatformAdminValidationIssue {
  /** Bulgu kodu */
  code: string;
  /** Mesaj */
  message: string;
  /** Önem derecesi */
  severity: 'warning' | 'error';
}

/**
 * Platform özet öğesi.
 */
export interface PlatformAdminSummaryItem {
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
export interface PlatformAdminExecutionSummary {
  /** Genel başarı — error severity yoksa true */
  success: boolean;
  /** Projeksiyon üretilen modül sayısı */
  moduleCount: number;
  /** İstenen modül sayısı */
  requestedCount: number;
  /** Bulunamayan modül sayısı */
  unavailableCount: number;
}

/**
 * Platform Admin telemetrisi.
 */
export interface PlatformAdminTelemetry {
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
 * Platform Admin Runtime çıktısı.
 */
export interface PlatformAdminResult {
  /** Modül projeksiyonları */
  modules: readonly PlatformAdminModuleProjection[];
  /** Yürütme özeti */
  summary: PlatformAdminExecutionSummary;
  /** Platform özet öğeleri */
  summaryItems: readonly PlatformAdminSummaryItem[];
  /** Doğrulama bulguları */
  validationIssues: readonly PlatformAdminValidationIssue[];
  /** Telemetri */
  telemetry: PlatformAdminTelemetry;
}

/** Pipeline bag anahtarı — zengin runtime sonucu */
export const PIPELINE_BAG_PLATFORM_ADMIN_RESULT_KEY =
  'platformAdminResult' as const;
