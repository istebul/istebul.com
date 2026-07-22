/**
 * İSTEBUL Identity — Supabase hata eşleme (EPIC-301B).
 */

import {
  AuthenticationError,
  InvalidCredentials,
  ProviderUnavailable,
  SessionExpired,
  type AuthenticationErrorCode
} from './AuthenticationError';

/**
 * Supabase Auth hata benzeri yapı.
 */
export interface SupabaseAuthErrorLike {
  message?: string;
  status?: number;
  code?: string;
  name?: string;
}

const INVALID_CREDENTIAL_PATTERNS = [
  /invalid login credentials/i,
  /invalid credentials/i,
  /email not confirmed/i,
  /user not found/i,
  /wrong password/i,
  /invalid_grant/i
];

const SESSION_EXPIRED_PATTERNS = [
  /session.*expired/i,
  /jwt expired/i,
  /refresh_token_not_found/i,
  /invalid refresh token/i,
  /token has expired/i,
  /AuthSessionMissing/i
];

const UNAVAILABLE_PATTERNS = [
  /failed to fetch/i,
  /network/i,
  /timeout/i,
  /ECONNREFUSED/i,
  /ENOTFOUND/i,
  /503/,
  /service unavailable/i,
  /fetch failed/i
];

/**
 * Ham hata metnini AuthenticationErrorCode'a eşler.
 */
export function mapSupabaseErrorMessageToCode(
  message: string,
  status?: number
): AuthenticationErrorCode {
  if (status === 401 || status === 403) {
    if (SESSION_EXPIRED_PATTERNS.some((pattern) => pattern.test(message))) {
      return 'SessionExpired';
    }
    return 'InvalidCredentials';
  }
  if (status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
    return 'ProviderUnavailable';
  }
  if (SESSION_EXPIRED_PATTERNS.some((pattern) => pattern.test(message))) {
    return 'SessionExpired';
  }
  if (INVALID_CREDENTIAL_PATTERNS.some((pattern) => pattern.test(message))) {
    return 'InvalidCredentials';
  }
  if (UNAVAILABLE_PATTERNS.some((pattern) => pattern.test(message))) {
    return 'ProviderUnavailable';
  }
  return 'AuthenticationError';
}

/**
 * Supabase Auth hatasını typed AuthenticationError'a çevirir.
 */
export function mapSupabaseAuthError(
  error: SupabaseAuthErrorLike | null | undefined,
  fallbackMessage = 'Supabase authentication hatası.'
): AuthenticationError {
  const message =
    (error?.message && error.message.trim()) || fallbackMessage;
  const code = mapSupabaseErrorMessageToCode(message, error?.status);

  switch (code) {
    case 'SessionExpired':
      return new SessionExpired(message, error);
    case 'InvalidCredentials':
      return new InvalidCredentials(message, error);
    case 'ProviderUnavailable':
      return new ProviderUnavailable(message, error);
    default:
      return new AuthenticationError(message, 'AuthenticationError', error);
  }
}

/**
 * Bilinmeyen throw değerini AuthenticationError'a çevirir.
 */
export function mapUnknownProviderError(error: unknown): AuthenticationError {
  if (error instanceof AuthenticationError) {
    return error;
  }
  if (error && typeof error === 'object') {
    const like = error as SupabaseAuthErrorLike;
    if (like.message || typeof like.status === 'number') {
      return mapSupabaseAuthError(like);
    }
  }
  if (error instanceof Error) {
    const code = mapSupabaseErrorMessageToCode(error.message);
    if (code === 'ProviderUnavailable') {
      return new ProviderUnavailable(error.message, error);
    }
    if (code === 'SessionExpired') {
      return new SessionExpired(error.message, error);
    }
    if (code === 'InvalidCredentials') {
      return new InvalidCredentials(error.message, error);
    }
    return new AuthenticationError(error.message, 'AuthenticationError', error);
  }
  return new ProviderUnavailable(
    'Authentication provider kullanılamıyor.',
    error
  );
}
