import {
  buildGoogleCalendarUrl,
  buildReservationConfirmUrl,
  createRestaurantReservation,
  getRestaurantDetail,
  getRestaurantMenu,
  getRestaurantSlots,
  normalizeRestaurantDetail,
  normalizeRestaurantMenu,
  normalizeRestaurantSlots,
  parseBusinessIdFromLocation,
  parseReservationContext,
  ReservationValidationError,
  resolveSlotDate
} from './restoran-api.js';
import { createCart } from './preorder-cart.js';

const FALLBACK_MESSAGE =
  'GarsonAI rezervasyon altyapısı hazırlanıyor. Bu restoran için rezervasyon yakında aktif olacak.';
const SLOTS_FALLBACK_MESSAGE =
  'Bu restoran için canlı saat seçimi yakında aktif olacak.';
const SLOTS_UNAVAILABLE_POST_MESSAGE =
  'Canlı saat seçimi olmadan rezervasyon oluşturulamaz. Rezervasyon yakında aktif olacak.';
const MENU_FALLBACK_MESSAGE =
  'Bu restoran için menü yakında aktif olacak.';
const MENU_EMPTY_MESSAGE = 'Menü bilgisi henüz eklenmemiş.';
const PREORDER_CONTINUE_MESSAGE = 'Ön sipariş gönderme adımı yakında aktif olacak.';
const PREORDER_EMPTY_MESSAGE = 'Henüz ürün seçmediniz.';

const preorderCart = createCart();

/** @type {import('./restoran-api.js').RestaurantMenuCategory[]} */
let menuCategories = [];

/** @type {import('./restoran-api.js').RestaurantSlot[]} */
let currentSlots = [];

/** @type {import('./restoran-api.js').RestaurantSlot|null} */
let selectedSlot = null;

/** @type {import('./restoran-api.js').ReservationContext} */
let currentContext = {};

/** @type {string} */
let currentBusinessId = '';

/** @type {string} */
let currentRestaurantName = '';

/** @type {string} */
let currentRestaurantAddress = '';

/** @type {boolean} */
let slotsAvailable = false;

/** @type {boolean} */
let isSubmitting = false;

/** @type {boolean} */
let reservationComplete = false;

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
 * @returns {{ customerName: string, customerPhone: string, note: string }}
 */
function readContactForm() {
  return {
    customerName:
      /** @type {HTMLInputElement|null} */ ($('reservation-customer-name'))?.value.trim() ?? '',
    customerPhone:
      /** @type {HTMLInputElement|null} */ ($('reservation-customer-phone'))?.value.trim() ?? '',
    note: /** @type {HTMLTextAreaElement|null} */ ($('reservation-note'))?.value.trim() ?? ''
  };
}

/**
 * @returns {boolean}
 */
