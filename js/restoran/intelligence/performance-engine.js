/**
 * GarsonAI kitchen performance analyzer.
 */
import { filterByRestaurantId } from './tenant-utils.js';

/**
 * @typedef {Object} PerformanceAnalysis
 * @property {number} avgPreparationTime
 * @property {number} delayedRate
 * @property {number} score
 * @property {number} completedOrders
 * @property {number} delayedOrders
 */

const DEFAULT_DELAY_THRESHOLD_MINUTES = 30;

/**
 * @param {unknown} order
 * @returns {boolean}
 */
function isCompletedOrder(order) {
  const status = String(
    /** @type {Record<string, unknown>} */ (order).status || ''
  )
    .trim()
    .toLowerCase();
  return status === 'completed' || status === 'delivered' || status === 'served';
}

/**
 * @param {unknown} order
 * @returns {number|null}
 */
function resolvePreparationMinutes(order) {
  const row = /** @type {Record<string, unknown>} */ (
    order && typeof order === 'object' ? order : {}
  );

  const direct = row.preparationMinutes ?? row.preparation_minutes ?? row.prep_time_minutes;
  const directNum = direct != null && direct !== '' ? Number(direct) : null;
  if (directNum != null && Number.isFinite(directNum) && directNum >= 0) {
    return directNum;
  }

  const createdRaw = row.createdAt ?? row.created_at;
  const readyRaw = row.readyAt ?? row.ready_at ?? row.completedAt ?? row.completed_at;
  if (!createdRaw || !readyRaw) return null;

  const created = new Date(String(createdRaw));
  const ready = new Date(String(readyRaw));
  if (Number.isNaN(created.getTime()) || Number.isNaN(ready.getTime())) return null;

  return Math.max(0, Math.round((ready.getTime() - created.getTime()) / 60000));
}

/**
 * @param {unknown} order
 * @param {number} thresholdMinutes
 * @returns {boolean}
 */
function isDelayedOrder(order, thresholdMinutes) {
  const row = /** @type {Record<string, unknown>} */ (
    order && typeof order === 'object' ? order : {}
  );

  if (row.delayed === true || row.is_delayed === true) return true;

  const prep = resolvePreparationMinutes(order);
  return prep != null && prep >= thresholdMinutes;
}

/**
 * @param {number} delayedRate
 * @param {number} avgPreparationTime
 * @returns {number}
 */
export function calculatePerformanceScore(delayedRate, avgPreparationTime) {
  const delayPenalty = Math.min(60, Math.round(delayedRate * 100));
  const prepPenalty = Math.min(30, Math.max(0, avgPreparationTime - 15));
  const score = 100 - delayPenalty - prepPenalty;
  return Math.max(0, Math.min(100, score));
}

/**
 * @param {unknown[]} orders
 * @param {{ restaurantId?: string, delayThresholdMinutes?: number }} [options]
 * @returns {PerformanceAnalysis}
 */
export function analyzePerformance(orders, options = {}) {
  const scoped = options.restaurantId
    ? filterByRestaurantId(orders, options.restaurantId)
    : Array.isArray(orders)
      ? orders
      : [];

  const threshold =
    Number.isFinite(options.delayThresholdMinutes) && options.delayThresholdMinutes > 0
      ? options.delayThresholdMinutes
      : DEFAULT_DELAY_THRESHOLD_MINUTES;

  const completed = scoped.filter(isCompletedOrder);
  const prepTimes = completed
    .map((order) => resolvePreparationMinutes(order))
    .filter((value) => value != null);

  const avgPreparationTime = prepTimes.length
    ? Math.round(prepTimes.reduce((sum, value) => sum + value, 0) / prepTimes.length)
    : 0;

  const delayedOrders = completed.filter((order) => isDelayedOrder(order, threshold)).length;
  const completedOrders = completed.length;
  const delayedRate = completedOrders ? delayedOrders / completedOrders : 0;
  const score = calculatePerformanceScore(delayedRate, avgPreparationTime);

  return {
    avgPreparationTime,
    delayedRate,
    score,
    completedOrders,
    delayedOrders
  };
}
