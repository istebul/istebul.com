/**
 * AI Decision Coach — red flag detection (Sprint-17 v1).
 */

/**
 * @param {Record<string, unknown>} ctx
 * @returns {string[]}
 */
export function buildRedFlags(ctx) {
  /** @type {string[]} */
  const flags = [];

  const listing = /** @type {Record<string, unknown>} */ (ctx.selected_recommendation?.listing ?? {});
  const images = Array.isArray(listing.images) ? listing.images : [];
  const location = String(listing.location ?? '').trim();
  const description = String(listing.description ?? '').trim();
  const sourceUrl = String(listing.source_url ?? '').trim();

  if (!images.length) flags.push('Fotoğraf yok');
  if (!location) flags.push('Konum yok');

  const duplicate = String(ctx.duplicate_status ?? ctx.selected_recommendation?.duplicate_status ?? 'new');
  if (duplicate === 'exact' || duplicate === 'similar') flags.push('Duplicate yüksek');

  const risk = Number(ctx.risk_score ?? ctx.selected_recommendation?.risk_score);
  if (Number.isFinite(risk) && risk >= 61) flags.push('Risk skoru yüksek');

  const priceIntel = /** @type {Record<string, unknown>} */ (ctx.price_intelligence ?? {});
  const pricePosition = String(priceIntel.price_position ?? '');
  if (pricePosition === 'overpriced' || pricePosition === 'slightly_overpriced') {
    flags.push('Fiyat çok yüksek');
  }

  if (description.length < 30) flags.push('Açıklama yetersiz');
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) flags.push('Kaynak URL yok');

  const explainRisks = ctx.explainability?.risks ?? ctx.selected_recommendation?.risks;
  if (Array.isArray(explainRisks)) {
    for (const risk of explainRisks) {
      const text = String(risk);
      if (/duplicate/i.test(text) && !flags.includes('Duplicate yüksek')) flags.push('Duplicate yüksek');
      if (/fotoğraf/i.test(text) && !flags.includes('Fotoğraf yok')) flags.push('Fotoğraf yok');
    }
  }

  return [...new Set(flags)].slice(0, 8);
}
