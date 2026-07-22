/**
 * İSTEBUL Identity — Tenant error model (EPIC-302B).
 *
 * Supabase Tenant Provider hata modeli.
 * Global state yoktur.
 */

/**
 * Tenant provider hata kodları.
 */
export type TenantErrorCode =
  | 'TenantError'
  | 'TenantNotFound'
  | 'MembershipNotFound'
  | 'AccessDenied'
  | 'ProviderUnavailable';

/**
 * Temel tenant hatası.
 */
export class TenantError extends Error {
  readonly code: TenantErrorCode;
  readonly cause?: unknown;

  constructor(
    message: string,
    code: TenantErrorCode = 'TenantError',
    cause?: unknown
  ) {
    super(message);
    this.name = 'TenantError';
    this.code = code;
    this.cause = cause;
  }
}

/**
 * Tenant bulunamadı.
 */
export class TenantNotFound extends TenantError {
  constructor(message = 'Tenant bulunamadı.', cause?: unknown) {
    super(message, 'TenantNotFound', cause);
    this.name = 'TenantNotFound';
  }
}

/**
 * Üyelik bulunamadı.
 */
export class MembershipNotFound extends TenantError {
  constructor(message = 'Üyelik bulunamadı.', cause?: unknown) {
    super(message, 'MembershipNotFound', cause);
    this.name = 'MembershipNotFound';
  }
}

/**
 * Erişim reddedildi.
 */
export class AccessDenied extends TenantError {
  constructor(message = 'Erişim reddedildi.', cause?: unknown) {
    super(message, 'AccessDenied', cause);
    this.name = 'AccessDenied';
  }
}

/**
 * Provider kullanılamıyor (ağ / servis).
 */
export class ProviderUnavailable extends TenantError {
  constructor(
    message = 'Tenant provider kullanılamıyor.',
    cause?: unknown
  ) {
    super(message, 'ProviderUnavailable', cause);
    this.name = 'ProviderUnavailable';
  }
}

/**
 * Hata kodundan sınıf örneği üretir.
 */
export function createTenantErrorByCode(
  code: TenantErrorCode,
  message: string,
  cause?: unknown
): TenantError {
  switch (code) {
    case 'TenantNotFound':
      return new TenantNotFound(message, cause);
    case 'MembershipNotFound':
      return new MembershipNotFound(message, cause);
    case 'AccessDenied':
      return new AccessDenied(message, cause);
    case 'ProviderUnavailable':
      return new ProviderUnavailable(message, cause);
    case 'TenantError':
    default:
      return new TenantError(message, 'TenantError', cause);
  }
}

/**
 * Bilinmeyen değeri TenantError'a çevirir.
 */
export function toTenantError(error: unknown): TenantError {
  if (error instanceof TenantError) {
    return error;
  }
  if (error instanceof Error) {
    return new TenantError(error.message, 'TenantError', error);
  }
  return new TenantError(
    typeof error === 'string' ? error : 'Bilinmeyen tenant hatası.',
    'TenantError',
    error
  );
}
