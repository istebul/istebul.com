/**
 * Admin panel navigation — every sidebar page maps to a refresh handler.
 */

import { syncAdminHeaderTitle } from './admin-shell.js';

/** @type {Record<string, () => void | Promise<void>>} */
let pageHandlers = {};

/** All nav targets that must have a DOM page and handler */
export const ADMIN_PAGE_IDS = [
  'dashboard',
  'settings',
  'content',
  'announcements',
  'campaigns',
  'faqs',
  'blog',
  'listings',
  'users',
  'auto-leads',
  'vacation-analytics',
  'vacation-leads',
  'vacation-scenarios',
  'vacation-settings',
  'vacation-destinations',
  'vacation-partners',
  'vacation-scoring',
  'housing-leads',
  'housing-locations',
  'housing-partners',
  'housing-scoring',
  'finance-leads',
  'sigorta-leads',
  'finance-partners',
  'finance-scoring',
  'auto-analytics',
  'platform-analytics',
  'dashboard-ceo',
  'dashboard-growth',
  'dashboard-revenue',
  'dashboard-partner-ops',
  'dashboard-support',
  'ops-ai-assistant',
  'investor-metrics',
  'observability',
  'ops-command-center',
  'startup-operating-center',
  'scale-architecture',
  'company-operating-system',
  'hiring-architecture',
  'international-expansion',
  'category-dominance',
  'competitor-attack',
  'expansion-prioritization',
  'strategic-partnerships',
  'acquisition-exit',
  'partner-endpoints',
  'partner-applications',
  'partner-dispatch-logs',
  'payments'
];

/** URL slug → sidebar page id (e.g. /admin/decision-center → ops-ai-assistant) */
export const ADMIN_PATH_ALIASES = Object.freeze({
  'decision-center': 'ops-ai-assistant'
});

/**
 * @param {string} [pathname]
 * @returns {string | null}
 */
export function resolveAdminPageFromPath(pathname = '/') {
  const match = String(pathname).match(/^\/admin\/([^/]+)\/?$/);
  if (!match) return null;
  const slug = decodeURIComponent(match[1]);
  return ADMIN_PATH_ALIASES[slug] || slug;
}

/**
 * Open the admin page matching the current URL path (/admin/listings, …).
 * @returns {boolean}
 */
export function bootAdminPageFromUrl() {
  const pageId = resolveAdminPageFromPath(window.location.pathname);
  if (!pageId) return false;
  const nav = document.querySelector(`[data-page-target="${pageId}"]`);
  if (!nav) {
    console.warn('[admin] no nav target for path page:', pageId);
    return false;
  }
  showAdminPage(pageId, nav);
  return true;
}

/**
 * @param {Record<string, () => void | Promise<void>>} handlers
 */
export function registerAdminPageHandlers(handlers) {
  pageHandlers = { ...handlers };
}

/**
 * @param {string} rootId
 * @param {string} [message]
 */
export function setAdminRootLoading(rootId, message = 'Yükleniyor…') {
  const el = document.getElementById(rootId);
  if (el) el.innerHTML = `<div class="empty">${message}</div>`;
}

/**
 * @param {string} name
 * @param {HTMLElement | null} [navEl]
 */
export function showAdminPage(name, navEl) {
  const pageEl = document.getElementById(`page-${name}`);
  if (!pageEl) {
    console.warn('[admin] unknown page:', name);
    return;
  }

  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
  pageEl.classList.add('active');
  syncAdminHeaderTitle(name);

  if (navEl?.classList?.contains('nav-item')) {
    navEl.classList.add('active');
  }

  const titleEl = document.getElementById('admin-mobile-title');
  if (titleEl && navEl?.textContent) {
    titleEl.textContent = navEl.textContent.replace(/^\s*\S+\s*/, '').trim() || 'Admin';
  }

  const handler = pageHandlers[name];
  if (typeof handler !== 'function') {
    console.warn('[admin] no handler registered for page:', name);
    return;
  }

  Promise.resolve(handler()).catch((err) => {
    console.error('[admin] page load failed:', name, err);
    const msg = String(err?.message || err || 'Bilinmeyen hata');
    const targets = pageEl.querySelectorAll(
      '[id$="-list"], [id$="-root"], [id$="-stats"]'
    );
    const html = `<div class="empty" role="alert">Sayfa yüklenemedi: ${escapeAdminPageText(msg)}</div>`;
    if (targets.length) {
      targets.forEach((node) => {
        node.innerHTML = html;
      });
    }
  });
}

function escapeAdminPageText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
