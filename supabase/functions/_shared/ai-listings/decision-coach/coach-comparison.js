/**
 * AI Decision Coach — comparison notes across top recommendations (Sprint-17 v1).
 */

/**
 * @param {Record<string, unknown>} item
 * @returns {string}
 */
function itemTitle(item) {
  const fallback = `${item.brand ?? ''} ${item.model ?? ''}`.trim();
  return String(item.title ?? (fallback || 'Seçenek'));
}

/**
 * @param {Record<string, unknown>} item
 * @returns {string}
 */
function priceNote(item) {
  const price = Number(item.price);
  if (!Number.isFinite(price) || price <= 0) return 'fiyat bilgisi sınırlı';
  const subscores = /** @type {Record<string, number>} */ (item.subscores ?? {});
  const priceFit = Number(subscores.price_fit ?? item.breakdown?.price_fit ?? 50);
  if (priceFit >= 75) return 'fiyat açısından daha güçlü görünürken';
  if (priceFit <= 40) return 'fiyat açısından daha zayıf görünürken';
  return 'fiyat açısından dengeli görünürken';
}

/**
 * @param {Record<string, unknown>} item
 * @returns {string}
 */
function riskNote(item) {
  const risk = Number(item.risk_score);
  if (!Number.isFinite(risk)) return 'risk profili belirsiz olabilir';
  if (risk <= 35) return 'risk açısından daha düşük olabilir';
  if (risk >= 60) return 'risk açısından daha yüksek olabilir';
  return 'risk açısından orta düzeyde olabilir';
}

/**
 * @param {Record<string, unknown>} ctx
 * @returns {string}
 */
export function buildComparisonNotes(ctx) {
  const top = Array.isArray(ctx.top_recommendations) ? ctx.top_recommendations : [];
  const selectedId = String(ctx.selected_recommendation?.id ?? '');

  if (top.length < 2) {
    return 'Alternatif karşılaştırma için yeterli öneri bulunmuyor. Mevcut seçenek ön değerlendirme ile incelenebilir.';
  }

  const others = top.filter((item) => String(item.id) !== selectedId).slice(0, 2);
  if (!others.length) {
    return 'Diğer önerilerle kıyas için yeterli alternatif bulunmuyor.';
  }

  const selected = ctx.selected_recommendation ?? top[0];
  const primary = others[0];
  const secondary = others[1];

  let note = `${itemTitle(selected)} ${priceNote(selected)}, ${itemTitle(primary)} ${riskNote(primary)}.`;

  if (secondary) {
    note += ` ${itemTitle(secondary)} ise farklı bir denge sunabilir.`;
  }

  note += ' Nihai karar kullanım önceliğine göre verilmelidir.';

  return note;
}
