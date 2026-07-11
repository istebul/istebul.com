/**
 * GarsonAI WhatsApp Cloud API message routing.
 */

/** @type {readonly string[]} */
export const WHATSAPP_MESSAGE_TYPES = ['text', 'interactive', 'button', 'list_reply', 'unknown'];

/**
 * @typedef {Object} RoutedWhatsAppMessage
 * @property {'text'|'interactive'|'button'|'list_reply'|'unknown'} type
 * @property {string} text
 * @property {string} messageId
 * @property {string} from
 * @property {string} timestamp
 * @property {Record<string, unknown>} raw
 */

/**
 * @param {unknown} message
 * @returns {RoutedWhatsAppMessage}
 */
export function routeWhatsAppMessage(message) {
  const row = /** @type {Record<string, unknown>} */ (
    message && typeof message === 'object' ? message : {}
  );

  const messageId = String(row.id ?? '').trim();
  const from = String(row.from ?? '').trim();
  const timestamp = String(row.timestamp ?? '').trim();
  const type = String(row.type ?? 'unknown').trim().toLowerCase();

  if (type === 'text') {
    const textBody = /** @type {Record<string, unknown>} */ (row.text || {});
    return {
      type: 'text',
      text: String(textBody.body ?? '').trim(),
      messageId,
      from,
      timestamp,
      raw: row
    };
  }

  if (type === 'interactive') {
    const interactive = /** @type {Record<string, unknown>} */ (row.interactive || {});
    const interactiveType = String(interactive.type ?? '').trim().toLowerCase();

    if (interactiveType === 'button_reply') {
      const buttonReply = /** @type {Record<string, unknown>} */ (interactive.button_reply || {});
      return {
        type: 'button',
        text: String(buttonReply.title ?? buttonReply.id ?? '').trim(),
        messageId,
        from,
        timestamp,
        raw: row
      };
    }

    if (interactiveType === 'list_reply') {
      const listReply = /** @type {Record<string, unknown>} */ (interactive.list_reply || {});
      return {
        type: 'list_reply',
        text: String(listReply.title ?? listReply.description ?? listReply.id ?? '').trim(),
        messageId,
        from,
        timestamp,
        raw: row
      };
    }

    return {
      type: 'interactive',
      text: '',
      messageId,
      from,
      timestamp,
      raw: row
    };
  }

  if (type === 'button') {
    const button = /** @type {Record<string, unknown>} */ (row.button || {});
    return {
      type: 'button',
      text: String(button.text ?? button.payload ?? '').trim(),
      messageId,
      from,
      timestamp,
      raw: row
    };
  }

  return {
    type: 'unknown',
    text: '',
    messageId,
    from,
    timestamp,
    raw: row
  };
}

/**
 * @param {RoutedWhatsAppMessage} routed
 * @returns {boolean}
 */
export function isOrderCapableMessage(routed) {
  return routed.type === 'text' || routed.type === 'button' || routed.type === 'list_reply';
}
