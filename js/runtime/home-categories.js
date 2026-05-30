import {
  HOME_DECISION_CATEGORIES,
  isHomeCategoryActive
} from '../platform/home-category-config.js';

const FEATURED_CATEGORY_IDS = new Set(['araba', 'konut', 'tatil', 'finansman', 'sigorta']);

const CATEGORY_SHORT_NAMES = {
  araba: 'Otomobil',
  konut: 'Konut',
  tatil: 'Tatil',
  finansman: 'Finans',
  sigorta: 'Sigorta',
  kasko: 'Kasko'
};

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function categoryShortName(category) {
  return CATEGORY_SHORT_NAMES[category.id] || category.name;
}

function renderActiveCard(category) {
  const score = category.sampleScore != null ? String(category.sampleScore) : '—';
  const title = categoryShortName(category);
  return `
    <a
      href="${escapeHtml(category.href)}"
      class="ib-cat-mockup is-active ib-cat-mockup--${escapeHtml(category.id)}"
      data-category-id="${escapeHtml(category.id)}"
      data-native-route
      role="listitem"
      aria-label="${escapeHtml(title)} — Analiz et"
    >
      <div class="ib-cat-mockup__bg" aria-hidden="true"></div>
      <div class="ib-cat-mockup__overlay" aria-hidden="true"></div>
      <div class="ib-cat-mockup__body">
        <span class="ib-cat-mockup__score">${escapeHtml(score)}/100</span>
        <h3 class="ib-cat-mockup__title">${escapeHtml(title)}</h3>
        <p class="ib-cat-mockup__desc">${escapeHtml(category.description)}</p>
        <span class="ib-cat-mockup__link">Analiz Et →</span>
      </div>
    </a>
  `;
}

function renderComingSoonCard(category) {
  const title = categoryShortName(category);
  return `
    <article
      class="ib-cat-mockup is-soon ib-cat-mockup--${escapeHtml(category.id)} is-coming-soon"
      data-category-id="${escapeHtml(category.id)}"
      role="listitem"
      aria-label="${escapeHtml(title)} — yakında"
    >
      <span class="ib-cat-mockup__soon-badge">Yakında</span>
      <div class="ib-cat-mockup__bg" aria-hidden="true"></div>
      <div class="ib-cat-mockup__overlay" aria-hidden="true"></div>
      <div class="ib-cat-mockup__body">
        <h3 class="ib-cat-mockup__title">${escapeHtml(title)}</h3>
        <p class="ib-cat-mockup__desc">${escapeHtml(category.description)}</p>
        <span class="ib-cat-mockup__link">Yakında</span>
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
    if (!category.settingKey) return true;
    return visibilitySettings[category.settingKey] ?? true;
  });
  const activeCategories = categories.filter((category) => isHomeCategoryActive(category));
  const soonCategories = categories.filter((category) => category.status === 'coming_soon');
  const liveHtml = activeCategories.map((category) => renderActiveCard(category)).join('');
  const soonHtml = soonCategories.map((category) => renderComingSoonCard(category)).join('');
  grid.innerHTML = `
    <div class="ib-cat-mockup-shell" role="list" aria-label="Karar kategorileri">
      ${liveHtml}
      ${soonHtml}
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

// Preserve modal export for tests / future interest CTA
export { openInterestModal, ensureComingSoonModal };
