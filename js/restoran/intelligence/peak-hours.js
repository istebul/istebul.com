/**
 * GarsonAI peak-hour analyzer.
 */
import { filterByRestaurantId } from './tenant-utils.js';

/**
 * @typedef {Object} HourStat
 * @property {number} hour
 * @property {number} orderCount
 * @property {number} revenue
 */

/**
 * @typedef {Object} PeakHoursAnalysis
 * @property {HourStat[]} busiestHours
 * @property {HourStat[]} quietHours
 */

/**
 * @param {unknown} order
 * @returns {number|null}
 */
function resolveOrderHour(order) {
  const row = /** @type {Record<string, unknown>} */ (
    order && typeof order === 'object' ? order : {}
  );
  const raw = row.createdAt ?? row.created_at ?? row.placedAt ?? row.placed_at;
  if (!raw) return null;

  const date = new Date(String(raw));
  if (Number.isNaN(date.getTime())) return null;
  return date.getHours();
}

/**
 * @param {unknown} order
 * @returns {number}
 */
function resolveOrderRevenue(order) {
  const row = /** @type {Record<string, unknown>} */ (
    order && typeof order === 'object' ? order : {}
  );
  const totalRaw = row.total ?? row.total_amount ?? row.totalAmount;
  const totalNum = totalRaw != null && totalRaw !== '' ? Number(totalRaw) : null;
  return totalNum != null && Number.isFinite(totalNum) ? totalNum : 0;
}

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
 * @param {unknown[]} orders
 * @param {{ restaurantId?: string, topCount?: number }} [options]
 * @returns {PeakHoursAnalysis}
 */
export function analyzePeakHours(orders, options = {}) {
  const scoped = options.restaurantId
    ? filterByRestaurantId(orders, options.restaurantId)
    : Array.isArray(orders)
      ? orders
      : [];

  const topCount =
    Number.isFinite(options.topCount) && options.topCount > 0 ? options.topCount : 3;

  /** @type {Map<number, HourStat>} */
  const hourMap = new Map();

  for (const order of scoped.filter(isCountableOrder)) {
    const hour = resolveOrderHour(order);
    if (hour == null) continue;

    const existing = hourMap.get(hour) || { hour, orderCount: 0, revenue: 0 };
    existing.orderCount += 1;
    existing.revenue += resolveOrderRevenue(order);
    hourMap.set(hour, existing);
  }

  const hours = [...hourMap.values()].sort((left, right) => {
    if (right.orderCount !== left.orderCount) return right.orderCount - left.orderCount;
    return right.revenue - left.revenue;
  });

  const busiestHours = hours.slice(0, topCount);
  const quietHours = [...hours]
    .sort((left, right) => {
      if (left.orderCount !== right.orderCount) return left.orderCount - right.orderCount;
      return left.revenue - right.revenue;
    })
    .slice(0, topCount);

  return {
    busiestHours,
    quietHours
  };
}
