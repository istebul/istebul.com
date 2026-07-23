import {
  formatPreorderStatusLabel,
  getKitchenQueue,
  normalizeKitchenOrderStatus,
  parseBusinessIdFromLocation,
  updateKitchenOrderStatus
} from './restoran-api.js';
import { bindKitchenOrderRealtime } from './kitchen-realtime-bridge.js';
import { isGarsonSupabaseClientAvailable, getGarsonDataClient } from './data-service.js';

const FALLBACK_MESSAGE = 'Canlı mutfak ekranı yakında aktif olacak.';
const MISSING_BUSINESS_MESSAGE = 'Restoran kimliği gerekli. URL\'ye ?businessId= ekleyin.';
const EMPTY_QUEUE_MESSAGE = 'Şu anda bekleyen sipariş yok.';

/** @type {'new'|'preparing'|'ready'} */
export const KITCHEN_COLUMNS = ['new', 'preparing', 'ready'];

/** @type {Record<'new'|'preparing'|'ready', string>} */
export const KITCHEN_COLUMN_LABELS = {
  new: 'Yeni Siparişler',
  preparing: 'Hazırlanıyor',
  ready: 'Hazır'
};

/**
 * @param {string} [status]
 * @returns {'new'|'preparing'|'ready'|null}
 */
export function mapKitchenOrderColumn(status) {
  const key = normalizeKitchenOrderStatus(status);
  if (key === 'submitted' || key === 'scheduled') return 'new';
  if (key === 'preparing') return 'preparing';
  if (key === 'ready') return 'ready';
  return null;
}

/**
 * @param {import('./restoran-api.js').NormalizedKitchenOrder[]} orders
 * @returns {Record<'new'|'preparing'|'ready', import('./restoran-api.js').NormalizedKitchenOrder[]>}
 */
export function groupKitchenOrdersByColumn(orders = []) {
  /** @type {Record<'new'|'preparing'|'ready', import('./restoran-api.js').NormalizedKitchenOrder[]>} */
  const grouped = {
    new: [],
    preparing: [],
    ready: []
  };

  for (const order of orders) {
    const column = mapKitchenOrderColumn(order.status);
    if (column) grouped[column].push(order);
  }

  return grouped;
}

/**
 * @param {number|null|undefined} etaMinutes
 * @returns {string}
 */
export function formatKitchenEtaMessage(etaMinutes) {
  if (etaMinutes == null || !Number.isFinite(etaMinutes)) return '';
  return `ETA: ${etaMinutes} dk`;
}

/**
 * @param {string} status
 * @returns {{ label: string, nextStatus: string }|null}
 */
export function getKitchenOrderAction(status) {
  const key = normalizeKitchenOrderStatus(status);
  if (key === 'submitted' || key === 'scheduled') {
    return { label: 'Hazırlamaya Başla', nextStatus: 'preparing' };
  }
  if (key === 'preparing') {
    return { label: 'Hazır', nextStatus: 'ready' };
  }
  if (key === 'ready') {
    return { label: 'Servis Edildi', nextStatus: 'served' };
  }
  return null;
}

/**
 * @param {import('./restoran-api.js').NormalizedKitchenOrder} order
 * @returns {string}
 */
export function renderKitchenOrderCardHtml(order) {
  const action = getKitchenOrderAction(order.status);
  const customer = order.customerName || 'Müşteri';
  const time = order.arrivalTime || '—';
  const table = order.tableName ? ` · ${order.tableName}` : '';
  const eta = formatKitchenEtaMessage(order.etaMinutes);

  const itemsHtml = order.items.length
    ? order.items
        .map((item) => {
          const qty = item.quantity > 1 ? `${item.quantity}× ` : '';
          const note = item.note ? `<span class="kds-admin-card__note">${item.note}</span>` : '';
          return `<li>${qty}${item.name}${note}</li>`;
        })
        .join('')
    : '<li>Ürün bilgisi yok</li>';

  const actionHtml = action
    ? `<button type="button" class="vacation-btn vacation-btn--primary kds-admin-card__action" data-order-id="${order.id}" data-next-status="${action.nextStatus}">${action.label}</button>`
    : '';

  return `
    <article class="kds-admin-card" data-order-id="${order.id}">
      <header class="kds-admin-card__header">
        <h3 class="kds-admin-card__customer">${customer}${table}</h3>
        <p class="kds-admin-card__time">${time}</p>
      </header>
      <ul class="kds-admin-card__items">${itemsHtml}</ul>
      ${eta ? `<p class="kds-admin-card__eta">${eta}</p>` : ''}
      <p class="kds-admin-card__status">${formatPreorderStatusLabel(order.status)}</p>
      ${actionHtml}
    </article>
  `.trim();
}

/**
 * @param {string} [search]
 * @returns {string}
 */
export function parseKitchenBusinessId(search = '') {
  return parseBusinessIdFromLocation('/garson/mutfak/', search.startsWith('?') ? search : `?${search}`);
}

