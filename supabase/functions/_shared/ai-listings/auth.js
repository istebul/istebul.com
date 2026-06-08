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
 * @returns {string}
 */
export function extractBearerToken(req) {
  return String(req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
}

/**
 * @param {Request} req
 * @param {Record<string, string|undefined>} env
 * @returns {boolean}
 */
export function hasValidEdgeSecret(req, env) {
  const expected = String(env.AI_LISTINGS_EDGE_SECRET ?? '').trim();
  if (!expected) return false;
  const provided = String(req.headers.get(SECRET_HEADER) ?? '').trim();
  return Boolean(provided && provided === expected);
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

  if (!hasValidEdgeSecret(req, env)) {
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

/**
 * @param {Request} req
 * @param {Record<string, string|undefined>} env
 * @param {{ verifyAdminSession?: (request: Request) => Promise<boolean> }} [options]
 * @returns {Promise<{ ok: true, publicRead?: boolean, adminSession?: boolean } | { ok: false, code: string, message: string, status: number }>}
 */
export async function authorizeRequestWithPublicReadAsync(req, env, options = {}) {
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

  if (hasValidEdgeSecret(req, env)) {
    return { ok: true };
  }

  const verifyAdminSession = options.verifyAdminSession;
  if (typeof verifyAdminSession === 'function') {
    try {
      const isAdmin = await verifyAdminSession(req);
      if (isAdmin) {
        return { ok: true, adminSession: true };
      }
    } catch {
      // fall through to unauthorized / misconfiguration response
    }
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

  return {
    ok: false,
    code: EDGE_ERROR_CODES.UNAUTHORIZED,
    message: 'Invalid or missing internal secret',
    status: 401
  };
}

/**
 * @param {Request} req
 * @param {Record<string, string|undefined>} env
 * @param {(url: string, key: string) => { from: (table: string) => { select: (cols: string) => { eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: unknown }> } } } } }} createServiceClient
 * @returns {Promise<boolean>}
 */
export async function verifyAdminBearerSession(req, env, createServiceClient) {
  const token = extractBearerToken(req);
  if (!token) return false;

  const url = String(env.SUPABASE_URL ?? '').trim();
  const anonKey = String(env.SUPABASE_ANON_KEY ?? '').trim();
  if (!url || !anonKey || token === anonKey) return false;

  const userRes = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: anonKey }
  });
  if (!userRes.ok) return false;

  const user = await userRes.json().catch(() => null);
  if (!user?.id) return false;

  const serviceKey = String(env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!serviceKey) return false;

  const sb = createServiceClient(url, serviceKey);
  const { data } = await sb
    .from('profiles')
    .select('role,is_banned')
    .eq('id', user.id)
    .maybeSingle();

  const profile = /** @type {{ role?: string, is_banned?: boolean }|null} */ (data);
  const role = String(profile?.role ?? '').toLowerCase();
  return (role === 'admin' || role === 'super_admin') && profile?.is_banned !== true;
}

export { SECRET_HEADER };
