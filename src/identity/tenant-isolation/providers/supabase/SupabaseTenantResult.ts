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
  readonly id: string;
  readonly slug: string;
  readonly displayName: string;
  readonly domain?: string;
  readonly status?: string;
}

/**
 * Supabase üyelik projeksiyonu.
 */
export interface SupabaseMembershipRecord {
  readonly id: string;
  readonly identityId: string;
  readonly tenantId: string;
  readonly roleLabel?: string;
  readonly active: boolean;
}

/**
 * Supabase provider hata özeti.
 */
export interface SupabaseTenantErrorInfo {
  readonly code: TenantErrorCode;
  readonly message: string;
}

/**
 * Supabase tenant operasyon çıktısı.
 */
export interface SupabaseTenantResult {
  /** Operasyon başarılı mı */
  readonly success: boolean;
  /** Tenant çözümleme durumu */
  readonly status: TenantProviderStatus;
  /** Çalıştırılan operasyon */
  readonly operation: TenantProviderOperation;
  /** Provider kimliği */
  readonly providerId: string;
  /** Tenant */
  readonly tenant?: SupabaseTenantRecord;
  /** Üyelikler */
  readonly memberships?: readonly SupabaseMembershipRecord[];
  /** Erişim kararı */
  readonly accessOutcome?: TenantIsolationDecisionOutcome;
  /** Erişim kapsamı */
  readonly accessScope?: TenantAccessScope;
  /** Hata bilgisi */
  readonly error?: SupabaseTenantErrorInfo;
  /** Doğrulama bulguları */
  readonly validationIssues: readonly TenantProviderValidationIssue[];
  /** Özet öğeleri */
  readonly summaryItems: readonly TenantProviderSummaryItem[];
  /** Telemetri */
  readonly telemetry: TenantProviderTelemetry;
  /** Ek bag */
  readonly bag?: Readonly<Record<string, unknown>>;
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
  return Object.freeze({
    success: input.success,
    status: input.status,
    operation: input.operation,
    providerId: input.providerId ?? SUPABASE_TENANT_PROVIDER_ID,
    tenant: input.tenant
      ? Object.freeze({ ...input.tenant })
      : undefined,
    memberships: input.memberships
      ? Object.freeze(
          input.memberships.map((item) => Object.freeze({ ...item }))
        )
      : undefined,
    accessOutcome: input.accessOutcome,
    accessScope: input.accessScope
      ? Object.freeze({
          ...input.accessScope,
          allowedTenantIds: Object.freeze([
            ...input.accessScope.allowedTenantIds
          ])
        })
      : undefined,
    error: input.error
      ? Object.freeze({ ...input.error })
      : undefined,
    validationIssues: Object.freeze(
      (input.validationIssues ?? []).map((issue) =>
        Object.freeze({ ...issue })
      )
    ),
    summaryItems: Object.freeze(
      (input.summaryItems ?? []).map((item) =>
        Object.freeze({ ...item })
      )
    ),
    telemetry: Object.freeze({ ...input.telemetry }),
    bag: input.bag
      ? Object.freeze({ ...input.bag })
      : undefined
  });
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
  // Normalize results even when they were not created by our factory.
  const snapshot = createSupabaseTenantResult(result);

  const tenant = snapshot.tenant
    ? toTenantIdentityRefFromSupabaseTenant(snapshot.tenant)
    : undefined;
  const memberships = snapshot.memberships
    ? toTenantMembershipsFromSupabase(snapshot.memberships)
    : undefined;
  const issues: TenantProviderValidationIssue[] = [
    ...snapshot.validationIssues
  ];

  if (snapshot.error) {
    issues.push({
      code: snapshot.error.code,
      message: snapshot.error.message,
      severity: 'error'
    });
  }

  return createTenantProviderResult({
    success: snapshot.success,
    status: snapshot.status,
    operation: snapshot.operation,
    providerId: snapshot.providerId,
    tenant,
    memberships,
    accessScope: snapshot.accessScope,
    accessOutcome: snapshot.accessOutcome,
    validationIssues: issues,
    summaryItems: snapshot.summaryItems,
    telemetry: snapshot.telemetry,
    bag: {
      ...(snapshot.bag ?? {}),
      supabaseTenant: snapshot.tenant,
      supabaseMemberships: snapshot.memberships,
      supabaseTenantError: snapshot.error
    }
  });
}