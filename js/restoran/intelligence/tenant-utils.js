/**
 * Shared tenant scoping helpers for GarsonAI intelligence modules.
 */

/**
 * @param {unknown} record
 * @returns {string}
 */
export function resolveRestaurantId(record) {
  if (!record || typeof record !== 'object') return '';
  const row = /** @type {Record<string, unknown>} */ (record);
  return String(row.restaurantId ?? row.restaurant_id ?? '').trim();
}

/**
 * @param {unknown[]} records
 * @param {string} restaurantId
 * @returns {unknown[]}
 */
export function filterByRestaurantId(records, restaurantId) {
  const targetId = String(restaurantId || '').trim();
  if (!targetId || !Array.isArray(records)) return [];

  return records.filter((record) => resolveRestaurantId(record) === targetId);
}

/**
 * @param {unknown} products
 * @param {string} restaurantId
 * @returns {unknown[]}
 */
export function flattenRestaurantProducts(products, restaurantId) {
  const targetId = String(restaurantId || '').trim();
  if (!targetId || !Array.isArray(products)) return [];

  /** @type {unknown[]} */
  const flattened = [];

  for (const entry of products) {
    if (!entry || typeof entry !== 'object') continue;
    const row = /** @type {Record<string, unknown>} */ (entry);

    if (row.items || row.products || row.menu_items) {
      const itemSource = row.items ?? row.products ?? row.menu_items;
      if (Array.isArray(itemSource)) {
        for (const item of itemSource) flattened.push(item);
      }
      continue;
    }

    flattened.push(entry);
  }

  return filterByRestaurantId(flattened, targetId);
}
