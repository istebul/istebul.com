/**
 * AI Listings Search — result summary builder (Sprint-16 v2).
 */

/** @type {Readonly<Record<string, string>>} */
const ATTRIBUTE_LABELS_TR = Object.freeze({
  low_km: 'Düşük KM',
  authorized_service: 'Yetkili Servis',
  paint_one_piece: 'Tek Parça Boya',
  m_sport: 'M Sport'
});

/** @type {Readonly<Record<string, string>>} */
const FUEL_LABELS_TR = Object.freeze({
  diesel: 'Dizel',
  gasoline: 'Benzin',
  lpg: 'LPG',
  electric: 'Elektrik',
  hybrid: 'Hibrit'
});

/** @type {Readonly<Record<string, string>>} */
const TRANSMISSION_LABELS_TR = Object.freeze({
  automatic: 'Otomatik',
  manual: 'Manuel'
});

/**
 * @param {import('./query-parser.js').ParsedSearchQuery|null|undefined} parsed
 * @returns {string|null}
 */
function resolveFeatureLabel(parsed) {
  if (!parsed) return null;

  for (const attr of parsed.attributes) {
    if (ATTRIBUTE_LABELS_TR[attr]) return ATTRIBUTE_LABELS_TR[attr];
  }

  if (parsed.transmission) return TRANSMISSION_LABELS_TR[parsed.transmission] ?? null;
  if (parsed.fuel) return FUEL_LABELS_TR[parsed.fuel] ?? null;
  if (parsed.body_type) return String(parsed.body_type).toUpperCase();

  return null;
}

/**
 * @param {Array<Record<string, unknown>>} results
 * @param {string} [query]
 * @param {import('./query-parser.js').ParsedSearchQuery|null} [parsed]
 * @returns {{
 *   total: number,
 *   message: string,
 *   brand_label: string|null,
 *   model_label: string|null,
 *   feature_label: string|null,
 *   top_match_title: string|null,
 *   top_match: Record<string, unknown>|null
 * }}
 */
export function buildSearchSummary(results, query = '', parsed = null) {
  const total = results.length;
  const hasQuery = String(query ?? '').trim().length > 0;

  if (!hasQuery) {
    return {
      total,
      message: total > 0 ? `${total} kayıt bulundu.` : 'Yeterli veri yok',
      brand_label: null,
      model_label: null,
      feature_label: null,
      top_match_title: null,
      top_match: null
    };
  }

  if (total === 0) {
    return {
      total: 0,
      message: 'Sonuç bulunamadı.\nAramayı genişletmeyi deneyin.',
      brand_label: null,
      model_label: null,
      feature_label: null,
      top_match_title: null,
      top_match: null
    };
  }

  const top = results[0] ?? null;
  const topTitle = top ? String(top.title ?? `${top.brand ?? ''} ${top.model ?? ''}`.trim()) : '';
  const topSimilarity = top ? Number(top.similarity_percent ?? top.search_score ?? 0) : 0;

  const brandLabel = parsed?.brand ?? (top?.brand ? String(top.brand) : null);
  const modelLabel = parsed?.model ?? (top?.model ? String(top.model) : null);
  const featureLabel = resolveFeatureLabel(parsed);

  const countWord = total === 1 ? 'sonuç' : 'sonuç';
  const lines = [`${total} ${countWord} bulundu`];

  if (brandLabel) lines.push('', 'Marka:', brandLabel);
  if (modelLabel) lines.push('', 'Model:', modelLabel);
  if (featureLabel) lines.push('', 'Özellik:', featureLabel);

  if (topTitle) {
    lines.push('', 'En iyi eşleşme:', '', topTitle);
    if (topSimilarity > 0) {
      lines.push(`(%${topSimilarity})`);
    }
  }

  return {
    total,
    message: lines.join('\n'),
    brand_label: brandLabel,
    model_label: modelLabel,
    feature_label: featureLabel,
    top_match_title: topTitle || null,
    top_match: top
  };
}
