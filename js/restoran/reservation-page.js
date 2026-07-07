import {
  getRestaurantDetail,
  getRestaurantSlots,
  normalizeRestaurantDetail,
  normalizeRestaurantSlots,
  parseBusinessIdFromLocation,
  parseReservationContext
} from './restoran-api.js';

const FALLBACK_MESSAGE =
  'GarsonAI rezervasyon altyapısı hazırlanıyor. Bu restoran için rezervasyon yakında aktif olacak.';
const SLOTS_FALLBACK_MESSAGE =
  'Bu restoran için canlı saat seçimi yakında aktif olacak.';
const CTA_PENDING_MESSAGE = 'Rezervasyon oluşturma adımı yakında aktif olacak.';

/** @type {import('./restoran-api.js').RestaurantSlot[]} */
let currentSlots = [];

/** @type {import('./restoran-api.js').RestaurantSlot|null} */
let selectedSlot = null;

/** @type {import('./restoran-api.js').ReservationContext} */
let currentContext = {};

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
 * @param {string} time
 * @returns {string}
 */
function normalizeTimeForMatch(time) {
  const match = String(time || '').match(/(\d{2}:\d{2})/);
  return match ? match[1] : String(time || '').trim();
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
 * @param {import('./restoran-api.js').ReservationContext} context
 */
function updateContextSummary(context) {
  const summary = formatContextSummary(context);
  const contextSummary = $('reservation-context-summary');
  if (contextSummary) contextSummary.textContent = summary;
}

/**
 * @param {boolean} enabled
 */
function setConfirmButtonState(enabled) {
  const button = /** @type {HTMLButtonElement|null} */ ($('reservation-confirm-btn'));
  if (!button) return;

  button.disabled = !enabled;
  button.setAttribute('aria-disabled', enabled ? 'false' : 'true');
  button.textContent = enabled ? 'Rezervasyonu onayla' : 'Rezervasyonu onayla (yakında)';
}

/**
 * @param {string} message
 */
function showCtaNotice(message) {
  const notice = $('reservation-cta-notice');
  if (!notice) return;
  notice.hidden = false;
  notice.textContent = message;
}

/**
 * @param {string} message
 * @param {'info'|'error'} [tone]
 */
function showSlotsMessage(message, tone = 'info') {
  const status = $('reservation-slots-status');
  const list = $('reservation-slots-list');
  if (list) list.innerHTML = '';
  if (!status) return;

  status.hidden = false;
  status.className = `restoran-status restoran-status--${tone === 'error' ? 'error' : 'loading'}`;
  status.textContent = message;
}

/**
 * @param {import('./restoran-api.js').RestaurantSlot} slot
 */
function selectSlot(slot) {
  if (!slot.available) return;

  selectedSlot = slot;
  currentContext = { ...currentContext, time: slot.time };
  updateContextSummary(currentContext);
  setConfirmButtonState(true);
  renderSlotButtons();
}

/**
 * @param {import('./restoran-api.js').RestaurantSlot[]} slots
 * @param {string} [preferredTime]
 * @returns {import('./restoran-api.js').RestaurantSlot|null}
 */
function findPreferredSlot(slots, preferredTime) {
  if (!preferredTime) return null;
  const normalized = normalizeTimeForMatch(preferredTime);
  return (
    slots.find(
      (slot) =>
        slot.available &&
        (normalizeTimeForMatch(slot.time) === normalized ||
          normalizeTimeForMatch(slot.label) === normalized ||
          slot.id === preferredTime)
    ) ?? null
  );
}

function renderSlotButtons() {
  const list = $('reservation-slots-list');
  const status = $('reservation-slots-status');
  if (!list) return;

  if (!currentSlots.length) {
    showSlotsMessage('Bu tarih için uygun saat bulunamadı.');
    return;
  }

  if (status) status.hidden = true;

  list.innerHTML = currentSlots
    .map((slot) => {
      const isSelected = selectedSlot?.id === slot.id;
      const disabled = !slot.available;
      return `
        <button
          type="button"
          class="reservation-slot${isSelected ? ' is-selected' : ''}${disabled ? ' is-disabled' : ''}"
          data-slot-id="${escapeHtml(slot.id)}"
          role="option"
          aria-selected="${isSelected ? 'true' : 'false'}"
          ${disabled ? 'disabled aria-disabled="true"' : ''}
        >${escapeHtml(slot.label)}</button>`;
    })
    .join('');

  list.querySelectorAll('.reservation-slot:not(.is-disabled)').forEach((node) => {
    node.addEventListener('click', () => {
      const slotId = node.getAttribute('data-slot-id');
      const slot = currentSlots.find((item) => item.id === slotId);
      if (slot) selectSlot(slot);
    });
  });
}

/**
 * @param {string} businessId
 * @param {import('./restoran-api.js').ReservationContext} context
 */
async function loadSlots(businessId, context) {
  const slotsSection = $('reservation-slots-section');
  if (slotsSection) slotsSection.hidden = false;

  showSlotsMessage('Uygun saatler yükleniyor…');

  try {
    const payload = await getRestaurantSlots(businessId, {
      date: context.date,
      guestCount: context.guests
    });
    currentSlots = normalizeRestaurantSlots(payload).filter((slot) => slot.time || slot.label);

    if (!currentSlots.length) {
      selectedSlot = null;
      setConfirmButtonState(false);
      showSlotsMessage('Bu tarih için uygun saat bulunamadı.');
      return;
    }

    const preferred = findPreferredSlot(currentSlots, context.time);
    if (preferred) {
      selectSlot(preferred);
      return;
    }

    selectedSlot = null;
    setConfirmButtonState(false);
    renderSlotButtons();
  } catch {
    currentSlots = [];
    selectedSlot = null;
    setConfirmButtonState(false);
    showSlotsMessage(SLOTS_FALLBACK_MESSAGE);
  }
}

/**
 * @param {import('./restoran-api.js').RestaurantDetail} detail
 * @param {import('./restoran-api.js').ReservationContext} context
 */
function renderDetail(detail, context) {
  const title = $('reservation-title');
  const address = $('reservation-address');
  const availability = $('reservation-availability');

  if (title) title.textContent = detail.name || 'Restoran rezervasyonu';
  if (address) {
    address.textContent = detail.address || 'Adres bilgisi yakında eklenecek';
    address.hidden = false;
  }
  if (availability) availability.textContent = detail.availability || 'Bilgi yok';

  currentContext = { ...context };
  updateContextSummary(currentContext);
  setConfirmButtonState(false);

  document.title = `${detail.name || 'Rezervasyon'} | GarsonAI — isteBul`;
  setPageState('ready');
}

function renderFallback(context) {
  const title = $('reservation-title');
  const address = $('reservation-address');
  const availability = $('reservation-availability');
  const contextSummary = $('reservation-context-summary');
  const fallbackText = $('reservation-fallback-text');
  const slotsSection = $('reservation-slots-section');

  if (title) title.textContent = 'Rezervasyon';
  if (address) address.hidden = true;
  if (availability) availability.textContent = 'Yakında';
  if (contextSummary) contextSummary.textContent = formatContextSummary(context);
  if (fallbackText) fallbackText.textContent = FALLBACK_MESSAGE;
  if (slotsSection) slotsSection.hidden = true;

  const fallbackSummary = $('reservation-context-summary-fallback');
  if (fallbackSummary) fallbackSummary.textContent = formatContextSummary(context);

  setPageState('fallback');
}

function bindConfirmButton() {
  const button = $('reservation-confirm-btn');
  button?.addEventListener('click', () => {
    if (!selectedSlot) return;
    showCtaNotice(CTA_PENDING_MESSAGE);
  });
}

async function boot() {
  document.body.classList.add('ib-ready');
  bindConfirmButton();

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
    await loadSlots(businessId, context);
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
  findPreferredSlot,
  FALLBACK_MESSAGE,
  SLOTS_FALLBACK_MESSAGE,
  CTA_PENDING_MESSAGE
};
