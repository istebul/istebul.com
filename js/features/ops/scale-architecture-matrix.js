/**
 * P19 — Scale architecture execution matrix (10K / 100K / 1M MAU).
 */

const TIER_ORDER = ['10k', '100k', '1m'];
const RISK_WEIGHT = { low: 1, medium: 2, high: 3, critical: 4 };

/**
 * @param {string} risk
 */
export function riskToScore(risk) {
  return RISK_WEIGHT[String(risk || 'medium').toLowerCase()] || 2;
}

/**
 * Technical confidence 0–100 per tier from dimension risk scores.
 * @param {Array} dimensions
 * @param {string} tierId
 */
export function computeTierConfidence(dimensions, tierId) {
  if (!dimensions?.length) return 0;
  const scores = dimensions.map((d) => riskToScore(d.tiers?.[tierId]?.risk));
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.max(0, Math.min(100, Math.round(100 - (avg - 1) * 28)));
}

/**
 * Adjust confidence from live ops signals (analytics cap, alerts).
 * @param {number} base
 * @param {object} live
 */
export function adjustConfidenceWithLiveSignals(base, live = {}) {
  let score = base;
  if (live.analyticsAtCap) score -= 12;
  if (live.triggeredAlerts >= 3) score -= 8;
  if (live.opsHealth === 'critical') score -= 15;
  else if (live.opsHealth === 'warning') score -= 5;
  return Math.max(0, Math.min(100, score));
}

/**
 * @param {object} input
 * @param {object} input.config scale-architecture-scenarios.json
 * @param {object} [input.liveSignals]
 */
export function buildScaleArchitectureReport(input = {}) {
  const config = input.config || {};
  const dimensions = (config.dimensions || []).map((dim) => ({
    id: dim.id,
    name: dim.name,
    tiers: dim.tiers
  }));

  const tierConfidence = {};
  for (const tier of TIER_ORDER) {
    const base = computeTierConfidence(dimensions, tier);
    tierConfidence[tier] =
      tier === '10k'
        ? adjustConfidenceWithLiveSignals(base, input.liveSignals || {})
        : base;
  }

  const hotDimensions = dimensions
    .map((d) => ({
      id: d.id,
      name: d.name,
      tier100k: d.tiers?.['100k'],
      tier1m: d.tiers?.['1m'],
      maxRisk: Math.max(
        riskToScore(d.tiers?.['10k']?.risk),
        riskToScore(d.tiers?.['100k']?.risk),
        riskToScore(d.tiers?.['1m']?.risk)
      )
    }))
    .sort((a, b) => b.maxRisk - a.maxRisk);

  const executiveSummary = [
    `10K MAU confidence: ${tierConfidence['10k']}% (${config.confidenceVerdict?.['10k'] || '—'}).`,
    `100K MAU confidence: ${tierConfidence['100k']}% (${config.confidenceVerdict?.['100k'] || '—'}).`,
    `1M MAU confidence: ${tierConfidence['1m']}% (${config.confidenceVerdict?.['1m'] || '—'}).`,
    `Top scale risk: ${hotDimensions[0]?.name || '—'} (peaks at ${hotDimensions[0]?.tier1m?.risk || '—'} @ 1M).`
  ];

  if (input.liveSignals?.analyticsAtCap) {
    executiveSummary.unshift(
      'Live: analytics admin/export at row cap — prioritize rollups before 100K MAU.'
    );
  }

  return {
    version: config.version || 'p19.0',
    generatedAt: input.generatedAt || new Date().toISOString(),
    assumptions: config.assumptions,
    volumeEstimates: config.volumeEstimates,
    confidenceVerdict: config.confidenceVerdict,
    tierConfidence,
    dimensions,
    hotDimensions: hotDimensions.slice(0, 6),
    currentGuardrails: config.currentGuardrails,
    executiveSummary,
    liveSignals: input.liveSignals || null,
    docPath: 'docs/SCALE_ARCHITECTURE_EXECUTION.md'
  };
}
