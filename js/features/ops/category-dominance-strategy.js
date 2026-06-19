/**
 * P23 — Category dominance: competitor landscape + six moat plans + ownership score.
 */

/**
 * @param {object} moat
 */
export function scoreMoatStrength(moat) {
  return Math.max(0, Math.min(100, Number(moat.score) || 0));
}

/**
 * @param {object} competitor
 */
export function threatWeight(competitor) {
  const map = { high: 3, medium_high: 2.5, medium: 2, low_medium: 1.5, low: 1 };
  return map[competitor.threatLevel] || 2;
}

/**
 * @param {object} config category-dominance-strategy.json
 * @param {object} [input]
 */
export function buildCategoryDominanceSnapshot(input = {}) {
  const config = input.config || {};
  const moatPlans = (config.moatPlans || []).map((m) => ({
    ...m,
    strengthPct: scoreMoatStrength(m)
  }));

  const avgMoat =
    moatPlans.length > 0
      ? Math.round(moatPlans.reduce((s, m) => s + m.strengthPct, 0) / moatPlans.length)
      : 0;

  const competitors = [...(config.competitorLandscape || [])].sort(
    (a, b) => threatWeight(b) - threatWeight(a)
  );

  const strongest = [...moatPlans].sort((a, b) => b.strengthPct - a.strengthPct);
  const weakest = [...moatPlans].sort((a, b) => a.strengthPct - b.strengthPct);
  const topThreat = competitors[0];

  const ownershipPct =
    Number(config.ownershipVerdict?.categoryOwnershipPct) ||
    Math.round(avgMoat * 0.7 + (strongest[0]?.strengthPct || 0) * 0.3);

  const executiveSummary = [
    `Category: ${config.categoryDefinition?.name || 'Decision Platform'} — ownership ~${ownershipPct}%.`,
    `Beachhead: ${config.ownershipVerdict?.primaryBeachhead || 'auto_tr'}; position: ${config.ownershipVerdict?.currentPosition || '—'}.`,
    `Strongest moat today: ${strongest[0]?.name || '—'} (${strongest[0]?.strengthPct}%).`,
    `Top threat: ${topThreat?.name || '—'} — ${topThreat?.theirMoat?.slice(0, 60) || ''}.`,
    `Weakest moat: ${weakest[0]?.name || '—'} — focus ${weakest[0]?.plays?.[0] || ''}.`
  ];

  return {
    version: config.version || 'p23.0',
    generatedAt: input.generatedAt || new Date().toISOString(),
    categoryThesis: config.categoryThesis,
    categoryDefinition: config.categoryDefinition,
    ownershipVerdict: config.ownershipVerdict,
    categoryOwnershipPct: ownershipPct,
    avgMoatStrengthPct: avgMoat,
    competitorLandscape: competitors,
    moatPlans,
    dominancePhases: config.dominancePhases || [],
    flywheel: config.flywheel,
    kpis: config.kpis || [],
    linkedDocs: config.linkedDocs || [],
    executiveSummary,
    docPath: 'docs/CATEGORY_DOMINANCE_STRATEGY.md'
  };
}
