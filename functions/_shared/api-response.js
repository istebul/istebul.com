/**
 * Consistent JSON API envelope for Cloudflare Pages Functions.
 */

export const API_ERROR_CODES = Object.freeze({
  BAD_REQUEST: 'bad_request',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not_found',
  METHOD_NOT_ALLOWED: 'method_not_allowed',
  CONFLICT: 'conflict',
  RATE_LIMITED: 'rate_limited',
  SERVER_MISCONFIGURED: 'server_misconfigured',
  UPSTREAM_ERROR: 'upstream_error',
  INTERNAL_ERROR: 'internal_error'
});

export function logApiEvent(level, event, fields = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...fields
  };
  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export function apiErrorBody(code, message, details = undefined) {
  const error = { code, message };
  if (details !== undefined && details !== null) {
    error.details = details;
  }
  return { ok: false, error };
}

export function apiSuccessBody(data = {}, meta = undefined) {
  const body = { ok: true, data };
  if (meta !== undefined && meta !== null) {
    body.meta = meta;
  }
  return body;
}

export const JSON_CONTENT_TYPE = 'application/json; charset=utf-8';

export function jsonApiResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': JSON_CONTENT_TYPE,
      ...headers
    }
  });
}

/** HEAD without body — avoids SPA /* → index.html (text/html) on API paths. */
export function jsonApiHead(headers = {}) {
  return new Response(null, {
    status: 200,
    headers: {
      'Content-Type': JSON_CONTENT_TYPE,
      ...headers
    }
  });
}

export function jsonApiError(
  status,
  code,
  message,
  headers = {},
  details = undefined
) {
  return jsonApiResponse(apiErrorBody(code, message, details), status, headers);
}

export function jsonApiSuccess(data = {}, status = 200, headers = {}, meta = undefined) {
  return jsonApiResponse(apiSuccessBody(data, meta), status, headers);
}
