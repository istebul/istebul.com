/**
 * GarsonAI public restaurant search API client.
 */

const ENV_KEYS = ['GARSONAI_API_URL', 'VITE_GARSONAI_API_URL'];

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
  return '';
}

/**
 * @returns {string}
 */
export function getGarsonAiOrigin() {
  const apiUrl = getGarsonAiApiUrl();
  if (!apiUrl) return '';
  try {
    return new URL(apiUrl).origin;
  } catch {
    return '';
  }
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function formatAvailability(value) {
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
 * @param {{ q?: string, guestCount?: number, date?: string }} params
 * @returns {Promise<unknown>}
 */
export async function searchRestaurants({ q, guestCount, date }) {
  const base = getGarsonAiApiUrl();
  if (!base) {
    throw new Error(
      'GarsonAI API adresi yapılandırılmadı. GARSONAI_API_URL veya VITE_GARSONAI_API_URL tanımlayın.'
    );
  }

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
 * @param {string} businessId
 * @returns {string}
 */
export function buildReservationUrl(businessId) {
  const id = String(businessId || '').trim();
  const origin = getGarsonAiOrigin();
  if (origin) return `${origin}/r/${encodeURIComponent(id)}`;
  return `/r/${encodeURIComponent(id)}`;
}
