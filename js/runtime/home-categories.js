import {
  HOME_DECISION_CATEGORIES,
  isHomeCategoryActive
} from '../platform/home-category-config.js';
import { getHomeCategoryCardImage } from '../platform/home-category-visuals.js';
import { trackCategoryCardClick } from '../platform/site-analytics.js';

const FEATURED_CATEGORY_IDS = new Set([
  'araba',
  'konut',
  'tatil',
  'finansman',
  'sigorta',
  'kasko'
]);

const CATEGORY_DISPLAY_ORDER = [
  'araba',
  'tatil',
  'konut',
  'finansman',
  'sigorta',
  'kasko'
];

const CATEGORY_ICONS = {
  araba:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 17h14M5 17a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h1l1.4-3.5A2 2 0 0 1 9.2 7h5.6a2 2 0 0 1 1.8 1.1L18 11.5h1a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2M5 17a2 2 0 1 0 4 0M15 17a2 2 0 1 0 4 0"/></svg>',
  konut:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
  tatil:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v18"/><path d="M8 7c0-2 1.5-4 4-4s4 2 4 4-1.5 3-4 3-4-1-4-3Z"/><path d="M6 21c1.5-2 4-3 6-3s4.5 1 6 3"/></svg>',
  finansman:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10h18M5 10V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M5 10v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/><path d="M12 14v4"/></svg>',
  sigorta:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 4 7v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-4Z"/><path d="m9 12 2 2 4-4"/></svg>',
  kasko:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 4 7v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-4Z"/><path d="M12 11v4"/><path d="M12 8h.01"/></svg>'
};

function categoryIconMarkup(categoryId) {
  return CATEGORY_ICONS[categoryId] || CATEGORY_ICONS.sigorta;
}

function sortCategoriesForDisplay(categories) {
  return [...categories].sort(
    (a, b) => CATEGORY_DISPLAY_ORDER.indexOf(a.id) - CATEGORY_DISPLAY_ORDER.indexOf(b.id)
  );
}

function resolveLocaleId() {
  return (
    window.__ibI18n?.currentLang ||
    document.documentElement.dataset.locale ||
    'tr'
  );
}

function translate(key) {
  const result = window.__ibI18n?.t(key);
  if (result && result !== key) return result;
  return key;
}

function categoryDisplayName(category) {
  return translate(`categories.${category.id}.name`);
}

