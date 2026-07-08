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
  if (!segment || segment === 'index.html' || segment === 'onay') return '';

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

/**
 * @typedef {Object} RestaurantMenuItem
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {number|null} price
 * @property {string} priceLabel
 * @property {string} currency
 * @property {boolean} available
 * @property {number|null} prepTimeMinutes
 * @property {string[]} allergens
 * @property {string} imageUrl
 * @property {unknown} raw
 */

/**
 * @typedef {Object} RestaurantMenuCategory
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {RestaurantMenuItem[]} items
 * @property {unknown} raw
 */

/**
 * @param {number} price
 * @param {string} [currency]
 * @returns {string}
 */
function formatMenuPriceLabel(price, currency = 'TRY') {
  const formatted = Number.isInteger(price) ? String(price) : String(price);
  const symbol = currency === 'TRY' ? 'TL' : currency;
  return `${formatted} ${symbol}`;
}

/**
 * @param {unknown} item
 * @param {number} index
 * @returns {RestaurantMenuItem|null}
 */
function normalizeMenuItem(item, index) {
  if (!item || typeof item !== 'object') return null;

  const row = /** @type {Record<string, unknown>} */ (item);
  const id = String(row.id ?? row.item_id ?? row.itemId ?? `item-${index}`).trim();
  const name = String(row.name ?? row.title ?? row.product_name ?? '').trim();
  if (!name) return null;

  const description = String(row.description ?? row.desc ?? '').trim();

  let price = null;
  const priceRaw = row.price ?? row.unit_price ?? row.unitPrice;
  if (priceRaw != null && priceRaw !== '') {
    const num = Number(priceRaw);
    if (Number.isFinite(num)) price = num;
  }

  const currency = String(row.currency ?? row.currency_code ?? 'TRY').trim() || 'TRY';

  let priceLabel = String(row.price_label ?? row.priceLabel ?? '').trim();
  if (!priceLabel && price != null) {
    priceLabel = formatMenuPriceLabel(price, currency);
  }

  const availableRaw = row.available ?? row.is_available ?? row.in_stock;
  let available = true;
  if (availableRaw === false || availableRaw === 0 || row.status === 'unavailable') {
    available = false;
  }

  let prepTimeMinutes = null;
  const prepRaw = row.prep_time_minutes ?? row.prepTimeMinutes ?? row.prep_time;
  if (prepRaw != null && prepRaw !== '') {
    const num = Number(prepRaw);
    if (Number.isFinite(num) && num >= 0) prepTimeMinutes = num;
  }

  const allergenSource = row.allergens ?? row.allergen_tags ?? row.allergenTags ?? [];
  const allergens = Array.isArray(allergenSource)
    ? allergenSource.map((entry) => String(entry).trim()).filter(Boolean)
    : typeof allergenSource === 'string'
      ? allergenSource.split(/[,;]/).map((entry) => entry.trim()).filter(Boolean)
      : [];

  const imageUrl = String(row.image_url ?? row.imageUrl ?? row.image ?? '').trim();

  return {
    id,
    name,
    description,
    price,
    priceLabel,
    currency,
    available,
    prepTimeMinutes,
    allergens,
    imageUrl,
    raw: item
  };
}

/**
 * @param {unknown} category
 * @param {number} index
 * @returns {RestaurantMenuCategory|null}
 */
function normalizeMenuCategory(category, index) {
  if (!category || typeof category !== 'object') return null;

  const row = /** @type {Record<string, unknown>} */ (category);
  const id = String(row.id ?? row.category_id ?? row.categoryId ?? `cat-${index}`).trim();
  const name = String(row.name ?? row.title ?? row.category_name ?? '').trim();
  if (!name) return null;

  const description = String(row.description ?? row.desc ?? '').trim();
  const itemSource = row.items ?? row.products ?? row.menu_items ?? row.menuItems ?? [];
  const items = Array.isArray(itemSource)
    ? itemSource
        .map((entry, itemIndex) => normalizeMenuItem(entry, itemIndex))
        .filter((entry) => entry != null)
    : [];

  return {
    id,
    name,
    description,
    items,
    raw: category
  };
}

