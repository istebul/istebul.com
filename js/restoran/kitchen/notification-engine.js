/**
 * GarsonAI customer notification builder for kitchen order lifecycle events.
 */
import { normalizeOrderStatus } from './order-status.js';

/** @type {Record<string, string>} */
export const CUSTOMER_STATUS_MESSAGES = {
  pending: 'Siparişiniz alındı, onay bekliyor.',
  accepted: 'Siparişiniz alındı',
  preparing: 'Siparişiniz hazırlanıyor',
  ready: 'Siparişiniz hazır',
  delivering: 'Siparişiniz yola çıktı',
  completed: 'Siparişiniz tamamlandı. Afiyet olsun!',
  cancelled: 'Siparişiniz iptal edildi'
};

/**
 * @typedef {Object} CustomerNotification
 * @property {string} orderId
 * @property {string} restaurantId
 * @property {string} status
 * @property {string} message
 * @property {string} channel
 * @property {{ phone?: string, name?: string, whatsappId?: string }} customer
 */

/**
 * @param {unknown} order
 * @returns {string}
 */
function resolveOrderId(order) {
  if (!order || typeof order !== 'object') return '';
  const row = /** @type {Record<string, unknown>} */ (order);
  return String(row.id ?? row.orderId ?? row.order_id ?? '').trim();
}

/**
 * @param {unknown} order
 * @returns {string}
 */
function resolveRestaurantId(order) {
  if (!order || typeof order !== 'object') return '';
  const row = /** @type {Record<string, unknown>} */ (order);
  return String(row.restaurantId ?? row.restaurant_id ?? '').trim();
}

/**
 * @param {unknown} order
 * @returns {{ phone?: string, name?: string, whatsappId?: string }}
 */
function resolveCustomer(order) {
  if (!order || typeof order !== 'object') return {};
  const row = /** @type {Record<string, unknown>} */ (order);
  const customer =
    row.customer && typeof row.customer === 'object'
      ? /** @type {Record<string, unknown>} */ (row.customer)
      : row;

  return {
    phone: String(customer.phone ?? customer.customer_phone ?? '').trim() || undefined,
    name: String(customer.name ?? customer.customer_name ?? '').trim() || undefined,
    whatsappId:
      String(customer.whatsappId ?? customer.whatsapp_id ?? customer.wa_id ?? '').trim() ||
      undefined
  };
}

/**
 * @param {unknown} order
 * @returns {string}
 */
function resolveNotificationChannel(order) {
  if (!order || typeof order !== 'object') return 'sms';
  const row = /** @type {Record<string, unknown>} */ (order);
  const source = String(row.source ?? '').trim().toLowerCase();
  if (source === 'whatsapp') return 'whatsapp';
  if (source === 'web' || source === 'app') return 'push';
  return 'sms';
}

/**
 * @param {unknown} order
 * @param {string} [status]
 * @returns {CustomerNotification}
 */
export function createCustomerNotification(order, status) {
  const normalizedStatus = normalizeOrderStatus(status);
  const message =
    CUSTOMER_STATUS_MESSAGES[normalizedStatus] ||
    'Sipariş durumunuz güncellendi.';

  return {
    orderId: resolveOrderId(order),
    restaurantId: resolveRestaurantId(order),
    status: normalizedStatus,
    message,
    channel: resolveNotificationChannel(order),
    customer: resolveCustomer(order)
  };
}
