/**
 * P18 — Startup operating mode: scale pillars, bottlenecks, cadence, quick wins.
 * Merges static config with live ops command center signals when available.
 */

const SEVERITY_WEIGHT = { critical: 4, high: 3, medium: 2, low: 1 };

/**
 * @param {object} bottleneck
 * @param {object} [liveSignals]
 */
export function scoreBottleneckUrgency(bottleneck, liveSignals = {}) {
  const base = SEVERITY_WEIGHT[bottleneck.severity] || 2;
  let boost = 0;
  if (bottleneck.id === 'analytics_write_volume' && liveSignals.analyticsAtCap) boost += 2;
  if (bottleneck.id === 'no_warehouse_bi' && liveSignals.analyticsAtCap) boost += 1;
  if (bottleneck.id === 'github_cron_spof' && liveSignals.opsHealth === 'critical') boost += 1;
  if (bottleneck.id === 'multi_vertical_crm' && (liveSignals.autoLeads7d || 0) > 50) boost += 0.5;
  return Math.round((base + boost) * 10) / 10;
}

/**
 * Readiness 0–100 per pillar from bottleneck + quick win coverage.
 * @param {object} pillar
 * @param {Array} bottlenecks
 * @param {Array} quickWins
 */
export function scorePillarReadiness(pillar, bottlenecks = [], quickWins = []) {
  const related = bottlenecks.filter((b) => b.pillar === pillar.id);
  const openHigh = related.filter(
    (b) => b.status !== 'resolved' && ['critical', 'high'].includes(b.severity)
  ).length;
  const liveWins = quickWins.filter(
    (q) => q.status === 'live' && related.some((b) => b.quickWinIds?.includes(q.id))
  ).length;
  let score = 72;
  score -= openHigh * 12;
  score -= related.filter((b) => b.status === 'planned').length * 4;
  score += liveWins * 6;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * @param {object} input
 * @param {object} input.config startup-operating-mode.json
 * @param {object} [input.opsCenter] buildOpsCommandCenter output
 * @param {string} [input.generatedAt]
 */
export function buildStartupOperatingSnapshot(input = {}) {
  const config = input.config || {};
  const ops = input.opsCenter || null;
  const bottlenecks = (config.bottlenecks || []).map((b) => ({ ...b }));

  const liveSignals = {
    analyticsAtCap: Boolean(ops?.metrics?.analytics?.eventsAtCap),
    opsHealth: ops?.overallHealth || 'unknown',
    autoLeads7d: ops?.executive?.partnerLeadQuality?.totalLeads ?? null,
    triggeredAlerts: ops?.alerts?.triggeredCount ?? 0
  };

  const rankedBottlenecks = bottlenecks
    .map((b) => ({
      ...b,
      urgencyScore: scoreBottleneckUrgency(b, liveSignals)
    }))
    .sort((a, b) => b.urgencyScore - a.urgencyScore);

  const quickWins = (config.quickWins || []).map((q) => ({ ...q }));
  const pillars = (config.scalePillars || []).map((p) => ({
    id: p.id,
    name: p.name,
    owner: p.owner,
    targetState: p.targetState,
    roadmapRef: p.roadmapRef,
    readinessPct: scorePillarReadiness(p, bottlenecks, quickWins)
  }));

  const avgReadiness =
    pillars.length > 0
      ? Math.round(pillars.reduce((s, p) => s + p.readinessPct, 0) / pillars.length)
      : 0;

  const openCritical = rankedBottlenecks.filter(
    (b) => b.severity === 'high' && b.status !== 'resolved'
  ).length;

  let scaleStage = 'foundation';
  if (avgReadiness >= 75 && openCritical <= 2) scaleStage = 'scale_ready';
  else if (avgReadiness >= 60) scaleStage = 'scaling';

  const executiveSummary = [];
  if (liveSignals.triggeredAlerts > 0) {
    executiveSummary.push(`${liveSignals.triggeredAlerts} ops alert rule(s) triggered — review Ops Command Center.`);
  }
  if (liveSignals.analyticsAtCap) {
    executiveSummary.push('Analytics sample at admin cap — prioritize warehouse export and retention purge.');
  }
  executiveSummary.push(
    `Scale readiness ${avgReadiness}% across ${pillars.length} pillars (${scaleStage}).`
  );
  executiveSummary.push(
    `Top bottleneck: ${rankedBottlenecks[0]?.id || 'none'} (${rankedBottlenecks[0]?.severity || '—'}).`
  );

  return {
    version: config.version || 'p18.0',
    mode: config.mode || 'startup_operating',
    generatedAt: input.generatedAt || new Date().toISOString(),
    vision: config.vision,
    scaleStage,
    scaleReadinessPct: avgReadiness,
    liveSignals,
    executiveRoles: config.executiveRoles || [],
    decisionCadence: config.decisionCadence || [],
    pillars,
    bottlenecks: rankedBottlenecks,
    quickWins,
    implementationPhases: config.implementationPhases || [],
    kpis: config.kpis || [],
    executiveSummary,
    opsHealth: ops?.overallHealth || null,
    linkedRoadmaps: [
      'data/ops/automation-roadmap.json',
      'data/platform/expansion-roadmap.json',
      'docs/PLATFORM_EXPANSION_ROADMAP.md',
      'docs/STARTUP_OPERATING_MODE.md'
    ]
  };
}
