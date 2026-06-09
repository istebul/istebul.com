/**
 * Admin CRM — listing management navigation (admin-only, runtime injection).
 */

/** AI Listings Karar Merkezi — NOT classic CRM Karar Seçenekleri (/admin/listings). */
export const ADMIN_LISTING_MANAGEMENT_HREF = '/admin/ai-listings/';

const NAV_MARKER = 'data-admin-listing-nav-injected';

/**
 * @param {string} href
 * @param {string} label
 * @param {string} icon
 * @returns {HTMLDivElement}
 */
function buildExternalNavItem(href, label, icon) {
  const item = document.createElement('div');
  item.className = 'nav-item nav-item--external nav-item--admin-only';
  item.setAttribute('data-nav-href', href);
  item.setAttribute('data-admin-only', 'true');
  item.setAttribute('role', 'link');
  item.setAttribute('tabindex', '0');
  item.innerHTML = `<span class="nav-icon" aria-hidden="true">${icon}</span><span class="nav-label">${label}</span>`;
  return item;
}

/**
 * @param {HTMLElement} item
 */
function navigateExternalNavItem(item) {
  const href = item.getAttribute('data-nav-href');
  if (!href) return;
  window.location.assign(href);
}

/**
 * Injects admin-only AI listing management link after successful admin auth.
 */
export function injectAdminListingManagementNav() {
  const nav = document.getElementById('admin-nav');
  if (!nav || nav.querySelector(`[${NAV_MARKER}]`)) return;

  const listingsItem = nav.querySelector('[data-page-target="listings"]');
  if (listingsItem) {
    listingsItem.setAttribute('title', 'Klasik ilan/ürün CRUD — AI karar analizi için AI İlan Yönetimi\'ni kullanın');
    const aiListings = buildExternalNavItem(ADMIN_LISTING_MANAGEMENT_HREF, 'AI İlan Yönetimi', '◈');
    aiListings.setAttribute(NAV_MARKER, 'ai-listings');
    aiListings.setAttribute(
      'title',
      'Karar Merkezi analizi, onay akışı ve AI ilan motoru — klasik İlan/Ürünler\'den farklıdır'
    );
    listingsItem.insertAdjacentElement('afterend', aiListings);
  }

  nav.querySelectorAll('.nav-item--external').forEach((item) => {
    if (item.dataset.navBound === '1') return;
    item.dataset.navBound = '1';
    item.addEventListener('click', () => navigateExternalNavItem(item));
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        navigateExternalNavItem(item);
      }
    });
  });
}

/** @deprecated Use injectAdminListingManagementNav */
export const injectDecisionCenterNav = injectAdminListingManagementNav;
