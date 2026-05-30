import {
  HOME_DECISION_CATEGORIES,
  isHomeCategoryActive
} from '../platform/home-category-config.js';

const FEATURED_CATEGORY_IDS = new Set(['araba', 'konut', 'tatil', 'finansman', 'sigorta', 'kasko']);

const CATEGORY_ICONS = {
  araba:
    '<svg class="ib-cat-v6__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 17h14M5 17a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h1l1.4-3.5A2 2 0 0 1 9.2 7h5.6a2 2 0 0 1 1.8 1.1L18 11.5h1a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2M5 17a2 2 0 1 0 4 0M15 17a2 2 0 1 0 4 0"/></svg>',
  konut:
    '<svg class="ib-cat-v6__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
  tatil:
    '<svg class="ib-cat-v6__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v18M8 7c0-2 1.5-4 4-4s4 2 4 4-1.5 3-4 3-4-1-4-3Z"/><path d="M6 21c1.5-2 4-3 6-3s4.5 1 6 3"/></svg>',
  finansman:
    '<svg class="ib-cat-v6__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10h18M5 10V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M5 10v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/><path d="M12 14v4"/></svg>',
  sigorta:
    '<svg class="ib-cat-v6__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 4 7v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-4Z"/><path d="m9 12 2 2 4-4"/></svg>',
  kasko:
    '<svg class="ib-cat-v6__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 4 7v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-4Z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>'
};

function categoryIconMarkup(categoryId) {
  return CATEGORY_ICONS[categoryId] || '';
}

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
      class="ib-cat-v6 is-active ib-category-showcase ib-category-showcase--${escapeHtml(category.theme)} ib-cat-v6--enterprise"
      data-category-id="${escapeHtml(category.id)}"
      data-native-route
      role="listitem"
      aria-label="${escapeHtml(category.name)} — ${escapeHtml(category.ctaLabel || 'Analizi başlat')}"
    >
      <span class="ib-cat-v6__badge ib-cat-v6__badge--ai">AI Destekli</span>
      <div class="ib-cat-v6__icon ib-cat-v6__icon--${escapeHtml(category.id)}" aria-hidden="true">
        ${categoryIconMarkup(category.id)}
      </div>
      <h3 class="ib-cat-v6__title">${escapeHtml(category.name)}</h3>
      <p class="ib-cat-v6__value">${escapeHtml(category.description)}</p>
      <div class="ib-cat-v6__metrics ib-cat-v6__metrics--dashboard" aria-label="Örnek karar sinyalleri">
        <div class="ib-cat-v6__metric ib-cat-v6__metric--score">
          <span class="ib-cat-v6__metric-label">Karar sinyali</span>
          <strong class="ib-cat-v6__score-value" aria-label="Örnek karar sinyali ${escapeHtml(score)} üzerinden 100">${escapeHtml(score)}<span>/100</span></strong>
          <span class="ib-cat-v6__metric-hint">Örnek analiz çıktısı</span>
        </div>
        <div class="ib-cat-v6__metric ib-cat-v6__risk ib-cat-v6__risk--${escapeHtml(riskClass)}">
          <span class="ib-cat-v6__metric-label">Risk görünümü</span>
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
      class="ib-cat-v6 is-soon ib-category-showcase is-coming-soon ib-category-showcase--${escapeHtml(category.theme)} ib-cat-v6--enterprise"
      data-category-id="${escapeHtml(category.id)}"
      role="listitem"
      aria-label="${escapeHtml(category.name)} — yakında"
    >
      <span class="ib-cat-v6__badge ib-cat-v6__badge--soon">Yakında</span>
      <div class="ib-cat-v6__icon ib-cat-v6__icon--${escapeHtml(category.id)}" aria-hidden="true">
        ${categoryIconMarkup(category.id)}
      </div>
      <h3 class="ib-cat-v6__title">${escapeHtml(category.name)}</h3>
      <p class="ib-cat-v6__value">${escapeHtml(category.description)}</p>
      <span class="ib-cat-v6__cta ib-cat-v6__cta--passive" aria-disabled="true">Yakında</span>
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
    <div class="ib-cat-v6-shell ib-cat-v6-shell--enterprise" role="list" aria-label="Karar kategorileri">
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
