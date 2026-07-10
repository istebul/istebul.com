/**
 * GarsonAI WhatsApp Cloud API webhook handler.
 */
import { routeWhatsAppMessage } from './message-router.js';
import { requireRestaurantId } from '../database/tenant-utils.js';

export class WhatsAppWebhookError extends Error {
  constructor(message) {
    super(message);
    this.name = 'WhatsAppWebhookError';
  }
}

/**
 * @typedef {Object} WebhookVerificationInput
 * @property {string} [mode]
 * @property {string} [verifyToken]
 * @property {string} [challenge]
 * @property {string} [expectedToken]
 */

/**
 * @typedef {Object} ParsedWebhookMessage
 * @property {string} restaurantId
 * @property {import('./message-router.js').RoutedWhatsAppMessage} message
 * @property {{ phone?: string, name?: string, whatsappId?: string }} customer
 * @property {string} phoneNumberId
 * @property {Record<string, unknown>} raw
 */

/**
 * @param {WebhookVerificationInput} input
 * @returns {{ verified: boolean, challenge: string|null }}
 */
export function verifyWebhookChallenge(input = {}) {
  const mode = String(input.mode || '').trim();
  const verifyToken = String(input.verifyToken || '').trim();
  const expectedToken = String(input.expectedToken || '').trim();
  const challenge = String(input.challenge || '').trim();

  const verified =
    mode === 'subscribe' &&
    Boolean(expectedToken) &&
    verifyToken === expectedToken &&
    Boolean(challenge);

  return {
    verified,
    challenge: verified ? challenge : null
  };
}

/**
 * @param {unknown} metadata
 * @param {{ restaurantId?: string, restaurantMap?: Record<string, string> }} [options]
 * @returns {string}
 */
export function resolveRestaurantIdFromWebhook(metadata, options = {}) {
  const explicit = String(options.restaurantId || '').trim();
  const row = /** @type {Record<string, unknown>} */ (
    metadata && typeof metadata === 'object' ? metadata : {}
  );

  const metadataRestaurantId = String(
    row.restaurant_id ?? row.restaurantId ?? ''
  ).trim();
  const phoneNumberId = String(row.phone_number_id ?? row.phoneNumberId ?? '').trim();
  const mappedRestaurantId = phoneNumberId
    ? String(options.restaurantMap?.[phoneNumberId] || '').trim()
    : '';

  const resolved = explicit || metadataRestaurantId || mappedRestaurantId;
  if (!resolved) {
    throw new WhatsAppWebhookError('Webhook için restoran kimliği çözümlenemedi.');
  }

  if (explicit && metadataRestaurantId && explicit !== metadataRestaurantId) {
    throw new WhatsAppWebhookError('Tenant izolasyonu ihlali: webhook restoran kimliği uyuşmuyor.');
  }

  if (explicit && mappedRestaurantId && explicit !== mappedRestaurantId) {
    throw new WhatsAppWebhookError('Tenant izolasyonu ihlali: phone_number_id eşlemesi uyuşmuyor.');
  }

  return requireRestaurantId(resolved);
}

/**
 * @param {unknown} contacts
 * @param {string} from
 * @returns {{ phone?: string, name?: string, whatsappId?: string }}
 */
export function resolveWebhookCustomer(contacts, from) {
  const list = Array.isArray(contacts) ? contacts : [];
  const match =
    list.find((entry) => {
      const row = /** @type {Record<string, unknown>} */ (
        entry && typeof entry === 'object' ? entry : {}
      );
      return String(row.wa_id ?? '').trim() === String(from || '').trim();
    }) || list[0];

  const row = /** @type {Record<string, unknown>} */ (
    match && typeof match === 'object' ? match : {}
  );
  const profile =
    row.profile && typeof row.profile === 'object'
      ? /** @type {Record<string, unknown>} */ (row.profile)
      : {};

  return {
    phone: from ? `+${String(from).replace(/[^\d]/g, '')}` : undefined,
    name: String(profile.name ?? '').trim() || undefined,
    whatsappId: String(row.wa_id ?? from ?? '').trim() || undefined
  };
}

/**
 * @param {unknown} payload
 * @param {{ restaurantId?: string, restaurantMap?: Record<string, string> }} [options]
 * @returns {ParsedWebhookMessage[]}
 */
export function processWebhook(payload, options = {}) {
  const root = /** @type {Record<string, unknown>} */ (
    payload && typeof payload === 'object' ? payload : {}
  );

  if (String(root.object || '') !== 'whatsapp_business_account') {
    throw new WhatsAppWebhookError('Geçersiz WhatsApp webhook payload.');
  }

  const entries = Array.isArray(root.entry) ? root.entry : [];
  /** @type {ParsedWebhookMessage[]} */
  const messages = [];

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
      const restaurantId = resolveRestaurantIdFromWebhook(metadata, options);
      const phoneNumberId = String(metadata.phone_number_id ?? '').trim();
      const inboundMessages = Array.isArray(value.messages) ? value.messages : [];
      const contacts = value.contacts;

      for (const inbound of inboundMessages) {
        const routed = routeWhatsAppMessage(inbound);
        messages.push({
          restaurantId,
          message: routed,
          customer: resolveWebhookCustomer(contacts, routed.from),
          phoneNumberId,
          raw: /** @type {Record<string, unknown>} */ (inbound)
        });
      }
    }
  }

  return messages;
}
