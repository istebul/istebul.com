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

export { SECRET_HEADER };
