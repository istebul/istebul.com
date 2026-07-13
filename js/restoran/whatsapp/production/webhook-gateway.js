/**
 * GarsonAI P6-E Production WhatsApp Webhook Gateway.
 * Cloudflare Pages Functions entry katmanı için HTTP + pipeline orkestrasyonu.
 */
import { runGarsonAiProductionPipeline } from '../../ai/production/pipeline.js';
import { getRestaurantMenuData } from '../../data-service.js';
import { buildKitchenQueue } from '../../kitchen/kitchen-queue.js';
import { createCustomerNotification } from '../../kitchen/notification-engine.js';
import {
  generateProductionReply,
  isOrderCapableMessage,
  persistProductionOrder,
  processWebhook,
  syncWhatsAppCustomer
} from '../../whatsapp-production/index.js';
import { verifyWebhookChallenge } from '../../whatsapp-production/webhook-handler.js';
import { WhatsAppCloudApiClient } from './cloud-api-client.js';
import {
  buildWebhookEventKey,
  isDuplicateEvent,
  markEventProcessed
} from './dedupe.js';
import { loadWhatsAppProductionConfig } from './config.js';
import { resolveRestaurantFromPhoneNumberId } from './restaurant-routing.js';
import { logAudit } from './logging.js';
import { verifyWebhookSignature } from './signature.js';

export const WEBHOOK_GATEWAY_VERSION = 'p6-e.1.0.0';

export const WEBHOOK_GATEWAY_REQUIRED_ENV = Object.freeze([
  'WHATSAPP_VERIFY_TOKEN',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_BUSINESS_ACCOUNT_ID',
  'META_APP_SECRET',
  'SUPABASE_URL'
]);

const VERIFY_TOKEN_KEYS = ['WHATSAPP_VERIFY_TOKEN', 'META_WHATSAPP_VERIFY_TOKEN'];
const ACCESS_TOKEN_KEYS = [
  'WHATSAPP_ACCESS_TOKEN',
  'META_WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_TOKEN'
];
const PHONE_NUMBER_KEYS = ['WHATSAPP_PHONE_NUMBER_ID', 'META_WHATSAPP_PHONE_NUMBER_ID'];
const BUSINESS_ACCOUNT_KEYS = [
  'WHATSAPP_BUSINESS_ACCOUNT_ID',
  'META_WHATSAPP_BUSINESS_ACCOUNT_ID'
];
const META_APP_SECRET_KEYS = [
  'META_APP_SECRET',
  'WHATSAPP_APP_SECRET',
  'META_WHATSAPP_APP_SECRET'
];
const SUPABASE_URL_KEYS = ['SUPABASE_URL', 'VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'];

const GATEWAY_METRICS_KEY = '__garsonWhatsAppWebhookGatewayMetrics__';
const GATEWAY_START_KEY = '__garsonWhatsAppWebhookGatewayStart__';

export class WhatsAppWebhookGatewayError extends Error {
  /**
   * @param {string} message
   * @param {number} [status]
   * @param {string} [code]
   */
  constructor(message, status = 500, code = 'gateway_error') {
    super(message);
    this.name = 'WhatsAppWebhookGatewayError';
    this.status = status;
    this.code = code;
  }
}

/**
 * @param {Record<string, string>} env
 * @param {string[]} keys
 * @returns {string}
 */
function readEnvValue(env, keys) {
  for (const key of keys) {
    const value = String(env[key] || '').trim();
    if (value) return value;
  }
  return '';
}

/**
 * @param {Record<string, unknown>} [options]
 * @returns {{ ok: boolean, missing: string[], values: Record<string, string> }}
 */
export function validateWebhookGatewayEnvironment(options = {}) {
  const env = /** @type {Record<string, string>} */ (options.env || {});
  /** @type {string[]} */
  const missing = [];

  const values = {
    verifyToken: readEnvValue(env, VERIFY_TOKEN_KEYS),
    accessToken: readEnvValue(env, ACCESS_TOKEN_KEYS),
    phoneNumberId: readEnvValue(env, PHONE_NUMBER_KEYS),
    businessAccountId: readEnvValue(env, BUSINESS_ACCOUNT_KEYS),
    metaAppSecret: readEnvValue(env, META_APP_SECRET_KEYS),
    supabaseUrl: readEnvValue(env, SUPABASE_URL_KEYS)
  };

  if (!values.verifyToken) missing.push('WHATSAPP_VERIFY_TOKEN');
  if (!values.accessToken) missing.push('WHATSAPP_ACCESS_TOKEN');
  if (!values.phoneNumberId) missing.push('WHATSAPP_PHONE_NUMBER_ID');
  if (!values.businessAccountId) missing.push('WHATSAPP_BUSINESS_ACCOUNT_ID');
  if (!values.metaAppSecret) missing.push('META_APP_SECRET');
  if (!values.supabaseUrl) missing.push('SUPABASE_URL');

  return { ok: missing.length === 0, missing, values };
}