function categoryDisplayDesc(category) {
  return translate(`categories.${category.id}.desc`);
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderCardImage(category, index, eager = false) {
  const src = getHomeCategoryCardImage(category.id);
  if (!src) return '<div class="ib-cat-mockup__bg" aria-hidden="true"></div>';
  const loading = eager ? 'eager' : 'lazy';
  const fetchPriority = eager ? 'high' : 'low';
  return `
    <div class="ib-cat-mockup__bg" aria-hidden="true">
      <img
        src="${escapeHtml(src)}"
        alt=""
        width="800"
        height="500"
        loading="${loading}"
        decoding="async"
        fetchpriority="${fetchPriority}"
      />
    </div>
  `;
}

function renderActiveCard(category, index) {
  const score = category.sampleScore != null ? String(category.sampleScore) : '—';
  const title = categoryDisplayName(category);
  const desc = categoryDisplayDesc(category);
  const analyzeLabel = translate('home.analyzeLink');
  const analyzeAction = translate('home.analyzeAction');
  return `
    <a
      href="${escapeHtml(category.href)}"
      class="ib-cat-mockup ib-cat-mockup--premium is-active ib-cat-mockup--${escapeHtml(category.id)}"
      data-category-id="${escapeHtml(category.id)}"
      data-native-route
      role="listitem"
      style="--ib-cat-i: ${index}"
      aria-label="${escapeHtml(title)} — ${escapeHtml(analyzeAction)}"
    >
      ${renderCardImage(category, index, index < 2)}
      <div class="ib-cat-mockup__theme" aria-hidden="true"></div>
      <div class="ib-cat-mockup__overlay" aria-hidden="true"></div>
      <div class="ib-cat-mockup__glow" aria-hidden="true"></div>
      <div class="ib-cat-mockup__body">
        <div class="ib-cat-mockup__top">
          <span class="ib-cat-mockup__icon">${categoryIconMarkup(category.id)}</span>
          <span class="ib-cat-mockup__score">${escapeHtml(score)}<span class="ib-cat-mockup__score-suffix">/100</span></span>
        </div>
        <div class="ib-cat-mockup__panel">
          <h3 class="ib-cat-mockup__title">${escapeHtml(title)}</h3>
          <p class="ib-cat-mockup__desc">${escapeHtml(desc)}</p>
          <span class="ib-cat-mockup__link">${escapeHtml(analyzeLabel)}</span>
        </div>
      </div>
    </a>
  `;
}

function renderComingSoonCard(category, index) {
  const title = categoryDisplayName(category);
  const desc = categoryDisplayDesc(category);
  const soonLabel = translate('home.soon');
  return `
    <article
      class="ib-cat-mockup ib-cat-mockup--premium is-soon ib-cat-mockup--${escapeHtml(category.id)} is-coming-soon"
      data-category-id="${escapeHtml(category.id)}"
      role="listitem"
      style="--ib-cat-i: ${index}"
      aria-label="${escapeHtml(title)} — ${escapeHtml(soonLabel)}"
    >
      <span class="ib-cat-mockup__soon-badge ib-soon-badge">${escapeHtml(soonLabel)}</span>
      ${renderCardImage(category, index)}
      <div class="ib-cat-mockup__theme" aria-hidden="true"></div>
      <div class="ib-cat-mockup__overlay" aria-hidden="true"></div>
      <div class="ib-cat-mockup__body">
        <div class="ib-cat-mockup__top">
          <span class="ib-cat-mockup__icon">${categoryIconMarkup(category.id)}</span>
        </div>
        <div class="ib-cat-mockup__panel">
          <h3 class="ib-cat-mockup__title">${escapeHtml(title)}</h3>
          <p class="ib-cat-mockup__desc">${escapeHtml(desc)}</p>
          <span class="ib-cat-mockup__link">${escapeHtml(soonLabel)}</span>
        </div>
      </div>
    </article>
  `;
}

function closeInterestModal() {
  const modal = document.getElementById('coming-soon-interest-modal');
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
}

async function submitInterestForm(form) {
  const category = String(form.elements.category?.value || '').trim();
  const name = String(form.elements.name?.value || '').trim();
  const email = String(form.elements.email?.value || '').trim();
  const status = form.querySelector('[data-interest-status]');
  if (!category || !name || !email) return;

  const payload = {
    full_name: name,
    email,
    interest_type: category === 'kasko' ? 'insurance' : category,
    category,
    source: 'coming_soon_interest_modal',
    consent: true
  };

  try {
    const supabaseUrl = window.__env?.SUPABASE_URL;
    const supabaseAnonKey = window.__env?.SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
      await fetch(`${supabaseUrl}/functions/v1/auto-intake`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          apikey: supabaseAnonKey,
          authorization: `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify(payload)
      });
    }
  } catch (error) {
    console.warn('coming-soon-interest-submit-failed', { category, message: String(error?.message || error) });
  }

  try {
    const key = 'ib_coming_soon_interest_queue';
    const queue = JSON.parse(localStorage.getItem(key) || '[]');
    queue.push({ ...payload, created_at: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(queue.slice(-100)));
  } catch {}

  if (status) {
    status.textContent = 'Talebiniz alındı. Kategori açıldığında sizi bilgilendireceğiz.';
  }
  form.reset();
}

function ensureComingSoonModal() {
  if (document.getElementById('coming-soon-interest-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'coming-soon-interest-modal';
  modal.className = 'ib-interest-modal';
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div class="ib-interest-modal__backdrop" data-interest-close></div>
    <div class="ib-interest-modal__card" role="dialog" aria-modal="true" aria-labelledby="coming-soon-interest-title">
      <button type="button" class="ib-interest-modal__close" aria-label="Kapat" data-interest-close>×</button>
      <h3 id="coming-soon-interest-title">Bilgilendirme alın</h3>
      <p>Bu kategori yakında yayında olacak. Form bilgilendirme amaçlıdır.</p>
      <form class="ib-interest-modal__form">
        <input type="hidden" name="category" />
        <label>Ad Soyad<input type="text" name="name" required autocomplete="name" /></label>
        <label>E-posta<input type="email" name="email" required autocomplete="email" /></label>
        <button type="submit" class="btn btn-primary">Bilgilendirme al</button>
        <p class="text-muted-sm">Bilgileriniz KVKK kapsamında işlenir.</p>
        <p class="text-muted-sm" data-interest-status aria-live="polite"></p>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.hasAttribute('data-interest-close')) {
      closeInterestModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) {
      closeInterestModal();
    }
  });

  const form = modal.querySelector('form');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await submitInterestForm(event.currentTarget);
  });
}

function openInterestModal(categoryId) {
  ensureComingSoonModal();
  const modal = document.getElementById('coming-soon-interest-modal');
  if (!modal) return;
  const input = modal.querySelector('input[name="category"]');
  const status = modal.querySelector('[data-interest-status]');
  if (input) input.value = categoryId;
  if (status) status.textContent = '';
  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
}

async function fetchVisibilitySettings() {
  try {
    const supabaseUrl = window.__env?.SUPABASE_URL;
    const supabaseAnonKey = window.__env?.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return {};
    const keys = HOME_DECISION_CATEGORIES.filter(
      (category) => FEATURED_CATEGORY_IDS.has(category.id) && category.settingKey
    ).map((category) => category.settingKey);
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

  const ready = window.__ibI18n?.ready;
  if (ready) {
    await Promise.race([ready, new Promise((resolve) => setTimeout(resolve, 3000))]);
  }

  const visibilitySettings = await fetchVisibilitySettings();
  const categories = HOME_DECISION_CATEGORIES.filter((category) => {
    if (!FEATURED_CATEGORY_IDS.has(category.id)) return false;
    // Active verticals follow config status; remote flags cannot hide live product cards.
    if (isHomeCategoryActive(category)) return true;
    if (!category.settingKey) return true;
    return visibilitySettings[category.settingKey] ?? true;
  });
  const activeCategories = sortCategoriesForDisplay(
    categories.filter((category) => isHomeCategoryActive(category))
  );
  const soonCategories = sortCategoriesForDisplay(
    categories.filter((category) => category.status === 'coming_soon')
  );
  const liveHtml = activeCategories.map((category, index) => renderActiveCard(category, index)).join('');
  const soonHtml = soonCategories
    .map((category, index) => renderComingSoonCard(category, activeCategories.length + index))
    .join('');
  const gridAria = translate('home.categoriesGridAria');
  const soonAria = translate('home.categoriesSoonAria');
  grid.innerHTML = `
    <div class="ib-cat-mockup-shell">
      <div class="ib-cat-mockup-shell__live" role="list" aria-label="${escapeHtml(gridAria)}">
        ${liveHtml}
      </div>
      ${
        soonHtml
          ? `<div class="ib-cat-mockup-shell__soon" role="list" aria-label="${escapeHtml(soonAria)}">${soonHtml}</div>`
          : ''
      }
    </div>
  `;

  grid.querySelectorAll('[data-category-id]').forEach((card) => {
    card.addEventListener('click', (event) => {
      const categoryId = card.getAttribute('data-category-id');
      if (!categoryId) return;
      if (card.classList.contains('is-coming-soon')) {
        event.preventDefault();
        openInterestModal(categoryId);
        trackCategoryCardClick(categoryId, { href: null, interest: true });
        return;
      }
      trackCategoryCardClick(categoryId, { href: card.getAttribute('href') });
    });
  });

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
  document.addEventListener('ib:locale-changed', () => {
    if (document.getElementById('home-category-grid')) {
      mountHomeCategoryGrid();
    }
  });
}

export { openInterestModal, ensureComingSoonModal };
