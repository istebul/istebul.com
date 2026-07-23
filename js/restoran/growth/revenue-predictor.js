/**
 * GarsonAI revenue prediction engine.
 */
import { filterByRestaurantId } from './tenant-utils.js';

/**
 * @typedef {Object} RevenuePrediction
 * @property {number} currentRevenue
 * @property {number} predictedRevenue
 * @property {'up'|'stable'|'down'} trend
 * @property {'low'|'medium'|'high'} risk
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
 * @returns {Date|null}
 */
function resolveOrderDate(order) {
  const row = /** @type {Record<string, unknown>} */ (
    order && typeof order === 'object' ? order : {}
  );
  const raw = row.createdAt ?? row.created_at;
  if (!raw) return null;
  const date = new Date(String(raw));
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * @param {number} recentRevenue
 * @param {number} previousRevenue
 * @returns {'up'|'stable'|'down'}
 */
export function resolveRevenueTrend(recentRevenue, previousRevenue) {
  if (previousRevenue <= 0 && recentRevenue > 0) return 'up';
  if (recentRevenue <= 0 && previousRevenue > 0) return 'down';
  if (previousRevenue <= 0) return 'stable';

  const change = (recentRevenue - previousRevenue) / previousRevenue;
  if (change >= 0.1) return 'up';
  if (change <= -0.1) return 'down';
  return 'stable';
}

/**
 * @param {'up'|'stable'|'down'} trend
 * @param {number} recentOrderCount
 * @returns {'low'|'medium'|'high'}
 */
export function resolveRevenueRisk(trend, recentOrderCount) {
  if (trend === 'down' && recentOrderCount < 3) return 'high';
  if (trend === 'down') return 'medium';
  if (trend === 'stable' && recentOrderCount < 2) return 'medium';
  return 'low';
}

/**
 * @param {unknown[]} orders
 * @param {{ restaurantId?: string, now?: Date, recentDays?: number }} [options]
 * @returns {RevenuePrediction}
 */
export function predictRevenue(orders, options = {}) {
  const scoped = options.restaurantId
    ? filterByRestaurantId(orders, options.restaurantId).filter(isCountableOrder)
    : Array.isArray(orders)
      ? orders.filter(isCountableOrder)
      : [];

  const now = options.now instanceof Date ? options.now : new Date();
  const recentDays =
    Number.isFinite(options.recentDays) && options.recentDays > 0 ? options.recentDays : 7;
  const recentMs = recentDays * 24 * 60 * 60 * 1000;
  const previousMs = recentMs;

  let recentRevenue = 0;
  let previousRevenue = 0;
  let recentOrderCount = 0;

  for (const order of scoped) {
    const date = resolveOrderDate(order);
    if (!date) continue;

    const ageMs = now.getTime() - date.getTime();
    const total = resolveOrderTotal(order);

    if (ageMs >= 0 && ageMs <= recentMs) {
      recentRevenue += total;
      recentOrderCount += 1;
    } else if (ageMs > recentMs && ageMs <= recentMs + previousMs) {
      previousRevenue += total;
    }
  }

  const currentRevenue = recentRevenue;
  const trend = resolveRevenueTrend(recentRevenue, previousRevenue);
  const growthFactor = trend === 'up' ? 1.12 : trend === 'down' ? 0.9 : 1.02;
  const predictedRevenue = Math.round(currentRevenue * growthFactor);
  const risk = resolveRevenueRisk(trend, recentOrderCount);

  return {
    currentRevenue,
    predictedRevenue,
    trend,
    risk
  };
}
