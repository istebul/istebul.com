/**
 * AI Decision Report — alternatives section (Sprint-19 v1).
 */

/**
 * @param {Record<string, unknown>} item
 * @returns {string}
 */
function itemTitle(item) {
  const brand = String(item.brand ?? item.listing?.attributes?.brand ?? '').trim();
  const model = String(item.model ?? item.listing?.attributes?.model ?? '').trim();
  const title = String(item.title ?? '').trim();
  if (brand && model) return `${brand} ${model}`.trim();
  return title || 'Alternatif';
}

/**
 * @param {Record<string, unknown>} item
 * @returns {string}
 */
function itemReason(item) {
  const reasons = Array.isArray(item.reasons) ? item.reasons : [];
  if (reasons.length) return String(reasons[0]);
  const label = String(item.recommendation_label ?? '');
  if (label) return `${label} — fit ${item.fit_score ?? '—'}`;
  return `Fit skoru ${item.fit_score ?? '—'}`;
}

/**
 * @param {Record<string, unknown>} ctx
 * @returns {Array<{ rank: number, title: string, reason: string, fit_score: number, label: string }>}
 */
export function buildAlternativesSection(ctx) {
  const selectedId = String(ctx.recommendation?.id ?? '');
  const top = Array.isArray(ctx.top_recommendations) ? ctx.top_recommendations : [];

  const others = top.filter((item) => String(item.id) !== selectedId).slice(0, 3);

  return others.map((item, index) => ({
    rank: index + 1,
    title: itemTitle(item),
    reason: itemReason(item),
    fit_score: Number(item.fit_score ?? 0),
    label: String(item.recommendation_label ?? 'İncelenebilir')
  }));
}