function isFormComplete() {
  const { customerName, customerPhone } = readContactForm();
  return Boolean(customerName && customerPhone);
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

function updateConfirmButton() {
  const button = /** @type {HTMLButtonElement|null} */ ($('reservation-confirm-btn'));
  if (!button || reservationComplete) return;

  if (isSubmitting) {
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
    button.textContent = 'Rezervasyon oluşturuluyor…';
    return;
  }

  if (!slotsAvailable) {
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
    button.textContent = 'Rezervasyonu onayla (yakında)';
    return;
  }

  if (!selectedSlot) {
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
    button.textContent = 'Önce uygun saat seç';
    return;
  }

  if (!isFormComplete()) {
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
    button.textContent = 'Bilgileri tamamla';
    return;
  }

  button.disabled = false;
  button.setAttribute('aria-disabled', 'false');
  button.textContent = 'Rezervasyonu onayla';
}

/**
 * @param {string} message
 * @param {'info'|'error'} [tone]
 */
function showCtaNotice(message, tone = 'info') {
  const notice = $('reservation-cta-notice');
  if (!notice) return;
  notice.hidden = false;
  notice.className = `reservation-cta-notice reservation-cta-notice--${tone}`;
  notice.textContent = message;
}

function hideCtaNotice() {
  const notice = $('reservation-cta-notice');
  if (!notice) return;
  notice.hidden = true;
  notice.textContent = '';
}

/**
 * @param {'hidden'|'loading'|'error'|'empty'|'content'} state
 * @param {string} [message]
 */
function setMenuState(state, message = '') {
  const section = $('reservation-menu-section');
  const loading = $('reservation-menu-loading');
  const error = $('reservation-menu-error');
  const empty = $('reservation-menu-empty');
  const content = $('reservation-menu-content');

  if (section) section.hidden = state === 'hidden';
  if (loading) loading.hidden = state !== 'loading';
  if (error) {
    error.hidden = state !== 'error';
    if (state === 'error') error.textContent = message || MENU_FALLBACK_MESSAGE;
  }
  if (empty) {
    empty.hidden = state !== 'empty';
    if (state === 'empty') empty.textContent = message || MENU_EMPTY_MESSAGE;
  }
  if (content) content.hidden = state !== 'content';
}

/**
 * @param {string} itemId
 * @returns {import('./preorder-cart.js').CartLine|null}
 */
function getCartLineForId(itemId) {
  return preorderCart.getItems().find((line) => line.id === itemId) ?? null;
}

/**
 * @param {import('./restoran-api.js').RestaurantMenuItem} item
 * @returns {import('./preorder-cart.js').CartLine|null}
 */
function getCartLineForItem(item) {
  return getCartLineForId(item.id);
}

function refreshCartUi() {
  renderPreorderSection();
  if (menuCategories.length) {
    renderMenuCategories(menuCategories);
  }
}

function renderPreorderSection() {
  const section = $('reservation-preorder-section');
  const empty = $('reservation-preorder-empty');
  const content = $('reservation-preorder-content');
  const list = $('reservation-preorder-list');
  const totalQty = $('reservation-preorder-total-qty');
  const grandTotal = $('reservation-preorder-grand-total');
  const button = /** @type {HTMLButtonElement|null} */ ($('reservation-preorder-btn'));
  const notice = $('reservation-preorder-notice');

  if (!section) return;

  section.hidden = false;
  const summary = preorderCart.getSummary();
  const isEmpty = summary.lineCount === 0;

  if (empty) empty.hidden = !isEmpty;
  if (content) content.hidden = isEmpty;

  if (isEmpty) {
    if (empty) empty.textContent = PREORDER_EMPTY_MESSAGE;
    if (button) {
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
      button.textContent = 'Ürün seç';
    }
    if (notice) notice.hidden = true;
    return;
  }

  if (list) {
    list.innerHTML = summary.lines
      .map(
        (line) => `
        <li class="restoran-preorder-line">
          <div class="restoran-preorder-line__main">
            <span class="restoran-preorder-line__name">${escapeHtml(line.name)}</span>
            <span class="restoran-preorder-line__qty">× ${line.qty}</span>
          </div>
          <div class="restoran-preorder-line__prices">
            <span class="restoran-preorder-line__unit">${escapeHtml(line.unitPriceLabel || '—')}</span>
            <span class="restoran-preorder-line__subtotal">${escapeHtml(line.lineTotalLabel || '—')}</span>
          </div>
          ${line.note ? `<p class="restoran-preorder-line__note">${escapeHtml(line.note)}</p>` : ''}
        </li>`
      )
      .join('');
  }

  if (totalQty) totalQty.textContent = String(summary.totalQty);
  if (grandTotal) grandTotal.textContent = summary.grandTotalLabel || '—';

  if (button) {
    button.disabled = false;
    button.setAttribute('aria-disabled', 'false');
    button.textContent = 'Ön siparişe devam et (yakında)';
  }

  if (notice) notice.hidden = true;
}

/**
 * @param {import('./restoran-api.js').RestaurantMenuItem} item
 * @returns {string}
 */
function renderMenuItemControls(item) {
  if (!item.available) return '';

  const cartLine = getCartLineForItem(item);
  const qty = cartLine?.qty ?? 0;
  const note = cartLine?.note ?? '';

  const qtyControls =
    qty > 0
      ? `
        <div class="restoran-menu-item__cart" data-menu-item-id="${escapeHtml(item.id)}">
          <div class="restoran-menu-item__qty" role="group" aria-label="${escapeHtml(item.name)} adet">
            <button type="button" class="restoran-menu-item__qty-btn" data-cart-action="decrease" data-item-id="${escapeHtml(item.id)}" aria-label="Adedi azalt">−</button>
            <span class="restoran-menu-item__qty-value" id="menu-qty-${escapeHtml(item.id)}">${qty}</span>
            <button type="button" class="restoran-menu-item__qty-btn" data-cart-action="increase" data-item-id="${escapeHtml(item.id)}" aria-label="Adedi artır">+</button>
          </div>
          <label class="restoran-menu-item__note-label" for="menu-note-${escapeHtml(item.id)}">Ürün notu</label>
          <input
            type="text"
            class="restoran-menu-item__note"
            id="menu-note-${escapeHtml(item.id)}"
            data-cart-action="note"
            data-item-id="${escapeHtml(item.id)}"
            value="${escapeHtml(note)}"
            placeholder="Örn. az pişmiş, sossuz">
        </div>`
      : '';

  const addButton =
    qty > 0
      ? ''
      : `<button type="button" class="btn btn-primary restoran-menu-item__cta" data-cart-action="add" data-item-id="${escapeHtml(item.id)}">Sepete ekle</button>`;

  return `${qtyControls}${addButton}`;
}

function bindMenuCartEvents() {
  const content = $('reservation-menu-content');
  if (!content || content.dataset.cartBound === 'true') return;

  content.dataset.cartBound = 'true';
  content.addEventListener('click', (event) => {
    const target = /** @type {HTMLElement|null} */ (event.target instanceof HTMLElement ? event.target : null);
    const button = target?.closest('[data-cart-action]');
    if (!button || !(button instanceof HTMLElement)) return;

    const action = button.getAttribute('data-cart-action');
    const itemId = button.getAttribute('data-item-id');
    if (!itemId) return;

    const menuItem = findMenuItemById(itemId);
    if (!menuItem) return;

    if (action === 'add') {
      preorderCart.addItem({
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        priceLabel: menuItem.priceLabel,
        currency: menuItem.currency
      });
      refreshCartUi();
      return;
    }

    if (action === 'increase') {
      if (getCartLineForItem(menuItem)) {
        preorderCart.increaseQty(itemId);
      } else {
        preorderCart.addItem({
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          priceLabel: menuItem.priceLabel,
          currency: menuItem.currency
        });
      }
      refreshCartUi();
      return;
    }

    if (action === 'decrease') {
      preorderCart.decreaseQty(itemId);
      refreshCartUi();
    }
  });

  content.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.getAttribute('data-cart-action') !== 'note') return;

    const itemId = target.getAttribute('data-item-id');
    if (!itemId) return;

    if (getCartLineForId(itemId)) {
      preorderCart.updateItemNote(itemId, target.value);
      renderPreorderSection();
    }
  });
}

