/**
 * P19 — Recommended guardrail overrides by MAU tier (planning; not auto-applied).
 * Authoritative limits remain in scale-limits.js and server configs.
 */

export const SCALE_TIER_RECOMMENDATIONS = Object.freeze({
  '10k': {
    label: '10K MAU',
    analyticsSampleRateLowPriority: 0.5,
    analyticsMaxQueue: 40,
    analyticsRetentionDays: 90,
    analyticsIngestPerIpPerMin: 100,
    aiSessionCallsPerHour: 3,
    lifecycleSendsPerRun: 50,
    adminExecutiveRowLimit: 2500,
    liveAnalyticsInAdmin: true
  },
  '100k': {
    label: '100K MAU',
    analyticsSampleRateLowPriority: 0.35,
    analyticsMaxQueue: 32,
    analyticsRetentionDays: 60,
    analyticsIngestPerIpPerMin: 80,
    aiSessionCallsPerHour: 2,
    lifecycleSendsPerRun: 80,
    adminExecutiveRowLimit: 5000,
    liveAnalyticsInAdmin: false,
    notes: 'Prefer dist/*.json snapshots and funnel_daily MV'
  },
  '1m': {
    label: '1M MAU',
    analyticsSampleRateLowPriority: 0.15,
    analyticsMaxQueue: 24,
    analyticsRetentionDays: 30,
    analyticsIngestPerIpPerMin: 60,
    aiSessionCallsPerHour: 0,
    lifecycleSendsPerRun: 200,
    adminExecutiveRowLimit: 0,
    liveAnalyticsInAdmin: false,
    notes: 'Warehouse BI only; AI narration off or premium quota table'
  }
});

/**
 * @param {string} tierId 10k | 100k | 1m
 */
export function getScaleTierRecommendation(tierId) {
  return SCALE_TIER_RECOMMENDATIONS[tierId] || SCALE_TIER_RECOMMENDATIONS['10k'];
}
