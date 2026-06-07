/**
 * AI Listings Search — result summary builder (Sprint-15).
 */

/**
 * @param {Array<Record<string, unknown>>} results
 * @param {string} [query]
 * @returns {{ total: number, message: string, top_match: Record<string, unknown>|null }}
 */
export function buildSearchSummary(results, query = '') {
  const total = results.length;
  const hasQuery = String(query ?? '').trim().length > 0;

  if (!hasQuery) {
    return {
      total,
      message: total > 0 ? `${total} kayıt bulundu.` : 'Yeterli veri yok',
      top_match: null
    };
  }

  if (total === 0) {
    return {
      total: 0,
      message: 'Sonuç bulunamadı.\nAramayı genişletmeyi deneyin.',
      top_match: null
    };
  }

  const top = results[0] ?? null;
  const topTitle = top ? String(top.title ?? `${top.brand ?? ''} ${top.model ?? ''}`.trim()) : '';
  const topSimilarity = top ? Number(top.similarity_percent ?? top.search_score ?? 0) : 0;

  let message = `${total} kayıt bulundu.`;
  if (topTitle) {
    message += `\nEn güçlü eşleşme: ${topTitle} (%${topSimilarity})`;
  }

  return {
    total,
    message,
    top_match: top
  };
}
