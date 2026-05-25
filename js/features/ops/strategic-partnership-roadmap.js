/**
 * P26 — Strategic partnership roadmap: distribution + monetization acceleration.
 */

/**
 * @param {object} type
 * @param {object[]} dimensions
 */
export function computePartnerTypeScore(type, dimensions = []) {
  const scores = type.scores || {};
  if (!dimensions.length) {
    const vals = Object.values(scores).map((v) => Number(v) || 0);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }
  let total = 0;
  let w = 0;
  for (const d of dimensions) {
    const weight = Number(d.weight) || 0;
    total += (Number(scores[d.id]) || 0) * weight;
    w += weight;
  }
  return w > 0 ? Math.round(total / w) : 0;
}

/**
 * @param {object} config strategic-partnership-roadmap.json
 */
export function buildStrategicPartnershipSnapshot(input = {}) {
  const config = input.config || {};
  const dimensions = config.scoringDimensions || [];

  const partnerTypes = (config.partnerTypes || []).map((t) => ({
    ...t,
    compositeScore: t.compositeScore ?? computePartnerTypeScore(t, dimensions)
  }));

  const ranked = [...partnerTypes].sort(
    (a, b) => (a.rank || 99) - (b.rank || 99) || b.compositeScore - a.compositeScore
  );

  const verdict = config.accelerationVerdict || {};
  const first = ranked.find((t) => t.id === verdict.firstPartnershipMotion) || ranked[0];

  const executiveSummary = [
    `Wave 1: ${(verdict.wave1Focus || []).join(' + ')} — fastest monetization.`,
    `First motion: ${first?.name || verdict.firstPartnershipMotion} — ${verdict.whyFirst || ''}.`,
    `Distribution lever: ${verdict.distributionLever || 'marketplace'} (wave 3).`,
    `Scale lever: ${verdict.scaleLever || 'affiliate'} (gated wave 4).`,
    `North star: ${config.northStar?.distribution || '—'}; ${config.northStar?.monetization || '—'}.`
  ];

  return {
    version: config.version || 'p26.0',
    generatedAt: input.generatedAt || new Date().toISOString(),
    mission: config.mission,
    northStar: config.northStar,
    accelerationVerdict: verdict,
    scoringDimensions: dimensions,
    partnerTypes: ranked,
    roadmapPhases: config.roadmapPhases || [],
    bdMotions: config.bdMotions || [],
    kpis: config.kpis || [],
    firstPartnerType: first,
    executiveSummary,
    docPath: 'docs/STRATEGIC_PARTNERSHIP_ROADMAP.md'
  };
}
