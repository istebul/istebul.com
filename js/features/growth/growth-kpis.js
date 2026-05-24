/**
 * Growth KPI computations — shared funnel CR math for admin + CLI exports.
 */

export const EXECUTIVE_FUNNEL_STEPS = Object.freeze([
  ['landing_visit', 'Landing'],
  ['hero_cta_click', 'Hero CTA'],
  ['auto_start', 'Auto start'],
  ['wizard_complete', 'Wizard complete'],
  ['results_view', 'Results'],
  ['lead_submit', 'Lead'],
  ['pricing_view', 'Pricing'],
  ['checkout_start', 'Checkout start'],
  ['checkout_complete', 'Checkout complete'],
  ['paid_conversion', 'Paid conversion']
]);

/** Canonical step → legacy aliases (deduped counts). */
export const FUNNEL_ALIASES = Object.freeze({
  landing_visit: ['page_view'],
  hero_cta_click: [],
  auto_start: ['auto_form_started', 'auto_page_view'],
  wizard_step: ['auto_wizard_step'],
  wizard_complete: ['auto_wizard_complete'],
  results_view: ['auto_results_view', 'auto_results_rendered'],
  lead_submit: ['auto_lead_submit'],
  pricing_view: [],
  checkout_start: ['checkout_started'],
  checkout_complete: ['checkout_completed'],
  paid_conversion: []
});

export function conversionRate(numerator, denominator) {
  if (!denominator) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function countEvents(rows, name) {
  return rows.filter((row) => row.event_name === name).length;
}

export function countFunnelStep(rows, canonical) {
  const names = new Set([canonical, ...(FUNNEL_ALIASES[canonical] || [])]);
  return rows.filter((row) => names.has(row.event_name)).length;
}

/**
 * @param {Array<{ event_name: string, attribution?: object, properties?: object }>} rows
 */
export function computeExecutiveFunnel(rows) {
  const steps = EXECUTIVE_FUNNEL_STEPS.map(([key, label], index) => {
    const count = countFunnelStep(rows, key);
    const prevKey = index > 0 ? EXECUTIVE_FUNNEL_STEPS[index - 1][0] : null;
    const prev = prevKey ? countFunnelStep(rows, prevKey) : count;
    return {
      key,
      label,
      count,
      stepCrPct: index > 0 ? conversionRate(count, prev) : null,
      overallCrPct: index > 0 && countFunnelStep(rows, EXECUTIVE_FUNNEL_STEPS[0][0])
        ? conversionRate(count, countFunnelStep(rows, EXECUTIVE_FUNNEL_STEPS[0][0]))
        : null
    };
  });

  const landing = countFunnelStep(rows, 'landing_visit') || countEvents(rows, 'page_view');
  const paid = countFunnelStep(rows, 'paid_conversion');
  const leads = countFunnelStep(rows, 'lead_submit');

  return {
    steps,
    northStar: {
      qualifiedLeads: leads,
      paidConversions: paid,
      landingToLeadPct: conversionRate(leads, landing),
      landingToPaidPct: conversionRate(paid, landing),
      checkoutStart: countFunnelStep(rows, 'checkout_start'),
      checkoutComplete: countFunnelStep(rows, 'checkout_complete'),
      checkoutCrPct: conversionRate(
        countFunnelStep(rows, 'checkout_complete'),
        countFunnelStep(rows, 'checkout_start')
      )
    }
  };
}

function channelFromRow(row) {
  const props = row.properties || {};
  return (
    props.growth_channel ||
    row.attribution?.growth_channel ||
    row.attribution?.utm_source ||
    row.funnel ||
    'direct'
  );
}

/**
 * @param {Array<object>} rows
 */
export function computeChannelBreakdown(rows) {
  const byChannel = {};

  for (const row of rows) {
    const ch = channelFromRow(row);
    if (!byChannel[ch]) {
      byChannel[ch] = { events: 0, leads: 0, checkouts: 0, paid: 0, revenueCents: 0 };
    }
    byChannel[ch].events += 1;

    if (row.event_name === 'auto_lead_submit' || row.event_name === 'lead_submit') {
      byChannel[ch].leads += 1;
    }
    if (row.event_name === 'checkout_start' || row.event_name === 'checkout_started') {
      byChannel[ch].checkouts += 1;
    }
    if (row.event_name === 'paid_conversion' || row.event_name === 'checkout_completed') {
      byChannel[ch].paid += 1;
      byChannel[ch].revenueCents += Number(row.revenue_cents || 0);
    }
  }

  return Object.entries(byChannel)
    .map(([channel, stats]) => ({ channel, ...stats }))
    .sort((a, b) => b.leads - a.leads || b.events - a.events);
}

/**
 * Retention proxy from analytics rows (7d return, lifecycle enroll).
 */
export function computeRetentionSignals(rows) {
  const returns = countEvents(rows, 'retention_return_visit');
  const engagement = countEvents(rows, 'retention_engagement');
  const lifecycleEnroll = countEvents(rows, 'lifecycle_enroll_requested');
  const checkoutAbandon = countEvents(rows, 'checkout_abandoned');
  const emailClicks = countEvents(rows, 'growth_email_click');

  return {
    returnVisits: returns,
    engagementEvents: engagement,
    lifecycleEnrolls: lifecycleEnroll,
    checkoutAbandons: checkoutAbandon,
    lifecycleEmailClicks: emailClicks,
    recoveryRatePct: conversionRate(
      countEvents(rows, 'growth_lead_recovery_click'),
      countEvents(rows, 'growth_lead_abandon')
    )
  };
}
