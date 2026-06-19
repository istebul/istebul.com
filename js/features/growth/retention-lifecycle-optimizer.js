/**
 * P5.4 — Lifecycle flow selection from retention context (LTV).
 */

/**
 * @param {{ level?: string, savedCount?: number, engagementScore?: number, inactiveDays?: number }} trigger
 */
export function pickLifecycleFlowForRetention(trigger = {}) {
  if (trigger.level === 'reactivation') return 'reactivation_ltv';
  if ((trigger.savedCount || 0) > 0) return 'saved_decision_revisit';
  if ((trigger.inactiveDays || 0) >= 14) return 'inactive_users';
  if ((trigger.engagementScore || 0) >= 12) return 'habit_loop_reminder';
  if (trigger.level === 'hard') return 'retention_campaigns';
  return 'habit_loop_reminder';
}

/**
 * Rank flows for server/cron documentation (client-side reference).
 */
export function lifecyclePriorityForLtv(ctx = {}) {
  const flows = [];
  if (ctx.churnRisk) flows.push({ id: 'retention_campaigns', priority: 100 });
  if (ctx.inactiveDays >= 14) flows.push({ id: 'reactivation_ltv', priority: 90 });
  if (ctx.savedDecisions > 0) flows.push({ id: 'saved_decision_revisit', priority: 80 });
  if (ctx.habitStreak >= 2) flows.push({ id: 'habit_loop_reminder', priority: 60 });
  flows.push({ id: 'inactive_users', priority: 50 });
  return flows.sort((a, b) => b.priority - a.priority);
}
