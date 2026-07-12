import { resolveGarsonPanelAccess } from '../auth-service.js';
import { GARSON_ADMIN_LOGIN_PATH } from './shared/constants.js';

/**
 * @param {Element|null} root
 * @returns {string}
 */
function detectPageId(root) {
  if (root instanceof HTMLElement && root.dataset.adminPage) {
    return root.dataset.adminPage;
  }

  if (root instanceof HTMLElement && root.dataset.page) {
    const map = {
      menu: 'menu',
      reservations: 'rezervasyonlar',
      orders: 'siparisler'
    };
    return map[root.dataset.page] || root.dataset.page;
  }

  if (document.getElementById('garson-admin-panel')) return 'dashboard';
  return '';
}

async function boot() {
  const root =
    document.querySelector('[data-admin-page]') ||
    document.getElementById('garson-admin-panel') ||
    document.getElementById('garson-management-root');

  if (!(root instanceof HTMLElement)) return;

  const pageId = detectPageId(root);
  if (!pageId) return;

  const access = await resolveGarsonPanelAccess();
  if (access.mode === 'none') {
    window.location.assign(GARSON_ADMIN_LOGIN_PATH);
    return;
  }

  const { bootAdminPage } = await import('./index.js');
  await bootAdminPage(root, pageId);

  const badge =
    document.getElementById('garson-admin-demo-badge') ||
    document.getElementById('garson-management-demo-badge');
  if (badge instanceof HTMLElement) badge.hidden = access.mode === 'live';
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      boot().catch(() => {});
    });
  } else {
    boot().catch(() => {});
  }
}
