/**
 * AI Decision Report — executive summary (Sprint-19 v1).
 */

/** @type {ReadonlyArray<string>} */
export const REPORT_FORBIDDEN_PHRASES = Object.freeze([
  'kesin alın',
  'kesinlikle alın',
  'garanti',
  'yatırım tavsiyesi',
  'kazandırır',
  'gerçek değer'
]);

/**
 * @param {string} text
 * @returns {string}
 */
export function sanitizeReportText(text) {
  let safe = String(text ?? '').trim();
  for (const phrase of REPORT_FORBIDDEN_PHRASES) {
    const regex = new RegExp(phrase, 'gi');
    safe = safe.replace(regex, 'değerlendirilebilir');
  }
  return safe;
}

/**
 * @param {number} confidence
 * @returns {string}
 */
function confidenceBand(confidence) {
  if (confidence >= 75) return 'yüksek';
  if (confidence >= 50) return 'orta-yüksek';
  if (confidence >= 35) return 'orta';
  return 'düşük-orta';
}

/**
 * @param {Record<string, unknown>} ctx
 * @returns {string}
 */
export function buildExecutiveSummary(ctx) {
  const fallback = `${ctx.recommendation?.brand ?? ''} ${ctx.recommendation?.model ?? ''}`.trim();
  const title = String(ctx.recommendation?.title ?? (fallback || 'Bu seçenek'));

  const fit = Number(ctx.recommendation?.fit_score ?? 0);
  const fitNote =
    fit >= 75
      ? 'kullanıcı profiliyle uyumlu görünmektedir'
      : fit >= 55
        ? 'kullanıcı profiliyle kısmen uyumlu görünmektedir'
        : 'kullanıcı profiliyle sınırlı uyum göstermektedir';

  const confidence = Number(ctx.final_confidence ?? ctx.coach?.confidence ?? 50);
  const band = confidenceBand(confidence);

  const summary = `Mevcut bilgiler ışığında ${title} ${fitNote}. Karar güveni ${band} seviyededir. Satın alma öncesinde doğrulama önerilir.`;

  return sanitizeReportText(summary);
}
