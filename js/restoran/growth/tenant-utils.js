/**
 * Shared tenant scoping helpers for GarsonAI growth modules.
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
 * @param {unknown} customer
 * @returns {string}
 */
export function resolveCustomerKey(customer) {
  if (!customer || typeof customer !== 'object') return '';
  const row = /** @type {Record<string, unknown>} */ (customer);
  return (
    String(row.id ?? row.customerId ?? row.customer_id ?? '').trim() ||
    String(row.phone ?? row.customer_phone ?? '').trim() ||
    String(row.whatsappId ?? row.whatsapp_id ?? '').trim() ||
    String(row.name ?? row.customer_name ?? '').trim().toLowerCase()
  );
}

/**
 * @param {unknown} order
 * @returns {string}
 */
export function resolveOrderCustomerKey(order) {
  if (!order || typeof order !== 'object') return '';
  const row = /** @type {Record<string, unknown>} */ (order);
  const nested =
    row.customer && typeof row.customer === 'object'
      ? /** @type {Record<string, unknown>} */ (row.customer)
      : row;

  return (
    String(row.customerId ?? row.customer_id ?? nested.id ?? '').trim() ||
    String(nested.phone ?? nested.customer_phone ?? '').trim() ||
    String(nested.whatsappId ?? nested.whatsapp_id ?? '').trim() ||
    String(nested.name ?? nested.customer_name ?? '').trim().toLowerCase()
  );
}