/** @type {string} */
let currentBusinessId = '';

/** @type {boolean} */
let isLoading = false;

/** @type {boolean} */
let isUpdating = false;

/** @type {import('./kitchen-realtime-bridge.js').KitchenRealtimeBinding|null} */
let kitchenRealtimeBinding = null;

/**
 * @param {string} id
 * @returns {HTMLElement|null}
 */
function $(id) {
  return document.getElementById(id);
}

/**
 * @param {'loading'|'ready'|'fallback'|'missing'} state
 * @param {string} [message]
 */
function setPageState(state, message = '') {
  const status = $('kds-admin-status');
  const board = $('kds-admin-board');
  const fallback = $('kds-admin-fallback');
  const missing = $('kds-admin-missing');

  if (status) {
    status.hidden = state !== 'loading';
    status.textContent = message || 'Mutfak kuyruğu yükleniyor…';
  }
  if (board) board.hidden = state !== 'ready';
  if (fallback) {
    fallback.hidden = state !== 'fallback';
    const text = $('kds-admin-fallback-text');
    if (text) text.textContent = message || FALLBACK_MESSAGE;
  }
  if (missing) {
    missing.hidden = state !== 'missing';
    const text = $('kds-admin-missing-text');
    if (text) text.textContent = message || MISSING_BUSINESS_MESSAGE;
  }
}

/**
 * @param {import('./restoran-api.js').NormalizedKitchenOrder[]} orders
 */
function renderBoard(orders) {
  const grouped = groupKitchenOrdersByColumn(orders);

  for (const column of KITCHEN_COLUMNS) {
    const list = $(`kds-admin-column-${column}`);
    const empty = $(`kds-admin-column-${column}-empty`);
    const columnOrders = grouped[column];

    if (!list) continue;

    if (!columnOrders.length) {
      list.innerHTML = '';
      if (empty) empty.hidden = false;
      continue;
    }

    if (empty) empty.hidden = true;
    list.innerHTML = columnOrders.map((order) => renderKitchenOrderCardHtml(order)).join('');
  }

  const globalEmpty = $('kds-admin-empty');
  if (globalEmpty) {
    const hasOrders = KITCHEN_COLUMNS.some((column) => grouped[column].length > 0);
    globalEmpty.hidden = hasOrders;
    if (!hasOrders) globalEmpty.textContent = EMPTY_QUEUE_MESSAGE;
  }
}

async function loadKitchenQueue() {
  if (!currentBusinessId || isLoading) return;

  isLoading = true;
  setPageState('loading');
  const refreshBtn = /** @type {HTMLButtonElement|null} */ ($('kds-admin-refresh'));
  if (refreshBtn) refreshBtn.disabled = true;

  try {
    const queue = await getKitchenQueue(currentBusinessId);
    renderBoard(queue.orders);
    setPageState('ready');
  } catch {
    renderBoard([]);
    setPageState('fallback', FALLBACK_MESSAGE);
  } finally {
    isLoading = false;
    if (refreshBtn) refreshBtn.disabled = false;
  }
}

/**
 * @param {string} orderId
 * @param {string} nextStatus
 */
async function handleStatusUpdate(orderId, nextStatus) {
  if (!orderId || !nextStatus || isUpdating) return;

  isUpdating = true;
  const buttons = document.querySelectorAll('.kds-admin-card__action');
  buttons.forEach((button) => {
    if (button instanceof HTMLButtonElement) button.disabled = true;
  });

  try {
    await updateKitchenOrderStatus(orderId, nextStatus);
    await loadKitchenQueue();
  } catch {
    setPageState('fallback', FALLBACK_MESSAGE);
  } finally {
    isUpdating = false;
    buttons.forEach((button) => {
      if (button instanceof HTMLButtonElement) button.disabled = false;
    });
  }
}

function bindEvents() {
  const refreshBtn = $('kds-admin-refresh');
  refreshBtn?.addEventListener('click', () => {
    void loadKitchenQueue();
  });

  const board = $('kds-admin-board');
  board?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest('.kds-admin-card__action');
    if (!(button instanceof HTMLButtonElement)) return;

    const orderId = button.dataset.orderId || '';
    const nextStatus = button.dataset.nextStatus || '';
    void handleStatusUpdate(orderId, nextStatus);
  });
}

async function boot() {
  document.body.classList.add('ib-ready');

  currentBusinessId = parseKitchenBusinessId(window.location.search);
  if (!currentBusinessId) {
    setPageState('missing');
    return;
  }

  bindEvents();
  await loadKitchenQueue();

  const client = getGarsonDataClient();
  if (isGarsonSupabaseClientAvailable(client)) {
    try {
      kitchenRealtimeBinding = await bindKitchenOrderRealtime({
        slug: currentBusinessId,
        client,
        onRefresh: loadKitchenQueue
      });
    } catch {
      kitchenRealtimeBinding = null;
    }
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      void boot();
    });
  } else {
    void boot();
  }
}
