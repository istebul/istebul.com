/**
 * GarsonAI order repository.
 */
import { getSupabaseClient } from '../../core/supabase.js';
import { normalizeOrderStatus } from '../kitchen/order-status.js';
import {
  RestaurantDatabaseError,
  getDatabaseErrorMessage,
  isDatabaseClientAvailable,
  normalizeOrderRow,
  requireRestaurantId
} from './tenant-utils.js';

const ORDER_SOURCES = new Set(['whatsapp', 'panel', 'qr']);

/**
 * @typedef {Object} OrderRepositoryOptions
 * @property {string} restaurantId
 * @property {import('@supabase/supabase-js').SupabaseClient} [client]
 */

/**
 * @param {unknown} source
 * @returns {string}
 */
function normalizeOrderSource(source) {
  const key = String(source || 'panel').trim().toLowerCase();
  return ORDER_SOURCES.has(key) ? key : 'panel';
}

/**
 * @param {OrderRepositoryOptions & { order?: Record<string, unknown>, items?: unknown[] }} options
 * @returns {Promise<Record<string, unknown>>}
 */
export async function createOrder(options) {
  const restaurantId = requireRestaurantId(options.restaurantId);
  const client = options.client || getSupabaseClient();
  const order = options.order && typeof options.order === 'object' ? options.order : {};
  const items = Array.isArray(options.items) ? options.items : [];

  if (!isDatabaseClientAvailable(client)) {
    throw new RestaurantDatabaseError('Veritabanı bağlantısı kullanılamıyor.');
  }

  const totalAmount = Number(order.totalAmount ?? order.total_amount ?? order.total ?? 0);
  const status = normalizeOrderStatus(String(order.status || 'pending'));
  const source = normalizeOrderSource(order.source);

  /** @type {Record<string, unknown>} */
  const insertRow = {
    restaurant_id: restaurantId,
    customer_id: order.customerId ?? order.customer_id ?? null,
    status,
    total_amount: Number.isFinite(totalAmount) ? totalAmount : 0,
    source,
    order_no: order.orderNo ?? order.order_no ?? null,
    kitchen_status: order.kitchenStatus ?? order.kitchen_status ?? status,
    items
  };

  const { data, error } = await client
    .from('orders')
    .insert(insertRow)
    .select(
      'id, restaurant_id, customer_id, status, total_amount, source, order_no, kitchen_status, items, created_at'
    )
    .single();

  if (error) {
    throw new RestaurantDatabaseError(getDatabaseErrorMessage(error));
  }

  const created = normalizeOrderRow(/** @type {Record<string, unknown>} */ (data));

  if (items.length) {
    const orderItems = items
      .map((item) => {
        const row = /** @type {Record<string, unknown>} */ (
          item && typeof item === 'object' ? item : {}
        );
        return {
          order_id: created.id,
          restaurant_id: restaurantId,
          menu_item_id: row.menuItemId ?? row.menu_item_id ?? null,
          quantity: Number(row.quantity ?? 1),
          unit_price: Number(row.unitPrice ?? row.unit_price ?? row.price ?? 0),
          note: row.note != null ? String(row.note) : null
        };
      })
      .filter((row) => row.quantity > 0);

    if (orderItems.length) {
      const { error: itemsError } = await client.from('order_items').insert(orderItems);
      if (itemsError) {
        throw new RestaurantDatabaseError(getDatabaseErrorMessage(itemsError));
      }
    }
  }

  return created;
}

/**
 * @param {OrderRepositoryOptions & { orderId?: string, status?: string }} options
 * @returns {Promise<Record<string, unknown>>}
 */
export async function updateOrderStatus(options) {
  const restaurantId = requireRestaurantId(options.restaurantId);
  const orderId = String(options.orderId || '').trim();
  const status = normalizeOrderStatus(options.status);

  if (!orderId) {
    throw new RestaurantDatabaseError('Sipariş kimliği gerekli.');
  }

  const client = options.client || getSupabaseClient();

  if (!isDatabaseClientAvailable(client)) {
    throw new RestaurantDatabaseError('Veritabanı bağlantısı kullanılamıyor.');
  }

  const { data, error } = await client
    .from('orders')
    .update({
      status,
      kitchen_status: status
    })
    .eq('id', orderId)
    .eq('restaurant_id', restaurantId)
    .select(
      'id, restaurant_id, customer_id, status, total_amount, source, order_no, kitchen_status, items, created_at'
    )
    .maybeSingle();

  if (error) {
    throw new RestaurantDatabaseError(getDatabaseErrorMessage(error));
  }

  if (!data) {
    throw new RestaurantDatabaseError('Sipariş bulunamadı.');
  }

  return normalizeOrderRow(/** @type {Record<string, unknown>} */ (data));
}

/**
 * @param {OrderRepositoryOptions & { limit?: number }} options
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function getRestaurantOrders(options) {
  const restaurantId = requireRestaurantId(options.restaurantId);
  const client = options.client || getSupabaseClient();
  const limit =
    Number.isFinite(options.limit) && options.limit > 0 ? Math.floor(options.limit) : 100;

  if (!isDatabaseClientAvailable(client)) {
    throw new RestaurantDatabaseError('Veritabanı bağlantısı kullanılamıyor.');
  }

  const { data, error } = await client
    .from('orders')
    .select(
      'id, restaurant_id, customer_id, status, total_amount, source, order_no, kitchen_status, items, created_at'
    )
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new RestaurantDatabaseError(getDatabaseErrorMessage(error));
  }

  return (data || []).map((row) =>
    normalizeOrderRow(/** @type {Record<string, unknown>} */ (row))
  );
}
