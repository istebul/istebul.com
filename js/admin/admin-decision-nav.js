/**
 * Admin CRM — Decision Center navigation injection (runtime, no static HTML links).
 */

/** @type {Readonly<string>} */
export const DECISION_CENTER_HREF = '/admin/ai-listings.html';

/** @type {Readonly<string>} */
export const AI_LISTINGS_HREF = '/admin/listings';

const NAV_MARKER = 'data-decision-nav-injected';

/**
 * @param {string} href
 * @param {string} label
 * @param {string} icon
 * @returns {HTMLDivElement}
 */
function buildExternalNavItem(href, label, icon) {
  const item = document.createElement('div');
  item.className = 'nav-item nav-item--external';
  item.setAttribute('data-nav-href', href);
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
 * Injects Karar Merkezi + AI İlan Yönetimi links into admin sidebar after admin auth.
 */
export function injectDecisionCenterNav() {
  const nav = document.getElementById('admin-nav');
  if (!nav || nav.querySelector(`[${NAV_MARKER}]`)) return;

  const listingsItem = nav.querySelector('[data-page-target="listings"]');
  if (listingsItem) {
    const aiListings = buildExternalNavItem(AI_LISTINGS_HREF, 'AI İlan Yönetimi', '◈');
    aiListings.setAttribute(NAV_MARKER, 'ai-listings');
    listingsItem.insertAdjacentElement('afterend', aiListings);
  }

  const aiGroup = Array.from(nav.querySelectorAll('.nav-group')).find((group) => {
    const toggle = group.querySelector('.nav-group-toggle');
    return toggle?.textContent?.includes('AI Karar Motoru');
  });

  if (aiGroup) {
    const body = aiGroup.querySelector('.nav-group-body');
    if (body) {
      const decisionCenter = buildExternalNavItem(DECISION_CENTER_HREF, 'Karar Merkezi', '◆');
      decisionCenter.setAttribute(NAV_MARKER, 'decision-center');
      body.prepend(decisionCenter);
    }
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