/**
 * @param {unknown} payload
 * @returns {RestaurantMenuCategory[]}
 */
export function normalizeRestaurantMenu(payload) {
  let rawCategories = [];

  if (Array.isArray(payload)) {
    rawCategories = payload;
  } else if (payload && typeof payload === 'object') {
    const root = /** @type {Record<string, unknown>} */ (payload);
    if (Array.isArray(root.categories)) {
      rawCategories = root.categories;
    } else if (root.menu && typeof root.menu === 'object') {
      const menu = /** @type {Record<string, unknown>} */ (root.menu);
      if (Array.isArray(menu.categories)) rawCategories = menu.categories;
    } else if (root.data && typeof root.data === 'object') {
      const data = /** @type {Record<string, unknown>} */ (root.data);
      if (Array.isArray(data.categories)) rawCategories = data.categories;
    }
  }

  return rawCategories
    .map((entry, index) => normalizeMenuCategory(entry, index))
    .filter((entry) => entry != null);
}

/**
 * @param {string} id
 * @returns {string}
 */
export function buildRestaurantMenuUrl(id) {
  const trimmed = String(id || '').trim();
  return `${getGarsonAiApiUrl()}/public/restaurants/${encodeURIComponent(trimmed)}/menu`;
}

/**
 * @param {string} id
 * @returns {Promise<unknown>}
 */
