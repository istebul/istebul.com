/**
 * Investor-grade KPI calculations (deterministic, auditable).
 * Used by admin dashboard and export scripts.
 */

export const PRO_PLAN_MRR_TRY = Object.freeze({
  monthly: 299,
  annualMonthlyEquivalent: 2870 / 12
});

const ACTIVE_STATUSES = new Set(['active', 'trialing']);

/**
 * Infer normalized monthly MRR (TRY) from subscription period length.
 */
export function mrrForSubscription(sub = {}) {
  if (!ACTIVE_STATUSES.has(sub.status)) return 0;

  const start = sub.current_period_start ? new Date(sub.current_period_start) : null;
  const end = sub.current_period_end ? new Date(sub.current_period_end) : null;

  if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
    const days = (end.getTime() - start.getTime()) / 86400000;
    if (days > 60) return PRO_PLAN_MRR_TRY.annualMonthlyEquivalent;
  }

  return PRO_PLAN_MRR_TRY.monthly;
}

export function computeSubscriptionMetrics(subscriptions = []) {
  const rows = Array.isArray(subscriptions) ? subscriptions : [];
  let mrrTry = 0;
  let active = 0;
  let trialing = 0;
  let cancelAtPeriodEnd = 0;

  for (const sub of rows) {
    if (sub.status === 'active') active += 1;
    if (sub.status === 'trialing') trialing += 1;
    if (sub.cancel_at_period_end) cancelAtPeriodEnd += 1;
    mrrTry += mrrForSubscription(sub);
  }

  return {
    mrrTry: Math.round(mrrTry),
    arrTry: Math.round(mrrTry * 12),
    activeSubscriptions: active,
    trialingSubscriptions: trialing,
    totalBillable: active + trialing,
    cancelAtPeriodEnd,
    grossChurnSignal: rows.length
      ? Math.round((cancelAtPeriodEnd / Math.max(active + trialing, 1)) * 100)
      : 0
  };
}

export function computeLeadPipelineMetrics(leads = []) {
  const rows = Array.isArray(leads) ? leads : [];
  const estimated = rows.reduce((s, l) => s + Number(l.estimated_revenue || 0), 0);
  const actual = rows.reduce((s, l) => s + Number(l.actual_revenue || 0), 0);
  const won = rows.filter((l) =>
    ['paid', 'closed', 'won', 'delivered', 'funded', 'purchased'].includes(l.partner_status)
  ).length;
  const dispatched = rows.filter((l) =>
    ['dispatched', 'sent', 'delivered', 'accepted'].includes(l.partner_status)
  ).length;

  return {
    leadCount: rows.length,
    pipelineEstimatedTry: Math.round(estimated),
    pipelineActualTry: Math.round(actual),
    partnerWinCount: won,
    partnerDispatchCount: dispatched,
    realizationRate: estimated > 0 ? Math.round((actual / estimated) * 100) : null,
    winRate: rows.length ? Math.round((won / rows.length) * 100) : null
  };
}

export function computeProductFunnelMetrics(events = []) {
  const rows = Array.isArray(events) ? events : [];
  const count = (name) => rows.filter((r) => r.event_name === name).length;

  const pageViews = count('page_view') + count('auto_page_view');
  const checkoutStarted = count('checkout_start') + count('checkout_started');
  const checkoutCompleted = count('checkout_complete') + count('checkout_completed');
  const paidConversion = count('paid_conversion');
  const leads = count('lead_submit') + count('auto_lead_submit');

  return {
    sampleSize: rows.length,
    pageViews,
    checkoutStarted,
    checkoutCompleted,
    paidConversion,
    leads,
    checkoutConversionPct: checkoutStarted
      ? Math.round((checkoutCompleted / checkoutStarted) * 100)
      : null,
    leadConversionPct: pageViews ? Math.round((leads / pageViews) * 100) : null
  };
}

export function buildInvestorSnapshot({
  subscriptions = [],
  leads = [],
  analyticsEvents = []
} = {}) {
  const subscription = computeSubscriptionMetrics(subscriptions);
  const pipeline = computeLeadPipelineMetrics(leads);
  const funnel = computeProductFunnelMetrics(analyticsEvents);

  return {
    generatedAt: new Date().toISOString(),
    subscription,
    pipeline,
    funnel,
    blendedArrTry: subscription.arrTry + pipeline.pipelineActualTry,
    notes: [
      'MRR is normalized from Stripe subscription period (monthly vs annual).',
      'Pipeline actual revenue is operator-entered in CRM until partner settlement automation.',
      'Funnel metrics use latest analytics_events sample (admin-capped).'
    ]
  };
}
