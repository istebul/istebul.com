/**
 * GarsonAI customer repository.
 */
import { getSupabaseClient } from '../../core/supabase.js';
import {
  RestaurantDatabaseError,
  getDatabaseErrorMessage,
  isDatabaseClientAvailable,
  normalizeCustomerRow,
  normalizeOrderRow,
  requireRestaurantId
} from './tenant-utils.js';

/**
 * @typedef {Object} CustomerRepositoryOptions
 * @property {string} restaurantId
 * @property {import('@supabase/supabase-js').SupabaseClient} [client]
 */

/**
 * @param {CustomerRepositoryOptions & { customer?: Record<string, unknown> }} options
 * @returns {Promise<Record<string, unknown>>}
 */
export async function upsertCustomer(options) {
  const restaurantId = requireRestaurantId(options.restaurantId);
  const client = options.client || getSupabaseClient();
  const customer = options.customer && typeof options.customer === 'object' ? options.customer : {};

  if (!isDatabaseClientAvailable(client)) {
    throw new RestaurantDatabaseError('Veritabanı bağlantısı kullanılamıyor.');
  }

  const name = String(customer.name ?? '').trim();
  if (!name) {
    throw new RestaurantDatabaseError('Müşteri adı gerekli.');
  }

  const phone = customer.phone != null ? String(customer.phone).trim() : null;

  /** @type {Record<string, unknown>} */
  const row = {
    restaurant_id: restaurantId,
    name,
    phone,
    total_orders: Number(customer.totalOrders ?? customer.total_orders ?? 0),
    total_spent: Number(customer.totalSpent ?? customer.total_spent ?? 0),
    last_order_at: customer.lastOrderAt ?? customer.last_order_at ?? null
  };

  const query = phone
    ? client
        .from('customers')
        .upsert(row, { onConflict: 'restaurant_id,phone' })
        .select('id, restaurant_id, name, phone, total_orders, total_spent, last_order_at')
        .single()
    : client
        .from('customers')
        .insert(row)
        .select('id, restaurant_id, name, phone, total_orders, total_spent, last_order_at')
        .single();

  const { data, error } = await query;

  if (error) {
    throw new RestaurantDatabaseError(getDatabaseErrorMessage(error));
  }

  return normalizeCustomerRow(/** @type {Record<string, unknown>} */ (data));
}

/**
 * @param {CustomerRepositoryOptions & { customerId?: string, limit?: number }} options
 * @returns {Promise<{ customer: Record<string, unknown>, orders: Record<string, unknown>[] }>}
 */
export async function getCustomerHistory(options) {
  const restaurantId = requireRestaurantId(options.restaurantId);
  const customerId = String(options.customerId || '').trim();
  const limit =
    Number.isFinite(options.limit) && options.limit > 0 ? Math.floor(options.limit) : 50;

  if (!customerId) {
    throw new RestaurantDatabaseError('Müşteri kimliği gerekli.');
  }

  const client = options.client || getSupabaseClient();

  if (!isDatabaseClientAvailable(client)) {
    throw new RestaurantDatabaseError('Veritabanı bağlantısı kullanılamıyor.');
  }

  const [customerRes, ordersRes] = await Promise.all([
    client
      .from('customers')
      .select('id, restaurant_id, name, phone, total_orders, total_spent, last_order_at')
      .eq('restaurant_id', restaurantId)
      .eq('id', customerId)
      .maybeSingle(),
    client
      .from('orders')
      .select(
        'id, restaurant_id, customer_id, status, total_amount, source, order_no, kitchen_status, items, created_at'
      )
      .eq('restaurant_id', restaurantId)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(limit)
  ]);

  if (customerRes.error) {
    throw new RestaurantDatabaseError(getDatabaseErrorMessage(customerRes.error));
  }

  if (ordersRes.error) {
    throw new RestaurantDatabaseError(getDatabaseErrorMessage(ordersRes.error));
  }

  if (!customerRes.data) {
    throw new RestaurantDatabaseError('Müşteri bulunamadı.');
  }

  return {
    customer: normalizeCustomerRow(/** @type {Record<string, unknown>} */ (customerRes.data)),
    orders: (ordersRes.data || []).map((row) =>
      normalizeOrderRow(/** @type {Record<string, unknown>} */ (row))
    )
  };
}
