/**
 * isteBul AI Listings Edge API — consistent error codes.
 */

export const EDGE_ERROR_CODES = Object.freeze({
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  MODULE_DISABLED: 'MODULE_DISABLED',
  NOT_FOUND: 'NOT_FOUND',
  DB_ERROR: 'DB_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
});

/**
 * @param {string} code
 * @param {string} message
 * @param {unknown} [details]
 * @returns {{ ok: false, error: { code: string, message: string, details?: unknown } }}
 */
export function errorBody(code, message, details) {
  const body = { ok: false, error: { code, message } };
  if (details !== undefined && details !== null) {
    body.error.details = details;
  }
  return body;
}

/**
 * @param {Record<string, unknown>} data
 * @param {Record<string, unknown>} [meta]
 */
export function successBody(data, meta) {
  const body = { ok: true, data };
  if (meta) body.meta = meta;
  return body;
}

/**
 * @param {unknown} body
 * @param {number} status
 */
export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * @param {string} code
 * @param {string} message
 * @param {number} status
 * @param {unknown} [details]
 */
export function errorResponse(code, message, status, details) {
  return jsonResponse(errorBody(code, message, details), status);
}
