/**
 * Admin panel navigation — every sidebar page maps to a refresh handler.
 */

/** @type {Record<string, () => void | Promise<void>>} */
let pageHandlers = {};

/** All nav targets that must have a DOM page and handler */
export const ADMIN_PAGE_IDS = [
  'dashboard',
  'settings',
  'content',
  'announcements',
  'faqs',
  'blog',
  'listings',
  'users',
  'auto-leads',
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
  'partner-endpoints',
  'partner-applications',
  'partner-dispatch-logs'
];

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
  });
}
