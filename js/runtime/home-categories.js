import {
  HOME_DECISION_CATEGORIES,
  isHomeCategoryActive
} from '../platform/home-category-config.js';

const FEATURED_CATEGORY_IDS = new Set(['araba', 'konut', 'tatil', 'finansman', 'sigorta', 'kasko']);

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Presentational risk tone for badge color (V6 cards). */
function riskToneClass(riskValue) {
  const v = String(riskValue || '').toLowerCase();
  if (!v || v === '—') return 'neutral';
  if (v.includes('yüksek')) return 'high';
  if (v.includes('orta') && v.includes('düşük')) return 'medium-low';
  if (v.includes('düşük') && v.includes('orta')) return 'medium-low';
  if (v.includes('orta')) return 'medium';
  if (v.includes('düşük')) return 'low';
  return 'neutral';
}

function renderActiveCard(category) {
  const score = category.sampleScore != null ? String(category.sampleScore) : '—';
  const risk = category.riskValue || '—';
  const riskClass = riskToneClass(risk);
  return `
    <a
      href="${escapeHtml(category.href)}"
      class="ib-cat-v6 is-active ib-category-showcase ib-category-showcase--${escapeHtml(category.theme)}"
      data-category-id="${escapeHtml(category.id)}"
      data-native-route
    >
      <span class="ib-cat-v6__badge ib-cat-v6__badge--ai">AI destekli</span>
      <div class="ib-cat-v6__icon" aria-hidden="true">
        <i data-lucide="${escapeHtml(category.icon)}"></i>
      </div>
      <h3 class="ib-cat-v6__title">${escapeHtml(category.name)}</h3>
      <p class="ib-cat-v6__value">${escapeHtml(category.description)}</p>
      <div class="ib-cat-v6__metrics">
        <div class="ib-cat-v6__metric ib-cat-v6__metric--score">
          <span class="ib-cat-v6__metric-label">Karar skoru</span>
          <strong class="ib-cat-v6__score-value" aria-label="Örnek karar skoru">${escapeHtml(score)}<span>/100</span></strong>
        </div>
        <div class="ib-cat-v6__metric ib-cat-v6__risk ib-cat-v6__risk--${escapeHtml(riskClass)}">
          <span class="ib-cat-v6__metric-label">Risk</span>
          <strong class="ib-cat-v6__risk-value">${escapeHtml(risk)}</strong>
        </div>
      </div>
      <span class="ib-cat-v6__cta">${escapeHtml(category.ctaLabel || 'Analizi başlat')}</span>
    </a>
  `;
}

function renderComingSoonCard(category) {
  return `
    <article
      class="ib-cat-v6 is-soon ib-category-showcase is-coming-soon ib-category-showcase--${escapeHtml(category.theme)}"
      data-category-id="${escapeHtml(category.id)}"
    >
      <span class="ib-cat-v6__badge ib-cat-v6__badge--soon">Yakında</span>
      <div class="ib-cat-v6__icon" aria-hidden="true">
        <i data-lucide="${escapeHtml(category.icon)}"></i>
      </div>
      <h3 class="ib-cat-v6__title">${escapeHtml(category.name)}</h3>
      <p class="ib-cat-v6__value">${escapeHtml(category.description)}</p>
      <p class="ib-cat-v6__soon-note">Kategori yayına alındığında bilgilendirme listesine eklenin.</p>
      <button type="button" class="ib-cat-v6__cta ib-category-interest-btn" data-interest-category="${escapeHtml(category.id)}">
        ${escapeHtml(category.ctaLabel || 'Bilgilendirme al')}
      </button>
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
    <div class="ib-cat-v6-shell">
      ${liveHtml ? `<div class="ib-cat-v6-grid ib-cat-v6-grid--live" role="list">${liveHtml}</div>` : ''}
      ${soonHtml ? `<div class="ib-cat-v6-grid ib-cat-v6-grid--soon" role="list">${soonHtml}</div>` : ''}
    </div>
  `;

  document.dispatchEvent(new CustomEvent('ib:refresh-icons'));
  grid.querySelectorAll('.ib-category-interest-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const categoryId = btn.getAttribute('data-interest-category') || 'sigorta';
      openInterestModal(categoryId);
    });
  });
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