export async function getRestaurantMenu(id) {
  const trimmed = String(id || '').trim();
  if (!trimmed) {
    throw new Error('Restoran kimliği gerekli');
  }

  const url = buildRestaurantMenuUrl(trimmed);
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Menü bilgisi alınamadı (${response.status})`);
  }

  return response.json();
}

/**
 * @typedef {Object} ReservationCreateInput
 * @property {string} [businessId]
 * @property {string} [date]
 * @property {string} [time]
 * @property {number} [guestCount]
 * @property {string} [slotId]
 * @property {string} [customerName]
 * @property {string} [customerPhone]
 * @property {string} [note]
 * @property {string} [foodQuery]
 * @property {string} [searchQuery]
 */

/**
 * @typedef {Object} NormalizedReservationPayload
 * @property {string} businessId
 * @property {string} date
 * @property {string} time
 * @property {number} guestCount
 * @property {string} slotId
 * @property {string} customerName
 * @property {string} customerPhone
 * @property {string} [note]
 * @property {string} [foodQuery]
 * @property {string} [searchQuery]
 */

/**
 * @typedef {Object} NormalizedReservationResult
 * @property {string} id
 * @property {string} code
 * @property {string} status
 * @property {string} businessId
 * @property {string} businessName
 * @property {string} date
 * @property {string} time
 * @property {number} guestCount
 * @property {string} customerName
 * @property {string} customerPhone
 * @property {string} note
 * @property {unknown} raw
 */

export class ReservationValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ReservationValidationError';
  }
}

const MAX_GUEST_COUNT = 20;

/**
 * @param {ReservationCreateInput} input
 * @returns {NormalizedReservationPayload}
 */
export function normalizeReservationPayload(input = {}) {
  const row = /** @type {Record<string, unknown>} */ (
    input && typeof input === 'object' ? input : {}
  );

  const businessId = String(row.businessId ?? row.business_id ?? '').trim();
  const date = resolveSlotDate(String(row.date ?? '').trim());
  const time = normalizeSlotTime(row.time);
  const slotId = String(row.slotId ?? row.slot_id ?? '').trim();
  const customerName = String(row.customerName ?? row.customer_name ?? '').trim();
  const customerPhone = String(row.customerPhone ?? row.customer_phone ?? '').trim();
  const note = row.note != null ? String(row.note).trim() : '';
  const foodQuery = String(row.foodQuery ?? row.food ?? '').trim();
  const searchQuery = String(row.searchQuery ?? row.q ?? '').trim();

  const guestRaw = Number.parseInt(String(row.guestCount ?? row.guest_count ?? ''), 10);
  let guestCount = Number.isFinite(guestRaw) && guestRaw > 0 ? guestRaw : 0;
  if (guestCount > MAX_GUEST_COUNT) guestCount = MAX_GUEST_COUNT;

  if (!businessId) throw new ReservationValidationError('Restoran seçimi gerekli');
  if (!date) throw new ReservationValidationError('Rezervasyon tarihi gerekli');
  if (!time && !slotId) throw new ReservationValidationError('Saat seçimi gerekli');
  if (guestCount < 1) throw new ReservationValidationError('Kişi sayısı en az 1 olmalı');
  if (!customerName) throw new ReservationValidationError('Ad soyad gerekli');
  if (!customerPhone) throw new ReservationValidationError('Telefon gerekli');

  return {
    businessId,
    date,
    time,
    guestCount,
    slotId: slotId || time,
    customerName,
    customerPhone,
    note: note || undefined,
    foodQuery: foodQuery || undefined,
    searchQuery: searchQuery || undefined
  };
}

/**
 * @param {NormalizedReservationPayload} payload
 * @returns {Record<string, unknown>}
 */
export function buildReservationApiBody(payload) {
  /** @type {Record<string, unknown>} */
  const body = {
    business_id: payload.businessId,
    date: payload.date,
    guest_count: payload.guestCount,
    customer_name: payload.customerName,
    customer_phone: payload.customerPhone
  };

  if (payload.time) body.time = payload.time;
  if (payload.slotId) body.slot_id = payload.slotId;
  if (payload.note) body.note = payload.note;
  if (payload.foodQuery) body.food_query = payload.foodQuery;
  if (payload.searchQuery) body.search_query = payload.searchQuery;

  return body;
}

/**
 * @param {unknown} payload
 * @returns {NormalizedReservationResult}
 */
export function normalizeReservationResponse(payload) {
  let row = payload;

  if (payload && typeof payload === 'object') {
    const root = /** @type {Record<string, unknown>} */ (payload);
    if (root.reservation && typeof root.reservation === 'object') {
      row = root.reservation;
    } else if (root.data && typeof root.data === 'object') {
      const data = /** @type {Record<string, unknown>} */ (root.data);
      row =
        data.reservation && typeof data.reservation === 'object'
          ? data.reservation
          : data;
    }
  }

  const record = /** @type {Record<string, unknown>} */ (
    row && typeof row === 'object' ? row : {}
  );

  const id = String(record.id ?? record.reservation_id ?? '').trim();
  const code =
    String(
      record.code ?? record.reservation_code ?? record.confirmation_code ?? ''
    ).trim() || (id ? `RES-${id}` : 'RES-PENDING');
  const status = String(record.status ?? 'pending').trim() || 'pending';
  const businessId = String(record.business_id ?? record.businessId ?? '').trim();
  const businessName = String(
    record.business_name ?? record.businessName ?? record.restaurant_name ?? ''
  ).trim();
  const date = String(record.date ?? '').trim();
  const time = normalizeSlotTime(record.time ?? record.slot_time);
  const guestCount = normalizeGuestCount(record.guest_count ?? record.guestCount, 1);
  const customerName = String(record.customer_name ?? record.customerName ?? '').trim();
  const customerPhone = String(record.customer_phone ?? record.customerPhone ?? '').trim();
  const note = record.note != null ? String(record.note).trim() : '';

  return {
    id,
    code,
    status,
    businessId,
    businessName,
    date,
    time,
    guestCount,
    customerName,
    customerPhone,
    note,
    raw: payload
  };
}

/**
 * @param {string} [status]
 * @returns {string}
 */
export function formatReservationStatusLabel(status) {
  const key = String(status || 'pending').trim().toLowerCase();
  const labels = {
    pending: 'Beklemede',
    confirmed: 'Onaylandı',
    cancelled: 'İptal edildi',
    completed: 'Tamamlandı'
  };
  return labels[key] || String(status || 'Beklemede');
}

/**
 * @param {string} [search]
 * @returns {string}
 */
export function parseReservationCodeFromSearch(search = '') {
  const query = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  return String(params.get('code') ?? '').trim();
}

/**
 * @param {string} code
 * @returns {string}
 */
export function buildRestaurantReservationLookupUrl(code) {
  const trimmed = String(code || '').trim();
  return `${getGarsonAiApiUrl()}/public/reservations/${encodeURIComponent(trimmed)}`;
}

/**
 * @param {string} code
 * @param {string} [origin]
 * @returns {string}
 */
export function buildReservationConfirmUrl(code, origin = getReservationBaseOrigin()) {
  const trimmed = String(code || '').trim();
  const base = String(origin || getReservationBaseOrigin()).replace(/\/$/, '');
  if (!trimmed) return `${base}/r/onay/`;
  return `${base}/r/onay?code=${encodeURIComponent(trimmed)}`;
}

/**
 * @param {string} code
 * @returns {Promise<NormalizedReservationResult>}
 */
export async function getRestaurantReservation(code) {
  const trimmed = String(code || '').trim();
  if (!trimmed) {
    throw new Error('Rezervasyon kodu gerekli');
  }

  const url = buildRestaurantReservationLookupUrl(trimmed);
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Rezervasyon bilgisi alınamadı (${response.status})`);
  }

  const json = await response.json();
  return normalizeReservationResponse(json);
}

