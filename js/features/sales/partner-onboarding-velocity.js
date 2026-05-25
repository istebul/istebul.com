/**
 * P6 — Partner onboarding velocity (SLA, stuck detection).
 */

const DEFAULT_SLA = {
  targetDaysToLive: 14,
  warnDaysStuck: 5,
  stepsTotal: 6
};

/**
 * @param {object} app partner_applications row
 * @param {{ targetDaysToLive?: number, warnDaysStuck?: number, stepsTotal?: number }} [sla]
 */
export function computeOnboardingVelocity(app = {}, sla = DEFAULT_SLA) {
  const created = app.created_at ? new Date(app.created_at).getTime() : Date.now();
  const daysSinceApply = Math.floor((Date.now() - created) / 86400000);
  const step = Number(app.onboarding_step || 0);
  const stepsTotal = sla.stepsTotal || DEFAULT_SLA.stepsTotal;
  const progressPct = stepsTotal ? Math.round((step / stepsTotal) * 100) : 0;

  let health = 'on_track';
  if (app.status === 'live') health = 'live';
  else if (app.status === 'rejected') health = 'closed';
  else if (daysSinceApply >= (sla.targetDaysToLive || 14)) health = 'overdue';
  else if (daysSinceApply >= (sla.warnDaysStuck || 5) && step < 4) health = 'stuck';

  const daysToTarget = Math.max(0, (sla.targetDaysToLive || 14) - daysSinceApply);

  return {
    daysSinceApply,
    onboardingStep: step,
    progressPct,
    health,
    daysToTarget,
    label:
      health === 'live'
        ? 'Canlı'
        : health === 'stuck'
          ? 'Takıldı'
          : health === 'overdue'
            ? 'SLA aşıldı'
            : 'Yolunda'
  };
}

/**
 * @param {ReturnType<typeof computeOnboardingVelocity>} velocity
 */
export function velocityBadgeClass(velocity) {
  if (velocity.health === 'live') return 'badge-green';
  if (velocity.health === 'stuck' || velocity.health === 'overdue') return 'badge-red';
  if (velocity.health === 'on_track' && velocity.progressPct >= 50) return 'badge-green';
  return 'badge-yellow';
}
