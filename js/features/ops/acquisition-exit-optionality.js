/**
 * P11-exit — Acquisition / exit optionality snapshot builder.
 */

/**
 * @param {object} config acquisition-exit-optionality.json
 */
export function buildAcquisitionExitSnapshot(input = {}) {
  const config = input.config || {};
  const verdict = config.executiveVerdict || {};
  const scenarios = config.scenarios || [];

  const executiveSummary = [
    `Recommended path: ${verdict.recommendedPath || '—'}.`,
    `Exit readiness: ${verdict.exitReadinessPct ?? '—'}% · Investability: ${verdict.investabilityPct ?? '—'}% · Acquirability: ${verdict.acquirabilityPct ?? '—'}%.`,
    `First category for scale remains auto; capital path: ${verdict.timingSeed || '—'}.`,
    `Top strategic buyers: ${(config.strategicBuyers || []).slice(0, 3).map((b) => b.examples?.[0]).filter(Boolean).join(', ') || '—'}.`,
    `90d focus: ${(config.roadmap90Days || []).length} work blocks — LOIs, outcome graph, data room.`
  ];

  const seedScenario = scenarios.find((s) => s.id === 'seed');
  const bootstrapScenario = scenarios.find((s) => s.id === 'bootstrap');
  const maScenario = scenarios.find((s) => s.id === 'strategic_acquisition');

  return {
    version: config.version || 'p11-exit.0',
    generatedAt: input.generatedAt || new Date().toISOString(),
    phaseName: config.phaseName,
    executiveVerdict: verdict,
    valuationLogic: config.valuationLogic,
    bootstrapVsVc: config.bootstrapVsVc,
    scenarios: { bootstrap: bootstrapScenario, seed: seedScenario, strategicAcquisition: maScenario },
    strategicBuyers: [...(config.strategicBuyers || [])].sort(
      (a, b) => (b.fitScore || 0) - (a.fitScore || 0)
    ),
    metricsCollectNow: config.metricsCollectNow || [],
    roadmap90Days: config.roadmap90Days || [],
    exitReadinessGaps: config.exitReadinessGaps || [],
    executiveSummary,
    docPath: 'docs/investor/EXIT_OPTIONALITY_REPORT.md',
    playbookPath: 'docs/ACQUISITION_EXIT_OPTIONALITY.md'
  };
}