/**
 * @returns {string}
 */
export function buildReservationsApiUrl() {
  return `${getGarsonAiApiUrl()}/public/reservations`;
}

/**
 * @param {ReservationCreateInput} input
 * @returns {Promise<NormalizedReservationResult>}
 */
export async function createRestaurantReservation(input) {
  const payload = normalizeReservationPayload(input);
  const body = buildReservationApiBody(payload);
  const url = buildReservationsApiUrl();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Rezervasyon oluşturulamadı (${response.status})`);
  }

  const json = await response.json();
  return normalizeReservationResponse(json);
}

/**
 * @typedef {Object} PreorderItemInput
 * @property {string} [menuItemId]
 * @property {string} [menu_item_id]
 * @property {number} [qty]
 * @property {string} [note]
 */

/**
 * @typedef {Object} PreorderCreateInput
 * @property {string} [reservationId]
 * @property {string} [reservation_id]
 * @property {PreorderItemInput[]} [items]
 */

/**
 * @typedef {Object} NormalizedPreorderItem
 * @property {string} menuItemId
 * @property {number} qty
 * @property {string} [note]
 */

/**
 * @typedef {Object} NormalizedPreorderPayload
 * @property {string} reservationId
 * @property {NormalizedPreorderItem[]} items
 */

/**
 * @typedef {Object} NormalizedPreorderResult
 * @property {string} preorderId
 * @property {string} reservationId
 * @property {string} status
 * @property {number} itemCount
 * @property {number|null} totalAmount
 * @property {string} currency
 * @property {number|null} etaMinutes
 * @property {string} createdAt
 * @property {unknown} raw
 */

export class PreorderValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PreorderValidationError';
  }
}

/**
 * @param {unknown} item
 * @param {number} index
 * @returns {NormalizedPreorderItem}
 */
function normalizePreorderItem(item, index) {
  const row = /** @type {Record<string, unknown>} */ (
    item && typeof item === 'object' ? item : {}
  );
  const menuItemId = String(row.menuItemId ?? row.menu_item_id ?? row.id ?? '').trim();
  const qtyRaw = Number.parseInt(String(row.qty ?? ''), 10);
  const qty = Number.isFinite(qtyRaw) ? qtyRaw : 0;
  const note = row.note != null ? String(row.note).trim() : '';

  if (!menuItemId) {
    throw new PreorderValidationError(`Ürün kimliği gerekli (sıra ${index + 1})`);
  }
  if (qty < 1) {
    throw new PreorderValidationError(`Ürün adedi en az 1 olmalı (sıra ${index + 1})`);
  }

  return {
    menuItemId,
    qty,
    note: note || undefined
  };
}

/**
 * @param {PreorderCreateInput} input
 * @returns {NormalizedPreorderPayload}
 */
export function normalizePreorderPayload(input = {}) {
  const row = /** @type {Record<string, unknown>} */ (
    input && typeof input === 'object' ? input : {}
  );
  const reservationId = String(row.reservationId ?? row.reservation_id ?? '').trim();
  const rawItems = row.items;

  if (!reservationId) {
    throw new PreorderValidationError('Rezervasyon kimliği gerekli');
  }
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new PreorderValidationError('Ön sipariş ürün listesi boş olamaz');
  }

  const items = rawItems.map((entry, index) => normalizePreorderItem(entry, index));

  return { reservationId, items };
}

/**
 * @param {NormalizedPreorderPayload} payload
 * @returns {Record<string, unknown>}
 */
export function buildPreorderApiBody(payload) {
  return {
    reservation_id: payload.reservationId,
    items: payload.items.map((item) => {
      /** @type {Record<string, unknown>} */
      const row = {
        menu_item_id: item.menuItemId,
        qty: item.qty
      };
      if (item.note) row.note = item.note;
      return row;
    })
  };
}

/**
 * @param {string} reservationId
 * @returns {string}
 */
export function buildRestaurantPreorderUrl(reservationId) {
  const trimmed = String(reservationId || '').trim();
  return `${getGarsonAiApiUrl()}/public/reservations/${encodeURIComponent(trimmed)}/preorder`;
}

/**
 * @param {unknown} payload
 * @returns {NormalizedPreorderResult}
 */
export function normalizePreorderResponse(payload) {
  let row = payload;

  if (payload && typeof payload === 'object') {
    const root = /** @type {Record<string, unknown>} */ (payload);
    if (root.preorder && typeof root.preorder === 'object') {
      row = root.preorder;
    } else if (root.data && typeof root.data === 'object') {
      const data = /** @type {Record<string, unknown>} */ (root.data);
      row =
        data.preorder && typeof data.preorder === 'object'
          ? data.preorder
          : data;
    }
  }

  const record = /** @type {Record<string, unknown>} */ (
    row && typeof row === 'object' ? row : {}
  );

  const preorderId = String(record.id ?? record.preorder_id ?? record.preorderId ?? '').trim();
  const reservationId = String(record.reservation_id ?? record.reservationId ?? '').trim();
  const status = String(record.status ?? 'pending').trim() || 'pending';

  const itemCountRaw = Number.parseInt(
    String(record.item_count ?? record.itemCount ?? '0'),
    10
  );
  const itemCount = Number.isFinite(itemCountRaw) && itemCountRaw >= 0 ? itemCountRaw : 0;

  const totalRaw = record.total_amount ?? record.totalAmount ?? record.total;
  const totalNum = totalRaw != null && totalRaw !== '' ? Number(totalRaw) : null;
  const totalAmount = totalNum != null && Number.isFinite(totalNum) ? totalNum : null;

  const currency = String(record.currency ?? record.currency_code ?? 'TRY').trim() || 'TRY';

  const etaRaw = record.eta_minutes ?? record.etaMinutes ?? record.eta;
  const etaNum = etaRaw != null && etaRaw !== '' ? Number(etaRaw) : null;
  const etaMinutes = etaNum != null && Number.isFinite(etaNum) && etaNum >= 0 ? etaNum : null;

  const createdAt = String(record.created_at ?? record.createdAt ?? '').trim();

  return {
    preorderId,
    reservationId,
    status,
    itemCount,
    totalAmount,
    currency,
    etaMinutes,
    createdAt,
    raw: payload
  };
}

/**
 * @param {PreorderCreateInput} input
 * @returns {Promise<NormalizedPreorderResult>}
 */
export async function createRestaurantPreorder(input) {
  const payload = normalizePreorderPayload(input);
  const body = buildPreorderApiBody(payload);
  const url = buildRestaurantPreorderUrl(payload.reservationId);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Ön sipariş oluşturulamadı (${response.status})`);
  }

  const json = await response.json();
  return normalizePreorderResponse(json);
}

