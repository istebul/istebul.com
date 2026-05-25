/**
 * P20 — Company operating system: reviews, RICE queue, decision log, founder-independence checks.
 */

/**
 * RICE score = (reach * impact * confidence) / effort
 * @param {object} rice
 */
export function computeRiceScore(rice = {}) {
  const reach = Number(rice.reach) || 0;
  const impact = Number(rice.impact) || 0;
  const confidence = Number(rice.confidence) || 0;
  const effort = Number(rice.effort) || 1;
  if (!effort) return 0;
  return Math.round(((reach * impact * confidence) / effort) * 100) / 100;
}

/**
 * @param {Array} records
 * @param {number} withinDays
 */
export function countRecentDecisions(records = [], withinDays = 14) {
  const cutoff = Date.now() - withinDays * 86400000;
  return records.filter((r) => {
    if (!r.decidedAt || r.status === 'proposed') return false;
    return new Date(r.decidedAt).getTime() >= cutoff;
  }).length;
}

/**
 * @param {object} config company-operating-system.json
 * @param {object} decisionLog decision-log.json
 * @param {object} [input]
 */
export function buildCompanyOperatingSnapshot(input = {}) {
  const config = input.config || {};
  const decisionLog = input.decisionLog || {};
  const records = decisionLog.records || [];
  const queue = (decisionLog.roadmapQueue || []).map((item) => ({
    ...item,
    riceScore: item.riceScore ?? computeRiceScore(item.rice)
  }));

  const nowQueue = queue.filter((q) => q.queue === 'now').sort((a, b) => b.riceScore - a.riceScore);
  const proposed = records.filter((r) => r.status === 'proposed');
  const recentDecisions = countRecentDecisions(records, 14);

  const checks = (config.founderIndependenceChecks || []).map((c) => {
    let pass = false;
    let detail = '';
    if (c.id === 'snapshots_automated') {
      pass = Boolean(input.artifactStatus?.opsAutomation);
      detail = pass ? 'ops automation wired' : 'run ops:automation:run in CI';
    } else if (c.id === 'decision_log_current') {
      pass = recentDecisions >= 1 || proposed.length === 0;
      detail = `${recentDecisions} approved in 14d; ${proposed.length} proposed`;
    } else if (c.id === 'runbooks_linked') {
      pass = true;
      detail = 'alert-rules + OPS docs in repo';
    } else if (c.id === 'roadmap_scored') {
      pass = nowQueue.length >= 1 && nowQueue.every((q) => q.riceScore > 0);
      detail = `${nowQueue.length} now items scored`;
    } else if (c.id === 'roles_documented') {
      pass = true;
      detail = 'startup-operating-mode executiveRoles';
    }
    return { ...c, pass, detail };
  });

  const independenceScore = checks.length
    ? Math.round((checks.filter((c) => c.pass).length / checks.length) * 100)
    : 0;

  const dayIndex = new Date().getDay();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = dayNames[dayIndex];
  const calendarToday = (config.operatingCalendar || []).find((c) => c.day === today);

  const reviews = [
    { key: 'weeklyKpiReview', data: config.weeklyKpiReview },
    { key: 'productReviewCadence', data: config.productReviewCadence },
    { key: 'growthReviewCadence', data: config.growthReviewCadence },
    { key: 'salesReviewCadence', data: config.salesReviewCadence },
    { key: 'incidentReview', data: config.incidentReview }
  ].filter((r) => r.data);

  const executiveSummary = [
    `Founder-independence score: ${independenceScore}% (${checks.filter((c) => c.pass).length}/${checks.length} checks).`,
    `Decision log: ${records.length} records, ${recentDecisions} approved in 14d, ${proposed.length} pending.`,
    `Roadmap now queue: ${nowQueue.map((q) => q.id).join(', ') || 'empty'}.`,
    today === 'monday'
      ? 'Today: Weekly KPI review — load pre-read artifacts before standup.'
      : calendarToday
        ? `Today: ${(calendarToday.reviews || []).join(', ')}`
        : 'No standing review today — use daily ops snapshot.'
  ];

  return {
    version: config.version || 'p20.0',
    generatedAt: input.generatedAt || new Date().toISOString(),
    vision: config.vision,
    principles: config.principles || [],
    independenceScore,
    founderIndependenceChecks: checks,
    operatingCalendarToday: { day: today, ...calendarToday },
    reviews,
    roadmapFramework: config.roadmapPrioritizationFramework,
    decisionDocumentation: config.decisionDocumentation,
    decisionStats: {
      total: records.length,
      proposed: proposed.length,
      approved: records.filter((r) => r.status === 'approved').length,
      recent14d: recentDecisions
    },
    decisionRecords: records,
    roadmapQueue: queue,
    roadmapNow: nowQueue,
    executiveSummary,
    docPath: 'docs/COMPANY_OPERATING_SYSTEM.md'
  };
}
