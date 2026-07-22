/**
 * İSTEBUL Identity — SessionResult (PR-203C).
 */

import type { IdentityProjection } from '../../runtime/IdentityModule';
import type { AuthenticationProjection } from '../../authentication/runtime/AuthenticationModule';
import type { SessionProjection, SessionState } from './SessionModule';

/**
 * Session doğrulama bulgusu.
 */
export interface SessionValidationIssue {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

/**
 * Session özet öğesi.
 */
export interface SessionSummaryItem {
  key: string;
  label: string;
  value: string | number | boolean;
}

/**
 * Session Summary — yürütme özeti.
 */
export interface SessionSummary {
  /** Genel başarı */
  success: boolean;
  /** Session sayısı */
  sessionCount: number;
  /** Aktif session sayısı */
  activeSessionCount: number;
  /** Süresi dolmuş session sayısı */
  expiredSessionCount: number;
  /** İstenen kayıt sayısı */
  requestedCount: number;
  /** Bulunamayan kayıt sayısı */
  unavailableCount: number;
  /** Upstream identity projeksiyon sayısı */
  identityProjectionCount: number;
  /** Upstream authentication projeksiyon sayısı */
  authenticationProjectionCount: number;
  /** Durum bazlı sayılar */
  stateCounts: Readonly<Record<SessionState, number>>;
}

/**
 * Session telemetrisi.
 */
export interface SessionTelemetry {
  /** Toplam süre (ms) */
  durationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Session sayısı */
  sessionCount: number;
  /** Aktif session sayısı */
  activeSessionCount: number;
  /** Süresi dolmuş session sayısı */
  expiredSessionCount: number;
  /** Özet öğe sayısı */
  summaryItemCount: number;
}

/**
 * Session Runtime çıktısı.
 */
export interface SessionResult {
  /** Upstream / çözümlenen identity projeksiyonları */
  identityProjections: readonly IdentityProjection[];
  /** Upstream / çözümlenen authentication projeksiyonları */
  authenticationProjections: readonly AuthenticationProjection[];
  /** Session projeksiyonları */
  sessions: readonly SessionProjection[];
  /** Yürütme özeti */
  summary: SessionSummary;
  /** Düz özet öğeleri */
  summaryItems: readonly SessionSummaryItem[];
  /** Doğrulama bulguları */
  validationIssues: readonly SessionValidationIssue[];
  /** Telemetri */
  telemetry: SessionTelemetry;
}

/** Pipeline bag anahtarı */
export const PIPELINE_BAG_SESSION_RESULT_KEY = 'sessionResult' as const;