/** @type {Set<string>} */
const PREORDER_STATUS_KEYS = new Set([
  'submitted',
  'scheduled',
  'preparing',
  'ready',
  'served',
  'cancelled'
]);

/**
 * @typedef {Object} NormalizedPreorderStatus
 * @property {string} id
 * @property {string} status
 * @property {number|null} etaMinutes
 * @property {string} estimatedReadyAt
 * @property {string} kitchenMessage
 * @property {string} updatedAt
 * @property {unknown} raw
 */

/**
 * @param {string} [status]
 * @returns {string}
 */
export function normalizePreorderStatusKey(status) {
  const key = String(status || '').trim().toLowerCase();
  return PREORDER_STATUS_KEYS.has(key) ? key : 'submitted';
}

/**
 * @param {string} [status]
 * @returns {string}
 */
export function formatPreorderStatusLabel(status) {
  const labels = {
    submitted: 'Alındı',
    scheduled: 'Planlandı',
    preparing: 'Hazırlanıyor',
    ready: 'Hazır',
    served: 'Servis edildi',
    cancelled: 'İptal edildi'
  };
  return labels[normalizePreorderStatusKey(status)] || labels.submitted;
}

/**
 * @param {unknown} payload
 * @returns {NormalizedPreorderStatus}
 */
