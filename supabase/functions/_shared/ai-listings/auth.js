/**
 * isteBul AI Listings Edge API — auth and module gate.
 */

import { EDGE_ERROR_CODES } from './errors.js';

const SECRET_HEADER = 'x-ai-listings-secret';

/**
 * @param {Record<string, string|undefined>} env
 */
export function isAiListingsModuleEnabled(env) {
  const raw = String(env.AI_LISTINGS_SUPABASE_ENABLED ?? '').trim().toLowerCase();
  return raw === 'true' || raw === '1';
}

/**
 * @param {Request} req
 * @param {Record<string, string|undefined>} env
 * @returns {{ ok: true } | { ok: false, code: string, message: string, status: number }}
 */
export function authorizeRequest(req, env) {
  if (!isAiListingsModuleEnabled(env)) {
    return {
      ok: false,
      code: EDGE_ERROR_CODES.MODULE_DISABLED,
      message: 'AI Listings module is disabled',
      status: 503
    };
  }

  const expected = String(env.AI_LISTINGS_EDGE_SECRET ?? '').trim();
  if (!expected) {
    return {
      ok: false,
      code: EDGE_ERROR_CODES.MODULE_DISABLED,
      message: 'AI Listings edge secret is not configured',
      status: 503
    };
  }

  const provided = String(req.headers.get(SECRET_HEADER) ?? '').trim();
  if (!provided || provided !== expected) {
    return {
      ok: false,
      code: EDGE_ERROR_CODES.UNAUTHORIZED,
      message: 'Invalid or missing internal secret',
      status: 401
    };
  }

  return { ok: true };
}

/**
 * Public read routes that may bypass the edge secret when publish is enabled.
 * @type {ReadonlySet<string>}
 */
export const PUBLIC_READ_PATHS = new Set(['/listings/public']);

/**
 * @param {string} pathname
 * @returns {boolean}
 */
export function isPublicReadPath(pathname) {
  const normalized = pathname
    .replace(/^\/functions\/v1\/ai-listings/, '')
    .replace(/^\/ai-listings/, '')
    .replace(/\/$/, '') || '/';
  return PUBLIC_READ_PATHS.has(normalized);
}

/**
 * @param {Request} req
 * @param {Record<string, string|undefined>} env
 * @returns {{ ok: true, publicRead?: boolean } | { ok: false, code: string, message: string, status: number }}
 */
export function authorizeRequestWithPublicRead(req, env) {
  if (!isAiListingsModuleEnabled(env)) {
    return {
      ok: false,
      code: EDGE_ERROR_CODES.MODULE_DISABLED,
      message: 'AI Listings module is disabled',
      status: 503
    };
  }

  const url = new URL(req.url);
  const publishEnabled = String(env.AI_LISTINGS_PUBLIC_PUBLISH_ENABLED ?? '').trim().toLowerCase();
  if (
    req.method === 'GET' &&
    isPublicReadPath(url.pathname) &&
    (publishEnabled === 'true' || publishEnabled === '1')
  ) {
    return { ok: true, publicRead: true };
  }

  return authorizeRequest(req, env);
}

export { SECRET_HEADER };
