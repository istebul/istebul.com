/**
 * İSTEBUL Identity — TenantIsolationResult (PR-203E).
 */

import type { IdentityProjection } from '../../runtime/IdentityModule';
import type { AuthenticationProjection } from '../../authentication/runtime/AuthenticationModule';
import type { SessionProjection } from '../../session/runtime/SessionModule';
import type { AuthorizationProjection } from '../../authorization/runtime/AuthorizationModule';
import type { TenantIsolationProjection } from './TenantIsolationModule';

/**
 * Tenant Isolation doğrulama bulgusu.
 */
export interface TenantIsolationValidationIssue {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

/**
 * Tenant Isolation özet öğesi.
 */
export interface TenantIsolationSummaryItem {
  key: string;
  label: string;
  value: string | number | boolean;
}

/**
 * Tenant Isolation Summary — yürütme özeti.
 */
export interface TenantIsolationSummary {
  /** Genel başarı */
  success: boolean;
  /** Tenant / isolation kayıt sayısı */
  tenantCount: number;
  /** Üyelik sayısı */
  membershipCount: number;
  /** Isolation decision sayısı */
  isolationDecisionCount: number;
  /** Allow sayısı */
  allowCount: number;
  /** Deny sayısı */
  denyCount: number;
  /** Restrict sayısı */
  restrictCount: number;
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
  /** Upstream authorization projeksiyon sayısı */
  authorizationProjectionCount: number;
}

/**
 * Tenant Isolation telemetrisi.
 */
export interface TenantIsolationTelemetry {
  /** Toplam süre (ms) */
  durationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Tenant sayısı */
  tenantCount: number;
  /** Üyelik sayısı */
  membershipCount: number;
  /** Isolation decision sayısı */
  isolationDecisionCount: number;
  /** Özet öğe sayısı */
  summaryItemCount: number;
}

/**
 * Tenant Isolation Runtime çıktısı.
 */
export interface TenantIsolationResult {
  identityProjections: readonly IdentityProjection[];
  authenticationProjections: readonly AuthenticationProjection[];
  sessionProjections: readonly SessionProjection[];
  authorizationProjections: readonly AuthorizationProjection[];
  isolations: readonly TenantIsolationProjection[];
  summary: TenantIsolationSummary;
  summaryItems: readonly TenantIsolationSummaryItem[];
  validationIssues: readonly TenantIsolationValidationIssue[];
  telemetry: TenantIsolationTelemetry;
}

/** Pipeline bag anahtarı */
export const PIPELINE_BAG_TENANT_ISOLATION_RESULT_KEY =
  'tenantIsolationResult' as const;
