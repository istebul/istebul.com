/**
 * GarsonAI production AI retry yardımcıları.
 */

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 200;
const DEFAULT_MAX_DELAY_MS = 4_000;

/**
 * @param {number} attempt
 * @param {number} [baseDelayMs]
 * @param {number} [maxDelayMs]
 */
export function computeAiBackoffMs(attempt, baseDelayMs = DEFAULT_BASE_DELAY_MS, maxDelayMs = DEFAULT_MAX_DELAY_MS) {
  const exponent = Math.max(0, attempt - 1);
  return Math.min(baseDelayMs * 2 ** exponent, maxDelayMs);
}

/**
 * @param {unknown} error
 */
export function isRetryableAiError(error) {
  if (!error || typeof error !== 'object') return false;
  const row = /** @type {Record<string, unknown>} */ (error);
  const code = String(row.code || '').toLowerCase();
  if (['etimedout', 'econnreset', 'ai_timeout', 'rate_limit'].includes(code)) return true;
  const status = Number(row.status || 0);
  return status === 429 || (status >= 500 && status <= 599);
}

/**
 * @template T
 * @param {() => Promise<T>|T} operation
 * @param {{ maxAttempts?: number, onRetry?: (error: unknown, attempt: number) => void }} [options]
 */
export async function withAiRetry(operation, options = {}) {
  const maxAttempts = Math.max(1, options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  /** @type {unknown} */
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRetryableAiError(error) || attempt >= maxAttempts) throw error;
      options.onRetry?.(error, attempt);
      await new Promise((resolve) => setTimeout(resolve, computeAiBackoffMs(attempt)));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('AI retry başarısız oldu.');
}

/**
 * @template T
 * @param {() => Promise<T>|T} operation
 * @param {number} timeoutMs
 */
export async function withAiTimeout(operation, timeoutMs) {
  const limit = Math.max(1, timeoutMs);
  let timer = null;

  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error('AI işlemi zaman aşımına uğradı.');
      /** @type {Record<string, unknown>} */ (error).code = 'AI_TIMEOUT';
      reject(error);
    }, limit);
  });

  try {
    return await Promise.race([Promise.resolve().then(operation), timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