/**
 * @returns {number}
 */
function getGatewayStartTime() {
  const root = /** @type {Record<string, unknown>} */ (globalThis);
  if (!root[GATEWAY_START_KEY]) {
    root[GATEWAY_START_KEY] = Date.now();
  }
  return Number(root[GATEWAY_START_KEY]);
}

/**
 * @returns {{ messageCount: number, successCount: number, failureCount: number, totalLatencyMs: number, latencyCount: number }}
 */
function getGatewayMetricsStore() {
  const root = /** @type {Record<string, unknown>} */ (globalThis);
  if (!root[GATEWAY_METRICS_KEY]) {
    root[GATEWAY_METRICS_KEY] = {
      messageCount: 0,
      successCount: 0,
      failureCount: 0,
      totalLatencyMs: 0,
      latencyCount: 0
    };
  }
  return /** @type {{ messageCount: number, successCount: number, failureCount: number, totalLatencyMs: number, latencyCount: number }} */ (
    root[GATEWAY_METRICS_KEY]
  );
}

export function resetWebhookGatewayMetrics() {
  const root = /** @type {Record<string, unknown>} */ (globalThis);
  root[GATEWAY_METRICS_KEY] = {
    messageCount: 0,
    successCount: 0,
    failureCount: 0,
    totalLatencyMs: 0,
    latencyCount: 0
  };
  root[GATEWAY_START_KEY] = Date.now();
}

/**
 * @returns {{ messageCount: number, successCount: number, failureCount: number, latency: number, uptime: number }}
 */
export function getWebhookGatewayMetrics() {
  const store = getGatewayMetricsStore();
  const uptime = Math.max(0, Date.now() - getGatewayStartTime());
  const latency =
    store.latencyCount > 0
      ? Number((store.totalLatencyMs / store.latencyCount).toFixed(2))
      : 0;

  return {
    messageCount: store.messageCount,
    successCount: store.successCount,
    failureCount: store.failureCount,
    latency,
    uptime
  };
}

/**
 * @param {string} event
 * @param {{ restaurant_id?: string, message_id?: string, latency?: number, result?: string }} fields
 */
export function logGatewayEvent(event, fields = {}) {
  logAudit(event, fields);
}

/**
 * @param {boolean} success
 * @param {number} latencyMs
 */
function recordGatewayOutcome(success, latencyMs) {
  const store = getGatewayMetricsStore();
  store.messageCount += 1;
  if (success) {
    store.successCount += 1;
  } else {
    store.failureCount += 1;
  }
  store.totalLatencyMs += Math.max(0, latencyMs);
  store.latencyCount += 1;
}

/**
 * @param {Record<string, string>} env
 */
export function assertWebhookGatewayEnvironment(env = {}) {
  const validation = validateWebhookGatewayEnvironment({ env });
  if (!validation.ok) {
    throw new WhatsAppWebhookGatewayError(
      'WhatsApp webhook gateway yapılandırması eksik.',
      500,
      'server_misconfigured'
    );
  }
  return validation;
}

/**
 * @typedef {Object} WebhookGatewayVerificationQuery
 * @property {string} [mode]
 * @property {string} [verifyToken]
 * @property {string} [challenge]
 */

/**
 * @param {WebhookGatewayVerificationQuery} query
 * @param {Record<string, string>} env
 */
export function handleWebhookGatewayVerification(query = {}, env = {}) {
  const expectedVerifyToken = readEnvValue(env, VERIFY_TOKEN_KEYS);
  if (!expectedVerifyToken) {
    throw new WhatsAppWebhookGatewayError(
      'WhatsApp webhook gateway yapılandırması eksik.',
      500,
      'server_misconfigured'
    );
  }

  const result = verifyWebhookChallenge({
    mode: query.mode,
    verifyToken: query.verifyToken,
    challenge: query.challenge,
    expectedToken: expectedVerifyToken
  });

  if (!result.verified) {
    throw new WhatsAppWebhookGatewayError('Webhook doğrulaması başarısız.', 403, 'forbidden');
  }

  logGatewayEvent('whatsapp_webhook_verified', { result: 'verified' });
  return {
    status: 200,
    body: result.challenge || ''
  };
}

