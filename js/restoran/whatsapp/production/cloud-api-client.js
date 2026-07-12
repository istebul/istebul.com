/**
 * GarsonAI Meta WhatsApp Cloud API istemcisi.
 */
import { buildGraphEndpoint, loadWhatsAppProductionConfig } from './config.js';
import { fetchWithRetry } from './retry.js';
import { logDelivery, logError, logRetry } from './logging.js';
import { recordMessageSent } from './monitoring.js';

export class WhatsAppCloudApiError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, details?: unknown }} [options]
   */
  constructor(message, options = {}) {
    super(message);
    this.name = 'WhatsAppCloudApiError';
    this.status = options.status;
    this.details = options.details;
  }
}

/**
 * @typedef {import('./config.js').WhatsAppProductionConfig} WhatsAppProductionConfig
 */

export class WhatsAppCloudApiClient {
  /**
   * @param {WhatsAppProductionConfig} [config]
   * @param {{ fetchImpl?: typeof fetch }} [options]
   */
  constructor(config, options = {}) {
    this.config = config || loadWhatsAppProductionConfig();
    this.fetchImpl = options.fetchImpl || fetch;
  }

  /**
   * @param {Record<string, unknown>} payload
   * @param {string} [phoneNumberId]
   * @returns {Promise<Record<string, unknown>>}
   */
  async sendPayload(payload, phoneNumberId) {
    const token = String(this.config.accessToken || '').trim();
    if (!token) {
      throw new WhatsAppCloudApiError('WHATSAPP_ACCESS_TOKEN yapılandırması eksik.');
    }

    const url = buildGraphEndpoint('messages', this.config, phoneNumberId);
    const response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      },
      {
        onRetry: (error, attempt) => {
          logRetry('whatsapp_api_retry', {
            attempt,
            status: /** @type {Record<string, unknown>} */ (error).status,
            message: error instanceof Error ? error.message : String(error)
          });
        },
        fetchImpl: this.fetchImpl
      }
    );

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      logError('whatsapp_api_error', {
        status: response.status,
        body
      });
      throw new WhatsAppCloudApiError('WhatsApp API isteği başarısız oldu.', {
        status: response.status,
        details: body
      });
    }

    recordMessageSent();
    logDelivery('whatsapp_message_sent', {
      phoneNumberId: phoneNumberId || this.config.phoneNumberId,
      payloadType: payload.type
    });

    return /** @type {Record<string, unknown>} */ (body);
  }

  /**
   * @param {string} to
   * @param {string} text
   * @param {string} [phoneNumberId]
   */
  async sendTextMessage(to, text, phoneNumberId) {
    return this.sendPayload(
      {
        messaging_product: 'whatsapp',
        to: String(to || '').replace(/[^\d]/g, ''),
        type: 'text',
        text: { body: String(text || '').trim() }
      },
      phoneNumberId
    );
  }

  /**
   * @param {string} to
   * @param {string} name
   * @param {string} languageCode
   * @param {unknown[]} [components]
   * @param {string} [phoneNumberId]
   */
  async sendTemplateMessage(to, name, languageCode, components = [], phoneNumberId) {
    return this.sendPayload(
      {
        messaging_product: 'whatsapp',
        to: String(to || '').replace(/[^\d]/g, ''),
        type: 'template',
        template: {
          name: String(name || '').trim(),
          language: { code: String(languageCode || 'tr').trim() },
          components
        }
      },
      phoneNumberId
    );
  }

  /**
   * @param {string} to
   * @param {Record<string, unknown>} interactive
   * @param {string} [phoneNumberId]
   */
  async sendInteractiveReply(to, interactive, phoneNumberId) {
    return this.sendPayload(
      {
        messaging_product: 'whatsapp',
        to: String(to || '').replace(/[^\d]/g, ''),
        type: 'interactive',
        interactive
      },
      phoneNumberId
    );
  }

  /**
   * @param {string} messageId
   * @param {string} [phoneNumberId]
   */
  async markAsRead(messageId, phoneNumberId) {
    return this.sendPayload(
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: String(messageId || '').trim()
      },
      phoneNumberId
    );
  }

  /**
   * @param {string} messageId
   * @param {string} [phoneNumberId]
   */
  async sendTypingIndicator(messageId, phoneNumberId) {
    return this.sendPayload(
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: String(messageId || '').trim(),
        typing_indicator: { type: 'text' }
      },
      phoneNumberId
    );
  }

  /**
   * @param {unknown} inboundMessage
   * @returns {Record<string, unknown>|null}
   */
  parseInboundMessage(inboundMessage) {
    if (!inboundMessage || typeof inboundMessage !== 'object') return null;
    return /** @type {Record<string, unknown>} */ (inboundMessage);
  }
}
