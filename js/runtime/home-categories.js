import {
  HOME_DECISION_CATEGORIES,
  isHomeCategoryActive
} from '../platform/home-category-config.js';

const FEATURED_CATEGORY_IDS = new Set(['otomobil', 'konut', 'tatil', 'finans']);

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderActiveCard(category) {
  const highlights = Array.isArray(category.highlights) ? category.highlights : [];
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
      <ul class="ib-category-showcase-points">
        ${highlights.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}
      </ul>
      <span class="ib-category-showcase-cta">${escapeHtml(category.ctaLabel || 'Analiz Et')} →</span>
      ${
        category.sampleScore != null
          ? `<span class="ib-category-showcase-score" aria-label="Örnek karar skoru">${category.sampleScore}<span>/100</span></span>`
          : ''
      }
    </a>
  `;
}

async function fetchVisibilitySettings() {
  try {
    const supabaseUrl = window.__env?.SUPABASE_URL;
    const supabaseAnonKey = window.__env?.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return {};
    const keys = HOME_DECISION_CATEGORIES
      .filter((category) => FEATURED_CATEGORY_IDS.has(category.id) && category.settingKey)
      .map((category) => category.settingKey);
    if (!keys.length) return {};
    const query = encodeURIComponent(`(${keys.join(',')})`);
    const endpoint = `${supabaseUrl}/rest/v1/site_settings?select=key,value&key=in.${query}`;
    const response = await fetch(endpoint, {
      headers: {
        apikey: supabaseAnonKey,
        authorization: `Bearer ${supabaseAnonKey}`
      }
    });
    if (!response.ok) return {};
    const rows = await response.json();
    return Array.isArray(rows)
      ? rows.reduce((acc, row) => {
          if (row?.key) acc[row.key] = String(row.value).toLowerCase() !== 'false';
          return acc;
        }, {})
      : {};
  } catch {
    return {};
  }
}

export async function mountHomeCategoryGrid() {
  const grid = document.getElementById('home-category-grid');
  if (!grid) return;
  const visibilitySettings = await fetchVisibilitySettings();
  const categories = HOME_DECISION_CATEGORIES.filter((category) => {
    if (!FEATURED_CATEGORY_IDS.has(category.id)) return false;
    if (!isHomeCategoryActive(category)) return false;
    if (!category.settingKey) return true;
    return visibilitySettings[category.settingKey] ?? true;
  });

  grid.innerHTML = categories.map((category) => renderActiveCard(category)).join('');

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
