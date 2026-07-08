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
