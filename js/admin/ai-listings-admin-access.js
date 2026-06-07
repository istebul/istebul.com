/**
 * AI Listings admin access — Supabase admin session + localStorage gate (Sprint-33).
 */

import { getAdminSupabaseClient, isSupabaseConfigured } from '../core/supabase.js';
import {
  ADMIN_ENABLE_KEY,
  getAdminPanelState,
  getEdgeSecret,
  isAdminPanelEnabled
} from './ai-listings-admin-core.js';

/**
 * @typedef {'disabled'|'no-secret'|'ready'} AdminPanelState
 */

/**
 * @returns {Promise<{ sessionIsAdmin: boolean, email: string|null }>}
 */
export async function verifyAdminSessionAccess() {
  if (!isSupabaseConfigured()) {
    return { sessionIsAdmin: false, email: null };
  }

  try {
    const sb = getAdminSupabaseClient();
    const { data: sessionData } = await sb.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user?.id) {
      return { sessionIsAdmin: false, email: null };
    }

    const { data: profile, error } = await sb
      .from('profiles')
      .select('role, is_banned')
      .eq('id', user.id)
      .single();

    if (error || !profile || profile.role !== 'admin' || profile.is_banned === true) {
      return { sessionIsAdmin: false, email: user.email ?? null };
    }

    return { sessionIsAdmin: true, email: user.email ?? null };
  } catch {
    return { sessionIsAdmin: false, email: null };
  }
}

/**
 * @param {{ getItem?: (key: string) => string|null }|null|undefined} storage
 * @param {{ sessionIsAdmin?: boolean }} [options]
 * @returns {AdminPanelState}
 */
export function resolveAdminPanelAccess(storage, options = {}) {
  const sessionIsAdmin = options.sessionIsAdmin === true;
  const localEnabled = isAdminPanelEnabled(storage);

  if (!localEnabled && !sessionIsAdmin) return 'disabled';
  if (!getEdgeSecret(storage)) return 'no-secret';
  return 'ready';
}

/**
 * @param {{ getItem?: (key: string) => string|null }|null|undefined} storage
 * @param {{ sessionIsAdmin?: boolean }} [options]
 * @returns {boolean}
 */
export function isDecisionCenterUiEnabled(storage, options = {}) {
  return resolveAdminPanelAccess(storage, options) !== 'disabled';
}

export { ADMIN_ENABLE_KEY, getAdminPanelState, isAdminPanelEnabled };