export function normalizePreorderStatus(payload) {
  let row = payload;

  if (payload && typeof payload === 'object') {
    const root = /** @type {Record<string, unknown>} */ (payload);
    if (root.status && typeof root.status === 'object' && !Array.isArray(root.status)) {
      row = root.status;
    } else if (root.preorder_status && typeof root.preorder_status === 'object') {
      row = root.preorder_status;
    } else if (root.data && typeof root.data === 'object') {
      const data = /** @type {Record<string, unknown>} */ (root.data);
      row =
        data.status && typeof data.status === 'object' && !Array.isArray(data.status)
          ? data.status
          : data;
    }
  }

  const record = /** @type {Record<string, unknown>} */ (
    row && typeof row === 'object' ? row : {}
  );

  const id = String(record.id ?? record.preorder_id ?? record.preorderId ?? '').trim();
  const status = normalizePreorderStatusKey(record.status);

  const etaRaw = record.eta_minutes ?? record.etaMinutes ?? record.eta;
  const etaNum = etaRaw != null && etaRaw !== '' ? Number(etaRaw) : null;
  const etaMinutes = etaNum != null && Number.isFinite(etaNum) && etaNum >= 0 ? etaNum : null;

  const estimatedReadyAt = String(
    record.estimated_ready_at ?? record.estimatedReadyAt ?? ''
  ).trim();

  const kitchenMessage = String(
    record.kitchen_message ?? record.kitchenMessage ?? record.message ?? ''
  ).trim();

  const updatedAt = String(record.updated_at ?? record.updatedAt ?? '').trim();

  return {
    id,
    status,
    etaMinutes,
    estimatedReadyAt,
    kitchenMessage,
    updatedAt,
    raw: payload
  };
}

/**
 * @param {string} preorderId
 * @returns {string}
 */
export function buildPreorderStatusUrl(preorderId) {
  const trimmed = String(preorderId || '').trim();
  return `${getGarsonAiApiUrl()}/public/preorders/${encodeURIComponent(trimmed)}/status`;
}

/**
 * @param {string} preorderId
 * @returns {Promise<NormalizedPreorderStatus>}
 */
