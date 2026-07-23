/**
 * İSTEBUL Platform Admin — UserManagementResult (PR-201C).
 */

import type { UserProjection } from './User';
import type { UserSummary, UserSummaryItem } from './UserSummary';

/**
 * User Management doğrulama bulgusu.
 */
export interface UserManagementValidationIssue {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

/**
 * User Management telemetrisi.
 */
export interface UserManagementTelemetry {
  /** Toplam süre (ms) */
  durationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Kullanıcı sayısı */
  userCount: number;
  /** Özet öğe sayısı */
  summaryItemCount: number;
}

/**
 * User Management Runtime çıktısı.
 */
export interface UserManagementResult {
  /** Kullanıcı projeksiyonları */
  users: readonly UserProjection[];
  /** Yürütme özeti */
  summary: UserSummary;
  /** Düz özet öğeleri */
  summaryItems: readonly UserSummaryItem[];
  /** Doğrulama bulguları */
  validationIssues: readonly UserManagementValidationIssue[];
  /** Telemetri */
  telemetry: UserManagementTelemetry;
}

/** Pipeline bag anahtarı */
export const PIPELINE_BAG_USER_MANAGEMENT_RESULT_KEY =
  'userManagementResult' as const;
