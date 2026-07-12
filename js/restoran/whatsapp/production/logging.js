/**
 * GarsonAI WhatsApp production log yardımcıları.
 */

/**
 * @typedef {'audit'|'delivery'|'error'|'retry'} WhatsAppLogChannel
 */

/**
 * @param {WhatsAppLogChannel} channel
 * @param {string} event
 * @param {Record<string, unknown>} [fields]
 */
function writeLog(channel, event, fields = {}) {
  const payload = {
    ts: new Date().toISOString(),
    service: 'garson-whatsapp-production',
    channel,
    event,
    ...fields
  };
  const line = JSON.stringify(payload);
  if (channel === 'error') {
    console.error(line);
    return;
  }
  console.warn(line);
}

/**
 * @param {string} event
 * @param {Record<string, unknown>} [fields]
 */
export function logAudit(event, fields = {}) {
  writeLog('audit', event, fields);
}

/**
 * @param {string} event
 * @param {Record<string, unknown>} [fields]
 */
export function logDelivery(event, fields = {}) {
  writeLog('delivery', event, fields);
}

/**
 * @param {string} event
 * @param {Record<string, unknown>} [fields]
 */
export function logError(event, fields = {}) {
  writeLog('error', event, fields);
}

/**
 * @param {string} event
 * @param {Record<string, unknown>} [fields]
 */
export function logRetry(event, fields = {}) {
  writeLog('retry', event, fields);
}
