/**
 * GarsonAI WhatsApp production metrikleri (Workers global state uyumlu).
 */

const METRICS_KEY = '__garsonWhatsAppProductionMetrics__';

/**
 * @typedef {Object} WhatsAppProductionMetrics
 * @property {number} webhooksReceived
 * @property {number} webhooksFailed
 * @property {number} messagesProcessed
 * @property {number} messagesSent
 * @property {number} duplicatesSkipped
 * @property {number} totalProcessingLatencyMs
 * @property {number} processingCount
 */

/**
 * @returns {WhatsAppProductionMetrics}
 */
function createEmptyMetrics() {
  return {
    webhooksReceived: 0,
    webhooksFailed: 0,
    messagesProcessed: 0,
    messagesSent: 0,
    duplicatesSkipped: 0,
    totalProcessingLatencyMs: 0,
    processingCount: 0
  };
}

/**
 * @returns {WhatsAppProductionMetrics}
 */
function getMetricsStore() {
  const root = /** @type {Record<string, unknown>} */ (globalThis);
  if (!root[METRICS_KEY]) {
    root[METRICS_KEY] = createEmptyMetrics();
  }
  return /** @type {WhatsAppProductionMetrics} */ (root[METRICS_KEY]);
}

export function recordWebhookReceived() {
  getMetricsStore().webhooksReceived += 1;
}

export function recordWebhookFailed() {
  getMetricsStore().webhooksFailed += 1;
}

export function recordMessageProcessed(count = 1) {
  getMetricsStore().messagesProcessed += Math.max(0, count);
}

export function recordMessageSent(count = 1) {
  getMetricsStore().messagesSent += Math.max(0, count);
}

export function recordDuplicateSkipped(count = 1) {
  getMetricsStore().duplicatesSkipped += Math.max(0, count);
}

/**
 * @param {number} latencyMs
 */
export function recordProcessingLatency(latencyMs) {
  const store = getMetricsStore();
  store.totalProcessingLatencyMs += Math.max(0, latencyMs);
  store.processingCount += 1;
}

/**
 * @returns {{ metrics: WhatsAppProductionMetrics, summary: Record<string, number|string> }}
 */
export function getWhatsAppProductionMetrics() {
  const metrics = { ...getMetricsStore() };
  const averageProcessingLatencyMs =
    metrics.processingCount > 0
      ? Number((metrics.totalProcessingLatencyMs / metrics.processingCount).toFixed(2))
      : 0;

  return {
    metrics,
    summary: {
      failedWebhookRate:
        metrics.webhooksReceived > 0
          ? Number((metrics.webhooksFailed / metrics.webhooksReceived).toFixed(4))
          : 0,
      averageProcessingLatencyMs,
      messageThroughput: metrics.messagesProcessed,
      messagesSent: metrics.messagesSent,
      duplicatesSkipped: metrics.duplicatesSkipped
    }
  };
}

export function resetWhatsAppProductionMetrics() {
  const root = /** @type {Record<string, unknown>} */ (globalThis);
  root[METRICS_KEY] = createEmptyMetrics();
}
