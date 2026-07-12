import { requireAdminPanelContext } from './shared/context.js';
import { renderAdminSidebarNav } from './shared/shell.js';
import { logoutRestaurantUser } from '../auth-service.js';
import { GARSON_ADMIN_LOGIN_PATH } from './shared/constants.js';
import { mountDashboardPage } from './dashboard/index.js';
import { mountOrdersPage } from './siparisler/index.js';
import { mountReservationsPage } from './rezervasyonlar/index.js';
import { mountCustomersPage } from './musteriler/index.js';
import { mountMenuPage } from './menu/index.js';
import { mountTablesPage } from './masalar/index.js';
import { mountKitchenPage } from './mutfak/index.js';
import { mountWhatsappPage } from './whatsapp/index.js';
import { mountAnalyticsPage } from './analitik/index.js';
import { mountNotificationsPage } from './bildirimler/index.js';
import { mountSettingsPage } from './ayarlar/index.js';

/** @type {Record<string, (root: HTMLElement, context: import('./shared/context.js').AdminPanelContext) => Promise<void>>} */
export const ADMIN_PAGE_MOUNTERS = {
  dashboard: mountDashboardPage,
  siparisler: mountOrdersPage,
  orders: mountOrdersPage,
  rezervasyonlar: mountReservationsPage,
  reservations: mountReservationsPage,
  musteriler: mountCustomersPage,
  menu: mountMenuPage,
  masalar: mountTablesPage,
  mutfak: mountKitchenPage,
  whatsapp: mountWhatsappPage,
  analitik: mountAnalyticsPage,
  bildirimler: mountNotificationsPage,
  ayarlar: mountSettingsPage
};

/**
 * @param {string} pageId
 * @returns {(root: HTMLElement, context: import('./shared/context.js').AdminPanelContext) => Promise<void>|undefined}
 */
export function resolveAdminPageMounter(pageId) {
  return ADMIN_PAGE_MOUNTERS[pageId];
}

/**
 * @param {HTMLElement} shell
 * @param {string} activeId
 */
export function renderAdminShellNav(shell, activeId) {
  const nav = shell.querySelector('[data-admin-nav]');
  if (nav) nav.innerHTML = renderAdminSidebarNav(activeId);
}

/**
 * @param {HTMLElement} root
 * @param {string} pageId
 */
export async function bootAdminPage(root, pageId) {
  const context = await requireAdminPanelContext();
  const shell = root.closest('.gai-admin-shell') || root;
  renderAdminShellNav(/** @type {HTMLElement} */ (shell), pageId);

  const content = root.querySelector('[data-admin-content]') || root;
  const mounter = resolveAdminPageMounter(pageId);
  if (!mounter) {
    content.innerHTML = '<p class="gai-admin-empty">Sayfa bulunamadı.</p>';
    return;
  }

  await mounter(/** @type {HTMLElement} */ (content), context);

  const logout = shell.querySelector('[data-admin-logout]');
  logout?.addEventListener('click', async (event) => {
    event.preventDefault();
    await logoutRestaurantUser();
    window.location.assign(GARSON_ADMIN_LOGIN_PATH);
  });
}

function detectPageId() {
  const root = document.querySelector('[data-admin-page]');
  if (root instanceof HTMLElement && root.dataset.adminPage) {
    return root.dataset.adminPage;
  }

  const legacy = document.querySelector('[data-page]');
  if (legacy instanceof HTMLElement && legacy.dataset.page) {
    const map = {
      menu: 'menu',
      reservations: 'rezervasyonlar',
      orders: 'siparisler'
    };
    return map[legacy.dataset.page] || legacy.dataset.page;
  }

  if (document.getElementById('garson-admin-panel')) return 'dashboard';
  return '';
}

function boot() {
  const pageId = detectPageId();
  const root =
    document.querySelector('[data-admin-page]') ||
    document.getElementById('garson-admin-panel') ||
    document.getElementById('garson-management-root');

  if (!root || !pageId) return;
  bootAdminPage(/** @type {HTMLElement} */ (root), pageId).catch(() => {});
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}
