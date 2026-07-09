/**
 * GarsonAI restaurant sales analyzer.
 */
import { filterByRestaurantId } from './tenant-utils.js';

/**
 * @typedef {Object} ProductSalesStat
 * @property {string} name
 * @property {string} [menuItemId]
 * @property {number} quantity
 * @property {number} revenue
 */

/**
 * @typedef {Object} SalesAnalysis
 * @property {number} totalRevenue
 * @property {number} totalOrders
 * @property {number} averageBasket
 * @property {ProductSalesStat[]} topProducts
 * @property {ProductSalesStat[]} slowProducts
 */

/**
 * @param {unknown} order
 * @returns {boolean}
 */
function isCountableOrder(order) {
  if (!order || typeof order !== 'object') return false;
  const status = String(/** @type {Record<string, unknown>} */ (order).status || '')
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
 * @param {unknown[]} orders
 * @returns {Map<string, ProductSalesStat>}
 */
function aggregateProductSales(orders) {
  /** @type {Map<string, ProductSalesStat>} */
  const stats = new Map();

  for (const order of orders) {
    const row = /** @type {Record<string, unknown>} */ (
      order && typeof order === 'object' ? order : {}
    );
    const items = Array.isArray(row.items) ? row.items : [];
    const orderTotal = resolveOrderTotal(order);
    const itemRevenueShare = items.length ? orderTotal / items.length : 0;

    for (const item of items) {
      const record = /** @type {Record<string, unknown>} */ (
        item && typeof item === 'object' ? item : {}
      );
      const name = String(record.name ?? record.product_name ?? '').trim();
      if (!name) continue;

      const menuItemId = String(record.menuItemId ?? record.menu_item_id ?? record.id ?? '')
        .trim();
      const key = menuItemId || name.toLowerCase();
      const qtyRaw = Number.parseInt(String(record.quantity ?? record.qty ?? '1'), 10);
      const quantity = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;
      const lineTotalRaw = record.lineTotal ?? record.line_total ?? record.total;
      const lineTotalNum =
        lineTotalRaw != null && lineTotalRaw !== '' ? Number(lineTotalRaw) : null;
      const revenue =
        lineTotalNum != null && Number.isFinite(lineTotalNum)
          ? lineTotalNum
          : itemRevenueShare;

      const existing = stats.get(key) || {
        name,
        menuItemId: menuItemId || undefined,
        quantity: 0,
        revenue: 0
      };

      existing.quantity += quantity;
      existing.revenue += revenue;
      stats.set(key, existing);
    }
  }

  return stats;
}

/**
 * @param {unknown[]} orders
 * @param {{ restaurantId?: string }} [options]
 * @returns {SalesAnalysis}
 */
export function analyzeSales(orders, options = {}) {
  const scoped = options.restaurantId
    ? filterByRestaurantId(orders, options.restaurantId)
    : Array.isArray(orders)
      ? orders
      : [];

  const countable = scoped.filter(isCountableOrder);
  const totalRevenue = countable.reduce((sum, order) => sum + resolveOrderTotal(order), 0);
  const totalOrders = countable.length;
  const averageBasket = totalOrders ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;

  const productStats = [...aggregateProductSales(countable).values()].sort((left, right) => {
    if (right.quantity !== left.quantity) return right.quantity - left.quantity;
    return right.revenue - left.revenue;
  });

  const topProducts = productStats.slice(0, 5);
  const slowProducts = [...productStats]
    .sort((left, right) => {
      if (left.quantity !== right.quantity) return left.quantity - right.quantity;
      return left.revenue - right.revenue;
    })
    .slice(0, 5);

  return {
    totalRevenue,
    totalOrders,
    averageBasket,
    topProducts,
    slowProducts
  };
}
