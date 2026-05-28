import {
  HOME_CATEGORY_PILLARS,
  HOME_DECISION_CATEGORIES,
  isHomeCategoryActive
} from '../platform/home-category-config.js';

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderPillarsList() {
  const items = HOME_CATEGORY_PILLARS.map(
    (label) => `<li>${escapeHtml(label)}</li>`
  ).join('');
  return `<ul class="ib-category-showcase-pillars" aria-label="Karar özeti">${items}</ul>`;
}

function renderActiveCard(category) {
  return `
    <a
      href="${escapeHtml(category.href)}"
      class="ib-category-showcase is-active ib-category-showcase--${escapeHtml(category.theme)}"
      data-category-id="${escapeHtml(category.id)}"
      data-native-route
    >
      <span class="ib-category-showcase-badge">Canlı</span>
      <h3><i data-lucide="${escapeHtml(category.icon)}" aria-hidden="true"></i> ${escapeHtml(category.name)}</h3>
      <p>${escapeHtml(category.description)}</p>
      ${renderPillarsList()}
      <span class="ib-category-showcase-cta">${escapeHtml(category.ctaLabel || 'Analiz et')} →</span>
      ${
        category.sampleScore != null
          ? `<span class="ib-category-showcase-score" aria-label="Örnek karar skoru">${category.sampleScore}<span>/100</span></span>`
          : ''
      }
    </a>
  `;
}

function renderComingSoonCard(category) {
  return `
    <div
      class="ib-category-showcase is-soon ib-category-showcase--${escapeHtml(category.theme)}"
      role="group"
      aria-disabled="true"
      data-category-id="${escapeHtml(category.id)}"
    >
      <span class="ib-category-showcase-badge">Yakında · erken erişim</span>
      <h3><i data-lucide="${escapeHtml(category.icon)}" aria-hidden="true"></i> ${escapeHtml(category.name)}</h3>
      <p>${escapeHtml(category.description)}</p>
      <ul class="ib-category-showcase-pillars is-muted" aria-hidden="true">
        ${HOME_CATEGORY_PILLARS.map((label) => `<li>${escapeHtml(label)}</li>`).join('')}
      </ul>
      <span class="ib-category-showcase-cta is-disabled">Erken erişim listesi</span>
    </div>
  `;
}

export function mountHomeCategoryGrid() {
  const grid = document.getElementById('home-category-grid');
  if (!grid) return;

  const live = HOME_DECISION_CATEGORIES.filter((c) => isHomeCategoryActive(c));
  const soon = HOME_DECISION_CATEGORIES.filter((c) => c.status === 'coming_soon');

  grid.innerHTML = `
    <div class="ib-category-showcase-live" aria-label="Canlı kategoriler">
      ${live.map((category) => renderActiveCard(category)).join('')}
    </div>
    <div class="ib-category-showcase-soon" aria-label="Yakında açılacak kategoriler">
      <p class="ib-category-soon-heading">Yakında</p>
      ${soon.map((category) => renderComingSoonCard(category)).join('')}
    </div>
  `;

  document.dispatchEvent(new CustomEvent('ib:refresh-icons'));
}

export function initHomeCategories() {
  if (typeof document === 'undefined') return;
  const run = () => mountHomeCategoryGrid();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
  document.addEventListener('routeChanged', () => {
    if (document.documentElement.dataset.ibRoute === 'home') {
      mountHomeCategoryGrid();
    }
  });
}
