/**
 * İSTEBUL Identity — Supabase hata eşleme (EPIC-302B).
 */

import {
  AccessDenied,
  MembershipNotFound,
  ProviderUnavailable,
  TenantError,
  TenantNotFound,
  type TenantErrorCode
} from './TenantError';

/**
 * Supabase Tenant hata benzeri yapı.
 */
export interface SupabaseTenantErrorLike {
  message?: string;
  status?: number;
  code?: string;
  name?: string;
}

const TENANT_NOT_FOUND_PATTERNS = [
  /tenant.*not found/i,
  /tenant bulunamadı/i,
  /no rows/i,
  /PGRST116/i,
  /not found/i
];

const MEMBERSHIP_NOT_FOUND_PATTERNS = [
  /membership.*not found/i,
  /üyelik bulunamadı/i,
  /member.*not found/i,
  /no membership/i
];

const ACCESS_DENIED_PATTERNS = [
  /access denied/i,
  /permission denied/i,
  /forbidden/i,
  /erişim reddedildi/i,
  /not allowed/i,
  /RLS/i
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
 * Ham hata metnini TenantErrorCode'a eşler.
 */
export function mapSupabaseTenantErrorMessageToCode(
  message: string,
  status?: number
): TenantErrorCode {
  if (status === 404) {
    if (MEMBERSHIP_NOT_FOUND_PATTERNS.some((pattern) => pattern.test(message))) {
      return 'MembershipNotFound';
    }
    return 'TenantNotFound';
  }
  if (status === 401 || status === 403) {
    return 'AccessDenied';
  }
  if (
    status === 408 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  ) {
    return 'ProviderUnavailable';
  }
  if (ACCESS_DENIED_PATTERNS.some((pattern) => pattern.test(message))) {
    return 'AccessDenied';
  }
  if (MEMBERSHIP_NOT_FOUND_PATTERNS.some((pattern) => pattern.test(message))) {
    return 'MembershipNotFound';
  }
  if (TENANT_NOT_FOUND_PATTERNS.some((pattern) => pattern.test(message))) {
    return 'TenantNotFound';
  }
  if (UNAVAILABLE_PATTERNS.some((pattern) => pattern.test(message))) {
    return 'ProviderUnavailable';
  }
  return 'TenantError';
}

/**
 * Supabase Tenant hatasını typed TenantError'a çevirir.
 */
export function mapSupabaseTenantError(
  error: SupabaseTenantErrorLike | null | undefined,
  fallbackMessage = 'Supabase tenant hatası.'
): TenantError {
  const message = (error?.message && error.message.trim()) || fallbackMessage;
  const code = mapSupabaseTenantErrorMessageToCode(message, error?.status);

  switch (code) {
    case 'TenantNotFound':
      return new TenantNotFound(message, error);
    case 'MembershipNotFound':
      return new MembershipNotFound(message, error);
    case 'AccessDenied':
      return new AccessDenied(message, error);
    case 'ProviderUnavailable':
      return new ProviderUnavailable(message, error);
    default:
      return new TenantError(message, 'TenantError', error);
  }
}

/**
 * Bilinmeyen throw değerini TenantError'a çevirir.
 */
export function mapUnknownTenantProviderError(error: unknown): TenantError {
  if (error instanceof TenantError) {
    return error;
  }
  if (error && typeof error === 'object') {
    const like = error as SupabaseTenantErrorLike;
    if (like.message || typeof like.status === 'number') {
      return mapSupabaseTenantError(like);
    }
  }
  if (error instanceof Error) {
    const code = mapSupabaseTenantErrorMessageToCode(error.message);
    if (code === 'ProviderUnavailable') {
      return new ProviderUnavailable(error.message, error);
    }
    if (code === 'TenantNotFound') {
      return new TenantNotFound(error.message, error);
    }
    if (code === 'MembershipNotFound') {
      return new MembershipNotFound(error.message, error);
    }
    if (code === 'AccessDenied') {
      return new AccessDenied(error.message, error);
    }
    return new TenantError(error.message, 'TenantError', error);
  }
  return new ProviderUnavailable('Tenant provider kullanılamıyor.', error);
}
