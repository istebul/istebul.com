/**
 * GarsonAI WhatsApp order engine entrypoint.
 */
import { detectIntent, isOrderIntent } from './intent-detector.js';
import { parseWhatsAppMessage } from './message-parser.js';
import { flattenMenuProducts, matchProductsToMenu } from './product-matcher.js';
import { buildWhatsAppOrder } from './order-builder.js';

/**
 * @typedef {Object} ProcessWhatsAppMessageInput
 * @property {string} message
 * @property {string} restaurantId
 * @property {unknown} [menu]
 * @property {{ phone?: string, name?: string, whatsappId?: string }} [customer]
 */

/**
 * @typedef {Object} ProcessWhatsAppMessageResult
 * @property {string} intent
 * @property {import('./message-parser.js').ParsedWhatsAppMessage} parsed
 * @property {import('./product-matcher.js').MatchedOrderItem[]} matchedItems
 * @property {import('./product-matcher.js').MatchedOrderItem[]} unmatchedItems
 * @property {import('./order-builder.js').WhatsAppOrder|null} order
 */

/**
 * @param {ProcessWhatsAppMessageInput} input
 * @returns {ProcessWhatsAppMessageResult}
 */
export function processWhatsAppOrderMessage(input = {}) {
  const message = String(input.message || '').trim();
  const restaurantId = String(input.restaurantId || '').trim();
  const intent = detectIntent(message);
  const parsed = parseWhatsAppMessage(message, { intent });

  if (!isOrderIntent(intent)) {
    return {
      intent,
      parsed,
      matchedItems: [],
      unmatchedItems: [],
      order: null
    };
  }

  const products = flattenMenuProducts(input.menu, restaurantId);
  const matchedItems = matchProductsToMenu(parsed.items, products, { restaurantId });
  const unmatchedItems = matchedItems.filter((item) => !item.matched);

  if (unmatchedItems.length) {
    return {
      intent,
      parsed,
      matchedItems,
      unmatchedItems,
      order: null
    };
  }

  const order = buildWhatsAppOrder({
    restaurantId,
    customer: input.customer,
    matchedItems
  });

  return {
    intent,
    parsed,
    matchedItems,
    unmatchedItems,
    order
  };
}

/**
 * @param {import('./order-builder.js').WhatsAppOrder|null} whatsappOrder
 * @param {{ client?: import('@supabase/supabase-js').SupabaseClient, useSupabase?: boolean, customerId?: string }} [options]
 * @returns {Promise<{ persisted: boolean, source: 'supabase'|'mock', order: Record<string, unknown>|import('./order-builder.js').WhatsAppOrder|null }>}
 */
export async function persistWhatsAppOrder(whatsappOrder, options = {}) {
  if (!whatsappOrder) {
    return { persisted: false, source: 'mock', order: null };
  }

  const { createOrder } = await import('../database/order-repository.js');
  const { isGarsonSupabaseClientAvailable, getGarsonDataClient } = await import('../data-service.js');

  const client = options.client || getGarsonDataClient(options);
  if (!isGarsonSupabaseClientAvailable(client, options)) {
    return { persisted: false, source: 'mock', order: whatsappOrder };
  }

  const saved = await createOrder({
    restaurantId: whatsappOrder.restaurantId,
    client,
    order: {
      status: whatsappOrder.status,
      totalAmount: whatsappOrder.total,
      source: whatsappOrder.source || 'whatsapp',
      customerId: options.customerId
    },
    items: (whatsappOrder.items || []).map((item) => ({
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      note: item.note
    }))
  });

  return { persisted: true, source: 'supabase', order: saved };
}

export { detectIntent, isOrderIntent, WHATSAPP_INTENTS } from './intent-detector.js';
export { parseWhatsAppMessage, extractOrderItems, normalizeOrderMessage } from './message-parser.js';
export {
  flattenMenuProducts,
  matchProductsToMenu,
  findBestMenuProductMatch,
  normalizeProductText,
  levenshteinDistance
} from './product-matcher.js';
export {
  buildWhatsAppOrder,
  calculateOrderTotal,
  mapMatchedItemsToOrderLines,
  normalizeWhatsAppCustomer,
  WhatsAppOrderBuilderError
} from './order-builder.js';
