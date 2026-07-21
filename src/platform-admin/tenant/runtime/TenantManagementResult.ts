/**
 * İSTEBUL Platform Admin — TenantManagementResult (PR-201B).
 */

import type { TenantProjection } from './Tenant';
import type { TenantSummary, TenantSummaryItem } from './TenantSummary';

/**
 * Tenant Management doğrulama bulgusu.
 */
export interface TenantManagementValidationIssue {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

/**
 * Tenant Management telemetrisi.
 */
export interface TenantManagementTelemetry {
  /** Toplam süre (ms) */
  durationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Tenant sayısı */
  tenantCount: number;
  /** Özet öğe sayısı */
  summaryItemCount: number;
}

/**
 * Tenant Management Runtime çıktısı.
 */
export interface TenantManagementResult {
  /** Tenant projeksiyonları */
  tenants: readonly TenantProjection[];
  /** Yürütme özeti */
  summary: TenantSummary;
  /** Düz özet öğeleri */
  summaryItems: readonly TenantSummaryItem[];
  /** Doğrulama bulguları */
  validationIssues: readonly TenantManagementValidationIssue[];
  /** Telemetri */
  telemetry: TenantManagementTelemetry;
}

/** Pipeline bag anahtarı */
export const PIPELINE_BAG_TENANT_MANAGEMENT_RESULT_KEY =
  'tenantManagementResult' as const;