export async function getPreorderStatus(preorderId) {
  const trimmed = String(preorderId || '').trim();
  if (!trimmed) {
    throw new Error('Ön sipariş kimliği gerekli');
  }

  const url = buildPreorderStatusUrl(trimmed);
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Ön sipariş durumu alınamadı (${response.status})`);
  }

  const json = await response.json();
  return normalizePreorderStatus(json);
}

/** @type {Set<string>} */
const KITCHEN_ORDER_STATUS_KEYS = new Set([
  'submitted',
  'scheduled',
  'preparing',
  'ready',
  'served',
  'cancelled'
]);

/** @type {Set<string>} */
const KITCHEN_STATUS_UPDATE_KEYS = new Set(['preparing', 'ready', 'served']);

/**
 * @typedef {Object} NormalizedKitchenItem
 * @property {string} name
 * @property {number} quantity
 * @property {string} note
 */

/**
 * @typedef {Object} NormalizedKitchenOrder
 * @property {string} id
 * @property {string} reservationId
 * @property {string} customerName
 * @property {string} tableName
 * @property {string} arrivalTime
 * @property {string} status
 * @property {number|null} etaMinutes
 * @property {NormalizedKitchenItem[]} items
 * @property {string} createdAt
 * @property {unknown} raw
 */

/**
 * @typedef {Object} NormalizedKitchenQueue
 * @property {NormalizedKitchenOrder[]} orders
 * @property {unknown} raw
 */

/**
 * @param {string} [status]
 * @returns {string}
 */
export function normalizeKitchenOrderStatus(status) {
  const key = String(status || '').trim().toLowerCase();
  if (key === 'pending' || key === 'new' || key === 'received') return 'submitted';
  return KITCHEN_ORDER_STATUS_KEYS.has(key) ? key : 'submitted';
}

/**
 * @param {unknown} item
 * @returns {NormalizedKitchenItem|null}
 */
function normalizeKitchenQueueItem(item) {
  const row = /** @type {Record<string, unknown>} */ (
    item && typeof item === 'object' ? item : {}
  );

  const name = String(row.name ?? row.product_name ?? row.title ?? row.menu_item_name ?? '').trim();
  if (!name) return null;

  const qtyRaw = Number.parseInt(String(row.quantity ?? row.qty ?? row.count ?? '1'), 10);
  const quantity = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;
  const note = String(row.note ?? row.notes ?? row.special_request ?? '').trim();

  return { name, quantity, note };
}

/**
 * @param {unknown} order
 * @returns {NormalizedKitchenOrder|null}
 */
function normalizeKitchenQueueOrder(order) {
  const row = /** @type {Record<string, unknown>} */ (
    order && typeof order === 'object' ? order : {}
  );

  const id = String(row.id ?? row.order_id ?? row.preorder_id ?? row.preorderId ?? '').trim();
  if (!id) return null;

  const reservationId = String(row.reservation_id ?? row.reservationId ?? '').trim();
  const customerName = String(
    row.customer_name ?? row.customerName ?? row.guest_name ?? ''
  ).trim();
  const tableName = String(row.table_name ?? row.tableName ?? row.table ?? '').trim();
  const arrivalTime = String(
    row.arrival_time ?? row.arrivalTime ?? row.reservation_time ?? row.time ?? ''
  ).trim();
  const status = normalizeKitchenOrderStatus(String(row.status ?? ''));

  const etaRaw = row.eta_minutes ?? row.etaMinutes ?? row.eta;
  const etaNum = etaRaw != null && etaRaw !== '' ? Number(etaRaw) : null;
  const etaMinutes = etaNum != null && Number.isFinite(etaNum) && etaNum >= 0 ? etaNum : null;

  const itemSource = row.items ?? row.line_items ?? row.products ?? [];
  const items = Array.isArray(itemSource)
    ? itemSource
        .map((item) => normalizeKitchenQueueItem(item))
        .filter((item) => item != null)
    : [];

  const createdAt = String(row.created_at ?? row.createdAt ?? '').trim();

  return {
    id,
    reservationId,
    customerName,
    tableName,
    arrivalTime,
    status,
    etaMinutes,
    items,
    createdAt,
    raw: order
  };
}

/**
 * @param {unknown} payload
 * @returns {NormalizedKitchenQueue}
 */
export function normalizeKitchenQueue(payload) {
  let row = payload;

  if (payload && typeof payload === 'object') {
    const root = /** @type {Record<string, unknown>} */ (payload);
    if (Array.isArray(root.orders)) {
      row = root.orders;
    } else if (Array.isArray(root.queue)) {
      row = root.queue;
    } else if (root.kitchen && typeof root.kitchen === 'object') {
      const kitchen = /** @type {Record<string, unknown>} */ (root.kitchen);
      row = kitchen.orders ?? kitchen.queue ?? kitchen;
    } else if (root.data && typeof root.data === 'object') {
      const data = /** @type {Record<string, unknown>} */ (root.data);
      row = data.orders ?? data.queue ?? data;
    }
  }

  const source = Array.isArray(row) ? row : [];
  const orders = source
    .map((order) => normalizeKitchenQueueOrder(order))
    .filter((order) => order != null);

  return { orders, raw: payload };
}

/**
 * @param {string} businessId
 * @returns {string}
 */
export function buildKitchenQueueUrl(businessId) {
  const trimmed = String(businessId || '').trim();
  return `${getGarsonAiApiUrl()}/public/restaurants/${encodeURIComponent(trimmed)}/kitchen`;
}

/**
 * @param {string} orderId
 * @returns {string}
 */
export function buildKitchenOrderStatusUrl(orderId) {
  const trimmed = String(orderId || '').trim();
  return `${getGarsonAiApiUrl()}/public/kitchen/orders/${encodeURIComponent(trimmed)}`;
}

/**
 * @param {string} status
 * @returns {Record<string, string>}
 */
export function buildKitchenStatusUpdateBody(status) {
  const key = String(status || '').trim().toLowerCase();
  if (!KITCHEN_STATUS_UPDATE_KEYS.has(key)) {
    throw new Error('Geçersiz mutfak durumu');
  }
  return { status: key };
}

/**
 * @param {string} businessId
 * @returns {Promise<NormalizedKitchenQueue>}
 */
export async function getKitchenQueue(businessId) {
  const trimmed = String(businessId || '').trim();
  if (!trimmed) {
    throw new Error('Restoran kimliği gerekli');
  }

  const url = buildKitchenQueueUrl(trimmed);
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Mutfak kuyruğu alınamadı (${response.status})`);
  }

  const json = await response.json();
  return normalizeKitchenQueue(json);
}

