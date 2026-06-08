/**
 * Turkish price intelligence summary — AI Listings Price Intelligence v1.
 */

/** @type {Readonly<Record<string, string>>} */
export const PRICE_POSITION_LABELS_TR = Object.freeze({
  underpriced: 'Fırsat olabilir',
  fair: 'Makul aralık',
  slightly_overpriced: 'Biraz yüksek',
  overpriced: 'Yüksek fiyat',
  unknown: 'Yetersiz veri'
});

/**
 * @param {number} value
 * @returns {string}
 */
function formatTurkishPrice(value) {
  if (!Number.isFinite(value) || value <= 0) return '—';
  return `${Math.round(value).toLocaleString('tr-TR')} TL`;
}

/**
 * @param {number} pct
 * @returns {string}
 */
function formatPctTr(pct) {
  const abs = Math.abs(pct);
  const formatted = abs.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (pct > 0) return `%${formatted} üzerinde`;
  if (pct < 0) return `%${formatted} altında`;
  return 'eşit seviyede';
}

/**
 * @param {{
 *   estimated_market_value: number,
 *   listing_price: number,
 *   deviation_pct: number,
 *   price_position: string,
 *   price_confidence: number
 * }} data
 * @returns {string}
 */
export function buildPriceSummary(data) {
  const {
    estimated_market_value,
    listing_price,
    deviation_pct,
    price_position,
    price_confidence
  } = data;

  if (price_position === 'unknown' || estimated_market_value <= 0 || listing_price <= 0) {
    return 'Mevcut girilen alanlara göre tahmini değer hesaplanamadı. Daha fazla alan ekleyerek güveni artırabilirsiniz. Bu sonuç canlı piyasa verisi değil, deterministik ön değerlendirmedir.';
  }

  const estLabel = formatTurkishPrice(estimated_market_value);
  const deviationLabel = formatPctTr(deviation_pct);
  const confidencePct = Math.round(price_confidence * 100);

  let positionNote = '';
  if (price_position === 'underpriced') {
    positionNote = ' İlan fiyatı tahminin altında görünüyor; fırsat olabilir.';
  } else if (price_position === 'fair') {
    positionNote = ' İlan fiyatı makul aralıkta görünüyor.';
  } else if (price_position === 'slightly_overpriced') {
    positionNote = ' İlan fiyatı tahminin biraz üzerinde.';
  } else if (price_position === 'overpriced') {
    positionNote = ' İlan fiyatı tahminin belirgin üzerinde.';
  }

  return `Mevcut girilen alanlara göre tahmini değer ${estLabel} civarındadır. İlan fiyatı bu tahminin yaklaşık ${deviationLabel}.${positionNote} Güven düzeyi %${confidencePct}. Bu sonuç canlı piyasa verisi değil, deterministik ön değerlendirmedir.`;
}

/**
 * @param {string} position
 * @returns {string}
 */
export function getPricePositionLabelTr(position) {
  return PRICE_POSITION_LABELS_TR[position] ?? PRICE_POSITION_LABELS_TR.unknown;
}