/**
 * @typedef {Object} ParsedWebhookStatusEvent
 * @property {string} restaurantId
 * @property {string} phoneNumberId
 * @property {string} messageId
 * @property {string} status
 * @property {string} recipientId
 */

/**
 * @typedef {Object} ParsedWebhookTemplateEvent
 * @property {string} restaurantId
 * @property {string} phoneNumberId
 * @property {string} messageTemplateId
 * @property {string} event
 * @property {string} reason
 */

/**
 * @typedef {Object} ClassifiedWebhookPayload
 * @property {string} objectType
 * @property {ParsedWebhookStatusEvent[]} statuses
 * @property {ParsedWebhookTemplateEvent[]} templateUpdates
 */

/**
 * @param {unknown} payload
 * @param {Record<string, string>} [restaurantMap]
 * @returns {ClassifiedWebhookPayload}
 */
export function classifyWebhookPayload(payload, restaurantMap = {}) {
  const root = /** @type {Record<string, unknown>} */ (
    payload && typeof payload === 'object' ? payload : {}
  );
  const objectType = String(root.object || '');
  /** @type {ParsedWebhookStatusEvent[]} */
  const statuses = [];
  /** @type {ParsedWebhookTemplateEvent[]} */
  const templateUpdates = [];

  if (objectType !== 'whatsapp_business_account') {
    return { objectType, statuses, templateUpdates };
  }

  const entries = Array.isArray(root.entry) ? root.entry : [];
  for (const entry of entries) {
    const entryRow = /** @type {Record<string, unknown>} */ (
      entry && typeof entry === 'object' ? entry : {}
    );
    const changes = Array.isArray(entryRow.changes) ? entryRow.changes : [];

    for (const change of changes) {
      const changeRow = /** @type {Record<string, unknown>} */ (
        change && typeof change === 'object' ? change : {}
      );
      const field = String(changeRow.field || '').trim();
      const value = /** @type {Record<string, unknown>} */ (
        changeRow.value && typeof changeRow.value === 'object' ? changeRow.value : {}
      );
      const metadata = /** @type {Record<string, unknown>} */ (value.metadata || {});
      const phoneNumberId = String(metadata.phone_number_id ?? '').trim();

      let restaurantId = '';
      if (phoneNumberId) {
        try {
          restaurantId = resolveRestaurantFromPhoneNumberId({
            phoneNumberId,
            metadata,
            restaurantMap
          });
        } catch {
          restaurantId = '';
        }
      }

      const inboundStatuses = Array.isArray(value.statuses) ? value.statuses : [];
      for (const statusRow of inboundStatuses) {
        const row = /** @type {Record<string, unknown>} */ (
          statusRow && typeof statusRow === 'object' ? statusRow : {}
        );
        const messageId = String(row.id ?? '').trim();
        const status = String(row.status ?? '').trim();
        if (!messageId || !status) continue;
        statuses.push({
          restaurantId,
          phoneNumberId,
          messageId,
          status,
          recipientId: String(row.recipient_id ?? '').trim()
        });
      }

      if (field === 'message_template_status_update') {
        templateUpdates.push({
          restaurantId,
          phoneNumberId,
          messageTemplateId: String(value.message_template_id ?? '').trim(),
          event: String(value.event ?? '').trim(),
          reason: String(value.reason ?? '').trim()
        });
      }
    }
  }

  return { objectType, statuses, templateUpdates };
}

/**
 * @param {unknown} payload
 * @returns {string[]}
 */
export function extractInboundMessageKeys(payload) {
  const root = /** @type {Record<string, unknown>} */ (
    payload && typeof payload === 'object' ? payload : {}
  );
  const entries = Array.isArray(root.entry) ? root.entry : [];
  /** @type {string[]} */
  const keys = [];

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
        if (!messageId) continue;
        keys.push(buildWebhookEventKey(messageId, phoneNumberId));
      }
    }
  }

  return keys;
}

/**
 * @param {unknown} menuData
 */
function normalizeMenuForPipeline(menuData) {
  if (!menuData || typeof menuData !== 'object') return menuData;
  const row = /** @type {Record<string, unknown>} */ (menuData);
  if (Array.isArray(row.categories)) return row.categories;
  if (Array.isArray(row.menu)) return row.menu;
  return menuData;
}

