/**
 * AI Decision Report — recommendation section (Sprint-19 v1).
 */

/**
 * @param {Record<string, unknown>} recommendation
 * @returns {{
 *   title: string,
 *   fit_score: number,
 *   label: string,
 *   quality_score: number|null,
 *   risk_score: number|null,
 *   reasons: string[],
 *   risks: string[],
 *   summary: string
 * }}
 */
export function buildRecommendationSection(recommendation = {}) {
  const rec = recommendation && typeof recommendation === 'object' ? recommendation : {};
  const fallback = `${rec.brand ?? ''} ${rec.model ?? ''}`.trim();
  const title = String(rec.title ?? (fallback || '—'));
  const fit = Number(rec.fit_score ?? 0);
  const label = String(rec.recommendation_label ?? 'İncelenebilir');
  const reasons = Array.isArray(rec.reasons) ? rec.reasons.map(String) : [];
  const risks = Array.isArray(rec.risks) ? rec.risks.map(String) : [];

  const summary =
    reasons.length > 0
      ? `Fit skoru ${fit} ile "${label}" seviyesinde değerlendirilmiştir.`
      : `Fit skoru ${fit} ile ön değerlendirme yapılmıştır.`;

  return {
    title,
    fit_score: fit,
    label,
    quality_score: Number.isFinite(Number(rec.quality_score)) ? Number(rec.quality_score) : null,
    risk_score: Number.isFinite(Number(rec.risk_score)) ? Number(rec.risk_score) : null,
    reasons,
    risks,
    summary
  };
}
