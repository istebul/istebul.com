/**
 * EPIC-500 — İSTEBUL Business MVP boot for `/business/`.
 *
 * Type-safe UI bileşenlerini `src/business` üzerinden bağlar.
 * Auth / tenant / API çağrısı yapmaz; mevcut ürünlere dokunmaz.
 */

import { mountBusinessApp } from '../../src/business/app/mountBusinessApp.ts';
import { getBusinessRouteByPath } from '../../src/business/routes/business-routes.ts';
import type { BusinessNavId } from '../../src/business/types/business-nav.ts';

const MOUNT_ID = 'business-app-root';

/**
 * @param {string | undefined} pageAttr
 * @returns {BusinessNavId | undefined}
 */
function resolveNavId(pageAttr) {
  if (
    pageAttr === 'dashboard' ||
    pageAttr === 'analizler' ||
    pageAttr === 'raporlar' ||
    pageAttr === 'danisman' ||
    pageAttr === 'bildirimler' ||
    pageAttr === 'ayarlar'
  ) {
    return /** @type {BusinessNavId} */ (pageAttr);
  }
  return undefined;
}

/**
 * @returns {{ ready: boolean, page: string | null }}
 */
export function bootBusinessApp() {
  if (typeof document === 'undefined') {
    return { ready: false, page: null };
  }

  const root = document.getElementById(MOUNT_ID);
  if (!(root instanceof HTMLElement)) {
    return { ready: false, page: null };
  }

  if (root.dataset.businessAppReady === '1') {
    return { ready: true, page: root.dataset.businessActivePage || null };
  }

  const navId = resolveNavId(root.dataset.businessPage);
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/business';
  const route = navId
    ? null
    : getBusinessRouteByPath(pathname);

  mountBusinessApp(root, {
    navId: navId ?? route?.navId ?? 'dashboard',
    pathname
  });

  document.documentElement.dataset.businessApp = '1';
  return { ready: true, page: root.dataset.businessActivePage || navId || 'dashboard' };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      bootBusinessApp();
    });
  } else {
    bootBusinessApp();
  }
}

export default bootBusinessApp;
