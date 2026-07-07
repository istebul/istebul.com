import {
  getRestaurantDetail,
  normalizeRestaurantDetail,
  parseBusinessIdFromLocation,
  parseReservationContext
} from './restoran-api.js';

const FALLBACK_MESSAGE =
  'GarsonAI rezervasyon altyapısı hazırlanıyor. Bu restoran için rezervasyon yakında aktif olacak.';

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

/**
 * @param {import('./restoran-api.js').ReservationContext} context
 * @returns {string}
 */
function formatContextSummary(context) {
  const parts = [];
  if (context.guests != null && context.guests > 0) {
    parts.push(`${context.guests} kişi`);
  }
  if (context.date) {
    parts.push(context.time ? `${context.date} ${context.time}` : context.date);
  } else if (context.time) {
    parts.push(context.time);
  }
  if (context.food) parts.push(`Yemek: ${context.food}`);
  if (context.q) parts.push(`Arama: ${context.q}`);
  return parts.length ? parts.join(' · ') : 'Tarih ve kişi sayısı seçilmedi';
}

/**
 * @param {'loading'|'ready'|'fallback'} state
 * @param {string} [message]
 */
function setPageState(state, message = '') {
  const status = $('reservation-status');
  const panel = $('reservation-panel');
  const fallback = $('reservation-fallback');

  if (status) {
    status.hidden = state !== 'loading';
    status.className = 'restoran-status restoran-status--loading';
    status.textContent = message || 'Restoran bilgileri yükleniyor…';
  }

  if (panel) panel.hidden = state !== 'ready';
  if (fallback) fallback.hidden = state !== 'fallback';
}

/**
 * @param {import('./restoran-api.js').RestaurantDetail} detail
 * @param {import('./restoran-api.js').ReservationContext} context
 */
function renderDetail(detail, context) {
  const title = $('reservation-title');
  const address = $('reservation-address');
  const availability = $('reservation-availability');
  const contextSummary = $('reservation-context-summary');

  if (title) title.textContent = detail.name || 'Restoran rezervasyonu';
  if (address) {
    address.textContent = detail.address || 'Adres bilgisi yakında eklenecek';
    address.hidden = false;
  }
  if (availability) availability.textContent = detail.availability || 'Bilgi yok';
  if (contextSummary) contextSummary.textContent = formatContextSummary(context);

  document.title = `${detail.name || 'Rezervasyon'} | GarsonAI — isteBul`;
  setPageState('ready');
}

function renderFallback(context) {
  const title = $('reservation-title');
  const address = $('reservation-address');
  const availability = $('reservation-availability');
  const contextSummary = $('reservation-context-summary');
  const fallbackText = $('reservation-fallback-text');

  if (title) title.textContent = 'Rezervasyon';
  if (address) address.hidden = true;
  if (availability) availability.textContent = 'Yakında';
  if (contextSummary) contextSummary.textContent = formatContextSummary(context);
  if (fallbackText) fallbackText.textContent = FALLBACK_MESSAGE;
  const fallbackSummary = $('reservation-context-summary-fallback');
  if (fallbackSummary) fallbackSummary.textContent = formatContextSummary(context);

  setPageState('fallback');
}

async function boot() {
  document.body.classList.add('ib-ready');

  const businessId = parseBusinessIdFromLocation(
    window.location.pathname,
    window.location.search
  );
  const context = parseReservationContext(window.location.search);

  if (!businessId) {
    renderFallback(context);
    return;
  }

  setPageState('loading');

  try {
    const payload = await getRestaurantDetail(businessId);
    const detail = normalizeRestaurantDetail(payload);
    if (!detail.name) {
      renderFallback(context);
      return;
    }
    renderDetail(detail, context);
  } catch {
    renderFallback(context);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

export {
  escapeHtml,
  formatContextSummary,
  FALLBACK_MESSAGE
};