/**
 * @param {string} itemId
 * @returns {import('./restoran-api.js').RestaurantMenuItem|null}
 */
function findMenuItemById(itemId) {
  for (const category of menuCategories) {
    const item = category.items.find((entry) => entry.id === itemId);
    if (item) return item;
  }
  return null;
}

function bindPreorderButton() {
  const button = $('reservation-preorder-btn');
  button?.addEventListener('click', () => {
    const summary = preorderCart.getSummary();
    if (summary.lineCount === 0) return;

    const notice = $('reservation-preorder-notice');
    if (!notice) return;

    notice.hidden = false;
    notice.className = 'reservation-cta-notice';
    notice.textContent = PREORDER_CONTINUE_MESSAGE;
  });
}

/**
 * @param {import('./restoran-api.js').RestaurantMenuCategory[]} categories
 */
function renderMenuCategories(categories) {
  menuCategories = categories;
  const content = $('reservation-menu-content');
  if (!content) return;

  content.innerHTML = categories
    .map((category) => {
      const categoryDesc = category.description
        ? `<p class="restoran-menu-category__desc">${escapeHtml(category.description)}</p>`
        : '';

      const itemsHtml = category.items
        .map((item) => {
          const metaParts = [];
          if (item.priceLabel) {
            metaParts.push(
              `<span class="restoran-menu-item__price">${escapeHtml(item.priceLabel)}</span>`
            );
          }
          if (item.prepTimeMinutes != null) {
            metaParts.push(
              `<span class="restoran-menu-item__prep">~${item.prepTimeMinutes} dk</span>`
            );
          }

          const allergensHtml = item.allergens.length
            ? `<div class="restoran-menu-item__allergens">${item.allergens
                .map(
                  (allergen) =>
                    `<span class="restoran-menu-item__allergen">${escapeHtml(allergen)}</span>`
                )
                .join('')}</div>`
            : '';

          const unavailableHtml = !item.available
            ? '<p class="restoran-menu-item__unavailable">Şu an mevcut değil</p>'
            : '';

          const descriptionHtml = item.description
            ? `<p class="restoran-menu-item__desc">${escapeHtml(item.description)}</p>`
            : '';

          return `
            <article class="restoran-menu-item${item.available ? '' : ' is-unavailable'}" data-menu-item-id="${escapeHtml(item.id)}">
              <div class="restoran-menu-item__body">
                <h4 class="restoran-menu-item__name">${escapeHtml(item.name)}</h4>
                ${descriptionHtml}
                <div class="restoran-menu-item__meta">${metaParts.join('')}</div>
                ${allergensHtml}
                ${unavailableHtml}
              </div>
              <div class="restoran-menu-item__actions">
                ${renderMenuItemControls(item)}
              </div>
            </article>`;
        })
        .join('');

      return `
        <section class="restoran-menu-category" aria-labelledby="menu-cat-${escapeHtml(category.id)}">
          <h3 id="menu-cat-${escapeHtml(category.id)}" class="restoran-menu-category__title">${escapeHtml(category.name)}</h3>
          ${categoryDesc}
          <div class="restoran-menu-category__items">${itemsHtml}</div>
        </section>`;
    })
    .join('');

  bindMenuCartEvents();
}

