/**
 * GarsonAI customer behavior analyzer.
 */
import {
  filterByRestaurantId,
  resolveCustomerKey,
  resolveOrderCustomerKey
} from './tenant-utils.js';

/**
 * @typedef {Object} CustomerProfile
 * @property {string} id
 * @property {string} name
 * @property {string} phone
 * @property {number} orderCount
 * @property {number} totalSpend
 * @property {string|null} lastOrderAt
 * @property {string|null} favoriteProduct
 */

/**
 * @typedef {Object} CustomerAnalysis
 * @property {number} totalCustomers
 * @property {CustomerProfile[]} repeatCustomers
 * @property {CustomerProfile[]} vipCustomers
 * @property {CustomerProfile[]} inactiveCustomers
 * @property {CustomerProfile[]} customers
 */

/**
 * @param {unknown} order
 * @returns {boolean}
 */
function isCountableOrder(order) {
  const status = String(
    /** @type {Record<string, unknown>} */ (order).status || ''
  )
    .trim()
    .toLowerCase();
  return status !== 'cancelled';
}

/**
 * @param {unknown} order
 * @returns {number}
 */
function resolveOrderTotal(order) {
  const row = /** @type {Record<string, unknown>} */ (
    order && typeof order === 'object' ? order : {}
  );
  const totalRaw = row.total ?? row.total_amount ?? row.totalAmount;
  const totalNum = totalRaw != null && totalRaw !== '' ? Number(totalRaw) : null;
  return totalNum != null && Number.isFinite(totalNum) ? totalNum : 0;
}

/**
 * @param {unknown} order
 * @returns {string|null}
 */
function resolveOrderDate(order) {
  const row = /** @type {Record<string, unknown>} */ (
    order && typeof order === 'object' ? order : {}
  );
  const raw = row.createdAt ?? row.created_at ?? row.placedAt ?? row.placed_at;
  return raw ? String(raw) : null;
}

/**
 * @param {unknown} order
 * @returns {string}
 */
function resolveFavoriteProductFromOrder(order) {
  const row = /** @type {Record<string, unknown>} */ (
    order && typeof order === 'object' ? order : {}
  );
  const items = Array.isArray(row.items) ? row.items : [];
  const first = items[0];
  if (!first || typeof first !== 'object') return '';
  return String(/** @type {Record<string, unknown>} */ (first).name ?? '').trim();
}

/**
 * @param {unknown} customer
 * @returns {{ id: string, name: string, phone: string }}
 */
function normalizeCustomer(customer) {
  const row = /** @type {Record<string, unknown>} */ (
    customer && typeof customer === 'object' ? customer : {}
  );
  return {
    id: resolveCustomerKey(customer),
    name: String(row.name ?? row.customer_name ?? 'Müşteri').trim(),
    phone: String(row.phone ?? row.customer_phone ?? '').trim()
  };
}

/**
 * @param {unknown[]} customers
 * @param {unknown[]} orders
 * @param {{ restaurantId?: string, now?: Date, inactiveDays?: number, vipOrderThreshold?: number, vipSpendThreshold?: number }} [options]
 * @returns {CustomerAnalysis}
 */
export function analyzeCustomers(customers, orders, options = {}) {
  const restaurantId = String(options.restaurantId || '').trim();
  const now = options.now instanceof Date ? options.now : new Date();
  const inactiveDays =
    Number.isFinite(options.inactiveDays) && options.inactiveDays > 0
      ? options.inactiveDays
      : 30;
  const vipOrderThreshold =
    Number.isFinite(options.vipOrderThreshold) && options.vipOrderThreshold > 0
      ? options.vipOrderThreshold
      : 2;
  const vipSpendThreshold =
    Number.isFinite(options.vipSpendThreshold) && options.vipSpendThreshold > 0
      ? options.vipSpendThreshold
      : 500;

  const scopedCustomers = restaurantId
    ? filterByRestaurantId(customers, restaurantId)
    : Array.isArray(customers)
      ? customers
      : [];
  const scopedOrders = restaurantId
    ? filterByRestaurantId(orders, restaurantId).filter(isCountableOrder)
    : Array.isArray(orders)
      ? orders.filter(isCountableOrder)
      : [];

  /** @type {Map<string, CustomerProfile>} */
  const profiles = new Map();

  for (const customer of scopedCustomers) {
    const normalized = normalizeCustomer(customer);
    if (!normalized.id) continue;
    profiles.set(normalized.id, {
      id: normalized.id,
      name: normalized.name,
      phone: normalized.phone,
      orderCount: 0,
      totalSpend: 0,
      lastOrderAt: null,
      favoriteProduct: null
    });
  }

  /** @type {Map<string, number>} */
  const productCounts = new Map();

  for (const order of scopedOrders) {
    const key = resolveOrderCustomerKey(order);
    if (!key) continue;

    const existing =
      profiles.get(key) ||
      ({
        id: key,
        name:
          String(
            /** @type {Record<string, unknown>} */ (order).customer &&
              typeof /** @type {Record<string, unknown>} */ (order).customer === 'object'
              ? /** @type {Record<string, unknown>} */ (
                  /** @type {Record<string, unknown>} */ (order).customer
                ).name
              : ''
          ).trim() || 'Müşteri',
        phone: '',
        orderCount: 0,
        totalSpend: 0,
        lastOrderAt: null,
        favoriteProduct: null
      });

    existing.orderCount += 1;
    existing.totalSpend += resolveOrderTotal(order);

    const orderDate = resolveOrderDate(order);
    if (orderDate && (!existing.lastOrderAt || orderDate > existing.lastOrderAt)) {
      existing.lastOrderAt = orderDate;
    }

    const productName = resolveFavoriteProductFromOrder(order);
    if (productName) {
      productCounts.set(`${key}:${productName}`, (productCounts.get(`${key}:${productName}`) || 0) + 1);
    }

    profiles.set(key, existing);
  }

  for (const profile of profiles.values()) {
    let favorite = '';
    let favoriteCount = 0;
    for (const [compoundKey, count] of productCounts.entries()) {
      if (!compoundKey.startsWith(`${profile.id}:`)) continue;
      if (count > favoriteCount) {
        favoriteCount = count;
        favorite = compoundKey.slice(profile.id.length + 1);
      }
    }
    profile.favoriteProduct = favorite || null;
  }

  const allCustomers = [...profiles.values()];
  const repeatCustomers = allCustomers.filter((customer) => customer.orderCount >= 2);
  const vipCustomers = allCustomers.filter(
    (customer) =>
      customer.orderCount >= vipOrderThreshold || customer.totalSpend >= vipSpendThreshold
  );

  const inactiveThresholdMs = inactiveDays * 24 * 60 * 60 * 1000;
  const inactiveCustomers = allCustomers.filter((customer) => {
    if (!customer.lastOrderAt) return true;
    const last = new Date(customer.lastOrderAt);
    if (Number.isNaN(last.getTime())) return true;
    return now.getTime() - last.getTime() >= inactiveThresholdMs;
  });

  return {
    totalCustomers: allCustomers.length,
    repeatCustomers,
    vipCustomers,
    inactiveCustomers,
    customers: allCustomers
  };
}
