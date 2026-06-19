/**
 * P24 — Competitor attack scenarios + six-pillar defense plan.
 */

/**
 * @param {object} plan
 */
export function scoreDefensePillar(plan) {
  return Math.max(0, Math.min(100, Number(plan.score) || 0));
}

/**
 * @param {object} scenario
 */
export function attackLikelihoodWeight(scenario) {
  const map = {
    high: 3,
    medium_high: 2.5,
    medium: 2,
    low_medium: 1.5,
    low: 1
  };
  return map[scenario.likelihood] || 2;
}

/**
 * @param {object} config competitor-attack-scenario.json
 */
export function buildCompetitorAttackSnapshot(input = {}) {
  const config = input.config || {};
  const scenarios = [...(config.attackScenarios || [])].sort(
    (a, b) => attackLikelihoodWeight(b) - attackLikelihoodWeight(a)
  );

  const defensePlans = (config.defensePlans || []).map((p) => ({
    ...p,
    strengthPct: scoreDefensePillar(p)
  }));

  const avgDefense =
    defensePlans.length > 0
      ? Math.round(defensePlans.reduce((s, p) => s + p.strengthPct, 0) / defensePlans.length)
      : 0;

  const strongest = [...defensePlans].sort((a, b) => b.strengthPct - a.strengthPct);
  const weakest = [...defensePlans].sort((a, b) => a.strengthPct - b.strengthPct);
  const topAttack = scenarios[0];

  const readiness =
    Number(config.defensibilityVerdict?.overallDefenseReadiness) || avgDefense;

  const executiveSummary = [
    `Defense readiness: ${readiness}% — window ${config.defensibilityVerdict?.responseWindowDays || 90} days.`,
    `Top attack: ${topAttack?.name || '—'} (${topAttack?.likelihood || '—'}).`,
    `Hardest to copy: ${config.defensibilityVerdict?.hardestToCopy || 'partner outcomes'}.`,
    `Strongest pillar: ${strongest[0]?.name || '—'} (${strongest[0]?.strengthPct}%).`,
    `Weakest pillar: ${weakest[0]?.name || '—'} — ${weakest[0]?.plays?.[0] || ''}.`
  ];

  return {
    version: config.version || 'p24.0',
    generatedAt: input.generatedAt || new Date().toISOString(),
    strategicThesis: config.strategicThesis,
    defensibilityVerdict: config.defensibilityVerdict,
    defenseReadinessPct: readiness,
    avgDefensePillarPct: avgDefense,
    attackScenarios: scenarios,
    defensePlans,
    responsePlaybook: config.responsePlaybook || [],
    warGameMatrix: config.warGameMatrix || [],
    kpis: config.kpis || [],
    linkedDocs: config.linkedDocs || [],
    executiveSummary,
    docPath: 'docs/COMPETITOR_ATTACK_SCENARIO.md'
  };
}
