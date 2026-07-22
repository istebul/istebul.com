/**
 * İSTEBUL Identity — runtime sonucu (PR-203A).
 */

import type { IdentityProjection, IdentityStatus } from './IdentityModule';

/**
 * Identity doğrulama bulgusu.
 */
export interface IdentityValidationIssue {
  /** Bulgu kodu */
  code: string;
  /** Mesaj */
  message: string;
  /** Önem derecesi */
  severity: 'warning' | 'error';
}

/**
 * Identity özet öğesi.
 */
export interface IdentitySummaryItem {
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
export interface IdentityExecutionSummary {
  /** Genel başarı — error severity yoksa true */
  success: boolean;
  /** Projeksiyon üretilen kimlik sayısı */
  identityCount: number;
  /** Toplam rol sayısı (projeksiyonlar üzerinden) */
  roleCount: number;
  /** Toplam izin sayısı (projeksiyonlar üzerinden) */
  permissionCount: number;
  /** İstenen kimlik sayısı */
  requestedCount: number;
  /** Bulunamayan kimlik sayısı */
  unavailableCount: number;
  /** Durum bazlı sayılar */
  statusCounts: Readonly<Record<IdentityStatus, number>>;
}

/**
 * Identity telemetrisi.
 */
export interface IdentityTelemetry {
  /** Toplam süre (ms) */
  durationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Kimlik sayısı */
  identityCount: number;
  /** Rol sayısı */
  roleCount: number;
  /** İzin sayısı */
  permissionCount: number;
  /** Özet öğe sayısı */
  summaryItemCount: number;
}

/**
 * Identity Runtime çıktısı.
 */
export interface IdentityResult {
  /** Kimlik projeksiyonları */
  identities: readonly IdentityProjection[];
  /** Yürütme özeti */
  summary: IdentityExecutionSummary;
  /** Identity özet öğeleri */
  summaryItems: readonly IdentitySummaryItem[];
  /** Doğrulama bulguları */
  validationIssues: readonly IdentityValidationIssue[];
  /** Telemetri */
  telemetry: IdentityTelemetry;
}

/** Pipeline bag anahtarı — zengin runtime sonucu */
export const PIPELINE_BAG_IDENTITY_RESULT_KEY = 'identityResult' as const;
