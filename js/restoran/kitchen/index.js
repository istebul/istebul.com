/**
 * GarsonAI kitchen order lifecycle orchestrator.
 */
import { validateOrderTransition } from './order-status.js';
import { buildKitchenQueue } from './kitchen-queue.js';
import { estimatePreparation } from './preparation-engine.js';
import { createCustomerNotification } from './notification-engine.js';

export class KitchenOrderProcessError extends Error {
  constructor(message) {
    super(message);
    this.name = 'KitchenOrderProcessError';
  }
}

/**
 * @typedef {Object} ProcessKitchenOrderInput
 * @property {Record<string, unknown>} order
 * @property {string} nextStatus
 * @property {string} [restaurantId]
 * @property {unknown[]} [allOrders]
 * @property {Date} [now]
 */

/**
 * @typedef {Object} ProcessKitchenOrderResult
 * @property {boolean} ok
 * @property {string} [error]
 * @property {Record<string, unknown>} [order]
 * @property {import('./preparation-engine.js').PreparationEstimate} [preparation]
 * @property {import('./notification-engine.js').CustomerNotification} [notification]
 * @property {import('./kitchen-queue.js').KitchenQueueItem[]} [queue]
 */

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
 * @param {ProcessKitchenOrderInput} input
 * @returns {ProcessKitchenOrderResult}
 */
export function processKitchenOrder(input = {}) {
  const order = /** @type {Record<string, unknown>} */ (
    input.order && typeof input.order === 'object' ? input.order : {}
  );
  const nextStatus = String(input.nextStatus || '').trim();
  const restaurantId = String(input.restaurantId || resolveRestaurantId(order) || '').trim();

  if (!restaurantId) {
    return { ok: false, error: 'Restoran kimliği gerekli.' };
  }

  const orderRestaurantId = resolveRestaurantId(order);
  if (orderRestaurantId && orderRestaurantId !== restaurantId) {
    return {
      ok: false,
      error: 'Tenant izolasyonu ihlali: sipariş farklı restorana ait.'
    };
  }

  const currentStatus = String(order.status || 'pending');
  const transition = validateOrderTransition(currentStatus, nextStatus);
  if (!transition.ok) {
    return { ok: false, error: transition.error || 'Geçersiz sipariş durumu geçişi.' };
  }

  const updatedOrder = {
    ...order,
    restaurantId: orderRestaurantId || restaurantId,
    status: transition.to
  };

  const items = Array.isArray(order.items) ? order.items : [];
  const preparation = estimatePreparation(items);
  const notification = createCustomerNotification(updatedOrder, transition.to);

  const allOrders = Array.isArray(input.allOrders) ? input.allOrders : [updatedOrder];
  const queue = buildKitchenQueue(
    allOrders.map((entry) => {
      const row = /** @type {Record<string, unknown>} */ (
        entry && typeof entry === 'object' ? entry : {}
      );
      const entryId = String(row.id ?? row.orderId ?? row.order_id ?? '');
      const updatedId = String(updatedOrder.id ?? updatedOrder.orderId ?? updatedOrder.order_id ?? '');
      return entryId && entryId === updatedId ? updatedOrder : entry;
    }),
    {
      restaurantId,
      now: input.now
    }
  );

  return {
    ok: true,
    order: updatedOrder,
    preparation,
    notification,
    queue
  };
}

export {
  ORDER_STATUSES,
  canCancelOrderStatus,
  getNextOrderStatuses,
  normalizeOrderStatus,
  validateOrderTransition
} from './order-status.js';
export { buildKitchenQueue, countOrderItems, resolveQueuePriority } from './kitchen-queue.js';
export { estimatePreparation } from './preparation-engine.js';
export {
  createCustomerNotification,
  CUSTOMER_STATUS_MESSAGES
} from './notification-engine.js';
