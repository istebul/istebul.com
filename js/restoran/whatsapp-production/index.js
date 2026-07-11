/**
 * GarsonAI production WhatsApp integration orchestrator.
 */
import { processWhatsAppOrderMessage } from '../whatsapp/index.js';
import { getRestaurantMenuData } from '../data-service.js';
import { requireRestaurantId } from '../database/tenant-utils.js';
import { processWebhook } from './webhook-handler.js';
import { routeWhatsAppMessage, isOrderCapableMessage } from './message-router.js';
import { persistProductionOrder } from './order-persistence.js';
import { syncWhatsAppCustomer } from './customer-sync.js';
import { generateProductionReply } from './reply-engine.js';

export { verifyWebhookChallenge, processWebhook, resolveRestaurantIdFromWebhook, WhatsAppWebhookError } from './webhook-handler.js';
export { routeWhatsAppMessage, isOrderCapableMessage, WHATSAPP_MESSAGE_TYPES } from './message-router.js';
export { persistProductionOrder, WhatsAppProductionPersistenceError } from './order-persistence.js';
export { syncWhatsAppCustomer, normalizeWhatsAppPhone, WhatsAppCustomerSyncError } from './customer-sync.js';
export { generateOrderStatusReply, generateProductionReply, ORDER_STATUS_REPLIES } from './reply-engine.js';

/**
 * @typedef {Object} ProcessProductionWhatsAppInput
 * @property {string} restaurantId
 * @property {string} [message]
 * @property {unknown} [webhookMessage]
 * @property {unknown} [menu]
 * @property {{ phone?: string, name?: string, whatsappId?: string }} [customer]
 * @property {import('@supabase/supabase-js').SupabaseClient} [client]
 * @property {boolean} [useSupabase]
 * @property {boolean} [persist]
 */

/**
 * @param {ProcessProductionWhatsAppInput} input
 * @returns {Promise<{ restaurantId: string, routed: import('./message-router.js').RoutedWhatsAppMessage, pipeline: import('../whatsapp/index.js').ProcessWhatsAppMessageResult, customer: Record<string, unknown>|null, persistence: { persisted: boolean, source: string, order: Record<string, unknown>|null }, reply: string }>}
 */
export async function processProductionWhatsAppMessage(input = {}) {
  const restaurantId = requireRestaurantId(input.restaurantId);
  const persist = input.persist !== false;

  const routed = input.webhookMessage
    ? routeWhatsAppMessage(input.webhookMessage)
    : {
        type: /** @type {'text'} */ ('text'),
        text: String(input.message || '').trim(),
        messageId: '',
        from: input.customer?.phone || '',
        timestamp: '',
        raw: {}
      };

  let menu = input.menu;
  if (!menu) {
    const menuResult = await getRestaurantMenuData({
      restaurantId,
      client: input.client,
      useSupabase: input.useSupabase
    });
    menu = menuResult.data;
  }

  const pipeline = processWhatsAppOrderMessage({
    message: routed.text,
    restaurantId,
    menu,
    customer: input.customer
  });

  let customerRecord = null;
  let persistence = { persisted: false, source: 'mock', order: null };

  if (pipeline.order && persist) {
    const customerSync = await syncWhatsAppCustomer({
      restaurantId,
      customer: {
        ...input.customer,
        ...pipeline.order.customer
      },
      orderTotal: pipeline.order.total,
      client: input.client,
      useSupabase: input.useSupabase
    });
    customerRecord = customerSync.customer;

    persistence = await persistProductionOrder(pipeline.order, {
      restaurantId,
      customerId: customerRecord?.id ? String(customerRecord.id) : undefined,
      client: input.client,
      useSupabase: input.useSupabase
    });
  }

  const reply = generateProductionReply({
    intent: pipeline.intent,
    orderCreated: Boolean(pipeline.order),
    orderStatus: pipeline.order?.status,
    unmatchedProducts: pipeline.unmatchedItems.length > 0
  });

  return {
    restaurantId,
    routed,
    pipeline,
    customer: customerRecord,
    persistence,
    reply
  };
}

/**
 * @param {unknown} payload
 * @param {{ restaurantId?: string, restaurantMap?: Record<string, string>, client?: import('@supabase/supabase-js').SupabaseClient, useSupabase?: boolean, persist?: boolean }} [options]
 * @returns {Promise<Array<Awaited<ReturnType<typeof processProductionWhatsAppMessage>>>>}
 */
export async function processProductionWebhook(payload, options = {}) {
  const inbound = processWebhook(payload, options);
  const results = [];

  for (const item of inbound) {
    if (!isOrderCapableMessage(item.message) || !item.message.text) {
      results.push({
        restaurantId: item.restaurantId,
        routed: item.message,
        pipeline: {
          intent: 'unknown',
          parsed: { text: item.message.text, items: [] },
          matchedItems: [],
          unmatchedItems: [],
          order: null
        },
        customer: null,
        persistence: { persisted: false, source: 'mock', order: null },
        reply: generateProductionReply({ intent: 'unknown' })
      });
      continue;
    }

    const result = await processProductionWhatsAppMessage({
      restaurantId: item.restaurantId,
      webhookMessage: item.raw,
      message: item.message.text,
      customer: item.customer,
      client: options.client,
      useSupabase: options.useSupabase,
      persist: options.persist
    });
    results.push(result);
  }

  return results;
}
