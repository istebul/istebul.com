/**
 * GarsonAI production AI metrikleri.
 */

const METRICS_KEY = '__garsonAiProductionMetrics__';

/**
 * @returns {Record<string, number>}
 */
function getStore() {
  const root = /** @type {Record<string, unknown>} */ (globalThis);
  if (!root[METRICS_KEY]) {
    root[METRICS_KEY] = {
      totalRequests: 0,
      successCount: 0,
      fallbackCount: 0,
      retryCount: 0,
      invalidJsonCount: 0,
      timeoutCount: 0,
      totalLatencyMs: 0
    };
  }
  return /** @type {Record<string, number>} */ (root[METRICS_KEY]);
}

export function recordAiRequest() {
  getStore().totalRequests += 1;
}

export function recordAiSuccess(latencyMs = 0) {
  const store = getStore();
  store.successCount += 1;
  store.totalLatencyMs += Math.max(0, latencyMs);
}

export function recordAiFallback(_reason = 'unknown') {
  getStore().fallbackCount += 1;
}

export function recordAiRetry() {
  getStore().retryCount += 1;
}

export function recordAiInvalidJson() {
  getStore().invalidJsonCount += 1;
}

export function recordAiTimeout() {
  getStore().timeoutCount += 1;
}

/**
 * @returns {{ metrics: Record<string, number>, summary: Record<string, number> }}
 */
export function getAiProductionMetrics() {
  const metrics = { ...getStore() };
  const total = Math.max(1, metrics.totalRequests);
  return {
    metrics,
    summary: {
      averageLatencyMs: Number((metrics.totalLatencyMs / Math.max(1, metrics.successCount)).toFixed(2)),
      successRate: Number((metrics.successCount / total).toFixed(4)),
      fallbackRate: Number((metrics.fallbackCount / total).toFixed(4)),
      retryRate: Number((metrics.retryCount / total).toFixed(4)),
      invalidJsonRate: Number((metrics.invalidJsonCount / total).toFixed(4)),
      timeoutRate: Number((metrics.timeoutCount / total).toFixed(4))
    }
  };
}

export function resetAiProductionMetrics() {
  const root = /** @type {Record<string, unknown>} */ (globalThis);
  delete root[METRICS_KEY];
}
