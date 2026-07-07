/**
 * GarsonAI public restaurant search API client (isteBul API gateway).
 */

const DEFAULT_GARSONAI_API_URL = 'https://api.istebul.com';
const ENV_KEYS = ['GARSONAI_API_URL', 'VITE_GARSONAI_API_URL'];

/**
 * @typedef {Object} ReservationContext
 * @property {string} [q]
 * @property {string} [food]
 * @property {string} [date]
 * @property {string} [time]
 * @property {number} [guests]
 */

/**
 * @typedef {Object} RestaurantDetail
 * @property {string} businessId
 * @property {string} name
 * @property {string} address
 * @property {string} availability
 */

/**
 * @returns {string}
 */
export function getGarsonAiApiUrl() {
  const env = typeof window !== 'undefined' ? window.__env || {} : {};
  for (const key of ENV_KEYS) {
    const raw = env[key];
    if (raw != null && String(raw).trim() !== '') {
      return String(raw).trim().replace(/\/$/, '');
    }
  }
  return DEFAULT_GARSONAI_API_URL;
}

/**
 * @returns {string}
 */
export function getReservationBaseOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://www.istebul.com';
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function formatAvailability(value) {
  if (value == null || value === '') return 'Bilgi yok';
  if (typeof value === 'boolean') return value ? 'Müsait masa var' : 'Müsait masa yok';
  if (typeof value === 'number') return value > 0 ? `${value} masa müsait` : 'Müsait masa yok';
  if (typeof value === 'object' && value !== null) {
    const obj = /** @type {Record<string, unknown>} */ (value);
    if (obj.available === true || obj.has_availability === true) return 'Müsait masa var';
    if (obj.available === false || obj.has_availability === false) return 'Müsait masa yok';
    if (obj.status != null) return String(obj.status);
    if (obj.message != null) return String(obj.message);
    if (obj.count != null) return `${obj.count} masa müsait`;
  }
  return String(value);
}

/**
 * @param {unknown} data
 * @returns {Array<{ businessId: string, name: string, products: string[], availability: string }>}
 */
export function normalizeSearchResults(data) {
  const root = /** @type {Record<string, unknown>} */ (
    data && typeof data === 'object' ? data : {}
  );
  const raw =
    root.restaurants ??
    root.results ??
    root.data ??
    (Array.isArray(data) ? data : []);

  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const row = /** @type {Record<string, unknown>} */ (
        item && typeof item === 'object' ? item : {}
      );
      const businessId = String(
        row.business_id ?? row.businessId ?? row.id ?? ''
      ).trim();
      const name = String(row.name ?? row.restaurant_name ?? 'Restoran').trim();
      const productSource =
        row.matching_products ?? row.products ?? row.menu_matches ?? [];
      const products = Array.isArray(productSource)
        ? productSource.map((p) => {
            if (typeof p === 'string') return p;
            if (p && typeof p === 'object') {
              const prod = /** @type {Record<string, unknown>} */ (p);
              return String(prod.name ?? prod.title ?? prod.product_name ?? '');
            }
            return '';
          }).filter(Boolean)
        : [];
      const availability = formatAvailability(
        row.table_availability ?? row.availability ?? row.available_tables
      );
      return { businessId, name, products, availability };
    })
    .filter((item) => item.name);
}

/**
 * @param {unknown} data
 * @returns {RestaurantDetail}
 */
export function normalizeRestaurantDetail(data) {
  const root = /** @type {Record<string, unknown>} */ (
    data && typeof data === 'object' ? data : {}
  );
  const nested =
    root.restaurant && typeof root.restaurant === 'object'
      ? root.restaurant
      : root.data && typeof root.data === 'object'
        ? root.data
        : root;
  const row = /** @type {Record<string, unknown>} */ (nested);
  const businessId = String(row.business_id ?? row.businessId ?? row.id ?? '').trim();
  const name = String(row.name ?? row.restaurant_name ?? 'Restoran').trim();
  const address = String(
    row.address ?? row.location ?? row.address_line ?? row.city ?? ''
  ).trim();
  const availability = formatAvailability(
    row.table_availability ?? row.availability ?? row.available_tables
  );
  return { businessId, name, address, availability };
}