/**
 * @typedef {Object} WebhookGatewayPipelineOptions
 * @property {import('@supabase/supabase-js').SupabaseClient} [client]
 * @property {boolean} [useSupabase]
 * @property {boolean} [persist]
 * @property {boolean} [sendReply]
 * @property {Record<string, string>} [env]
 * @property {import('./cloud-api-client.js').WhatsAppCloudApiClient} [apiClient]
 */

/**
 * @param {unknown} payload
 * @param {WebhookGatewayPipelineOptions} [options]
 */
export async function runWebhookGatewayPipeline(payload, options = {}) {
  const startedAt = Date.now();
  const env = /** @type {Record<string, string>} */ (options.env || {});
  const config = loadWhatsAppProductionConfig({ env });
  const apiClient = options.apiClient || new WhatsAppCloudApiClient(config);
  const restaurantMap = config.restaurantMap;

  const classified = classifyWebhookPayload(payload, restaurantMap);
  if (classified.objectType && classified.objectType !== 'whatsapp_business_account') {
    throw new WhatsAppWebhookGatewayError('Geçersiz WhatsApp webhook payload.', 400, 'bad_request');
  }

  /** @type {Array<Record<string, unknown>>} */
  const statusResults = [];

  for (const statusEvent of classified.statuses) {
    const eventStartedAt = Date.now();
    const resultLabel = ['sent', 'delivered', 'read', 'failed'].includes(statusEvent.status)
      ? `${statusEvent.status}`
      : `status:${statusEvent.status}`;

    logGatewayEvent('whatsapp_status', {
      restaurant_id: statusEvent.restaurantId || undefined,
      message_id: statusEvent.messageId,
      latency: Date.now() - eventStartedAt,
      result: resultLabel
    });

    statusResults.push({
      type: 'status',
      messageId: statusEvent.messageId,
      status: statusEvent.status,
      restaurantId: statusEvent.restaurantId
    });
    recordGatewayOutcome(true, Date.now() - eventStartedAt);
  }

  for (const templateEvent of classified.templateUpdates) {
    const eventStartedAt = Date.now();
    logGatewayEvent('whatsapp_template_status', {
      restaurant_id: templateEvent.restaurantId || undefined,
      message_id: templateEvent.messageTemplateId || undefined,
      latency: Date.now() - eventStartedAt,
      result: templateEvent.event || 'template_update'
    });

    statusResults.push({
      type: 'message_template_status_update',
      messageTemplateId: templateEvent.messageTemplateId,
      event: templateEvent.event,
      restaurantId: templateEvent.restaurantId
    });
    recordGatewayOutcome(true, Date.now() - eventStartedAt);
  }

  const inbound = processWebhook(payload, { restaurantMap });
  /** @type {Array<Record<string, unknown>>} */
  const messageResults = [];

  for (const item of inbound) {
    const eventStartedAt = Date.now();
    const messageId = item.message?.messageId || '';

    if (!isOrderCapableMessage(item.message) || !item.message.text) {
      logGatewayEvent('whatsapp_message', {
        restaurant_id: item.restaurantId,
        message_id: messageId,
        latency: Date.now() - eventStartedAt,
        result: 'ignored'
      });
      messageResults.push({
        restaurantId: item.restaurantId,
        messageId,
        result: 'ignored'
      });
      recordGatewayOutcome(true, Date.now() - eventStartedAt);
      continue;
    }

    const menuResult = await getRestaurantMenuData({
      restaurantId: item.restaurantId,
      client: options.client,
      useSupabase: options.useSupabase
    });

    const aiResult = await runGarsonAiProductionPipeline(
      {
        message: item.message.text,
        restaurantId: item.restaurantId,
        menu: normalizeMenuForPipeline(menuResult.data),
        customer: item.customer,
        env
      },
      {}
    );

    let customerRecord = null;
    let persistence = { persisted: false, source: 'mock', order: null };

    if (aiResult.pipeline?.order && options.persist !== false) {
      const customerSync = await syncWhatsAppCustomer({
        restaurantId: item.restaurantId,
        customer: {
          ...item.customer,
          ...aiResult.pipeline.order.customer
        },
        orderTotal: aiResult.pipeline.order.total,
        client: options.client,
        useSupabase: options.useSupabase
      });
      customerRecord = customerSync.customer;

      persistence = await persistProductionOrder(aiResult.pipeline.order, {
        restaurantId: item.restaurantId,
        customerId: customerRecord?.id ? String(customerRecord.id) : undefined,
        client: options.client,
        useSupabase: options.useSupabase
      });
    }

    const kitchenQueue = aiResult.kitchen?.queue?.length
      ? aiResult.kitchen.queue
      : aiResult.orderDto
        ? buildKitchenQueue(
            [
              {
                id: `wa-${Date.now()}`,
                restaurantId: item.restaurantId,
                status: aiResult.orderDto.status,
                source: 'whatsapp',
                total: aiResult.orderDto.total,
                customer: aiResult.orderDto.customer,
                items: aiResult.orderDto.items
              }
            ],
            { restaurantId: item.restaurantId }
          )
        : [];

    const notification =
      aiResult.kitchen?.notification ||
      (aiResult.orderDto
        ? createCustomerNotification(
            {
              id: `wa-${Date.now()}`,
              restaurantId: item.restaurantId,
              status: aiResult.orderDto.status,
              source: 'whatsapp',
              total: aiResult.orderDto.total,
              customer: aiResult.orderDto.customer,
              items: aiResult.orderDto.items
            },
            aiResult.orderDto.status
          )
        : null);

    const reply = generateProductionReply({
      intent: aiResult.pipeline?.intent,
      orderCreated: Boolean(aiResult.pipeline?.order),
      orderStatus: aiResult.pipeline?.order?.status,
      unmatchedProducts: (aiResult.pipeline?.unmatchedItems?.length || 0) > 0
    });

    const phoneNumberId = item.phoneNumberId || config.phoneNumberId;
    const recipient = item.message.from;

    if (options.sendReply !== false && recipient && reply) {
      try {
        if (messageId) {
          await apiClient.sendTypingIndicator(messageId, phoneNumberId);
          await apiClient.markAsRead(messageId, phoneNumberId);
        }
        await apiClient.sendTextMessage(recipient, reply, phoneNumberId);
      } catch {
        logGatewayEvent('whatsapp_message', {
          restaurant_id: item.restaurantId,
          message_id: messageId,
          latency: Date.now() - eventStartedAt,
          result: 'reply_failed'
        });
        recordGatewayOutcome(false, Date.now() - eventStartedAt);
        messageResults.push({
          restaurantId: item.restaurantId,
          messageId,
          result: 'reply_failed',
          orderCreated: Boolean(aiResult.pipeline?.order),
          persisted: Boolean(persistence.persisted),
          kitchenQueueSize: kitchenQueue.length
        });
        continue;
      }
    } else if (
      notification?.channel === 'whatsapp' &&
      notification.message &&
      recipient &&
      !reply &&
      options.sendReply !== false
    ) {
      try {
        await apiClient.sendTextMessage(recipient, notification.message, phoneNumberId);
      } catch {
        logGatewayEvent('whatsapp_message', {
          restaurant_id: item.restaurantId,
          message_id: messageId,
          latency: Date.now() - eventStartedAt,
          result: 'notification_failed'
        });
        recordGatewayOutcome(false, Date.now() - eventStartedAt);
        messageResults.push({
          restaurantId: item.restaurantId,
          messageId,
          result: 'notification_failed'
        });
        continue;
      }
    }

    const latency = Date.now() - eventStartedAt;
    logGatewayEvent('whatsapp_message', {
      restaurant_id: item.restaurantId,
      message_id: messageId,
      latency,
      result: aiResult.ok ? 'processed' : 'fallback'
    });
    recordGatewayOutcome(aiResult.ok, latency);

    messageResults.push({
      restaurantId: item.restaurantId,
      messageId,
      result: aiResult.ok ? 'processed' : 'fallback',
      orderCreated: Boolean(aiResult.pipeline?.order),
      persisted: Boolean(persistence.persisted),
      kitchenQueueSize: kitchenQueue.length,
      orderDto: aiResult.orderDto
    });
  }

  return {
    processed: messageResults.length + statusResults.length,
    messages: messageResults,
    statuses: statusResults,
    latencyMs: Date.now() - startedAt
  };
}

