/**
 * İSTEBUL Identity — SupabaseTenantResult (EPIC-302B).
 */

import type {
  TenantAccessScope,
  TenantIdentityRef,
  TenantIsolationDecisionOutcome,
  TenantMembership
} from '../../runtime/TenantIsolationModule';
import type { TenantProviderOperation } from '../../adapters/TenantProviderContext';
import type {
  TenantProviderResult,
  TenantProviderStatus,
  TenantProviderSummaryItem,
  TenantProviderTelemetry,
  TenantProviderValidationIssue
} from '../../adapters/TenantProviderResult';
import { createTenantProviderResult } from '../../adapters/TenantProviderResult';
import type { TenantErrorCode } from './TenantError';
import { SUPABASE_TENANT_PROVIDER_ID } from './constants';

/**
 * Supabase tenant projeksiyonu.
 */
export interface SupabaseTenantRecord {
  id: string;
  slug: string;
  displayName: string;
  domain?: string;
  status?: string;
}

/**
 * Supabase üyelik projeksiyonu.
 */
export interface SupabaseMembershipRecord {
  id: string;
  identityId: string;
  tenantId: string;
  roleLabel?: string;
  active: boolean;
}

/**
 * Supabase provider hata özeti.
 */
export interface SupabaseTenantErrorInfo {
  code: TenantErrorCode;
  message: string;
}

/**
 * Supabase tenant operasyon çıktısı.
 */
export interface SupabaseTenantResult {
  /** Operasyon başarılı mı */
  success: boolean;
  /** Tenant çözümleme durumu */
  status: TenantProviderStatus;
  /** Çalıştırılan operasyon */
  operation: TenantProviderOperation;
  /** Provider kimliği */
  providerId: string;
  /** Tenant */
  tenant?: SupabaseTenantRecord;
  /** Üyelikler */
  memberships?: readonly SupabaseMembershipRecord[];
  /** Erişim kararı */
  accessOutcome?: TenantIsolationDecisionOutcome;
  /** Erişim kapsamı */
  accessScope?: TenantAccessScope;
  /** Hata bilgisi */
  error?: SupabaseTenantErrorInfo;
  /** Doğrulama bulguları */
  validationIssues: readonly TenantProviderValidationIssue[];
  /** Özet öğeleri */
  summaryItems: readonly TenantProviderSummaryItem[];
  /** Telemetri */
  telemetry: TenantProviderTelemetry;
  /** Ek bag */
  bag?: Record<string, unknown>;
}

export interface CreateSupabaseTenantResultInput {
  success: boolean;
  status: TenantProviderStatus;
  operation: TenantProviderOperation;
  providerId?: string;
  tenant?: SupabaseTenantRecord;
  memberships?: readonly SupabaseMembershipRecord[];
  accessOutcome?: TenantIsolationDecisionOutcome;
  accessScope?: TenantAccessScope;
  error?: SupabaseTenantErrorInfo;
  validationIssues?: readonly TenantProviderValidationIssue[];
  summaryItems?: readonly TenantProviderSummaryItem[];
  telemetry: TenantProviderTelemetry;
  bag?: Record<string, unknown>;
}

/**
 * SupabaseTenantResult üretir.
 */
export function createSupabaseTenantResult(
  input: CreateSupabaseTenantResultInput
): SupabaseTenantResult {
  return {
    success: input.success,
    status: input.status,
    operation: input.operation,
    providerId: input.providerId ?? SUPABASE_TENANT_PROVIDER_ID,
    tenant: input.tenant ? { ...input.tenant } : undefined,
    memberships: input.memberships
      ? Object.freeze(input.memberships.map((item) => ({ ...item })))
      : undefined,
    accessOutcome: input.accessOutcome,
    accessScope: input.accessScope
      ? {
          ...input.accessScope,
          allowedTenantIds: Object.freeze([
            ...input.accessScope.allowedTenantIds
          ])
        }
      : undefined,
    error: input.error ? { ...input.error } : undefined,
    validationIssues: Object.freeze([...(input.validationIssues ?? [])]),
    summaryItems: Object.freeze([...(input.summaryItems ?? [])]),
    telemetry: { ...input.telemetry },
    bag: input.bag ? { ...input.bag } : undefined
  };
}

/**
 * Supabase tenant kaydını TenantIdentityRef'e dönüştürür.
 */
export function toTenantIdentityRefFromSupabaseTenant(
  tenant: SupabaseTenantRecord
): TenantIdentityRef {
  return {
    tenantId: tenant.id,
    slug: tenant.slug,
    displayName: tenant.displayName
  };
}

/**
 * Supabase üyeliklerini TenantMembership'e dönüştürür.
 */
export function toTenantMembershipsFromSupabase(
  memberships: readonly SupabaseMembershipRecord[]
): TenantMembership[] {
  return memberships.map((item) => ({
    membershipId: item.id,
    identityId: item.identityId,
    tenantId: item.tenantId,
    roleLabel: item.roleLabel,
    active: item.active
  }));
}

/**
 * Hata koduna göre TenantProviderStatus.
 */
export function statusFromTenantErrorCode(
  code: TenantErrorCode
): TenantProviderStatus {
  switch (code) {
    case 'AccessDenied':
      return 'denied';
    case 'TenantNotFound':
    case 'MembershipNotFound':
      return 'unresolved';
    case 'ProviderUnavailable':
      return 'stale';
    default:
      return 'unresolved';
  }
}

/**
 * SupabaseTenantResult → TenantProviderResult.
 */
export function toTenantProviderResult(
  result: SupabaseTenantResult
): TenantProviderResult {
  const tenant = result.tenant
    ? toTenantIdentityRefFromSupabaseTenant(result.tenant)
    : undefined;
  const memberships = result.memberships
    ? toTenantMembershipsFromSupabase(result.memberships)
    : undefined;

  const issues: TenantProviderValidationIssue[] = [
    ...result.validationIssues
  ];
  if (result.error) {
    issues.push({
      code: result.error.code,
      message: result.error.message,
      severity: 'error'
    });
  }

  return createTenantProviderResult({
    success: result.success,
    status: result.status,
    operation: result.operation,
    providerId: result.providerId,
    tenant,
    memberships,
    accessScope: result.accessScope,
    accessOutcome: result.accessOutcome,
    validationIssues: issues,
    summaryItems: result.summaryItems,
    telemetry: result.telemetry,
    bag: {
      ...(result.bag ?? {}),
      supabaseTenant: result.tenant,
      supabaseMemberships: result.memberships,
      supabaseTenantError: result.error
    }
  });
}
