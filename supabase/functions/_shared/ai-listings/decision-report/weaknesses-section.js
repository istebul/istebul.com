/**
 * AI Decision Report — weaknesses section (Sprint-19 v1).
 */

/**
 * @param {Record<string, unknown>} ctx
 * @returns {string[]}
 */
export function buildWeaknessesSection(ctx) {
  /** @type {string[]} */
  const weaknesses = [];

  const redFlags = ctx.coach?.red_flags ?? [];
  if (Array.isArray(redFlags)) {
    for (const flag of redFlags) {
      const text = String(flag).toLowerCase();
      if (/fotoğraf/i.test(text)) weaknesses.push('fotoğraf eksik');
      else if (/konum/i.test(text)) weaknesses.push('konum eksik');
      else if (/duplicate/i.test(text)) weaknesses.push('duplicate');
      else weaknesses.push(String(flag));
    }
  }

  const missing = ctx.missing_fields ?? [];
  if (Array.isArray(missing)) {
    for (const field of missing.slice(0, 4)) {
      weaknesses.push(`${String(field).toLowerCase()} eksik`);
    }
  }

  const quality = Number(ctx.recommendation?.quality_score);
  if (Number.isFinite(quality) && quality < 55) weaknesses.push('kalite düşürücü alanlar');

  const risks = ctx.recommendation?.risks ?? [];
  if (Array.isArray(risks)) {
    for (const risk of risks.slice(0, 3)) {
      const text = String(risk);
      if (!weaknesses.some((w) => w.includes(text.slice(0, 6)))) {
        weaknesses.push(text);
      }
    }
  }

  const duplicate = String(ctx.recommendation?.duplicate_status ?? '');
  const dupPenalty = Number(ctx.recommendation?.breakdown?.duplicate_penalty ?? 0);
  const coachDup = (ctx.coach?.red_flags ?? []).some((f) => /duplicate/i.test(String(f)));
  if (
    (duplicate === 'exact' || duplicate === 'similar' || dupPenalty < 0 || coachDup) &&
    !weaknesses.some((w) => /duplicate/i.test(w))
  ) {
    weaknesses.push('duplicate');
  }

  return [...new Set(weaknesses)].slice(0, 8).map((w) => `⚠ ${w}`);
}
