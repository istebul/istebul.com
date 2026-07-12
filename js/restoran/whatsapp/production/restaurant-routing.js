/**
 * GarsonAI WhatsApp production restoran yönlendirme (phone_number_id → restaurant_id).
 */
import {
  resolveRestaurantIdFromWebhook,
  WhatsAppWebhookError
} from '../../whatsapp-production/webhook-handler.js';

export { WhatsAppWebhookError };

/**
 * @typedef {Object} RestaurantRoutingInput
 * @property {string} [phoneNumberId]
 * @property {unknown} [metadata]
 * @property {string} [restaurantId]
 * @property {Record<string, string>} [restaurantMap]
 */

/**
 * @param {RestaurantRoutingInput} input
 * @returns {string}
 */
export function resolveRestaurantFromPhoneNumberId(input = {}) {
  const phoneNumberId = String(input.phoneNumberId || '').trim();
  const metadata =
    input.metadata && typeof input.metadata === 'object'
      ? {
          .../** @type {Record<string, unknown>} */ (input.metadata),
          phone_number_id: phoneNumberId || /** @type {Record<string, unknown>} */ (input.metadata).phone_number_id
        }
      : { phone_number_id: phoneNumberId };

  return resolveRestaurantIdFromWebhook(metadata, {
    restaurantId: input.restaurantId,
    restaurantMap: input.restaurantMap
  });
}

/**
 * @param {unknown} payload
 * @param {{ restaurantMap?: Record<string, string> }} [options]
 * @returns {Array<{ phoneNumberId: string, restaurantId: string }>}
 */
export function extractRestaurantRoutesFromWebhook(payload, options = {}) {
  const root = /** @type {Record<string, unknown>} */ (
    payload && typeof payload === 'object' ? payload : {}
  );
  const entries = Array.isArray(root.entry) ? root.entry : [];
  /** @type {Array<{ phoneNumberId: string, restaurantId: string }>} */
  const routes = [];

  for (const entry of entries) {
    const entryRow = /** @type {Record<string, unknown>} */ (
      entry && typeof entry === 'object' ? entry : {}
    );
    const changes = Array.isArray(entryRow.changes) ? entryRow.changes : [];

    for (const change of changes) {
      const changeRow = /** @type {Record<string, unknown>} */ (
        change && typeof change === 'object' ? change : {}
      );
      const value = /** @type {Record<string, unknown>} */ (
        changeRow.value && typeof changeRow.value === 'object' ? changeRow.value : {}
      );
      const metadata = /** @type {Record<string, unknown>} */ (value.metadata || {});
      const phoneNumberId = String(metadata.phone_number_id ?? '').trim();
      if (!phoneNumberId) continue;

      const restaurantId = resolveRestaurantFromPhoneNumberId({
        phoneNumberId,
        metadata,
        restaurantMap: options.restaurantMap
      });
      routes.push({ phoneNumberId, restaurantId });
    }
  }

  return routes;
}
