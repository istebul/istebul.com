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
  readonly code: string;
  readonly message: string;
  readonly severity: 'warning' | 'error';
}

/**
 * Provider özet öğesi.
 */
export interface AuthenticationProviderSummaryItem {
  readonly key: string;
  readonly label: string;
  readonly value: string | number | boolean;
}

/**
 * Provider telemetrisi.
 */
export interface AuthenticationProviderTelemetry {
  /** Toplam süre (ms) */
  readonly durationMs: number;
  /** Başlangıç ISO */
  readonly startedAt: string;
  /** Bitiş ISO */
  readonly endedAt: string;
  /** Çalıştırılan operasyon */
  readonly operation: AuthenticationProviderOperation;
  /** Provider kimliği */
  readonly providerId: string;
}

/**
 * Authentication provider operasyon çıktısı.
 */
export interface AuthenticationProviderResult {
  /** Operasyon başarılı mı */
  readonly success: boolean;
  /** Authentication durumu */
  readonly status: AuthenticationStatus;
  /** Çalıştırılan operasyon */
  readonly operation: AuthenticationProviderOperation;
  /** Kaynak provider kimliği */
  readonly providerId: string;
  /** Opsiyonel principal */
  readonly principal?: Readonly<Principal>;
  /** Opsiyonel credential referansı */
  readonly credentialReference?: Readonly<CredentialReference>;
  /** Doğrulama bulguları */
  readonly validationIssues: readonly AuthenticationProviderValidationIssue[];
  /** Özet öğeleri */
  readonly summaryItems: readonly AuthenticationProviderSummaryItem[];
  /** Telemetri */
  readonly telemetry: Readonly<AuthenticationProviderTelemetry>;
  /** Ek bag */
  readonly bag?: Readonly<Record<string, unknown>>;
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
  bag?: Readonly<Record<string, unknown>>;
}

/**
 * AuthenticationProviderResult üretir.
 */
export function createAuthenticationProviderResult(
  input: CreateAuthenticationProviderResultInput
): AuthenticationProviderResult {
  return Object.freeze({
    success: input.success,
    status: input.status,
    operation: input.operation,
    providerId: input.providerId,
    principal: input.principal
      ? Object.freeze({ ...input.principal })
      : undefined,
    credentialReference: input.credentialReference
      ? Object.freeze({ ...input.credentialReference })
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
