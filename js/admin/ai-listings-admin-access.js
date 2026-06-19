/**
 * AI Listings admin access — strict admin session gate (Sprint-33).
 * Public Karar Merkezi lives at /profil/ — not this module.
 */

import {
  ADMIN_ENABLE_KEY,
  getAdminPanelState,
  getEdgeSecret,
  isAdminPanelEnabled
} from './ai-listings-admin-core.js';
import { verifyAdminRouteAccess, isAdminProfile } from './admin-route-guard.js';

/** @typedef {'disabled'|'no-secret'|'ready'} AdminPanelState */

/**
 * @returns {Promise<{ sessionIsAdmin: boolean, email: string|null }>}
 */
export async function verifyAdminSessionAccess() {
  const access = await verifyAdminRouteAccess();
  return { sessionIsAdmin: access.allowed, email: access.email };
}

/**
 * Admin listing CRUD requires authenticated admin session.
 *
 * @param {{ getItem?: (key: string) => string|null }|null|undefined} storage
 * @param {{ sessionIsAdmin?: boolean }} [options]
 * @returns {AdminPanelState}
 */
export function resolveAdminPanelAccess(storage, options = {}) {
  if (!options.sessionIsAdmin) return 'disabled';
  return 'ready';
}

/**
 * Returns admin session access token for edge API auth (alternative to localStorage secret).
 *
 * @returns {Promise<string>}
 */
export async function getAdminAccessToken() {
  try {
    const { getAdminSupabaseClient } = await import('../core/supabase.js');
    const sb = getAdminSupabaseClient();
    const { data } = await sb.auth.getSession();
    return String(data?.session?.access_token ?? '').trim();
  } catch {
    return '';
  }
}

/**
 * @param {{ getItem?: (key: string) => string|null }|null|undefined} storage
 * @param {{ sessionIsAdmin?: boolean }} [options]
 * @returns {boolean}
 */
export function isAdminListingUiEnabled(storage, options = {}) {
  return resolveAdminPanelAccess(storage, options) !== 'disabled';
}

export { ADMIN_ENABLE_KEY, getAdminPanelState, isAdminPanelEnabled, isAdminProfile };