/**
 * @param {string} orderId
 * @param {string} status
 * @returns {Promise<NormalizedKitchenOrder>}
 */
export async function updateKitchenOrderStatus(orderId, status) {
  const trimmedId = String(orderId || '').trim();
  if (!trimmedId) {
    throw new Error('Sipariş kimliği gerekli');
  }

  const body = buildKitchenStatusUpdateBody(status);
  const url = buildKitchenOrderStatusUrl(trimmedId);
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Sipariş durumu güncellenemedi (${response.status})`);
  }

  const json = await response.json();
  const normalized = normalizeKitchenQueueOrder(json);
  if (normalized) return normalized;

  const queue = normalizeKitchenQueue(json);
  const match = queue.orders.find((order) => order.id === trimmedId);
  if (match) return match;

  return {
    id: trimmedId,
    reservationId: '',
    customerName: '',
    tableName: '',
    arrivalTime: '',
    status: body.status,
    etaMinutes: null,
    items: [],
    createdAt: '',
    raw: json
  };
}

/**
 * @param {{ title: string, date: string, time: string, description?: string, location?: string }} params
 * @returns {string}
 */
export function buildGoogleCalendarUrl({ title, date, time, description = '', location = '' }) {
  const safeDate = resolveSlotDate(date);
  const safeTime = normalizeSlotTime(time) || '19:00';
  const start = new Date(`${safeDate}T${safeTime}:00`);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

  /**
   * @param {Date} value
   * @returns {string}
   */
  const formatDate = (value) =>
    value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatDate(start)}/${formatDate(end)}`,
    details: description,
    location
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
