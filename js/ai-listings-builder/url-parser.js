/**
 * AI Auto Listing Builder — URL parser.
 */

import { isHttpOrHttpsUrl } from '../../supabase/functions/_shared/ai-listings/validation.js';

const BLOCKED_PROTOCOL_PREFIXES = ['javascript:', 'data:', 'file:', 'blob:'];

/**
 * @param {unknown} rawInput
 * @returns {boolean}
 */
export function isSafeBuilderUrl(rawInput) {
  const raw = String(rawInput ?? '').trim();
  const lower = raw.toLowerCase();
  for (const prefix of BLOCKED_PROTOCOL_PREFIXES) {
    if (lower.startsWith(prefix)) return false;
  }
  return isHttpOrHttpsUrl(raw);
}

/**
 * @param {unknown} rawInput
 * @returns {{ ok: true, record: Record<string, unknown>, confidence: number } | { ok: false, message: string }}
 */
export function parseUrlInput(rawInput) {
  const source_url = String(rawInput ?? '').trim();
  if (!source_url) {
    return { ok: false, message: 'URL boş.' };
  }

  if (!isSafeBuilderUrl(source_url)) {
    return { ok: false, message: 'Geçersiz URL. Yalnızca http/https adresleri kabul edilir.' };
  }

  /** @type {Record<string, unknown>} */
  const record = { source_url };

  try {
    const hostname = new URL(source_url).hostname.toLowerCase();
    if (hostname.includes('sahibinden') || hostname.includes('arabam') || hostname.includes('otoplus')) {
      record.category = 'vehicle';
    } else if (hostname.includes('emlak') || hostname.includes('hepsiemlak')) {
      record.category = 'housing';
    }
  } catch {
    return { ok: false, message: 'Geçersiz URL formatı.' };
  }

  return { ok: true, record, confidence: 0.85 };
}
