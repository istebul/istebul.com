/**
 * GarsonAI menu insight generator.
 */
import { analyzeSales } from './sales-analyzer.js';
import { flattenRestaurantProducts } from './tenant-utils.js';

/**
 * @typedef {Object} MenuInsights
 * @property {string[]} recommendations
 * @property {string[]} topPerformers
 * @property {string[]} underperformers
 * @property {string[]} inactiveProducts
 */

/**
 * @param {unknown} product
 * @returns {{ id: string, name: string, active: boolean }}
 */
function normalizeProduct(product) {
  const row = /** @type {Record<string, unknown>} */ (
    product && typeof product === 'object' ? product : {}
  );

  return {
    id: String(row.id ?? row.menu_item_id ?? '').trim(),
    name: String(row.name ?? row.product_name ?? '').trim(),
    active: row.active !== false && row.is_active !== false && row.is_active !== 0
  };
}

/**
 * @param {unknown[]} products
 * @param {unknown[]} orders
 * @param {{ restaurantId?: string }} [options]
 * @returns {MenuInsights}
 */
export function generateMenuInsights(products, orders, options = {}) {
  const restaurantId = String(options.restaurantId || '').trim();
  const scopedProducts = restaurantId
    ? flattenRestaurantProducts(products, restaurantId)
    : Array.isArray(products)
      ? products
      : [];

  const sales = analyzeSales(orders, { restaurantId });
  const normalizedProducts = scopedProducts.map(normalizeProduct).filter((item) => item.name);

  const soldIds = new Set(
    sales.topProducts
      .concat(sales.slowProducts)
      .map((item) => String(item.menuItemId || '').trim())
      .filter(Boolean)
  );

  const topPerformers = sales.topProducts.slice(0, 3).map((item) => item.name);
  const underperformers = sales.slowProducts.slice(0, 3).map((item) => item.name);
  const inactiveProducts = normalizedProducts
    .filter((product) => !product.active)
    .map((product) => product.name);

  /** @type {string[]} */
  const recommendations = [];

  if (topPerformers[0]) {
    recommendations.push(
      `${topPerformers[0]} çok satıyor; öne çıkarma ve çapraz satış paketlerine ekleyin.`
    );
  }

  if (underperformers[0]) {
    recommendations.push(
      `${underperformers[0]} düşük talep görüyor; fiyat, görünürlük veya menü konumunu gözden geçirin.`
    );
  }

  const unsoldProducts = normalizedProducts
    .filter((product) => product.active && product.id && !soldIds.has(product.id))
    .map((product) => product.name);

  if (unsoldProducts[0]) {
    recommendations.push(
      `${unsoldProducts[0]} son dönemde hiç satılmadı; kampanya veya menüden çıkarma değerlendirin.`
    );
  }

  if (inactiveProducts[0]) {
    recommendations.push(
      `${inactiveProducts[0]} pasif durumda; stok ve talep uygunsa yeniden aktifleştirmeyi düşünün.`
    );
  }

  if (!recommendations.length) {
    recommendations.push('Menü performansı dengeli görünüyor; haftalık satış trendini izlemeye devam edin.');
  }

  return {
    recommendations,
    topPerformers,
    underperformers,
    inactiveProducts
  };
}
