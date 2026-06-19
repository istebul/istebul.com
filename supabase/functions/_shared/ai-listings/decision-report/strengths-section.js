/**
 * AI Decision Report — strengths section (Sprint-19 v1).
 */

/**
 * @param {Record<string, unknown>} ctx
 * @returns {string[]}
 */
export function buildStrengthsSection(ctx) {
  /** @type {string[]} */
  const strengths = [];

  const quality = Number(ctx.recommendation?.quality_score);
  if (Number.isFinite(quality) && quality >= 70) strengths.push('kalite yüksek');

  const risk = Number(ctx.recommendation?.risk_score);
  if (Number.isFinite(risk) && risk <= 45) strengths.push('risk kabul edilebilir');

  const fit = Number(ctx.recommendation?.fit_score);
  if (Number.isFinite(fit) && fit >= 75) strengths.push('recommendation güçlü');

  const subscores = /** @type {Record<string, number>} */ (ctx.recommendation?.subscores ?? {});
  if (Number(subscores.budget_fit) >= 70) strengths.push('bütçeye uygun');
  if (Number(subscores.quality_fit) >= 70 && !strengths.includes('kalite yüksek')) {
    strengths.push('kalite skoru yeterli');
  }
  if (Number(subscores.risk_fit) >= 70) strengths.push('risk profili uygun');

  const coachConsider = ctx.coach?.should_consider ?? [];
  if (Array.isArray(coachConsider)) {
    for (const item of coachConsider.slice(0, 3)) {
      const text = String(item).toLowerCase();
      if (!strengths.some((s) => s.includes(text.slice(0, 8)))) {
        strengths.push(String(item));
      }
    }
  }

  const reasons = ctx.recommendation?.reasons ?? [];
  if (Array.isArray(reasons)) {
    for (const reason of reasons.slice(0, 2)) {
      const text = String(reason);
      if (!strengths.includes(text)) strengths.push(text);
    }
  }

  if (!strengths.length) strengths.push('ön değerlendirme ile incelenebilir');

  return [...new Set(strengths)].slice(0, 8).map((s) => `✓ ${s}`);
}
