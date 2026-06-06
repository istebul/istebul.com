/**
 * isteBul AI Listings Engine v1 — repository error codes.
 *
 * Raw Supabase errors must not leak outside the repository layer.
 */

export const AI_LISTINGS_REPOSITORY_DISABLED = 'AI_LISTINGS_REPOSITORY_DISABLED';
export const AI_LISTINGS_SUPABASE_CONFIG_MISSING = 'AI_LISTINGS_SUPABASE_CONFIG_MISSING';
export const AI_LISTINGS_RECORD_NOT_FOUND = 'AI_LISTINGS_RECORD_NOT_FOUND';
export const AI_LISTINGS_DB_ERROR = 'AI_LISTINGS_DB_ERROR';

/**
 * @typedef {'AI_LISTINGS_REPOSITORY_DISABLED'|'AI_LISTINGS_SUPABASE_CONFIG_MISSING'|'AI_LISTINGS_RECORD_NOT_FOUND'|'AI_LISTINGS_DB_ERROR'} RepositoryErrorCode
 */

export class AiListingsRepositoryError extends Error {
  /**
   * @param {RepositoryErrorCode} code
   * @param {string} [message]
   * @param {{ cause?: unknown }} [options]
   */
  constructor(code, message, options = {}) {
    super(message ?? code);
    this.name = 'AiListingsRepositoryError';
    this.code = code;
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

/**
 * @returns {AiListingsRepositoryError}
 */
export function repositoryDisabledError() {
  return new AiListingsRepositoryError(
    AI_LISTINGS_REPOSITORY_DISABLED,
    'Supabase repository adapter is disabled — set AI_LISTINGS_SUPABASE_ENABLED=true'
  );
}

/**
 * @returns {AiListingsRepositoryError}
 */
export function supabaseConfigMissingError() {
  return new AiListingsRepositoryError(
    AI_LISTINGS_SUPABASE_CONFIG_MISSING,
    'Supabase client configuration is missing — provide a valid client to the repository factory'
  );
}

/**
 * @param {string} [resource]
 * @returns {AiListingsRepositoryError}
 */
export function recordNotFoundError(resource = 'Record') {
  return new AiListingsRepositoryError(
    AI_LISTINGS_RECORD_NOT_FOUND,
    `${resource} not found`
  );
}

/**
 * @param {unknown} [cause]
 * @returns {AiListingsRepositoryError}
 */
export function dbError(cause) {
  return new AiListingsRepositoryError(AI_LISTINGS_DB_ERROR, 'Database operation failed', { cause });
}

/**
 * Map a Supabase PostgREST response to repository result or throw mapped error.
 * @template T
 * @param {{ data: T, error: { code?: string, message?: string }|null }} response
 * @param {{ allowEmpty?: boolean, notFoundLabel?: string }} [options]
 * @returns {T}
 */
export function unwrapSupabaseResponse(response, options = {}) {
  const { error, data } = response;

  if (error) {
    if (error.code === 'PGRST116') {
      throw recordNotFoundError(options.notFoundLabel);
    }
    throw dbError(error);
  }

  if (!options.allowEmpty && (data === null || data === undefined)) {
    throw recordNotFoundError(options.notFoundLabel);
  }

  return data;
}
