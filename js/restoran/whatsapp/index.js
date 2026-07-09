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
