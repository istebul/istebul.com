import {
  buildReservationUrl,
  normalizeSearchResults,
  searchRestaurants
} from './restoran-api.js';

const GUEST_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12];

/**
 * @param {string} id
 * @returns {HTMLElement|null}
 */
function $(id) {
  return document.getElementById(id);
}

/**
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setDefaultDateTime() {
  const dateInput = /** @type {HTMLInputElement|null} */ ($('restoran-date'));
  const timeInput = /** @type {HTMLInputElement|null} */ ($('restoran-time'));
  if (!dateInput || !timeInput) return;

  const now = new Date();
  now.setMinutes(now.getMinutes() + 60 - (now.getMinutes() % 15));
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');

  if (!dateInput.value) dateInput.value = `${yyyy}-${mm}-${dd}`;
  if (!timeInput.value) timeInput.value = `${hh}:${min}`;
}

/**
 * @returns {string}
 */
function buildSearchQuery() {
  const restaurant = /** @type {HTMLInputElement|null} */ ($('restoran-query'))?.value.trim() ?? '';
  const food = /** @type {HTMLInputElement|null} */ ($('restoran-food'))?.value.trim() ?? '';
  return [restaurant, food].filter(Boolean).join(' ').trim();
}

/**
 * @returns {string}
 */
function buildDateParam() {
  const date = /** @type {HTMLInputElement|null} */ ($('restoran-date'))?.value.trim() ?? '';
  const time = /** @type {HTMLInputElement|null} */ ($('restoran-time'))?.value.trim() ?? '';
  if (!date) return '';
  if (!time) return date;
  return `${date}T${time}:00`;
}

/**
 * @param {'loading'|'idle'|'error'} state
 * @param {string} [message]
 */
function setResultsState(state, message = '') {
  const status = $('restoran-status');
  const grid = $('restoran-results');
  const submitBtn = /** @type {HTMLButtonElement|null} */ ($('restoran-search-btn'));

  if (submitBtn) {
    submitBtn.disabled = state === 'loading';
    submitBtn.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
  }

  if (status) {
    status.hidden = state === 'idle';
    status.className = `restoran-status restoran-status--${state}`;
    status.textContent = message;
  }

  if (grid && state === 'loading') {
    grid.innerHTML = '';
    grid.setAttribute('aria-busy', 'true');
  } else if (grid) {
    grid.removeAttribute('aria-busy');
  }
}

/**
 * @param {Array<{ businessId: string, name: string, products: string[], availability: string }>} items
 */
function renderResults(items) {
  const grid = $('restoran-results');
  if (!grid) return;

  if (!items.length) {
    grid.innerHTML = `
      <div class="restoran-empty" role="status">
        <p>Kriterlerinize uygun restoran bulunamadı. Farklı bir arama veya tarih deneyin.</p>
      </div>`;
    return;
  }

  grid.innerHTML = items
    .map((item) => {
      const productsHtml = item.products.length
        ? `<ul class="restoran-card__products">${item.products
            .slice(0, 6)
            .map((product) => `<li>${escapeHtml(product)}</li>`)
            .join('')}</ul>`
        : '<p class="restoran-card__muted">Eşleşen ürün bilgisi yok</p>';

      const reserveDisabled = !item.businessId;
      const reserveHref = item.businessId
        ? buildReservationUrl(item.businessId)
        : '#';

      return `
        <article class="restoran-card" data-business-id="${escapeHtml(item.businessId)}">
          <header class="restoran-card__header">
            <h3 class="restoran-card__title">${escapeHtml(item.name)}</h3>
            <span class="restoran-card__badge">${escapeHtml(item.availability)}</span>
          </header>
          <div class="restoran-card__body">
            <p class="restoran-card__label">Eşleşen ürünler</p>
            ${productsHtml}
          </div>
          <footer class="restoran-card__footer">
            <a
              class="btn btn-primary restoran-card__reserve"
              href="${escapeHtml(reserveHref)}"
              ${reserveDisabled ? 'aria-disabled="true" tabindex="-1"' : 'target="_blank" rel="noopener noreferrer"'}
            >Rezervasyon yap</a>
          </footer>
        </article>`;
    })
    .join('');
}

async function handleSearch(event) {
  event.preventDefault();

  const guestRaw = /** @type {HTMLSelectElement|null} */ ($('restoran-guests'))?.value ?? '2';
  const guestCount = Number.parseInt(guestRaw, 10) || 2;
  const q = buildSearchQuery();
  const date = buildDateParam();

  if (!q && !date) {
    setResultsState('error', 'Restoran veya yemek adı girin ya da tarih seçin.');
    return;
  }

  setResultsState('loading', 'Restoranlar aranıyor…');

  try {
    const payload = await searchRestaurants({ q, guestCount, date });
    const items = normalizeSearchResults(payload);
    setResultsState('idle');
    renderResults(items);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Arama sırasında bir hata oluştu.';
    setResultsState('error', message);
    const grid = $('restoran-results');
    if (grid) grid.innerHTML = '';
  }
}

function bindNavToggle() {
  const toggle = /** @type {HTMLButtonElement|null} */ ($('restoran-nav-toggle'));
  const nav = $('restoran-nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}

function boot() {
  document.body.classList.add('ib-ready');
  setDefaultDateTime();
  bindNavToggle();

  const form = $('restoran-search-form');
  form?.addEventListener('submit', handleSearch);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
