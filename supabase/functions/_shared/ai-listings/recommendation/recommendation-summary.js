/**
 * AI Recommendation Engine — safe Turkish summary (Sprint-16 v1).
 */

/** @type {ReadonlyArray<string>} */
export const FORBIDDEN_PHRASES = Object.freeze([
  'kesinlikle alın',
  'garanti',
  'yatırım tavsiyesi',
  'kesin değer',
  'kazandırır',
  'gerçek piyasa garantisi'
]);

/** @type {ReadonlyArray<string>} */
export const SAFE_PHRASES = Object.freeze([
  'mevcut bilgiler ışığında',
  'ön değerlendirme',
  'önerilir',
  'değerlendirilebilir',
  'doğrulama önerilir'
]);

/**
 * @param {string} text
 * @returns {string}
 */
export function containsForbiddenPhrase(text) {
  const lower = String(text ?? '').toLowerCase();
  return FORBIDDEN_PHRASES.some((phrase) => lower.includes(phrase));
}

/**
 * @param {string} text
 * @returns {string}
 */
export function sanitizeSummaryText(text) {
  let safe = String(text ?? '').trim();
  for (const phrase of FORBIDDEN_PHRASES) {
    const regex = new RegExp(phrase, 'gi');
    safe = safe.replace(regex, 'değerlendirilebilir');
  }
  return safe;
}

/**
 * @param {Record<string, unknown>} top
 * @param {Record<string, unknown>} profile
 * @returns {string}
 */
export function buildRecommendationSummary(top, profile = {}) {
  if (!top || !top.title) {
    return 'Mevcut bilgiler ışığında bu profil için öneri üretilemedi. Profil alanlarını gözden geçirmeniz önerilir.';
  }

  const title = String(top.title ?? `${top.brand ?? ''} ${top.model ?? ''}`.trim());
  const label = String(top.recommendation_label ?? 'İncelenebilir');
  const budgetNote =
    profile.budget && top.price
      ? Number(top.price) <= Number(profile.budget)
        ? 'Bütçe ile uyumu iyi görünmektedir'
        : 'Bütçe üzerinde olabilir; ön değerlendirme ile kontrol önerilir'
      : 'Bütçe bilgisi sınırlı; ön değerlendirme önerilir';

  const riskNote = Number(top.risk_score) <= 40
    ? 'risk seviyesi düşük-orta'
    : Number(top.risk_score) <= 60
      ? 'risk seviyesi orta'
      : 'risk seviyesi yüksek olabilir';

  const qualityNote = Number(top.quality_score) >= 75
    ? 'kalite skoru kabul edilebilir düzeydedir'
    : Number(top.quality_score) >= 55
      ? 'kalite skoru orta düzeydedir'
      : 'kalite skoru sınırlı görünmektedir';

  const summary = `Mevcut bilgiler ışığında ${title} bu profil için ${label.toLowerCase()} seçeneklerden biri görünmektedir. ${budgetNote}, ${riskNote} ve ${qualityNote}. Satın alma öncesinde ekspertiz ve kayıt doğrulaması önerilir.`;

  return sanitizeSummaryText(summary);
}
