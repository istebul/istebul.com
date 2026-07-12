import { requireAdminPanelContext } from './shared/context.js';
import { renderAdminSidebarNav } from './shared/shell.js';
import { logoutRestaurantUser } from '../auth-service.js';
import { GARSON_ADMIN_LOGIN_PATH } from './shared/constants.js';

/** @type {Record<string, () => Promise<(root: HTMLElement, context: import('./shared/context.js').AdminPanelContext) => Promise<void>>>} */
const ADMIN_PAGE_LOADERS = {
  dashboard: () => import('./dashboard/index.js').then((module) => module.mountDashboardPage),
  siparisler: () => import('./siparisler/index.js').then((module) => module.mountOrdersPage),
  orders: () => import('./siparisler/index.js').then((module) => module.mountOrdersPage),
  rezervasyonlar: () =>
    import('./rezervasyonlar/index.js').then((module) => module.mountReservationsPage),
  reservations: () =>
    import('./rezervasyonlar/index.js').then((module) => module.mountReservationsPage),
  musteriler: () => import('./musteriler/index.js').then((module) => module.mountCustomersPage),
  menu: () => import('./menu/index.js').then((module) => module.mountMenuPage),
  masalar: () => import('./masalar/index.js').then((module) => module.mountTablesPage),
  mutfak: () => import('./mutfak/index.js').then((module) => module.mountKitchenPage),
  whatsapp: () => import('./whatsapp/index.js').then((module) => module.mountWhatsappPage),
  analitik: () => import('./analitik/index.js').then((module) => module.mountAnalyticsPage),
  bildirimler: () =>
    import('./bildirimler/index.js').then((module) => module.mountNotificationsPage),
  ayarlar: () => import('./ayarlar/index.js').then((module) => module.mountSettingsPage)
};

/** @type {Record<string, (root: HTMLElement, context: import('./shared/context.js').AdminPanelContext) => Promise<void>>} */
export const ADMIN_PAGE_MOUNTERS = Object.fromEntries(
  Object.entries(ADMIN_PAGE_LOADERS).map(([pageId, loader]) => [
    pageId,
    async (root, context) => {
      const mount = await loader();
      await mount(root, context);
    }
  ])
);

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
