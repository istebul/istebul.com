/**
 * GarsonAI production yapılandırılmış çıktı ve güvenli fallback.
 */
import { validateParsedMessage } from './schema.js';

/**
 * @typedef {Object} StructuredOutputResult
 * @property {boolean} ok
 * @property {Record<string, unknown>} data
 * @property {string} fallbackReason
 * @property {string[]} errors
 */

/**
 * @param {unknown} parsed
 * @returns {StructuredOutputResult}
 */
export function normalizeStructuredOutput(parsed) {
  const row = parsed && typeof parsed === 'object'
    ? /** @type {Record<string, unknown>} */ ({ .../** @type {Record<string, unknown>} */ (parsed) })
    : { intent: 'unknown', raw: '', items: [] };

  if (!Array.isArray(row.items)) {
    row.items = [];
  }

  row.items = row.items
    .map((item) => {
      const entry = item && typeof item === 'object'
        ? /** @type {Record<string, unknown>} */ (item)
        : {};
      const quantityRaw = Number.parseInt(String(entry.quantity ?? '1'), 10);
      const quantity = Number.isFinite(quantityRaw) && quantityRaw > 0 ? quantityRaw : 1;
      const name = String(entry.name ?? '').trim();
      const note = String(entry.note ?? '').trim();
      if (!name) return null;
      return note ? { name, quantity, note } : { name, quantity };
    })
    .filter(Boolean);

  if (!row.intent) row.intent = 'unknown';
  if (!row.raw) row.raw = '';

  return {
    ok: true,
    data: row,
    fallbackReason: '',
    errors: []
  };
}

/**
 * @param {unknown} parsed
 * @param {{ fallbackIntent?: string }} [options]
 * @returns {StructuredOutputResult}
 */
export function validateStructuredOutput(parsed, options = {}) {
  const normalized = normalizeStructuredOutput(parsed);
  const validation = validateParsedMessage(normalized.data);

  if (validation.ok && validation.data) {
    return {
      ok: true,
      data: validation.data,
      fallbackReason: '',
      errors: []
    };
  }

  const fallbackIntent = String(options.fallbackIntent || 'unknown');
  return {
    ok: false,
    data: {
      intent: fallbackIntent,
      raw: String(normalized.data.raw || ''),
      items: []
    },
    fallbackReason: 'invalid_structured_output',
    errors: validation.errors
  };
}

/**
 * @param {unknown} parsed
 * @returns {StructuredOutputResult}
 */
export function applyStructuredOutputFallback(parsed) {
  const result = validateStructuredOutput(parsed);
  if (result.ok) return result;

  return {
    ok: false,
    data: result.data,
    fallbackReason: result.fallbackReason || 'structured_output_fallback',
    errors: result.errors
  };
}
