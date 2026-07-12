/**
 * GarsonAI production AI güvenilirlik katmanı.
 */
import { withAiRetry, withAiTimeout } from './retry.js';
import { recordAiFallback, recordAiRetry, recordAiTimeout } from './monitoring.js';

/**
 * @typedef {'timeout'|'invalid_json'|'empty_response'|'unknown_intent'|'structured_output_fallback'} AiFallbackReason
 */

/**
 * @param {unknown} error
 * @returns {AiFallbackReason}
 */
export function classifyAiFailure(error) {
  const row = error && typeof error === 'object'
    ? /** @type {Record<string, unknown>} */ (error)
    : {};
  const code = String(row.code || '').toLowerCase();
  const message = String(row.message || error || '').toLowerCase();

  if (code === 'ai_timeout' || message.includes('zaman aşım')) return 'timeout';
  if (message.includes('json') || code === 'invalid_json') return 'invalid_json';
  if (message.includes('boş') || code === 'empty_response') return 'empty_response';
  return 'unknown_intent';
}

/**
 * @template T
 * @param {() => Promise<T>|T} operation
 * @param {{ timeoutMs?: number, maxRetries?: number, onRetry?: (error: unknown, attempt: number) => void }} [options]
 */
export async function runReliableAiOperation(operation, options = {}) {
  const timeoutMs = options.timeoutMs ?? 12_000;
  const maxRetries = options.maxRetries ?? 3;

  return withAiRetry(
    () =>
      withAiTimeout(operation, timeoutMs).catch((error) => {
        if (classifyAiFailure(error) === 'timeout') {
          recordAiTimeout();
        }
        throw error;
      }),
    {
      maxAttempts: maxRetries,
      onRetry: (error, attempt) => {
        recordAiRetry();
        options.onRetry?.(error, attempt);
      }
    }
  );
}

/**
 * @param {AiFallbackReason} reason
 * @param {Record<string, unknown>} [data]
 */
export function buildAiFallbackResult(reason, data = {}) {
  recordAiFallback(reason);
  return {
    ok: false,
    fallback: true,
    fallbackReason: reason,
    data
  };
}

/**
 * @param {unknown} intent
 * @returns {boolean}
 */
export function isUnknownIntent(intent) {
  return String(intent || '').trim() === 'unknown';
}