/**
 * @param {string} businessId
 */
async function loadMenu(businessId) {
  setMenuState('loading');

  try {
    const payload = await getRestaurantMenu(businessId);
    const categories = normalizeRestaurantMenu(payload);
    const hasItems = categories.some((category) => category.items.length > 0);

    if (!categories.length || !hasItems) {
      setMenuState('empty');
      return;
    }

    renderMenuCategories(categories);
    setMenuState('content');
    renderPreorderSection();
  } catch {
    setMenuState('error');
  }
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
  if (!slot.available || reservationComplete) return;

  selectedSlot = slot;
  currentContext = { ...currentContext, time: slot.time };
  updateContextSummary(currentContext);
  hideCtaNotice();
  updateConfirmButton();
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
    slotsAvailable = currentSlots.some((slot) => slot.available);

    if (!currentSlots.length) {
      selectedSlot = null;
      slotsAvailable = false;
      updateConfirmButton();
      showSlotsMessage('Bu tarih için uygun saat bulunamadı.');
      return;
    }

    const preferred = findPreferredSlot(currentSlots, context.time);
    if (preferred) {
      selectSlot(preferred);
      return;
    }

    selectedSlot = null;
    updateConfirmButton();
    renderSlotButtons();
  } catch {
    currentSlots = [];
    selectedSlot = null;
    slotsAvailable = false;
    updateConfirmButton();
    showSlotsMessage(SLOTS_FALLBACK_MESSAGE);
  }
}

/**
 * @param {import('./restoran-api.js').NormalizedReservationResult} result
 */
function showReservationSuccess(result) {
  reservationComplete = true;

  const success = $('reservation-success');
  const code = $('reservation-success-code');
  const summary = $('reservation-success-summary');
  const calendarLink = /** @type {HTMLAnchorElement|null} */ ($('reservation-calendar-link'));
  const detailLink = /** @type {HTMLAnchorElement|null} */ ($('reservation-detail-link'));
  const contactForm = $('reservation-contact-form');
  const actions = $('reservation-actions');
  const slotsSection = $('reservation-slots-section');
  const button = /** @type {HTMLButtonElement|null} */ ($('reservation-confirm-btn'));

  const date = result.date || resolveSlotDate(currentContext.date);
  const time = result.time || selectedSlot?.time || currentContext.time || '';
  const guests = result.guestCount || currentContext.guests || 2;
  const restaurantName = currentRestaurantName || 'Restoran';

  if (code) code.textContent = result.code;
  if (summary) {
    summary.textContent = `${restaurantName} · ${date} ${time} · ${guests} kişi`;
  }

  if (calendarLink) {
    calendarLink.href = buildGoogleCalendarUrl({
      title: `${restaurantName} rezervasyonu`,
      date,
      time,
      description: `Rezervasyon kodu: ${result.code}`,
      location: currentRestaurantAddress
    });
  }

  if (detailLink) {
    detailLink.href = buildReservationConfirmUrl(result.code);
  }

  if (success) success.hidden = false;
  if (contactForm) contactForm.hidden = true;
  if (slotsSection) slotsSection.hidden = true;
  if (actions) actions.hidden = true;
  if (button) {
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
  }

  hideCtaNotice();
}