/**
 * @param {string} pathname
 * @param {string} [search]
 * @returns {string}
 */
export function parseBusinessIdFromLocation(pathname = '', search = '') {
  const query = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  const fromQuery = params.get('id') ?? params.get('businessId') ?? params.get('business_id');
  if (fromQuery) return String(fromQuery).trim();

  const parts = String(pathname || '')
    .replace(/\/$/, '')
    .split('/')
    .filter(Boolean);
  const rIndex = parts.indexOf('r');
  if (rIndex === -1) return '';

  const segment = parts[rIndex + 1];
  if (!segment || segment === 'index.html') return '';

  try {
    return decodeURIComponent(segment).trim();
  } catch {
    return segment.trim();
  }
}

/**
 * @param {string|URLSearchParams} input
 * @returns {ReservationContext}
 */
export function parseReservationContext(input = '') {
  const params =
    input instanceof URLSearchParams
      ? input
      : new URLSearchParams(String(input).startsWith('?') ? String(input).slice(1) : String(input));

  /** @type {ReservationContext} */
  const context = {};
  const q = params.get('q');
  const food = params.get('food');
  const date = params.get('date');
  const time = params.get('time');
  const guestsRaw = params.get('guests') ?? params.get('guest_count');

  if (q) context.q = q;
  if (food) context.food = food;
  if (date) context.date = date;
  if (time) context.time = time;
  if (guestsRaw != null && guestsRaw !== '') {
    const guests = Number.parseInt(guestsRaw, 10);
    if (Number.isFinite(guests) && guests > 0) context.guests = guests;
  }

  return context;
}

/**
 * @param {ReservationContext} [context]
 * @returns {string}
 */
export function buildReservationQuery(context = {}) {
  const params = new URLSearchParams();
  if (context.q) params.set('q', context.q);
  if (context.food) params.set('food', context.food);
  if (context.date) params.set('date', context.date);
  if (context.time) params.set('time', context.time);
  if (context.guests != null && context.guests > 0) {
    params.set('guests', String(context.guests));
  }
  return params.toString();
}

/**
 * @param {string} businessId
 * @param {ReservationContext} [context]
 * @param {string} [origin]
 * @returns {string}
 */
export function buildReservationUrl(businessId, context = {}, origin = getReservationBaseOrigin()) {
  const id = String(businessId || '').trim();
  const query = buildReservationQuery(context);
  const querySuffix = query ? `?${query}` : '';
  const base = String(origin || getReservationBaseOrigin()).replace(/\/$/, '');

  if (!id) {
    return `${base}/r/${querySuffix}`;
  }

  return `${base}/r/${encodeURIComponent(id)}${querySuffix}`;
}

/**
 * @typedef {Object} RestaurantSlot
 * @property {string} id
 * @property {string} time
 * @property {string} label
 * @property {boolean} available
 * @property {number|null} capacityLeft
 * @property {unknown} raw
 */

/**
 * @param {unknown} value
 * @param {number} [fallback]
 * @returns {number}
 */
export function normalizeGuestCount(value, fallback = 2) {
  const num = Number.parseInt(String(value ?? ''), 10);
  if (Number.isFinite(num) && num > 0) return num;
  return fallback;
}

/**
 * @param {string} [date]
 * @returns {string}
 */
