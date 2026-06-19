/**
 * P22 — International expansion audit: dimension scores + priority markets.
 */

/**
 * @param {object} dimension
 */
export function scoreDimensionReadiness(dimension) {
  return Math.max(0, Math.min(100, Number(dimension.score) || 0));
}

/**
 * @param {object} config international-expansion-audit.json
 */
export function buildInternationalExpansionSnapshot(input = {}) {
  const config = input.config || {};
  const dimensions = (config.dimensions || []).map((d) => ({
    ...d,
    readinessPct: scoreDimensionReadiness(d)
  }));

  const avgScore =
    dimensions.length > 0
      ? Math.round(dimensions.reduce((s, d) => s + d.readinessPct, 0) / dimensions.length)
      : 0;

  const markets = [...(config.priorityMarkets || [])].sort(
    (a, b) => (a.rank || 99) - (b.rank || 99)
  );

  const wave1 = markets.filter((m) => m.phase === 'wave_1');
  const weakest = [...dimensions].sort((a, b) => a.readinessPct - b.readinessPct);

  const executiveSummary = [
    `Global foundation readiness: ${avgScore}% (${config.readinessVerdict?.globalFoundation || '—'}).`,
    `First expansion market: ${wave1[0]?.country || 'Germany'} (locale ${wave1[0]?.locale || 'de'}).`,
    `Weakest pillar: ${weakest[0]?.name || '—'} (${weakest[0]?.readinessPct}%) — ${weakest[0]?.gaps?.[0] || ''}.`,
    `Domain: ${config.domainStrategy?.phase1 || 'path locales on istebul.com'}.`
  ];

  return {
    version: config.version || 'p22.0',
    generatedAt: input.generatedAt || new Date().toISOString(),
    vision: config.vision,
    baselineMarket: config.baselineMarket,
    readinessVerdict: config.readinessVerdict,
    globalReadinessPct: avgScore,
    dimensions,
    priorityMarkets: markets,
    wave1Markets: wave1,
    domainStrategy: config.domainStrategy,
    roadmapPhases: config.roadmapPhases || [],
    kpis: config.kpis || [],
    executiveSummary,
    docPath: 'docs/INTERNATIONAL_EXPANSION_AUDIT.md'
  };
}
