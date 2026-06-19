/**
 * Admin CRM — listing management navigation (admin-only).
 */

/** AI Listings Karar Merkezi — NOT classic CRM Karar Seçenekleri (/admin/listings). */
export const ADMIN_LISTING_MANAGEMENT_HREF = '/admin/ai-listings/';

const NAV_MARKER = 'data-admin-listing-nav-injected';

/**
 * @param {string} href
 * @param {string} label
 * @param {string} icon
 * @returns {HTMLAnchorElement}
 */
function buildExternalNavItem(href, label, icon) {
  const item = document.createElement('a');
  item.className = 'nav-item nav-item--external nav-item--admin-only';
  item.href = href;
  item.setAttribute('data-nav-href', href);
  item.setAttribute('data-admin-only', 'true');
  item.innerHTML = `<span class="nav-icon" aria-hidden="true">${icon}</span><span class="nav-label">${label}</span>`;
  return item;
}

/**
 * @param {ParentNode} [root]
 */
export function bindAdminExternalNavLinks(root = document) {
  root.querySelectorAll('.nav-item--external[data-nav-href], a.nav-item--external[href]').forEach((item) => {
    if (item.dataset.navBound === '1') return;
    item.dataset.navBound = '1';
    item.addEventListener('click', (event) => {
      if (item.tagName === 'A' && item.getAttribute('href')) return;
      event.preventDefault();
      const href = item.getAttribute('data-nav-href') || item.getAttribute('href');
      if (href) window.location.assign(href);
    });
    item.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (item.tagName === 'A' && item.getAttribute('href')) return;
      event.preventDefault();
      const href = item.getAttribute('data-nav-href') || item.getAttribute('href');
      if (href) window.location.assign(href);
    });
  });
}

/**
 * Ensures admin-only AI listing management link exists and is wired.
 * Static link in admin-panel.html is preferred; inject is fallback only.
 */
export function injectAdminListingManagementNav() {
  const nav = document.getElementById('admin-nav');
  if (!nav) return;

  const listingsItem = nav.querySelector('[data-page-target="listings"]');
  if (listingsItem) {
    listingsItem.setAttribute(
      'title',
      'Klasik ilan/ürün CRUD — AI karar analizi için AI İlan Yönetimi\'ni kullanın'
    );
  }

  let aiListings = nav.querySelector(`[${NAV_MARKER}]`);
  if (!aiListings && listingsItem) {
    aiListings = buildExternalNavItem(ADMIN_LISTING_MANAGEMENT_HREF, 'AI İlan Yönetimi', '◈');
    aiListings.setAttribute(NAV_MARKER, 'ai-listings');
    aiListings.setAttribute(
      'title',
      'Karar Merkezi analizi, onay akışı ve AI ilan motoru — klasik Karar Seçenekleri\'nden farklıdır'
    );
    listingsItem.insertAdjacentElement('afterend', aiListings);
  }

  bindAdminExternalNavLinks(nav);
}

/** @deprecated Use injectAdminListingManagementNav */
export const injectDecisionCenterNav = injectAdminListingManagementNav;
