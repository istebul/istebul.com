/**
 * GarsonAI dashboard service — connects intelligence + growth engines for panel UI.
 */
import { analyzeRestaurantPerformance } from '../intelligence/index.js';
import { analyzeRestaurantGrowth } from '../growth/index.js';
import { filterByRestaurantId } from '../intelligence/tenant-utils.js';

export class RestaurantDashboardError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RestaurantDashboardError';
  }
}

/**
 * @typedef {Object} DashboardSalesSummary
 * @property {number} dailyRevenue
 * @property {number} orderCount
 * @property {number} averageBasket
 * @property {number} totalRevenue
 * @property {import('../intelligence/sales-analyzer.js').ProductSalesStat[]} topProducts
 */

/**
 * @typedef {Object} DashboardKitchenSummary
 * @property {number} score
 * @property {number} avgPreparationTime
 * @property {number} delayedRate
 * @property {string} statusLabel
 */

/**
 * @typedef {Object} DashboardCustomerSummary
 * @property {number} totalCustomers
 * @property {number} vipCount
 * @property {number} repeatCount
 * @property {number} inactiveCount
 */

/**
 * @typedef {Object} DashboardRecommendations
 * @property {string[]} advice
 * @property {import('../growth/campaign-engine.js').CampaignSuggestion[]} campaigns
 * @property {string[]} discounts
 */

/**
 * @typedef {Object} RestaurantDashboardReport
 * @property {string} restaurantId
 * @property {DashboardSalesSummary} sales
 * @property {DashboardKitchenSummary} kitchen
 * @property {DashboardCustomerSummary} customers
 * @property {DashboardRecommendations} recommendations
 */

/**
 * @param {unknown} order
 * @returns {boolean}
 */