/**
 * @param {import('./restoran-api.js').RestaurantDetail} detail
 * @param {import('./restoran-api.js').ReservationContext} context
 */
function renderDetail(detail, context) {
  const title = $('reservation-title');
  const address = $('reservation-address');
  const availability = $('reservation-availability');

  currentRestaurantName = detail.name || 'Restoran rezervasyonu';
  currentRestaurantAddress = detail.address || '';

  if (title) title.textContent = currentRestaurantName;
  if (address) {
    address.textContent = detail.address || 'Adres bilgisi yakında eklenecek';
    address.hidden = false;
  }
  if (availability) availability.textContent = detail.availability || 'Bilgi yok';

  currentContext = { ...context };
  updateContextSummary(currentContext);
  updateConfirmButton();

  document.title = `${currentRestaurantName} | GarsonAI — isteBul`;
  setPageState('ready');
}

function renderFallback(context) {
  const title = $('reservation-title');
  const address = $('reservation-address');
  const availability = $('reservation-availability');
  const contextSummary = $('reservation-context-summary');
  const fallbackText = $('reservation-fallback-text');
  const slotsSection = $('reservation-slots-section');
  const contactForm = $('reservation-contact-form');

  if (title) title.textContent = 'Rezervasyon';
  if (address) address.hidden = true;
  if (availability) availability.textContent = 'Yakında';
  if (contextSummary) contextSummary.textContent = formatContextSummary(context);
  if (fallbackText) fallbackText.textContent = FALLBACK_MESSAGE;
  if (slotsSection) slotsSection.hidden = true;
  if (contactForm) contactForm.hidden = true;

  setMenuState('hidden');
  const preorderSection = $('reservation-preorder-section');
  if (preorderSection) preorderSection.hidden = true;

  const fallbackSummary = $('reservation-context-summary-fallback');
  if (fallbackSummary) fallbackSummary.textContent = formatContextSummary(context);

  setPageState('fallback');
}

function bindContactForm() {
  const form = $('reservation-contact-form');
  form?.addEventListener('input', () => {
    hideCtaNotice();
    updateConfirmButton();
  });
}

async function handleConfirm() {
  if (reservationComplete || isSubmitting) return;

  if (!slotsAvailable) {
    showCtaNotice(SLOTS_UNAVAILABLE_POST_MESSAGE, 'error');
    return;
  }

  if (!selectedSlot) return;

  hideCtaNotice();
  isSubmitting = true;
  updateConfirmButton();

  try {
    const contact = readContactForm();
    const result = await createRestaurantReservation({
      businessId: currentBusinessId,
      date: resolveSlotDate(currentContext.date),
      time: selectedSlot.time,
      slotId: selectedSlot.id,
      guestCount: currentContext.guests,
      customerName: contact.customerName,
      customerPhone: contact.customerPhone,
      note: contact.note,
      foodQuery: currentContext.food,
      searchQuery: currentContext.q
    });

    isSubmitting = false;
    showReservationSuccess(result);
  } catch (error) {
    isSubmitting = false;
    updateConfirmButton();

    const message =
      error instanceof ReservationValidationError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Rezervasyon oluşturulamadı. Lütfen tekrar deneyin.';

    showCtaNotice(message, 'error');
  }
}

function bindConfirmButton() {
  const button = $('reservation-confirm-btn');
  button?.addEventListener('click', handleConfirm);
}

async function boot() {
  document.body.classList.add('ib-ready');
  bindContactForm();
  bindConfirmButton();
  bindPreorderButton();

  const businessId = parseBusinessIdFromLocation(
    window.location.pathname,
    window.location.search
  );
  const context = parseReservationContext(window.location.search);

  if (!businessId) {
    renderFallback(context);
    return;
  }

  currentBusinessId = businessId;

  setPageState('loading');

  try {
    const payload = await getRestaurantDetail(businessId);
    const detail = normalizeRestaurantDetail(payload);
    if (!detail.name) {
      renderFallback(context);
      return;
    }

    renderDetail(detail, context);
  renderPreorderSection();
  await Promise.all([loadSlots(businessId, context), loadMenu(businessId)]);
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
  SLOTS_UNAVAILABLE_POST_MESSAGE,
  MENU_FALLBACK_MESSAGE,
  MENU_EMPTY_MESSAGE,
  PREORDER_CONTINUE_MESSAGE,
  PREORDER_EMPTY_MESSAGE
};
