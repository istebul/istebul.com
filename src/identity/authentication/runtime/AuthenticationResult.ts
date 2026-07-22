/**
 * İSTEBUL Identity — AuthenticationResult (PR-203B).
 */

import type { IdentityProjection } from '../../runtime/IdentityModule';
import type {
  AuthenticationProjection,
  AuthenticationStatus
} from './AuthenticationModule';

/**
 * Authentication doğrulama bulgusu.
 */
export interface AuthenticationValidationIssue {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

/**
 * Authentication özet öğesi.
 */
export interface AuthenticationSummaryItem {
  key: string;
  label: string;
  value: string | number | boolean;
}

/**
 * Authentication Summary — yürütme özeti.
 */
export interface AuthenticationSummary {
  /** Genel başarı */
  success: boolean;
  /** Authentication state / projeksiyon sayısı */
  authenticationStateCount: number;
  /** Authenticated principal sayısı */
  authenticatedPrincipalCount: number;
  /** İstenen kayıt sayısı */
  requestedCount: number;
  /** Bulunamayan kayıt sayısı */
  unavailableCount: number;
  /** Upstream identity projeksiyon sayısı */
  identityProjectionCount: number;
  /** Durum bazlı sayılar */
  statusCounts: Readonly<Record<AuthenticationStatus, number>>;
}

/**
 * Authentication telemetrisi.
 */
export interface AuthenticationTelemetry {
  /** Toplam süre (ms) */
  durationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Authenticated principal sayısı */
  authenticatedPrincipalCount: number;
  /** Authentication state sayısı */
  authenticationStateCount: number;
  /** Özet öğe sayısı */
  summaryItemCount: number;
}

/**
 * Authentication Runtime çıktısı.
 */
export interface AuthenticationResult {
  /** Upstream / çözümlenen identity projeksiyonları */
  identityProjections: readonly IdentityProjection[];
  /** Authentication projeksiyonları */
  authentications: readonly AuthenticationProjection[];
  /** Yürütme özeti */
  summary: AuthenticationSummary;
  /** Düz özet öğeleri */
  summaryItems: readonly AuthenticationSummaryItem[];
  /** Doğrulama bulguları */
  validationIssues: readonly AuthenticationValidationIssue[];
  /** Telemetri */
  telemetry: AuthenticationTelemetry;
}

/** Pipeline bag anahtarı */
export const PIPELINE_BAG_AUTHENTICATION_RESULT_KEY =
  'authenticationResult' as const;
