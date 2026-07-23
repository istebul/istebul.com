/**
 * İSTEBUL Identity — AuthenticationProviderResult (EPIC-301A).
 *
 * Adapter katmanı çıktı modeli.
 * Supabase / JWT / OAuth / OIDC / API / DB yok.
 */

import type {
  AuthenticationStatus,
  CredentialReference,
  Principal
} from '../runtime/AuthenticationModule';
import type { AuthenticationProviderOperation } from './AuthenticationProviderContext';

/**
 * Provider doğrulama bulgusu.
 */
export interface AuthenticationProviderValidationIssue {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

/**
 * Provider özet öğesi.
 */
export interface AuthenticationProviderSummaryItem {
  key: string;
  label: string;
  value: string | number | boolean;
}

/**
 * Provider telemetrisi.
 */
export interface AuthenticationProviderTelemetry {
  /** Toplam süre (ms) */
  durationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Çalıştırılan operasyon */
  operation: AuthenticationProviderOperation;
  /** Provider kimliği */
  providerId: string;
}

/**
 * Authentication provider operasyon çıktısı.
 */
export interface AuthenticationProviderResult {
  /** Operasyon başarılı mı */
  success: boolean;
  /** Authentication durumu */
  status: AuthenticationStatus;
  /** Çalıştırılan operasyon */
  operation: AuthenticationProviderOperation;
  /** Kaynak provider kimliği */
  providerId: string;
  /** Opsiyonel principal */
  principal?: Principal;
  /** Opsiyonel credential referansı */
  credentialReference?: CredentialReference;
  /** Doğrulama bulguları */
  validationIssues: readonly AuthenticationProviderValidationIssue[];
  /** Özet öğeleri */
  summaryItems: readonly AuthenticationProviderSummaryItem[];
  /** Telemetri */
  telemetry: AuthenticationProviderTelemetry;
  /** Ek bag */
  bag?: Record<string, unknown>;
}

export interface CreateAuthenticationProviderResultInput {
  success: boolean;
  status: AuthenticationStatus;
  operation: AuthenticationProviderOperation;
  providerId: string;
  principal?: Principal;
  credentialReference?: CredentialReference;
  validationIssues?: readonly AuthenticationProviderValidationIssue[];
  summaryItems?: readonly AuthenticationProviderSummaryItem[];
  telemetry: AuthenticationProviderTelemetry;
  bag?: Record<string, unknown>;
}

/**
 * AuthenticationProviderResult üretir.
 */
export function createAuthenticationProviderResult(
  input: CreateAuthenticationProviderResultInput
): AuthenticationProviderResult {
  return {
    success: input.success,
    status: input.status,
    operation: input.operation,
    providerId: input.providerId,
    principal: input.principal
      ? { ...input.principal }
      : undefined,
    credentialReference: input.credentialReference
      ? { ...input.credentialReference }
      : undefined,
    validationIssues: Object.freeze([...(input.validationIssues ?? [])]),
    summaryItems: Object.freeze([...(input.summaryItems ?? [])]),
    telemetry: { ...input.telemetry },
    bag: input.bag ? { ...input.bag } : undefined
  };
}

/**
 * Başarısız provider sonucu üretir.
 */
export function createAuthenticationProviderFailure(
  operation: AuthenticationProviderOperation,
  providerId: string,
  telemetry: AuthenticationProviderTelemetry,
  issues: readonly AuthenticationProviderValidationIssue[],
  status: AuthenticationStatus = 'unauthenticated'
): AuthenticationProviderResult {
  return createAuthenticationProviderResult({
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
export function createAuthenticationProviderSuccess(
  operation: AuthenticationProviderOperation,
  providerId: string,
  telemetry: AuthenticationProviderTelemetry,
  principal: Principal,
  credentialReference: CredentialReference,
  status: AuthenticationStatus = 'authenticated',
  summaryItems: readonly AuthenticationProviderSummaryItem[] = []
): AuthenticationProviderResult {
  return createAuthenticationProviderResult({
    success: true,
    status,
    operation,
    providerId,
    principal,
    credentialReference,
    summaryItems,
    telemetry
  });
}