/**
 * @param {{ messages?: Array<{ result?: string }>, statuses?: Array<{ type?: string, status?: string }> }} pipeline
 * @returns {'status_event'|'template_event'|'inbound_message'|'ignored'}
 */
export function resolvePipelineDiagnosticBranch(pipeline) {
  const messages = Array.isArray(pipeline.messages) ? pipeline.messages : [];
  const statuses = Array.isArray(pipeline.statuses) ? pipeline.statuses : [];

  if (
    messages.some((item) =>
      ['processed', 'fallback', 'reply_failed', 'notification_failed'].includes(String(item.result || ''))
    )
  ) {
    return 'inbound_message';
  }
  if (messages.some((item) => item.result === 'ignored')) {
    return 'ignored';
  }
  if (statuses.some((item) => item.type === 'message_template_status_update')) {
    return 'template_event';
  }
  if (statuses.length > 0) {
    return 'status_event';
  }
  return 'status_event';
}

/**
 * @typedef {Object} ProcessWebhookGatewayPostOptions
 * @property {import('@supabase/supabase-js').SupabaseClient} [client]
 * @property {boolean} [useSupabase]
 * @property {boolean} [persist]
 * @property {boolean} [sendReply]
 * @property {Record<string, string>} [env]
 * @property {import('./cloud-api-client.js').WhatsAppCloudApiClient} [apiClient]
 */