export function resolveSlotDate(date) {
  const trimmed = String(date || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function normalizeSlotTime(value) {
  if (value == null || value === '') return '';
  const str = String(value).trim();
  const timeMatch = str.match(/(\d{2}:\d{2})/);
  if (timeMatch) return timeMatch[1];
  return str;
}

/**
 * @param {unknown} item
 * @param {number} index
 * @returns {RestaurantSlot|null}
 */
function normalizeSingleSlot(item, index) {
  if (item == null) return null;

  if (typeof item === 'string') {
    const time = normalizeSlotTime(item);
    if (!time) return null;
    return {
      id: time,
      time,
      label: time,
      available: true,
      capacityLeft: null,
      raw: item
    };
  }

  if (typeof item !== 'object') return null;

  const row = /** @type {Record<string, unknown>} */ (item);
  const time = normalizeSlotTime(
    row.time ?? row.start_time ?? row.startTime ?? row.slot_time ?? row.label
  );
  const id = String(row.id ?? row.slot_id ?? row.slotId ?? time ?? `slot-${index}`).trim();
  if (!time && !id) return null;

  const availableRaw = row.available ?? row.is_available ?? row.open;
  let available = true;
  if (availableRaw === false || availableRaw === 0) available = false;
  if (row.status === 'unavailable' || row.status === 'closed') available = false;

  const capacityRaw = row.capacity_left ?? row.capacityLeft ?? row.remaining ?? row.tables_left;
  const capacityNum = Number(capacityRaw);
  const capacityLeft =
    capacityRaw != null && capacityRaw !== '' && Number.isFinite(capacityNum)
      ? capacityNum
      : null;

  const label = String(row.label ?? row.display ?? time ?? id).trim();

  return {
    id,
    time: time || id,
    label,
    available,
    capacityLeft,
    raw: item
  };
}

/**
 * @param {unknown} payload
 * @returns {RestaurantSlot[]}
 */
export function normalizeRestaurantSlots(payload) {
  let raw = [];

  if (Array.isArray(payload)) {
    raw = payload;
  } else if (payload && typeof payload === 'object') {
    const root = /** @type {Record<string, unknown>} */ (payload);
    if (Array.isArray(root.slots)) {
      raw = root.slots;
    } else if (root.data && typeof root.data === 'object') {
      const data = /** @type {Record<string, unknown>} */ (root.data);
      if (Array.isArray(data.slots)) raw = data.slots;
      else if (Array.isArray(data)) raw = data;
    }
  }

  return raw
    .map((item, index) => normalizeSingleSlot(item, index))
    .filter((slot) => slot != null);
}

/**
 * @param {string} id
 * @param {{ date?: string, guestCount?: number }} params
 * @returns {string}
 */
export function buildRestaurantSlotsUrl(id, { date, guestCount } = {}) {
  const trimmed = String(id || '').trim();
  const params = new URLSearchParams();
  params.set('date', resolveSlotDate(date));
  params.set('guest_count', String(normalizeGuestCount(guestCount)));
  return `${getGarsonAiApiUrl()}/public/restaurants/${encodeURIComponent(trimmed)}/slots?${params.toString()}`;
}

/**
 * @param {string} id
 * @param {{ date?: string, guestCount?: number }} [params]
 * @returns {Promise<unknown>}
 */
export async function getRestaurantSlots(id, { date, guestCount } = {}) {
  const trimmed = String(id || '').trim();
  if (!trimmed) {
    throw new Error('Restoran kimliği gerekli');
  }

  const url = buildRestaurantSlotsUrl(trimmed, { date, guestCount });
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Müsait saatler alınamadı (${response.status})`);
  }

  return response.json();
}

/**
 * @param {string} id
 * @returns {string}
 */
export function buildRestaurantDetailUrl(id) {
  const trimmed = String(id || '').trim();
  return `${getGarsonAiApiUrl()}/public/restaurants/${encodeURIComponent(trimmed)}`;
}

/**
 * @param {{ q?: string, guestCount?: number, date?: string }} params
 * @returns {Promise<unknown>}
 */
export async function searchRestaurants({ q, guestCount, date }) {
  const base = getGarsonAiApiUrl();

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (guestCount != null && guestCount > 0) {
    params.set('guest_count', String(guestCount));
  }
  if (date) params.set('date', date);

  const url = `${base}/public/restaurants/search?${params.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Restoran araması başarısız (${response.status})`);
  }

  return response.json();
}

/**
 * @param {string} id
 * @returns {Promise<unknown>}
 */
export async function getRestaurantDetail(id) {
  const trimmed = String(id || '').trim();
  if (!trimmed) {
    throw new Error('Restoran kimliği gerekli');
  }

  const url = buildRestaurantDetailUrl(trimmed);
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Restoran bilgisi alınamadı (${response.status})`);
  }

  return response.json();
}
