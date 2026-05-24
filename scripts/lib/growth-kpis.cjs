'use strict';

const EXECUTIVE_FUNNEL_STEPS = [
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
];

const FUNNEL_ALIASES = {
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
};

function conversionRate(numerator, denominator) {
  if (!denominator) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function countEvents(rows, name) {
  return rows.filter((row) => row.event_name === name).length;
}

function countFunnelStep(rows, canonical) {
  const names = new Set([canonical, ...(FUNNEL_ALIASES[canonical] || [])]);
  return rows.filter((row) => names.has(row.event_name)).length;
}

function computeExecutiveFunnel(rows) {
  const steps = EXECUTIVE_FUNNEL_STEPS.map(([key, label], index) => {
    const count = countFunnelStep(rows, key);
    const prevKey = index > 0 ? EXECUTIVE_FUNNEL_STEPS[index - 1][0] : null;
    const prev = prevKey ? countFunnelStep(rows, prevKey) : count;
    return {
      key,
      label,
      count,
      stepCrPct: index > 0 ? conversionRate(count, prev) : null
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

function computeChannelBreakdown(rows) {
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

module.exports = {
  EXECUTIVE_FUNNEL_STEPS,
  computeExecutiveFunnel,
  computeChannelBreakdown,
  conversionRate,
  countFunnelStep
};
