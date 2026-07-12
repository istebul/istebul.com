/**
 * GarsonAI WhatsApp Cloud API HTTP webhook katmanı.
 */
import { verifyWebhookChallenge } from '../../whatsapp-production/webhook-handler.js';
import { loadWhatsAppProductionConfig } from './config.js';
import {
  buildWebhookEventKey,
  isDuplicateEvent,
  markEventProcessed
} from './dedupe.js';
import { logAudit, logError } from './logging.js';
import {
  recordDuplicateSkipped,
  recordWebhookFailed,
  recordWebhookReceived
} from './monitoring.js';
import { runWhatsAppOrderPipeline } from './order-pipeline.js';
import { verifyWebhookSignature } from './signature.js';

export class WhatsAppProductionWebhookError extends Error {
  /**
   * @param {string} message
   * @param {number} [status]
   */
  constructor(message, status = 400) {
    super(message);
    this.name = 'WhatsAppProductionWebhookError';
    this.status = status;
  }
}

/**
 * @typedef {Object} WebhookVerificationQuery
 * @property {string} [mode]
 * @property {string} [verifyToken]
 * @property {string} [challenge]
 */

/**
 * @param {WebhookVerificationQuery} query
 * @param {import('./config.js').WhatsAppProductionConfig} [config]
 */
export function handleWebhookVerification(query = {}, config) {
  const cfg = config || loadWhatsAppProductionConfig();
  const result = verifyWebhookChallenge({
    mode: query.mode,
    verifyToken: query.verifyToken,
    challenge: query.challenge,
    expectedToken: cfg.verifyToken
  });

  if (!result.verified) {
    throw new WhatsAppProductionWebhookError('Webhook doğrulaması başarısız.', 403);
  }

  logAudit('whatsapp_webhook_verified');
  return {
    status: 200,
    body: result.challenge || ''
  };
}

/**
 * @typedef {Object} ProcessWebhookPostOptions
 * @property {import('@supabase/supabase-js').SupabaseClient} [client]
 * @property {boolean} [useSupabase]
 * @property {boolean} [persist]
 * @property {boolean} [sendReply]
 * @property {boolean} [skipSignature]
 * @property {Record<string, string>} [env]
 * @property {import('./config.js').WhatsAppProductionConfig} [config]
 */

/**
 * @param {string} rawBody
 * @param {string} signatureHeader
 * @param {ProcessWebhookPostOptions} [options]
 */
export async function processWebhookPost(rawBody, signatureHeader, options = {}) {
  const startedAt = Date.now();
  recordWebhookReceived();

  const config = options.config || loadWhatsAppProductionConfig({ env: options.env });
  const skipSignature = options.skipSignature === true;

  if (!skipSignature) {
    const valid = await verifyWebhookSignature(rawBody, signatureHeader, config.appSecret);
    if (!valid) {
      recordWebhookFailed();
      throw new WhatsAppProductionWebhookError('Webhook imza doğrulaması başarısız.', 401);
    }
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    recordWebhookFailed();
    throw new WhatsAppProductionWebhookError('Geçersiz JSON webhook gövdesi.', 400);
  }

  const dedupeKeys = extractInboundMessageKeys(payload);
  const duplicateKeys = dedupeKeys.filter((key) => isDuplicateEvent(key));
  if (duplicateKeys.length > 0 && duplicateKeys.length === dedupeKeys.length) {
    recordDuplicateSkipped(duplicateKeys.length);
    logAudit('whatsapp_webhook_duplicate_skipped', { keys: duplicateKeys });
    return {
      status: 200,
      body: { ok: true, duplicate: true, processed: 0 }
    };
  }

  for (const key of dedupeKeys) {
    markEventProcessed(key);
  }

  try {
    const pipeline = await runWhatsAppOrderPipeline(payload, {
      client: options.client,
      useSupabase: options.useSupabase,
      persist: options.persist,
      sendReply: options.sendReply,
      config,
      restaurantMap: config.restaurantMap
    });

    logAudit('whatsapp_webhook_processed', {
      processed: pipeline.processed,
      latencyMs: Date.now() - startedAt
    });

    return {
      status: 200,
      body: {
        ok: true,
        processed: pipeline.processed,
        duplicate: false
      }
    };
  } catch (error) {
    recordWebhookFailed();
    logError('whatsapp_webhook_processing_failed', {
      message: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * @param {unknown} payload
 * @returns {string[]}
 */
function extractInboundMessageKeys(payload) {
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
 * @param {Request} request
 * @param {ProcessWebhookPostOptions} [options]
 */
export async function handleWebhookRequest(request, options = {}) {
  const config = options.config || loadWhatsAppProductionConfig({ env: options.env });

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const verification = handleWebhookVerification(
      {
        mode: url.searchParams.get('hub.mode') || undefined,
        verifyToken: url.searchParams.get('hub.verify_token') || undefined,
        challenge: url.searchParams.get('hub.challenge') || undefined
      },
      config
    );
    return new Response(verification.body, { status: verification.status });
  }

  if (request.method === 'POST') {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256') || '';
    const result = await processWebhookPost(rawBody, signature, options);
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
