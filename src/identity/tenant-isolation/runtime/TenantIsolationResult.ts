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
  readonly code: string;
  readonly message: string;
  readonly severity: 'warning' | 'error';
}

/**
 * Tenant Isolation özet öğesi.
 */
export interface TenantIsolationSummaryItem {
  readonly key: string;
  readonly label: string;
  readonly value: string | number | boolean;
}

/**
 * Tenant Isolation Summary — yürütme özeti.
 */
export interface TenantIsolationSummary {
  /** Genel başarı */
  readonly success: boolean;
  /** Tenant / isolation kayıt sayısı */
  readonly tenantCount: number;
  /** Üyelik sayısı */
  readonly membershipCount: number;
  /** Isolation decision sayısı */
  readonly isolationDecisionCount: number;
  /** Allow sayısı */
  readonly allowCount: number;
  /** Deny sayısı */
  readonly denyCount: number;
  /** Restrict sayısı */
  readonly restrictCount: number;
  /** İstenen kayıt sayısı */
  readonly requestedCount: number;
  /** Bulunamayan kayıt sayısı */
  readonly unavailableCount: number;
  /** Upstream identity projeksiyon sayısı */
  readonly identityProjectionCount: number;
  /** Upstream authentication projeksiyon sayısı */
  readonly authenticationProjectionCount: number;
  /** Upstream session projeksiyon sayısı */
  readonly sessionProjectionCount: number;
  /** Upstream authorization projeksiyon sayısı */
  readonly authorizationProjectionCount: number;
}

/**
 * Tenant Isolation telemetrisi.
 */
export interface TenantIsolationTelemetry {
  /** Toplam süre (ms) */
  readonly durationMs: number;
  /** Başlangıç ISO */
  readonly startedAt: string;
  /** Bitiş ISO */
  readonly endedAt: string;
  /** Tenant sayısı */
  readonly tenantCount: number;
  /** Üyelik sayısı */
  readonly membershipCount: number;
  /** Isolation decision sayısı */
  readonly isolationDecisionCount: number;
  /** Özet öğe sayısı */
  readonly summaryItemCount: number;
}

/**
 * Tenant Isolation Runtime çıktısı.
 */
export interface TenantIsolationResult {
  readonly identityProjections: readonly IdentityProjection[];
  readonly authenticationProjections: readonly AuthenticationProjection[];
  readonly sessionProjections: readonly SessionProjection[];
  readonly authorizationProjections: readonly AuthorizationProjection[];
  readonly isolations: readonly TenantIsolationProjection[];
  readonly summary: TenantIsolationSummary;
  readonly summaryItems: readonly TenantIsolationSummaryItem[];
  readonly validationIssues: readonly TenantIsolationValidationIssue[];
  readonly telemetry: TenantIsolationTelemetry;
}

/** Pipeline bag anahtarı */
export const PIPELINE_BAG_TENANT_ISOLATION_RESULT_KEY =
  'tenantIsolationResult' as const;
