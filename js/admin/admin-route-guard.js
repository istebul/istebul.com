/**
 * Admin route guard — enforces admin-only access for /admin/* surfaces.
 */

import { getAdminSupabaseClient, isSupabaseConfigured } from '../core/supabase.js';

/** @type {Readonly<string>} */
export const ADMIN_LOGIN_PATH = '/admin-panel.html';

/** @type {Readonly<string>} */
export const ADMIN_FORBIDDEN_PATH = '/admin/forbidden.html';

/** @type {Readonly<string>} */
export const PUBLIC_DECISION_CENTER_PATH = '/profil/';

/** @type {Readonly<RegExp>} */
export const ADMIN_ROUTE_PATTERN = /^\/admin(?:\/|$)|^\/admin-panel(?:\.html)?$/i;

/**
 * @param {Record<string, unknown>|null|undefined} profile
 * @returns {boolean}
 */
export function isAdminProfile(profile) {
  if (!profile || profile.is_banned === true) return false;
  const role = String(profile.role ?? '').toLowerCase();
  return role === 'admin' || role === 'super_admin';
}

/**
 * @returns {Promise<{ allowed: boolean, email: string|null, reason: string|null }>}
 */
export async function verifyAdminRouteAccess() {
  if (!isSupabaseConfigured()) {
    return { allowed: false, email: null, reason: 'supabase_not_configured' };
  }

  try {
    const sb = getAdminSupabaseClient();
    const { data: sessionData } = await sb.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user?.id) {
      return { allowed: false, email: null, reason: 'not_authenticated' };
    }

    const { data: profile, error } = await sb
      .from('profiles')
      .select('role, is_banned')
      .eq('id', user.id)
      .single();

    if (error || !isAdminProfile(profile)) {
      return { allowed: false, email: user.email ?? null, reason: 'not_admin' };
    }

    return { allowed: true, email: user.email ?? null, reason: null };
  } catch {
    return { allowed: false, email: null, reason: 'auth_error' };
  }
}

/**
 * @param {string} [pathname]
 * @returns {boolean}
 */
export function isAdminRoutePath(pathname = '') {
  const path = String(pathname || (typeof window !== 'undefined' ? window.location.pathname : ''));
  return ADMIN_ROUTE_PATTERN.test(path);
}

/**
 * @param {{ loginPath?: string, forbiddenPath?: string, returnTo?: string }} [options]
 * @returns {Promise<{ allowed: boolean, email: string|null }>}
 */
export async function enforceAdminRoute(options = {}) {
  const access = await verifyAdminRouteAccess();
  if (access.allowed) {
    return { allowed: true, email: access.email };
  }

  const loginPath = options.loginPath ?? ADMIN_LOGIN_PATH;
  const forbiddenPath = options.forbiddenPath ?? ADMIN_FORBIDDEN_PATH;
  const returnTo = options.returnTo ?? (typeof window !== 'undefined' ? window.location.pathname : '');

  if (typeof window !== 'undefined') {
    if (access.reason === 'not_authenticated') {
      const next = `${loginPath}?returnTo=${encodeURIComponent(returnTo)}`;
      window.location.replace(next);
    } else {
      window.location.replace(forbiddenPath);
    }
  }

  return { allowed: false, email: access.email };
}

const ADMIN_FORBIDDEN_STYLESHEET = '/css/admin-premium-polish.css?v=3';

/**
 * Ensures shared forbidden-shell styles are available for inline renders.
 */
function ensureAdminForbiddenStyles() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('link[data-admin-forbidden-styles]')) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = ADMIN_FORBIDDEN_STYLESHEET;
  link.setAttribute('data-admin-forbidden-styles', '');
  document.head.appendChild(link);
}

/**
 * @param {HTMLElement|null} [root]
 * @param {{ showPublicLink?: boolean }} [options]
 */
export function renderAdminForbiddenHtml(root, options = {}) {
  const mount = root ?? document.getElementById('ai-listings-admin-root') ?? document.body;
  if (!mount) return;

  ensureAdminForbiddenStyles();

  const publicLink = options.showPublicLink
    ? `<a class="admin-forbidden__link" href="${PUBLIC_DECISION_CENTER_PATH}">
        Karar Merkezi <span class="admin-forbidden__hint">(kullanıcı paneli)</span>
      </a>`
    : '';

  mount.innerHTML = `
    <div class="admin-forbidden" role="alert" aria-labelledby="admin-forbidden-inline-title">
      <p class="admin-forbidden__eyebrow">403</p>
      <h1 id="admin-forbidden-inline-title" class="admin-forbidden__title">Erişim reddedildi</h1>
      <p class="admin-forbidden__lead">Bu alan yalnızca yetkili admin kullanıcılar içindir.</p>
      <nav class="admin-forbidden__actions" aria-label="Yönlendirmeler">
        ${publicLink}
        <a class="admin-forbidden__link admin-forbidden__link--primary" href="${ADMIN_LOGIN_PATH}">Admin girişi</a>
      </nav>
    </div>`;
}
