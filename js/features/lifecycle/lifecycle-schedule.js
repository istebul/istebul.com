/**
 * Pure scheduling helpers for lifecycle flows (mirrors edge logic).
 */

/**
 * @param {string|Date} enrolledAt
 * @param {number} delayHours cumulative delay from enrollment start
 */
export function scheduleStepAt(enrolledAt, delayHours) {
  const base = new Date(enrolledAt).getTime();
  return new Date(base + delayHours * 60 * 60 * 1000).toISOString();
}

/**
 * @param {{ delayHours: number }[]} steps
 * @param {string|Date} enrolledAt
 */
export function buildStepSchedule(steps, enrolledAt) {
  return steps.map((step) => ({
    stepId: step.id,
    scheduledAt: scheduleStepAt(enrolledAt, step.delayHours)
  }));
}

/** @param {string[]} publicFlows */
export function isPublicEnrollFlow(flowId, publicFlows = PUBLIC_ENROLL_FLOWS) {
  return publicFlows.includes(flowId);
}

export const PUBLIC_ENROLL_FLOWS = Object.freeze([
  'signup_nurture',
  'abandoned_onboarding',
  'abandoned_lead',
  'finance_follow_up',
  'upsell_campaigns',
  'auto_results_ready',
  'checkout_abandon_recovery',
  'reactivation_ltv',
  'habit_loop_reminder',
  'saved_decision_revisit'
]);

export const LIFECYCLE_FLOW_IDS = Object.freeze([
  'signup_nurture',
  'abandoned_onboarding',
  'abandoned_lead',
  'finance_follow_up',
  'inactive_users',
  'upsell_campaigns',
  'partner_follow_up',
  'retention_campaigns',
  'auto_results_ready',
  'results_no_lead_d1',
  'lead_upgrade_d3',
  'checkout_abandon_recovery',
  'reactivation_ltv',
  'habit_loop_reminder',
  'saved_decision_revisit'
]);
