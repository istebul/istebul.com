/**
 * GarsonAI kitchen queue builder (priority, delay, and tenant-scoped sorting).
 */
import { normalizeOrderStatus } from './order-status.js';

/**
 * @typedef {Object} KitchenQueueItem
 * @property {string} orderId
 * @property {string} table
 * @property {Array<{ name: string, quantity: number, note?: string }>} items
 * @property {'normal'|'high'|'overdue'} priority
 * @property {number} waitingMinutes
 * @property {string} status
 * @property {boolean} largeOrder
 * @property {boolean} delayed
 */

const ACTIVE_QUEUE_STATUSES = new Set([
  'pending',
  'accepted',
  'preparing',
  'ready',
  'delivering'
]);

/**
 * @param {unknown} record
 * @returns {string}
 */
function resolveRestaurantId(record) {
  if (!record || typeof record !== 'object') return '';
  const row = /** @type {Record<string, unknown>} */ (record);
  return String(row.restaurantId ?? row.restaurant_id ?? '').trim();
}

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
function resolveTable(order) {
  if (!order || typeof order !== 'object') return '';
  const row = /** @type {Record<string, unknown>} */ (order);
  return String(row.table ?? row.tableName ?? row.table_name ?? '—').trim() || '—';
}

/**
 * @param {unknown} order
 * @returns {unknown[]}
 */
function resolveItems(order) {
  if (!order || typeof order !== 'object') return [];
  const row = /** @type {Record<string, unknown>} */ (order);
  const source = row.items ?? row.line_items ?? [];
  return Array.isArray(source) ? source : [];
}

/**
 * @param {unknown} order
 * @returns {Date|null}
 */
function resolveCreatedAt(order) {
  if (!order || typeof order !== 'object') return null;
  const row = /** @type {Record<string, unknown>} */ (order);
  const raw = row.createdAt ?? row.created_at;
  if (!raw) return null;
  const date = new Date(String(raw));
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * @param {unknown[]} items
 * @returns {number}
 */
export function countOrderItems(items) {
  return (Array.isArray(items) ? items : []).reduce((total, item) => {
    const row = /** @type {Record<string, unknown>} */ (
      item && typeof item === 'object' ? item : {}
    );
    const qtyRaw = Number.parseInt(String(row.quantity ?? row.qty ?? '1'), 10);
    const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;
    return total + qty;
  }, 0);
}

/**
 * @param {number} waitingMinutes
 * @param {boolean} largeOrder
 * @param {number} delayThresholdMinutes
 * @returns {'normal'|'high'|'overdue'}
 */
export function resolveQueuePriority(waitingMinutes, largeOrder, delayThresholdMinutes) {
  if (waitingMinutes >= delayThresholdMinutes) return 'overdue';
  if (largeOrder) return 'high';
  return 'normal';
}

/**
 * @param {number} priorityRank
 * @param {number} waitingMinutes
 * @returns {number}
 */
function prioritySortScore(priorityRank, waitingMinutes) {
  return priorityRank * 10000 - waitingMinutes;
}

/**
 * @param {'normal'|'high'|'overdue'} priority
 * @returns {number}
 */
function priorityRank(priority) {
  if (priority === 'overdue') return 0;
  if (priority === 'high') return 1;
  return 2;
}

/**
 * @param {unknown[]} orders
 * @param {{ restaurantId?: string, now?: Date, delayThresholdMinutes?: number, largeItemThreshold?: number }} [options]
 * @returns {KitchenQueueItem[]}
 */
export function buildKitchenQueue(orders, options = {}) {
  const restaurantId = String(options.restaurantId || '').trim();
  const now = options.now instanceof Date ? options.now : new Date();
  const delayThresholdMinutes =
    Number.isFinite(options.delayThresholdMinutes) && options.delayThresholdMinutes > 0
      ? options.delayThresholdMinutes
      : 30;
  const largeItemThreshold =
    Number.isFinite(options.largeItemThreshold) && options.largeItemThreshold > 0
      ? options.largeItemThreshold
      : 5;

  const source = Array.isArray(orders) ? orders : [];

  /** @type {KitchenQueueItem[]} */
  const queue = [];

  for (const order of source) {
    const orderRestaurantId = resolveRestaurantId(order);
    if (restaurantId && orderRestaurantId && orderRestaurantId !== restaurantId) {
      continue;
    }

    const status = normalizeOrderStatus(
      /** @type {Record<string, unknown>} */ (order).status
    );
    if (!ACTIVE_QUEUE_STATUSES.has(status)) continue;

    const orderId = resolveOrderId(order);
    if (!orderId) continue;

    const items = resolveItems(order).map((item) => {
      const row = /** @type {Record<string, unknown>} */ (
        item && typeof item === 'object' ? item : {}
      );
      const qtyRaw = Number.parseInt(String(row.quantity ?? row.qty ?? '1'), 10);
      return {
        name: String(row.name ?? row.product_name ?? '').trim(),
        quantity: Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1,
        note: row.note != null ? String(row.note).trim() : undefined
      };
    });

    const createdAt = resolveCreatedAt(order);
    const waitingMinutes = createdAt
      ? Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / 60000))
      : 0;
    const itemCount = countOrderItems(items);
    const largeOrder = itemCount >= largeItemThreshold;
    const delayed = waitingMinutes >= delayThresholdMinutes;
    const priority = resolveQueuePriority(
      waitingMinutes,
      largeOrder,
      delayThresholdMinutes
    );

    queue.push({
      orderId,
      table: resolveTable(order),
      items,
      priority,
      waitingMinutes,
      status,
      largeOrder,
      delayed
    });
  }

  return queue.sort((left, right) => {
    const leftScore = prioritySortScore(priorityRank(left.priority), left.waitingMinutes);
    const rightScore = prioritySortScore(priorityRank(right.priority), right.waitingMinutes);
    if (leftScore !== rightScore) return leftScore - rightScore;
    return right.waitingMinutes - left.waitingMinutes;
  });
}
