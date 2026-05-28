import {
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

function renderActiveCard(category) {
  return `
    <a
      href="${escapeHtml(category.href)}"
      class="ib-category-showcase is-active ib-category-showcase--${escapeHtml(category.theme)}"
      data-category-id="${escapeHtml(category.id)}"
      data-native-route
    >
      <span class="ib-category-showcase-badge">AI destekli</span>
      <h3><i data-lucide="${escapeHtml(category.icon)}" aria-hidden="true"></i> ${escapeHtml(category.name)}</h3>
      <p>${escapeHtml(category.description)}</p>
      <span class="ib-category-showcase-insight">${escapeHtml(category.insight || '')}</span>
      <span class="ib-category-showcase-cta">${escapeHtml(category.ctaLabel || 'Analiz Et')} →</span>
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
      <span class="ib-category-showcase-badge">Yakında</span>
      <h3><i data-lucide="${escapeHtml(category.icon)}" aria-hidden="true"></i> ${escapeHtml(category.name)}</h3>
      <p>${escapeHtml(category.description)}</p>
      <span class="ib-category-showcase-cta is-disabled" aria-hidden="true">Yakında</span>
    </div>
  `;
}

export function mountHomeCategoryGrid() {
  const grid = document.getElementById('home-category-grid');
  if (!grid) return;

  grid.innerHTML = HOME_DECISION_CATEGORIES.map((category) =>
    isHomeCategoryActive(category) ? renderActiveCard(category) : renderComingSoonCard(category)
  ).join('');

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
