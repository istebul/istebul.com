import { resolveCorsOrigin } from './cors-origins.js';
import { apiErrorBody } from './api-response.js';

export function buildCorsJsonHeaders(origin, overrides = {}) {
  return {
    'Access-Control-Allow-Origin': resolveCorsOrigin(origin, 'https://www.istebul.com'),
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    ...overrides
  };
}

export function corsJson(body, status = 200, origin = null, headerOverrides = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: buildCorsJsonHeaders(origin, headerOverrides)
  });
}

export function corsJsonError(
  status,
  code,
  message,
  origin = null,
  details = undefined,
  headerOverrides = {}
) {
  return corsJson(apiErrorBody(code, message, details), status, origin, headerOverrides);
}
