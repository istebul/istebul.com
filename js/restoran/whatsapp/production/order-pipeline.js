/**
 * GarsonAI WhatsApp production sipariş hattı.
 * WhatsApp → AI Parser → Order → Kitchen → Notification
 */
import {
  generateProductionReply,
  isOrderCapableMessage,
  processProductionWhatsAppMessage
} from '../../whatsapp-production/index.js';
import { processWebhook } from '../../whatsapp-production/webhook-handler.js';
import { getRestaurantMenuData } from '../../data-service.js';
import { buildKitchenQueue } from '../../kitchen/kitchen-queue.js';
import { createCustomerNotification } from '../../kitchen/notification-engine.js';
import { WhatsAppCloudApiClient } from './cloud-api-client.js';
import { loadWhatsAppProductionConfig } from './config.js';
import { logAudit, logError } from './logging.js';
import { recordMessageProcessed, recordProcessingLatency } from './monitoring.js';

/**
 * @typedef {Object} OrderPipelineOptions
 * @property {import('@supabase/supabase-js').SupabaseClient} [client]
 * @property {boolean} [useSupabase]
 * @property {boolean} [persist]
 * @property {boolean} [sendReply]
 * @property {Record<string, string>} [restaurantMap]
 * @property {import('./config.js').WhatsAppProductionConfig} [config]
 * @property {Record<string, string>} [env]
 * @property {WhatsAppCloudApiClient} [apiClient]
 */

/**
 * @param {unknown} payload
 * @param {OrderPipelineOptions} [options]
 */
export async function runWhatsAppOrderPipeline(payload, options = {}) {
  const startedAt = Date.now();
  const config = options.config || loadWhatsAppProductionConfig({ env: options.env });
  const apiClient = options.apiClient || new WhatsAppCloudApiClient(config);
  const phoneNumberIdByMessageId = buildPhoneNumberIdIndex(payload);

  const restaurantMap = options.restaurantMap || config.restaurantMap;
  const inbound = processWebhook(payload, { restaurantMap });
  /** @type {Awaited<ReturnType<typeof processProductionWhatsAppMessage>>[]} */
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

    const menuResult = await getRestaurantMenuData({
      restaurantId: item.restaurantId,
      client: options.client,
      useSupabase: options.useSupabase
    });

    const result = await processProductionWhatsAppMessage({
      restaurantId: item.restaurantId,
      webhookMessage: item.raw,
      message: item.message.text,
      menu: normalizeMenuForPipeline(menuResult.data),
      customer: item.customer,
      client: options.client,
      useSupabase: options.useSupabase,
      persist: options.persist
    });
    results.push(result);
  }

  recordMessageProcessed(results.length);

  /** @type {Array<Record<string, unknown>>} */
  const deliveries = [];

  for (const result of results) {
    const phoneNumberId =
      phoneNumberIdByMessageId.get(result.routed?.messageId || '') || config.phoneNumberId;
    const orderRecord = result.persistence?.order || result.pipeline?.order;
    const kitchenQueue = orderRecord
      ? buildKitchenQueue([orderRecord], { restaurantId: result.restaurantId })
      : [];

    const notification = orderRecord
      ? createCustomerNotification(
          {
            ...orderRecord,
            source: 'whatsapp',
            customer: result.customer || result.pipeline?.order?.customer
          },
          result.pipeline?.order?.status || 'pending'
        )
      : null;

    logAudit('whatsapp_order_pipeline', {
      restaurantId: result.restaurantId,
      intent: result.pipeline?.intent,
      orderCreated: Boolean(result.pipeline?.order),
      persisted: Boolean(result.persistence?.persisted),
      kitchenQueueSize: kitchenQueue.length
    });

    const shouldSendReply = options.sendReply !== false;
    const recipient = result.routed?.from;
    const messageId = result.routed?.messageId;

    if (shouldSendReply && recipient && result.reply) {
      try {
        if (messageId) {
          await apiClient.sendTypingIndicator(messageId, phoneNumberId);
          await apiClient.markAsRead(messageId, phoneNumberId);
        }
        const delivery = await apiClient.sendTextMessage(
          recipient,
          result.reply,
          phoneNumberId
        );
        deliveries.push({
          restaurantId: result.restaurantId,
          recipient,
          delivery
        });
      } catch (error) {
        logError('whatsapp_reply_failed', {
          restaurantId: result.restaurantId,
          recipient,
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }

    if (notification?.channel === 'whatsapp' && notification.message && recipient && !result.reply) {
      try {
        await apiClient.sendTextMessage(recipient, notification.message, phoneNumberId);
      } catch (error) {
        logError('whatsapp_notification_failed', {
          restaurantId: result.restaurantId,
          recipient,
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  recordProcessingLatency(Date.now() - startedAt);

  return {
    processed: results.length,
    results,
    deliveries
  };
}

/**
 * @param {unknown} payload
 * @returns {Map<string, string>}
 */
function buildPhoneNumberIdIndex(payload) {
  const root = /** @type {Record<string, unknown>} */ (
    payload && typeof payload === 'object' ? payload : {}
  );
  const entries = Array.isArray(root.entry) ? root.entry : [];
  /** @type {Map<string, string>} */
  const index = new Map();

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
      const messages = Array.isArray(value.messages) ? value.messages : [];

      for (const message of messages) {
        const row = /** @type {Record<string, unknown>} */ (
          message && typeof message === 'object' ? message : {}
        );
        const messageId = String(row.id ?? '').trim();
        if (messageId && phoneNumberId) {
          index.set(messageId, phoneNumberId);
        }
      }
    }
  }

  return index;
}

/**
 * Admin/normalized menü modelini WhatsApp matcher girişine dönüştürür.
 * @param {unknown} menuData
 */
function normalizeMenuForPipeline(menuData) {
  if (!menuData || typeof menuData !== 'object') return menuData;
  const row = /** @type {Record<string, unknown>} */ (menuData);
  if (Array.isArray(row.categories)) return row.categories;
  if (Array.isArray(row.menu)) return row.menu;
  return menuData;
}
