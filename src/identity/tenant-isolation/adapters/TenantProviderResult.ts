/**
 * İSTEBUL Identity — TenantProviderResult (EPIC-302A).
 *
 * Adapter katmanı çıktı modeli.
 * Supabase / API / Database / RLS / Business Context yok.
 */

import type {
  TenantAccessScope,
  TenantIdentityRef,
  TenantIsolationDecisionOutcome,
  TenantMembership
} from '../runtime/TenantIsolationModule';
import type { TenantProviderOperation } from './TenantProviderContext';

/**
 * Tenant provider operasyon durumu.
 */
export type TenantProviderStatus =
  | 'resolved'
  | 'unresolved'
  | 'denied'
  | 'stale'
  | 'pending';

/**
 * Provider doğrulama bulgusu.
 */
export interface TenantProviderValidationIssue {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

/**
 * Provider özet öğesi.
 */
export interface TenantProviderSummaryItem {
  key: string;
  label: string;
  value: string | number | boolean;
}

/**
 * Provider telemetrisi.
 */
export interface TenantProviderTelemetry {
  /** Toplam süre (ms) */
  durationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Çalıştırılan operasyon */
  operation: TenantProviderOperation;
  /** Provider kimliği */
  providerId: string;
}

/**
 * Tenant provider operasyon çıktısı.
 */
export interface TenantProviderResult {
  /** Operasyon başarılı mı */
  success: boolean;
  /** Tenant çözümleme durumu */
  status: TenantProviderStatus;
  /** Çalıştırılan operasyon */
  operation: TenantProviderOperation;
  /** Kaynak provider kimliği */
  providerId: string;
  /** Opsiyonel tenant kimlik projeksiyonu */
  tenant?: TenantIdentityRef;
  /** Opsiyonel üyelik listesi */
  memberships?: readonly TenantMembership[];
  /** Opsiyonel erişim kapsamı */
  accessScope?: TenantAccessScope;
  /** Opsiyonel erişim kararı */
  accessOutcome?: TenantIsolationDecisionOutcome;
  /** Doğrulama bulguları */
  validationIssues: readonly TenantProviderValidationIssue[];
  /** Özet öğeleri */
  summaryItems: readonly TenantProviderSummaryItem[];
  /** Telemetri */
  telemetry: TenantProviderTelemetry;
  /** Ek bag */
  bag?: Record<string, unknown>;
}

export interface CreateTenantProviderResultInput {
  success: boolean;
  status: TenantProviderStatus;
  operation: TenantProviderOperation;
  providerId: string;
  tenant?: TenantIdentityRef;
  memberships?: readonly TenantMembership[];
  accessScope?: TenantAccessScope;
  accessOutcome?: TenantIsolationDecisionOutcome;
  validationIssues?: readonly TenantProviderValidationIssue[];
  summaryItems?: readonly TenantProviderSummaryItem[];
  telemetry: TenantProviderTelemetry;
  bag?: Record<string, unknown>;
}

/**
 * TenantProviderResult üretir.
 */
export function createTenantProviderResult(
  input: CreateTenantProviderResultInput
): TenantProviderResult {
  return {
    success: input.success,
    status: input.status,
    operation: input.operation,
    providerId: input.providerId,
    tenant: input.tenant ? { ...input.tenant } : undefined,
    memberships: input.memberships
      ? Object.freeze(input.memberships.map((item) => ({ ...item })))
      : undefined,
    accessScope: input.accessScope
      ? {
          ...input.accessScope,
          allowedTenantIds: Object.freeze([
            ...input.accessScope.allowedTenantIds
          ])
        }
      : undefined,
    accessOutcome: input.accessOutcome,
    validationIssues: Object.freeze([...(input.validationIssues ?? [])]),
    summaryItems: Object.freeze([...(input.summaryItems ?? [])]),
    telemetry: { ...input.telemetry },
    bag: input.bag ? { ...input.bag } : undefined
  };
}

/**
 * Başarısız provider sonucu üretir.
 */
export function createTenantProviderFailure(
  operation: TenantProviderOperation,
  providerId: string,
  telemetry: TenantProviderTelemetry,
  issues: readonly TenantProviderValidationIssue[],
  status: TenantProviderStatus = 'unresolved'
): TenantProviderResult {
  return createTenantProviderResult({
    success: false,
    status,
    operation,
    providerId,
    validationIssues: issues,
    telemetry
  });
}

/**
 * Başarılı provider sonucu üretir.
 */
export function createTenantProviderSuccess(
  operation: TenantProviderOperation,
  providerId: string,
  telemetry: TenantProviderTelemetry,
  tenant: TenantIdentityRef,
  memberships: readonly TenantMembership[] = [],
  status: TenantProviderStatus = 'resolved',
  summaryItems: readonly TenantProviderSummaryItem[] = [],
  accessOutcome?: TenantIsolationDecisionOutcome,
  accessScope?: TenantAccessScope
): TenantProviderResult {
  return createTenantProviderResult({
    success: true,
    status,
    operation,
    providerId,
    tenant,
    memberships,
    accessScope,
    accessOutcome,
    summaryItems,
    telemetry
  });
}
