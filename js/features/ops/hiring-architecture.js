/**
 * P21 — Hiring architecture: role triggers, KPIs, 90-day plans, hire sequence.
 */

/**
 * @param {object} role
 */
export function scoreRoleUrgency(role, liveSignals = {}) {
  let score = 0;
  const id = role.id;
  if (id === 'ops_manager' && liveSignals.opsHealth !== 'healthy') score += 4;
  if (id === 'growth_marketer' && (liveSignals.funnelCrDropPct || 0) > 15) score += 3;
  if (id === 'backend_platform_engineer' && liveSignals.analyticsAtCap) score += 3;
  if (id === 'partner_success_manager' && (liveSignals.dispatchRatePct || 100) < 85) score += 3;
  if (id === 'b2b_sales_lead' && (liveSignals.partnerLeads30d || 0) > 30) score += 2;
  if (role.when?.earliestPhase === 'phase_0_first_hire') score += 2;
  return score;
}

/**
 * @param {object} input
 * @param {object} input.config hiring-architecture.json
 * @param {object} [input.liveSignals]
 */
export function buildHiringArchitectureSnapshot(input = {}) {
  const config = input.config || {};
  const roles = (config.roles || []).map((role) => ({
    ...role,
    urgencyScore: scoreRoleUrgency(role, input.liveSignals || {})
  }));

  const ranked = [...roles].sort((a, b) => b.urgencyScore - a.urgencyScore);
  const sequence = config.hireSequence || [];
  const nextHire = sequence.find((s) => {
    const role = roles.find((r) => r.id === s.roleId);
    return role && role.urgencyScore >= 2;
  }) || sequence[0];

  const byFunction = {};
  for (const role of roles) {
    const fn = role.function || 'other';
    if (!byFunction[fn]) byFunction[fn] = [];
    byFunction[fn].push(role);
  }

  const executiveSummary = [
    `Recommended next hire: ${nextHire?.roleId || '—'} (${nextHire?.trigger || ''}).`,
    `Team model: ${config.teamModel?.currentState} → ${config.teamModel?.targetState}.`,
    `Max concurrent reqs: ${config.teamModel?.maxConcurrentHires ?? 2}.`,
    `Top urgency: ${ranked[0]?.title || '—'} (score ${ranked[0]?.urgencyScore ?? 0}).`
  ];

  return {
    version: config.version || 'p21.0',
    generatedAt: input.generatedAt || new Date().toISOString(),
    vision: config.vision,
    teamModel: config.teamModel,
    hireSequence: sequence,
    nextRecommendedHire: nextHire,
    roles: ranked,
    rolesByFunction: byFunction,
    phases: config.phases || [],
    scalableTeamDesign: config.scalableTeamDesign,
    executiveSummary,
    liveSignals: input.liveSignals || null,
    docPath: 'docs/HIRING_ARCHITECTURE.md'
  };
}
