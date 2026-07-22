/**
 * İSTEBUL Identity — Authentication error model (EPIC-301B).
 *
 * Supabase Authentication Provider hata modeli.
 * Global state yoktur.
 */

/**
 * Kimlik doğrulama hata kodları.
 */
export type AuthenticationErrorCode =
  | 'AuthenticationError'
  | 'SessionExpired'
  | 'InvalidCredentials'
  | 'ProviderUnavailable';

/**
 * Temel authentication hatası.
 */
export class AuthenticationError extends Error {
  readonly code: AuthenticationErrorCode;
  readonly cause?: unknown;

  constructor(
    message: string,
    code: AuthenticationErrorCode = 'AuthenticationError',
    cause?: unknown
  ) {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
    this.cause = cause;
  }
}

/**
 * Oturum süresi dolmuş.
 */
export class SessionExpired extends AuthenticationError {
  constructor(message = 'Oturum süresi dolmuş.', cause?: unknown) {
    super(message, 'SessionExpired', cause);
    this.name = 'SessionExpired';
  }
}

/**
 * Geçersiz kimlik bilgileri.
 */
export class InvalidCredentials extends AuthenticationError {
  constructor(message = 'Geçersiz kimlik bilgileri.', cause?: unknown) {
    super(message, 'InvalidCredentials', cause);
    this.name = 'InvalidCredentials';
  }
}

/**
 * Provider kullanılamıyor (ağ / servis).
 */
export class ProviderUnavailable extends AuthenticationError {
  constructor(
    message = 'Authentication provider kullanılamıyor.',
    cause?: unknown
  ) {
    super(message, 'ProviderUnavailable', cause);
    this.name = 'ProviderUnavailable';
  }
}

/**
 * Hata kodundan sınıf örneği üretir.
 */
export function createAuthenticationErrorByCode(
  code: AuthenticationErrorCode,
  message: string,
  cause?: unknown
): AuthenticationError {
  switch (code) {
    case 'SessionExpired':
      return new SessionExpired(message, cause);
    case 'InvalidCredentials':
      return new InvalidCredentials(message, cause);
    case 'ProviderUnavailable':
      return new ProviderUnavailable(message, cause);
    case 'AuthenticationError':
    default:
      return new AuthenticationError(message, 'AuthenticationError', cause);
  }
}

/**
 * Bilinmeyen değeri AuthenticationError'a çevirir.
 */
export function toAuthenticationError(error: unknown): AuthenticationError {
  if (error instanceof AuthenticationError) {
    return error;
  }
  if (error instanceof Error) {
    return new AuthenticationError(error.message, 'AuthenticationError', error);
  }
  return new AuthenticationError(
    typeof error === 'string' ? error : 'Bilinmeyen authentication hatası.',
    'AuthenticationError',
    error
  );
}
