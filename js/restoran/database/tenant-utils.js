/**
 * Shared tenant guards for GarsonAI database repositories.
 */

export class RestaurantDatabaseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RestaurantDatabaseError';
  }
}

/**
 * @param {string|undefined|null} restaurantId
 * @returns {string}
 */
export function requireRestaurantId(restaurantId) {
  const value = String(restaurantId || '').trim();
  if (!value) {
    throw new RestaurantDatabaseError('Restoran kimliği gerekli.');
  }
  return value;
}

/**
 * @param {unknown} client
 * @returns {boolean}
 */
export function isDatabaseClientAvailable(client) {
  return Boolean(client && typeof client.from === 'function');
}

/**
 * @param {unknown} error
 * @returns {string}
 */
export function getDatabaseErrorMessage(error) {
  if (error instanceof RestaurantDatabaseError) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String(/** @type {{ message?: string }} */ (error).message || '').trim();
  }
  return 'Veritabanı işlemi başarısız oldu.';
}

/**
 * @param {Record<string, unknown>} row
 * @returns {Record<string, unknown>}
 */
export function normalizeRestaurantRow(row) {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    slug: String(row.slug ?? ''),
    phone: row.phone != null ? String(row.phone) : null,
    address: row.address != null ? String(row.address) : null,
    status: String(row.status ?? 'active'),
    subscriptionPlan: String(
      row.subscription_plan ?? row.subscriptionPlan ?? row.plan ?? 'starter'
    ),
    plan: String(row.plan ?? row.subscription_plan ?? 'starter'),
    createdAt: String(row.created_at ?? row.createdAt ?? '')
  };
}

/**
 * @param {Record<string, unknown>} row
 * @returns {Record<string, unknown>}
 */
export function normalizeCustomerRow(row) {
  return {
    id: String(row.id ?? ''),
    restaurantId: String(row.restaurant_id ?? row.restaurantId ?? ''),
    name: String(row.name ?? ''),
    phone: row.phone != null ? String(row.phone) : null,
    totalOrders: Number(row.total_orders ?? row.totalOrders ?? 0),
    totalSpent: Number(row.total_spent ?? row.totalSpent ?? 0),
    lastOrderAt: row.last_order_at ?? row.lastOrderAt ?? null
  };
}

/**
 * @param {Record<string, unknown>} row
 * @returns {Record<string, unknown>}
 */
export function normalizeMenuItemRow(row) {
  return {
    id: String(row.id ?? ''),
    restaurantId: String(row.restaurant_id ?? row.restaurantId ?? ''),
    name: String(row.name ?? ''),
    description: row.description != null ? String(row.description) : null,
    price: Number(row.price ?? 0),
    category: String(row.category ?? 'Genel'),
    active: row.active !== false
  };
}

/**
 * @param {Record<string, unknown>} row
 * @returns {Record<string, unknown>}
 */
export function normalizeOrderRow(row) {
  return {
    id: String(row.id ?? ''),
    restaurantId: String(row.restaurant_id ?? row.restaurantId ?? ''),
    customerId: row.customer_id ?? row.customerId ?? null,
    status: String(row.status ?? 'pending'),
    totalAmount: Number(row.total_amount ?? row.totalAmount ?? row.total ?? 0),
    source: String(row.source ?? 'panel'),
    orderNo: row.order_no ?? row.orderNo ?? null,
    kitchenStatus: row.kitchen_status ?? row.kitchenStatus ?? null,
    items: Array.isArray(row.items) ? row.items : [],
    createdAt: row.created_at ?? row.createdAt ?? null
  };
}
