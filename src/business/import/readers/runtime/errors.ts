/**
 * İSTEBUL Business Import Engine — Reader Registry hata tipleri (PR-101B).
 */

export type ReaderRegistryErrorCode =
  | 'READER_NOT_FOUND'
  | 'DUPLICATE_READER'
  | 'INVALID_REGISTRATION'
  | 'UNSUPPORTED_SOURCE';

export const READER_REGISTRY_ERROR_CODES: Readonly<
  Record<ReaderRegistryErrorCode, ReaderRegistryErrorCode>
> = Object.freeze({
  READER_NOT_FOUND: 'READER_NOT_FOUND',
  DUPLICATE_READER: 'DUPLICATE_READER',
  INVALID_REGISTRATION: 'INVALID_REGISTRATION',
  UNSUPPORTED_SOURCE: 'UNSUPPORTED_SOURCE'
});

/**
 * Standart reader registry hatası.
 */
export class ReaderRegistryError extends Error {
  readonly code: ReaderRegistryErrorCode;
  readonly details?: Readonly<Record<string, string>>;

  constructor(
    code: ReaderRegistryErrorCode,
    message: string,
    details?: Readonly<Record<string, string>>
  ) {
    super(message);
    this.name = 'ReaderRegistryError';
    this.code = code;
    this.details = details;
  }
}

/** ReaderNotFound */
export class ReaderNotFoundError extends ReaderRegistryError {
  constructor(message: string, details?: Readonly<Record<string, string>>) {
    super('READER_NOT_FOUND', message, details);
    this.name = 'ReaderNotFoundError';
  }
}

/** DuplicateReader */
export class DuplicateReaderError extends ReaderRegistryError {
  constructor(message: string, details?: Readonly<Record<string, string>>) {
    super('DUPLICATE_READER', message, details);
    this.name = 'DuplicateReaderError';
  }
}

/** InvalidRegistration */
export class InvalidRegistrationError extends ReaderRegistryError {
  constructor(message: string, details?: Readonly<Record<string, string>>) {
    super('INVALID_REGISTRATION', message, details);
    this.name = 'InvalidRegistrationError';
  }
}

/** UnsupportedSource */
export class UnsupportedSourceError extends ReaderRegistryError {
  constructor(message: string, details?: Readonly<Record<string, string>>) {
    super('UNSUPPORTED_SOURCE', message, details);
    this.name = 'UnsupportedSourceError';
  }
}
