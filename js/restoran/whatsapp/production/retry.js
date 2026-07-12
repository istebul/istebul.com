/**
 * GarsonAI WhatsApp Cloud API retry yardımcıları.
 */

const DEFAULT_MAX_ATTEMPTS = 4;
const DEFAULT_BASE_DELAY_MS = 250;
const DEFAULT_MAX_DELAY_MS = 8_000;

/**
 * @param {number} attempt
 * @param {number} baseDelayMs
 * @param {number} maxDelayMs
 * @returns {number}
 */
export function computeExponentialBackoffMs(attempt, baseDelayMs = DEFAULT_BASE_DELAY_MS, maxDelayMs = DEFAULT_MAX_DELAY_MS) {
  const exponent = Math.max(0, attempt - 1);
  const delay = baseDelayMs * 2 ** exponent;
  return Math.min(delay, maxDelayMs);
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export function isRetryableNetworkError(error) {
  if (!error || typeof error !== 'object') return false;
  const row = /** @type {Record<string, unknown>} */ (error);
  const code = String(row.code || '').trim().toLowerCase();
  if (['econnreset', 'etimedout', 'econnrefused', 'enotfound', 'fetch_failed'].includes(code)) {
    return true;
  }
  const message = String(row.message || error || '').toLowerCase();
  return message.includes('network') || message.includes('fetch failed') || message.includes('timeout');
}

/**
 * @param {number} status
 * @returns {boolean}
 */
export function isRetryableHttpStatus(status) {
  return status === 429 || (status >= 500 && status <= 599);
}

/**
 * @typedef {Object} RetryOptions
 * @property {number} [maxAttempts]
 * @property {number} [baseDelayMs]
 * @property {number} [maxDelayMs]
 * @property {(error: unknown, attempt: number) => void} [onRetry]
 * @property {(attempt: number) => boolean} [shouldRetry]
 * @property {typeof fetch} [fetchImpl]
 */

/**
 * @template T
 * @param {() => Promise<T>} operation
 * @param {RetryOptions} [options]
 * @returns {Promise<T>}
 */
export async function withRetry(operation, options = {}) {
  const maxAttempts = Math.max(1, options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;

  /** @type {unknown} */
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const retryable =
        typeof options.shouldRetry === 'function'
          ? options.shouldRetry(attempt)
          : isRetryableNetworkError(error);

      if (!retryable || attempt >= maxAttempts) {
        throw error;
      }

      options.onRetry?.(error, attempt);
      const delayMs = computeExponentialBackoffMs(attempt, baseDelayMs, maxDelayMs);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Retry işlemi başarısız oldu.');
}

/**
 * @param {Response} response
 * @param {RetryOptions} [options]
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, init = {}, options = {}) {
  const fetchFn = options.fetchImpl || fetch;
  return withRetry(async () => {
    const response = await fetchFn(url, init);
    if (!isRetryableHttpStatus(response.status)) {
      return response;
    }

    const error = new Error(`WhatsApp API geçici hata: HTTP ${response.status}`);
    /** @type {Record<string, unknown>} */ (error).status = response.status;
    throw error;
  }, {
    ...options,
    shouldRetry: (attempt) => {
      if (typeof options.shouldRetry === 'function' && !options.shouldRetry(attempt)) {
        return false;
      }
      return attempt < (options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
    }
  });
}
