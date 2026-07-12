import { ADMIN_NAV_ITEMS } from './constants.js';
import { escapeHtml } from './format.js';

/**
 * @param {string} activeId
 * @returns {string}
 */
export function renderAdminSidebarNav(activeId) {
  return ADMIN_NAV_ITEMS.map((item) => {
    const isActive = item.id === activeId;
    return `<a class="gai-admin-nav__link${isActive ? ' is-active' : ''}" href="${item.href}"${isActive ? ' aria-current="page"' : ''}>${escapeHtml(item.label)}</a>`;
  }).join('');
}

/**
 * @param {{ title: string, subtitle?: string, eyebrow?: string, demo?: boolean }} options
 * @returns {string}
 */
export function renderPageHeader(options) {
  const eyebrow = options.eyebrow || 'GarsonAI Yönetim';
  return `
    <header class="gai-admin-page-header">
      <div>
        <p class="gai-admin-page-header__eyebrow">${escapeHtml(eyebrow)}</p>
        <h1 class="gai-admin-page-header__title">${escapeHtml(options.title)}</h1>
        ${options.subtitle ? `<p class="gai-admin-page-header__subtitle">${escapeHtml(options.subtitle)}</p>` : ''}
      </div>
      ${options.demo ? '<span class="gai-badge gai-badge--warning">Demo modu</span>' : ''}
    </header>
  `.trim();
}

/**
 * @param {string} message
 * @param {'info'|'error'|'success'} [tone]
 * @returns {string}
 */
export function renderNotice(message, tone = 'info') {
  return `<p class="gai-admin-notice gai-admin-notice--${tone}" role="status">${escapeHtml(message)}</p>`;
}

/**
 * @param {string} html
 * @returns {string}
 */
export function renderPanelSection(html) {
  return `<section class="gai-admin-section gai-card">${html}</section>`;
}
