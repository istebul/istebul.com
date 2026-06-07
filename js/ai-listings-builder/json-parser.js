/**
 * AI Auto Listing Builder — JSON parser.
 */

/**
 * @param {unknown} rawInput
 * @returns {{ ok: true, record: Record<string, unknown>, confidence: number } | { ok: false, message: string }}
 */
export function parseJsonInput(rawInput) {
  const raw = String(rawInput ?? '').trim();
  if (!raw) {
    return { ok: false, message: 'JSON içeriği boş.' };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, message: 'Geçersiz JSON formatı.' };
  }

  let record = parsed;
  if (Array.isArray(parsed)) {
    if (!parsed.length) {
      return { ok: false, message: 'JSON dizisi boş.' };
    }
    record = parsed[0];
  }

  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return { ok: false, message: 'JSON kaydı geçerli bir nesne olmalıdır.' };
  }

  return {
    ok: true,
    record: /** @type {Record<string, unknown>} */ (record),
    confidence: 0.95
  };
}