/**
 * @param {string} rawBody
 * @param {string} signatureHeader
 * @param {ProcessWebhookGatewayPostOptions} [options]
 */
export async function processWebhookGatewayPost(rawBody, signatureHeader, options = {}) {
  const startedAt = Date.now();
  const env = /** @type {Record<string, string>} */ (options.env || {});
  const validation = assertWebhookGatewayEnvironment(env);

  const valid = await verifyWebhookSignature(
    rawBody,
    signatureHeader,
    validation.values.metaAppSecret
  );
  if (!valid) {
    recordGatewayOutcome(false, Date.now() - startedAt);
    throw new WhatsAppWebhookGatewayError(
      'Webhook imza doğrulaması başarısız.',
      403,
      'forbidden'
    );
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    recordGatewayOutcome(false, Date.now() - startedAt);
    throw new WhatsAppWebhookGatewayError('Geçersiz JSON webhook gövdesi.', 400, 'bad_request');
  }

  const dedupeKeys = extractInboundMessageKeys(payload);
  const duplicateKeys = dedupeKeys.filter((key) => isDuplicateEvent(key));
  if (duplicateKeys.length > 0 && duplicateKeys.length === dedupeKeys.length) {
    logGatewayEvent('whatsapp_webhook_duplicate', {
      latency: Date.now() - startedAt,
      result: 'duplicate'
    });
    return {
      status: 200,
      body: { ok: true, duplicate: true, processed: 0 },
      branch: 'duplicate'
    };
  }

  for (const key of dedupeKeys) {
    markEventProcessed(key);
  }

  const pipeline = await runWebhookGatewayPipeline(payload, options);
  logGatewayEvent('whatsapp_webhook_processed', {
    latency: Date.now() - startedAt,
    result: 'ok'
  });

  return {
    status: 200,
    body: {
      ok: true,
      processed: pipeline.processed,
      duplicate: false
    },
    branch: resolvePipelineDiagnosticBranch(pipeline)
  };
}

/**
 * @param {Request} request
 * @param {ProcessWebhookGatewayPostOptions} [options]
 */
export async function handleWebhookGatewayRequest(request, options = {}) {
  const env = /** @type {Record<string, string>} */ (options.env || {});

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const verification = handleWebhookGatewayVerification(
      {
        mode: url.searchParams.get('hub.mode') || undefined,
        verifyToken: url.searchParams.get('hub.verify_token') || undefined,
        challenge: url.searchParams.get('hub.challenge') || undefined
      },
      env
    );
    return new Response(verification.body, { status: verification.status });
  }

  if (request.method === 'POST') {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256') || '';
    const result = await processWebhookGatewayPost(rawBody, signature, options);
    const headers = { 'Content-Type': 'application/json; charset=utf-8' };
    if (result.branch) {
      headers['X-Garson-Webhook-Branch'] = result.branch;
    }
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers
    });
  }

  return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

/**
 * @param {Record<string, string>} [env]
 */
export function buildWebhookGatewayHealthResponse(env = {}) {
  const validation = validateWebhookGatewayEnvironment({ env });
  const metrics = getWebhookGatewayMetrics();

  return {
    status: validation.ok ? 'ok' : 'degraded',
    configured: validation.ok,
    missing: validation.missing,
    version: WEBHOOK_GATEWAY_VERSION,
    uptime: metrics.uptime,
    messageCount: metrics.messageCount,
    successCount: metrics.successCount,
    failureCount: metrics.failureCount,
    latency: metrics.latency
  };
}
