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
      <dl class="ib-category-showcase-summary">
        <div><dt>Karar skoru</dt><dd>${escapeHtml(category.sampleScore ?? '—')}/100</dd></div>
        <div><dt>Risk analizi</dt><dd>${escapeHtml(category.riskValue || '—')}</dd></div>
        <div><dt>${escapeHtml(category.totalCostLabel || 'Toplam maliyet')}</dt><dd>${escapeHtml(category.totalCostValue || '—')}</dd></div>
      </dl>
      <div class="home-v3-category-pills" aria-label="Öne çıkan yetenekler">
        <span>Karar Skoru</span><span>Risk Analizi</span><span>Toplam Maliyet</span><span>AI Değerlendirmesi</span>
      </div>
      <p class="ib-category-showcase-ai"><strong>AI gerekçesi:</strong> ${escapeHtml(category.aiRationale || 'Kişisel veriye göre yorum üretilecektir.')}</p>
      <p class="ib-category-showcase-next"><strong>Sonraki adım:</strong> ${escapeHtml(category.nextStep || 'Detay analizi başlat')}</p>
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

function renderComingSoonCard(category) {
  return `
    <article
      class="ib-category-showcase is-coming-soon ib-category-showcase--${escapeHtml(category.theme)}"
      data-category-id="${escapeHtml(category.id)}"
    >
      <span class="ib-category-showcase-badge">Yakında</span>
      <h3><i data-lucide="${escapeHtml(category.icon)}" aria-hidden="true"></i> ${escapeHtml(category.name)}</h3>
      <p>${escapeHtml(category.description)}</p>
      <p class="ib-category-showcase-ai"><strong>Durum:</strong> Yakında</p>
      <button type="button" class="ib-category-showcase-cta ib-category-interest-btn" data-interest-category="${escapeHtml(category.id)}">
        ${escapeHtml(category.ctaLabel || 'Bilgilendirme al')} →
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
  grid.innerHTML = [
    ...activeCategories.map((category) => renderActiveCard(category)),
    ...soonCategories.map((category) => renderComingSoonCard(category))
  ].join('');

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
