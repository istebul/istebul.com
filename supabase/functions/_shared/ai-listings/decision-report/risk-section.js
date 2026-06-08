/**
 * AI Decision Report — risk analysis section (Sprint-19 v1).
 */

/** @type {ReadonlyArray<string>} */
export const RISK_LEVELS = Object.freeze(['Düşük', 'Orta', 'Yüksek']);

/**
 * @param {number} riskScore
 * @returns {'Düşük'|'Orta'|'Yüksek'}
 */
export function resolveRiskLevel(riskScore) {
  const risk = Number(riskScore);
  if (!Number.isFinite(risk)) return 'Orta';
  if (risk <= 35) return 'Düşük';
  if (risk <= 60) return 'Orta';
  return 'Yüksek';
}

/**
 * @param {Record<string, unknown>} ctx
 * @returns {{ level: string, score: number|null, reasons: string[], summary: string }}
 */
export function buildRiskSection(ctx) {
  const score = Number.isFinite(Number(ctx.recommendation?.risk_score))
    ? Number(ctx.recommendation.risk_score)
    : null;
  const level = resolveRiskLevel(score ?? 50);

  /** @type {string[]} */
  const reasons = [];

  if (score !== null) {
    if (level === 'Düşük') reasons.push('Risk skoru düşük-orta bandında');
    else if (level === 'Orta') reasons.push('Risk skoru orta bandında');
    else reasons.push('Risk skoru yüksek bandında');
  }

  const coachFlags = ctx.coach?.red_flags ?? [];
  if (Array.isArray(coachFlags)) {
    for (const flag of coachFlags) {
      if (/risk/i.test(String(flag))) reasons.push(String(flag));
    }
  }

  const recRisks = ctx.recommendation?.risks ?? [];
  if (Array.isArray(recRisks)) {
    for (const risk of recRisks.slice(0, 3)) reasons.push(String(risk));
  }

  const duplicate = String(ctx.recommendation?.duplicate_status ?? '');
  if (duplicate === 'exact' || duplicate === 'similar') reasons.push('Duplicate riski mevcut');

  const missing = (ctx.missing_fields ?? []).length;
  if (missing >= 3) reasons.push('Eksik alan sayısı riski artırıyor');

  const summary = `Risk seviyesi: ${level}.${reasons.length ? ` ${reasons.slice(0, 2).join('; ')}.` : ''}`;

  return {
    level,
    score,
    reasons: [...new Set(reasons)].slice(0, 6),
    summary
  };
}
