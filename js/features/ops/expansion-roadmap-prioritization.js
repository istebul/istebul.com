/**
 * P25 — Expansion roadmap prioritization across seven categories.
 */

const CRITERION_IDS = [
  'monetization',
  'data_availability',
  'user_pain',
  'repeat_usage',
  'ai_differentiation',
  'partner_economics'
];

/**
 * @param {object} category
 * @param {object[]} criteria
 */
export function computeCompositeScore(category, criteria = []) {
  const scores = category.scores || {};
  if (!criteria.length) {
    const vals = CRITERION_IDS.map((id) => Number(scores[id]) || 0);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }

  let total = 0;
  let weightSum = 0;
  for (const c of criteria) {
    const w = Number(c.weight) || 0;
    total += (Number(scores[c.id]) || 0) * w;
    weightSum += w;
  }
  return weightSum > 0 ? Math.round(total / weightSum) : 0;
}

/**
 * @param {object} config expansion-roadmap-prioritization.json
 */
export function buildExpansionPrioritizationSnapshot(input = {}) {
  const config = input.config || {};
  const criteria = config.prioritizationCriteria || [];

  const categories = (config.categories || []).map((cat) => ({
    ...cat,
    compositeScore: cat.compositeScore ?? computeCompositeScore(cat, criteria)
  }));

  const ranked = [...categories].sort(
    (a, b) => (a.rank || 99) - (b.rank || 99) || b.compositeScore - a.compositeScore
  );

  const verdict = config.verdict || {};
  const first = ranked.find((c) => c.id === verdict.firstCategory) || ranked[0];

  const executiveSummary = [
    `First category: ${first?.displayName || verdict.firstCategoryDisplay} (wave ${first?.wave || 1}, score ${first?.compositeScore}%).`,
    `Why first: ${verdict.summaryWhyFirst || first?.whyNow?.[0] || '—'}.`,
    `Second: ${ranked.find((c) => c.id === verdict.secondCategory)?.displayName || verdict.secondCategory || '—'}.`,
    `Defer: ${(verdict.defer || []).join(', ')}.`,
    `Foundation: ${verdict.foundationFirst || 'category_registry'} before net-new launches.`
  ];

  return {
    version: config.version || 'p25.0',
    generatedAt: input.generatedAt || new Date().toISOString(),
    beachhead: config.beachhead,
    prioritizationCriteria: criteria,
    verdict: config.verdict,
    categories: ranked,
    recommendedSequence: config.recommendedSequence || [],
    kpis: config.kpis || [],
    firstCategory: first,
    executiveSummary,
    docPath: 'docs/EXPANSION_ROADMAP_PRIORITIZATION.md'
  };
}
