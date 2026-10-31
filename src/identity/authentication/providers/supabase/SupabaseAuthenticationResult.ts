/**
 * İSTEBUL Identity — SupabaseAuthenticationResult (EPIC-301B).
 */

import type {
  AuthenticationStatus,
  CredentialReference,
  Principal
} from '../../runtime/AuthenticationModule';
import type { AuthenticationProviderOperation } from '../../adapters/AuthenticationProviderContext';
import type {
  AuthenticationProviderResult,
  AuthenticationProviderSummaryItem,
  AuthenticationProviderTelemetry,
  AuthenticationProviderValidationIssue
} from '../../adapters/AuthenticationProviderResult';
import { createAuthenticationProviderResult } from '../../adapters/AuthenticationProviderResult';
import type { AuthenticationErrorCode } from './AuthenticationError';
import { SUPABASE_AUTHENTICATION_PROVIDER_ID } from './constants';

/**
 * Supabase kullanıcı projeksiyonu.
 */
export interface SupabaseAuthUser {
  readonly id: string;
  readonly email?: string;
  readonly displayName?: string;
  readonly tenantId?: string;
}

/**
 * Supabase oturum projeksiyonu.
 */
export interface SupabaseAuthSession {
  readonly accessToken?: string;
  readonly refreshToken?: string;
  readonly expiresAt?: number;
  readonly sessionId?: string;
}

/**
 * Supabase provider hata özeti.
 */
export interface SupabaseAuthenticationErrorInfo {
  readonly code: AuthenticationErrorCode;
  readonly message: string;
}

/**
 * Supabase authentication operasyon çıktısı.
 */
export interface SupabaseAuthenticationResult {
  /** Operasyon başarılı mı */
  readonly success: boolean;
  /** Authentication durumu */
  readonly status: AuthenticationStatus;
  /** Çalıştırılan operasyon */
  readonly operation: AuthenticationProviderOperation;
  /** Provider kimliği */
  readonly providerId: string;
  /** Kullanıcı */
  readonly user?: Readonly<SupabaseAuthUser>;
  /** Oturum */
  readonly session?: Readonly<SupabaseAuthSession>;
  /** Hata bilgisi */
  readonly error?: Readonly<SupabaseAuthenticationErrorInfo>;
  /** Doğrulama bulguları */
  readonly validationIssues: readonly AuthenticationProviderValidationIssue[];
  /** Özet öğeleri */
  readonly summaryItems: readonly AuthenticationProviderSummaryItem[];
  /** Telemetri */
  readonly telemetry: Readonly<AuthenticationProviderTelemetry>;
  /** Ek bag */
  readonly bag?: Readonly<Record<string, unknown>>;
}

export interface CreateSupabaseAuthenticationResultInput {
  success: boolean;
  status: AuthenticationStatus;
  operation: AuthenticationProviderOperation;
  providerId?: string;
  user?: SupabaseAuthUser;
  session?: SupabaseAuthSession;
  error?: SupabaseAuthenticationErrorInfo;
  validationIssues?: readonly AuthenticationProviderValidationIssue[];
  summaryItems?: readonly AuthenticationProviderSummaryItem[];
  telemetry: AuthenticationProviderTelemetry;
  bag?: Readonly<Record<string, unknown>>;
}

/**
 * SupabaseAuthenticationResult üretir.
 */
export function createSupabaseAuthenticationResult(
  input: CreateSupabaseAuthenticationResultInput
): SupabaseAuthenticationResult {
  return Object.freeze({
    success: input.success,
    status: input.status,
    operation: input.operation,
    providerId: input.providerId ?? SUPABASE_AUTHENTICATION_PROVIDER_ID,
    user: input.user ? Object.freeze({ ...input.user }) : undefined,
    session: input.session ? Object.freeze({ ...input.session }) : undefined,
    error: input.error ? Object.freeze({ ...input.error }) : undefined,
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
 * Supabase kullanıcısını Principal'a dönüştürür.
 */
export function toPrincipalFromSupabaseUser(
  user: Readonly<SupabaseAuthUser>
): Principal {
  return {
    principalId: `principal-supabase-${user.id}`,
    identityId: user.id,
    displayName: user.displayName ?? user.email ?? user.id,
    tenantId: user.tenantId
  };
}

/**
 * Supabase oturumunu CredentialReference'a dönüştürür.
 */
export function toCredentialReferenceFromSupabaseSession(
  session: Readonly<SupabaseAuthSession> | undefined,
  userId: string
): CredentialReference {
  const expiresAt =
    typeof session?.expiresAt === 'number'
      ? new Date(session.expiresAt * 1000).toISOString()
      : undefined;

  return {
    credentialId: session?.sessionId ?? `cred-supabase-${userId}`,
    method: 'password',
    issuedAt: new Date().toISOString(),
    expiresAt
  };
}

/**
 * SupabaseAuthenticationResult → AuthenticationProviderResult.
 */
export function toAuthenticationProviderResult(
  result: SupabaseAuthenticationResult
): AuthenticationProviderResult {
  const principal = result.user
    ? toPrincipalFromSupabaseUser(result.user)
    : undefined;
  const credentialReference =
    result.user && result.success
      ? toCredentialReferenceFromSupabaseSession(result.session, result.user.id)
      : undefined;

  const issues: AuthenticationProviderValidationIssue[] = [
    ...result.validationIssues
  ];
  if (result.error) {
    issues.push({
      code: result.error.code,
      message: result.error.message,
      severity: 'error'
    });
  }

  return createAuthenticationProviderResult({
    success: result.success,
    status: result.status,
    operation: result.operation,
    providerId: result.providerId,
    principal,
    credentialReference,
    validationIssues: issues,
    summaryItems: result.summaryItems,
    telemetry: result.telemetry,
    bag: {
      ...(result.bag ?? {}),
      supabaseUser: result.user,
      supabaseSession: result.session,
      supabaseError: result.error
    }
  });
}
