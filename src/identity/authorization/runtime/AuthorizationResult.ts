/**
 * İSTEBUL Identity — AuthorizationResult (PR-203D).
 */

import type { IdentityProjection } from '../../runtime/IdentityModule';
import type { AuthenticationProjection } from '../../authentication/runtime/AuthenticationModule';
import type { SessionProjection } from '../../session/runtime/SessionModule';
import type { AuthorizationProjection } from './AuthorizationModule';

/**
 * Authorization doğrulama bulgusu.
 */
export interface AuthorizationValidationIssue {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

/**
 * Authorization özet öğesi.
 */
export interface AuthorizationSummaryItem {
  key: string;
  label: string;
  value: string | number | boolean;
}

/**
 * Authorization Summary — yürütme özeti.
 */
export interface AuthorizationSummary {
  /** Genel başarı */
  success: boolean;
  /** Authorization kayıt sayısı */
  authorizationCount: number;
  /** Rol sayısı (projeksiyonlar üzerinden) */
  roleCount: number;
  /** İzin sayısı */
  permissionCount: number;
  /** Karar sayısı */
  decisionCount: number;
  /** Allow karar sayısı */
  allowCount: number;
  /** Deny karar sayısı */
  denyCount: number;
  /** İstenen kayıt sayısı */
  requestedCount: number;
  /** Bulunamayan kayıt sayısı */
  unavailableCount: number;
  /** Upstream identity projeksiyon sayısı */
  identityProjectionCount: number;
  /** Upstream authentication projeksiyon sayısı */
  authenticationProjectionCount: number;
  /** Upstream session projeksiyon sayısı */
  sessionProjectionCount: number;
}

/**
 * Authorization telemetrisi.
 */
export interface AuthorizationTelemetry {
  /** Toplam süre (ms) */
  durationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Rol sayısı */
  roleCount: number;
  /** İzin sayısı */
  permissionCount: number;
  /** Karar sayısı */
  decisionCount: number;
  /** Özet öğe sayısı */
  summaryItemCount: number;
}

/**
 * Authorization Runtime çıktısı.
 */
export interface AuthorizationResult {
  identityProjections: readonly IdentityProjection[];
  authenticationProjections: readonly AuthenticationProjection[];
  sessionProjections: readonly SessionProjection[];
  authorizations: readonly AuthorizationProjection[];
  summary: AuthorizationSummary;
  summaryItems: readonly AuthorizationSummaryItem[];
  validationIssues: readonly AuthorizationValidationIssue[];
  telemetry: AuthorizationTelemetry;
}

/** Pipeline bag anahtarı */
export const PIPELINE_BAG_AUTHORIZATION_RESULT_KEY =
  'authorizationResult' as const;
