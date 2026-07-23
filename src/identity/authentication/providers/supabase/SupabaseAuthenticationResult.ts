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
  id: string;
  email?: string;
  displayName?: string;
  tenantId?: string;
}

/**
 * Supabase oturum projeksiyonu.
 */
export interface SupabaseAuthSession {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  sessionId?: string;
}

/**
 * Supabase provider hata özeti.
 */
export interface SupabaseAuthenticationErrorInfo {
  code: AuthenticationErrorCode;
  message: string;
}

/**
 * Supabase authentication operasyon çıktısı.
 */
export interface SupabaseAuthenticationResult {
  /** Operasyon başarılı mı */
  success: boolean;
  /** Authentication durumu */
  status: AuthenticationStatus;
  /** Çalıştırılan operasyon */
  operation: AuthenticationProviderOperation;
  /** Provider kimliği */
  providerId: string;
  /** Kullanıcı */
  user?: SupabaseAuthUser;
  /** Oturum */
  session?: SupabaseAuthSession;
  /** Hata bilgisi */
  error?: SupabaseAuthenticationErrorInfo;
  /** Doğrulama bulguları */
  validationIssues: readonly AuthenticationProviderValidationIssue[];
  /** Özet öğeleri */
  summaryItems: readonly AuthenticationProviderSummaryItem[];
  /** Telemetri */
  telemetry: AuthenticationProviderTelemetry;
  /** Ek bag */
  bag?: Record<string, unknown>;
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
  bag?: Record<string, unknown>;
}

/**
 * SupabaseAuthenticationResult üretir.
 */
export function createSupabaseAuthenticationResult(
  input: CreateSupabaseAuthenticationResultInput
): SupabaseAuthenticationResult {
  return {
    success: input.success,
    status: input.status,
    operation: input.operation,
    providerId: input.providerId ?? SUPABASE_AUTHENTICATION_PROVIDER_ID,
    user: input.user ? { ...input.user } : undefined,
    session: input.session ? { ...input.session } : undefined,
    error: input.error ? { ...input.error } : undefined,
    validationIssues: Object.freeze([...(input.validationIssues ?? [])]),
    summaryItems: Object.freeze([...(input.summaryItems ?? [])]),
    telemetry: { ...input.telemetry },
    bag: input.bag ? { ...input.bag } : undefined
  };
}

/**
 * Supabase kullanıcısını Principal'a dönüştürür.
 */
export function toPrincipalFromSupabaseUser(
  user: SupabaseAuthUser
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
  session: SupabaseAuthSession | undefined,
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