function isCountableOrder(order) {
  const status = String(
    /** @type {Record<string, unknown>} */ (order).status || 'completed'
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
  const raw = row.createdAt ?? row.created_at ?? row.placedAt ?? row.placed_at;
  if (!raw) return null;
  const date = new Date(String(raw));
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * @param {unknown[]} orders
 * @param {Date} now
 * @returns {{ dailyRevenue: number, dailyOrderCount: number }}
 */
export function resolveDailySalesMetrics(orders, now) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  let dailyRevenue = 0;
  let dailyOrderCount = 0;

  for (const order of orders) {
    if (!isCountableOrder(order)) continue;
    const date = resolveOrderDate(order);
    if (!date || date < start || date >= end) continue;
    dailyRevenue += resolveOrderTotal(order);
    dailyOrderCount += 1;
  }

  return { dailyRevenue, dailyOrderCount };
}

/**
 * @param {number} score
 * @returns {string}
 */
export function resolveKitchenStatusLabel(score) {
  if (score >= 85) return 'Mükemmel';
  if (score >= 70) return 'İyi';
  if (score >= 50) return 'Orta';
  return 'Dikkat';
}

/**
 * @param {unknown} menu
 * @returns {unknown[]}
 */
export function flattenProductsFromMenu(menu) {
  if (!menu || typeof menu !== 'object') return [];

  const root = /** @type {Record<string, unknown>} */ (menu);
  const categories = Array.isArray(root.categories) ? root.categories : [];

  /** @type {unknown[]} */
  const products = [];

  for (const category of categories) {
    if (!category || typeof category !== 'object') continue;
    const row = /** @type {Record<string, unknown>} */ (category);
    const items = Array.isArray(row.items) ? row.items : [];
    for (const item of items) {
      if (item && typeof item === 'object') products.push(item);
    }
  }

  return products;
}

/**
 * @param {unknown[]} normalizedOrders
 * @param {string} restaurantId
 * @returns {unknown[]}
 */
export function enrichOrdersForIntelligence(normalizedOrders, restaurantId) {
  const now = new Date();
  const todayIso = now.toISOString();

  return normalizedOrders.map((order, index) => {
    const row = /** @type {Record<string, unknown>} */ (
      order && typeof order === 'object' ? order : {}
    );
    const raw = row.raw && typeof row.raw === 'object' ? row.raw : row;

    return {
      id: row.id ?? `order-${index}`,
      restaurantId: row.restaurantId ?? row.restaurant_id ?? restaurantId,
      status: String(raw.status ?? 'completed'),
      total: row.total ?? raw.total ?? 0,
      createdAt: raw.createdAt ?? raw.created_at ?? todayIso,
      preparationMinutes: raw.preparationMinutes ?? raw.preparation_minutes ?? 18,
      delayed: raw.delayed === true || raw.is_delayed === true,
      items: Array.isArray(row.items)
        ? row.items
        : Array.isArray(raw.items)
          ? raw.items
          : []
    };
  });
}

/**
 * @param {string} restaurantId
 * @returns {{ orders: unknown[], products: unknown[], customers: unknown[] }}
 */
export function buildDemoDashboardDataset(restaurantId) {
  const id = String(restaurantId || '').trim();

  const orders = [
    {
      id: 'dash-o-1',
      restaurantId: id,
      customerId: 'c-1',
      status: 'completed',
      total: 420,
      createdAt: '2026-07-09T12:00:00.000Z',
      preparationMinutes: 18,
      delayed: false,
      items: [{ name: 'Lahmacun', quantity: 2, menuItemId: 'item-lahmacun' }]
    },
    {
      id: 'dash-o-2',
      restaurantId: id,
      customerId: 'c-1',
      status: 'completed',
      total: 360,
      createdAt: '2026-07-09T13:30:00.000Z',
      preparationMinutes: 35,
      delayed: true,
      items: [{ name: 'Adana kebap', quantity: 1, menuItemId: 'item-kebap' }]
    },
    {
      id: 'dash-o-3',
      restaurantId: id,
      customerId: 'c-2',
      status: 'completed',
      total: 780,
      createdAt: '2026-07-09T14:00:00.000Z',
      preparationMinutes: 12,
      delayed: false,
      items: [{ name: 'Lahmacun', quantity: 4, menuItemId: 'item-lahmacun' }]
    },
    {
      id: 'dash-o-4',
      restaurantId: id,
      customerId: 'c-3',
      status: 'completed',
      total: 120,
      createdAt: '2026-05-01T10:00:00.000Z',
      preparationMinutes: 10,
      delayed: false,
      items: [{ name: 'Ayran', quantity: 2 }]
    },
    {
      id: 'dash-o-other',
      restaurantId: 'b0000000-0000-4000-8000-00000000bistro',
      status: 'completed',
      total: 999,
      createdAt: '2026-07-09T12:00:00.000Z',
      items: [{ name: 'Başka ürün', quantity: 1 }]
    }
  ];

  const products = [
    { id: 'item-lahmacun', restaurant_id: id, name: 'Lahmacun', price: 120, active: true },
    { id: 'item-kebap', restaurant_id: id, name: 'Adana kebap', price: 360, active: true },
    { id: 'item-ayran', restaurant_id: id, name: 'Ayran', price: 40, active: true }
  ];

  const customers = [
    { id: 'c-1', restaurantId: id, name: 'Ahmet Yılmaz', phone: '+905551110001' },
    { id: 'c-2', restaurantId: id, name: 'Ayşe Demir', phone: '+905551110002' },
    { id: 'c-3', restaurantId: id, name: 'Mehmet Kaya', phone: '+905551110003' },
    {
      id: 'c-other',
      restaurantId: 'b0000000-0000-4000-8000-00000000bistro',
      name: 'Başka Müşteri',
      phone: '+905559999999'
    }
  ];

  return { orders, products, customers };
}

/**
 * @param {{ restaurantId?: string, client?: import('@supabase/supabase-js').SupabaseClient, now?: Date, useSupabase?: boolean }} [options]
 * @returns {Promise<{ source: 'supabase'|'mock'|'fallback', orders: unknown[], products: unknown[], customers: unknown[] }>}
 */
export async function loadProductionDashboardDataset(options = {}) {
  const restaurantId = String(options.restaurantId || '').trim();
  if (!restaurantId) {
    throw new RestaurantDashboardError('Restoran kimliği gerekli.');
  }

  const {
    getRestaurantOrderData,
    getRestaurantMenuData,
    getRestaurantCustomerData,
    isGarsonSupabaseClientAvailable,
    getGarsonDataClient
  } = await import('../data-service.js');

  const client = options.client || getGarsonDataClient(options);
  const supabaseReady = isGarsonSupabaseClientAvailable(client, options);

  if (!supabaseReady) {
    const demo = buildDemoDashboardDataset(restaurantId);
    return { source: 'mock', ...demo };
  }

  const [ordersResult, menuResult, customersResult] = await Promise.all([
    getRestaurantOrderData({ restaurantId, client, useSupabase: true }),
    getRestaurantMenuData({ restaurantId, client, useSupabase: true }),
    getRestaurantCustomerData({ restaurantId, client, useSupabase: true })
  ]);

  const source =
    ordersResult.source === 'supabase' ||
    menuResult.source === 'supabase' ||
    customersResult.source === 'supabase'
      ? 'supabase'
      : ordersResult.source === 'fallback' ||
          menuResult.source === 'fallback' ||
          customersResult.source === 'fallback'
        ? 'fallback'
        : 'mock';

  const orders = enrichOrdersForIntelligence(
    ordersResult.data.orders || [],
    restaurantId
  );
  const products = flattenProductsFromMenu(menuResult.data);
  const customers = (customersResult.data.customers || []).map((customer) => ({
    id: customer.id,
    restaurantId: customer.restaurantId,
    name: customer.name,
    phone: customer.phone,
    totalOrders: customer.totalOrders,
    totalSpent: customer.totalSpent,
    lastOrderAt: customer.lastOrderAt
  }));

  if (!orders.length && !products.length && !customers.length && source !== 'supabase') {
    const demo = buildDemoDashboardDataset(restaurantId);
    return { source: 'mock', ...demo };
  }

  return { source, orders, products, customers };
}

/**
 * @param {{ restaurantId?: string, orders?: unknown[], products?: unknown[], customers?: unknown[], now?: Date }} input
 * @returns {RestaurantDashboardReport}
 */
export function loadRestaurantDashboard(input = {}) {
  const restaurantId = String(input.restaurantId || '').trim();
  if (!restaurantId) {
    throw new RestaurantDashboardError('Restoran kimliği gerekli.');
  }

  const now = input.now instanceof Date ? input.now : new Date();
  const scopedOrders = filterByRestaurantId(input.orders || [], restaurantId);
  const performance = analyzeRestaurantPerformance({
    restaurantId,
    orders: scopedOrders,
    products: input.products || []
  });
  const growth = analyzeRestaurantGrowth({
    restaurantId,
    orders: scopedOrders,
    customers: input.customers || [],
    peakHours: performance.peakHours,
    now
  });

  const daily = resolveDailySalesMetrics(scopedOrders, now);
  const orderCount = daily.dailyOrderCount || performance.sales.totalOrders;
  const averageBasket =
    orderCount > 0
      ? Math.round((daily.dailyRevenue / orderCount) * 100) / 100
      : performance.sales.averageBasket;

  const kitchenScore = performance.performance.score;
  const advice = [
    ...performance.advice,
    ...growth.campaigns.map((campaign) => campaign.message),
    ...growth.discounts
  ];

  return {
    restaurantId,
    sales: {
      dailyRevenue: daily.dailyRevenue,
      orderCount,
      averageBasket,
      totalRevenue: performance.sales.totalRevenue,
      topProducts: performance.sales.topProducts
    },
    kitchen: {
      score: kitchenScore,
      avgPreparationTime: performance.performance.avgPreparationTime,
      delayedRate: performance.performance.delayedRate,
      statusLabel: resolveKitchenStatusLabel(kitchenScore)
    },
    customers: {
      totalCustomers: growth.customers.totalCustomers,
      vipCount: growth.customers.vipCustomers.length,
      repeatCount: growth.customers.repeatCustomers.length,
      inactiveCount: growth.customers.inactiveCustomers.length
    },
    recommendations: {
      advice: performance.advice,
      campaigns: growth.campaigns,
      discounts: growth.discounts,
      highlights: advice.slice(0, 5)
    }
  };
}

/**
 * @param {{ restaurantId?: string, client?: import('@supabase/supabase-js').SupabaseClient, now?: Date, useSupabase?: boolean }} [options]
 * @returns {Promise<RestaurantDashboardReport>}
 */
export async function loadRestaurantDashboardLive(options = {}) {
  const restaurantId = String(options.restaurantId || '').trim();
  const dataset = await loadProductionDashboardDataset(options);

  return loadRestaurantDashboard({
    restaurantId,
    orders: dataset.orders,
    products: dataset.products,
    customers: dataset.customers,
    now: options.now
  });
}
