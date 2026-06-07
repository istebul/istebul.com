/**
 * AI Decision Coach — safe Turkish summary (Sprint-17 v1).
 */

/** @type {ReadonlyArray<string>} */
export const COACH_FORBIDDEN_PHRASES = Object.freeze([
  'kesinlikle alın',
  'garanti',
  'yatırım tavsiyesi',
  'kesin değer',
  'kazandırır',
  'gerçek piyasa garantisi'
]);

/** @type {ReadonlyArray<string>} */
export const COACH_SAFE_PHRASES = Object.freeze([
  'mevcut bilgiler ışığında',
  'ön değerlendirme',
  'doğrulama önerilir',
  'değerlendirilebilir',
  'dikkatli ilerlenmeli'
]);

/**
 * @param {string} text
 * @returns {boolean}
 */
export function containsCoachForbiddenPhrase(text) {
  const lower = String(text ?? '').toLowerCase();
  return COACH_FORBIDDEN_PHRASES.some((phrase) => lower.includes(phrase));
}

/**
 * @param {string} text
 * @returns {string}
 */
export function sanitizeCoachSummaryText(text) {
  let safe = String(text ?? '').trim();
  for (const phrase of COACH_FORBIDDEN_PHRASES) {
    const regex = new RegExp(phrase, 'gi');
    safe = safe.replace(regex, 'değerlendirilebilir');
  }
  return safe;
}

/**
 * @param {Record<string, unknown>} ctx
 * @param {string} coachLabel
 * @returns {string}
 */
export function buildCoachSummary(ctx, coachLabel) {
  const title = String(
    ctx.selected_recommendation?.title ??
      `${ctx.selected_recommendation?.brand ?? ''} ${ctx.selected_recommendation?.model ?? ''}`.trim() ??
      'Bu seçenek'
  );

  const missing = Array.isArray(ctx.missing_fields) ? ctx.missing_fields : [];
  const missingNote =
    missing.length > 0
      ? `${missing.slice(0, 2).join(' ve ')} bilgisi eksik olduğu için satın alma öncesinde doğrulama yapılmalıdır`
      : 'temel alanlar yeterli görünmektedir; yine de ön değerlendirme ile doğrulama önerilir';

  const labelLower = String(coachLabel).toLowerCase();
  const fitNote =
    labelLower.includes('güçlü')
      ? 'kullanıcı profiline uygun görünüyor'
      : labelLower.includes('uygun görünmüyor')
        ? 'mevcut profil ile uyumu sınırlı görünüyor'
        : labelLower.includes('önce doğrula')
          ? 'değerlendirilebilir ancak eksik bilgiler nedeniyle önce doğrulama gerekir'
          : 'ön değerlendirme ile değerlendirilebilir';

  const summary = `Mevcut bilgiler ışığında bu seçenek ${fitNote}. Ancak ${missingNote}.`;

  return sanitizeCoachSummaryText(summary.replace('Bu seçenek', title));
}
