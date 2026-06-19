/**
 * P5.3 — Executive (CEO) KPI dashboard — deterministic metrics from analytics + CRM + billing.
 */
import {
  computeExecutiveFunnel,
  computeChannelBreakdown,
  computeRetentionSignals,
  conversionRate,
  countEvents,
  countFunnelStep
} from '../growth/growth-kpis.js';
import {
  computeSubscriptionMetrics,
  computeLeadPipelineMetrics
} from './investor-kpis.js';

export const EXECUTIVE_WINDOW_DAYS = 30;

const REFERRAL_LAND_EVENTS = [
  'growth_referral_land',
  'referral_link_clicked',
  'referral_land'
];
const REFERRAL_CONVERT_EVENTS = [
  'growth_referral_convert',
  'referral_conversion',
  'referral_signup'
];

function countAny(rows, names) {
  return rows.filter((r) => names.includes(r.event_name)).length;
}

/**
 * @param {Array<{ session_id?: string, event_name: string }>} rows
 */
export function computeTrafficMetrics(rows) {
  const sessions = new Set();
  for (const row of rows) {
    if (row.session_id) sessions.add(row.session_id);
  }
  let pageViews = countEvents(rows, 'page_view') + countEvents(rows, 'auto_page_view');
  if (!pageViews) {
    pageViews = countFunnelStep(rows, 'landing_visit');
  }
  const autoStarts = countFunnelStep(rows, 'auto_start');

  return {
    pageViews,
    uniqueSessions: sessions.size || null,
    autoStarts,
    ctaClicks: countEvents(rows, 'cta_click') + countFunnelStep(rows, 'hero_cta_click')
  };
}

/**
 * @param {Array<object>} rows
 */
export function computeConversionMetrics(rows) {
  const traffic = computeTrafficMetrics(rows);
  const landing = countFunnelStep(rows, 'landing_visit') || traffic.pageViews || 0;
  const autoStarts = traffic.autoStarts || countFunnelStep(rows, 'auto_start');
  const wizardComplete = countFunnelStep(rows, 'wizard_complete');
  const leads = countFunnelStep(rows, 'lead_submit');
  const checkoutStart = countFunnelStep(rows, 'checkout_start');
  const checkoutComplete = countFunnelStep(rows, 'checkout_complete');
  const paid = countFunnelStep(rows, 'paid_conversion');
  const referralLand = countAny(rows, REFERRAL_LAND_EVENTS);
  const referralConvert = countAny(rows, REFERRAL_CONVERT_EVENTS);

  return {
    funnelConversionPct: conversionRate(leads, landing),
    wizardCompletionPct: conversionRate(wizardComplete, autoStarts),
    leadConversionPct: conversionRate(leads, landing),
    checkoutConversionPct: conversionRate(checkoutComplete, checkoutStart),
    paidConversionPct: conversionRate(paid, checkoutStart || leads),
    referralConversionPct: conversionRate(referralConvert, referralLand),
    counts: {
      landing,
      autoStarts,
      wizardComplete,
      leads,
      checkoutStart,
      checkoutComplete,
      paid,
      referralLand,
      referralConvert
    }
  };
}

/**
 * @param {Array<object>} leads
 */
export function computePartnerLeadQuality(leads = []) {
  const rows = Array.isArray(leads) ? leads : [];
  const scores = rows.map((l) => Number(l.lead_score)).filter((n) => n > 0);
  const avgLeadScore = scores.length
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null;

  const dispatched = rows.filter((l) =>
    ['dispatched', 'sent', 'delivered', 'accepted', 'dispatch_failed'].includes(
      l.partner_status
    )
  ).length;
  const dispatchFailed = rows.filter((l) => l.partner_status === 'dispatch_failed').length;
  const wins = rows.filter((l) =>
    ['paid', 'closed', 'won', 'delivered', 'funded', 'purchased'].includes(l.partner_status)
  ).length;

  return {
    totalLeads: rows.length,
    avgLeadScore,
    dispatchRatePct: dispatched ? conversionRate(dispatched - dispatchFailed, dispatched) : null,
    dispatchFailPct: rows.length ? conversionRate(dispatchFailed, rows.length) : null,
    partnerWinRatePct: rows.length ? conversionRate(wins, rows.length) : null,
    highIntentLeads: rows.filter((l) => Number(l.lead_score) >= 70).length
  };
}

/**
 * @param {{ analyticsEvents?: object[], subscriptions?: object[], autoLeads?: object[], windowDays?: number }} input
 */
export function buildExecutiveDashboard({
  analyticsEvents = [],
  subscriptions = [],
  autoLeads = [],
  windowDays = EXECUTIVE_WINDOW_DAYS
} = {}) {
  const events = Array.isArray(analyticsEvents) ? analyticsEvents : [];
  const funnel = computeExecutiveFunnel(events);
  const traffic = computeTrafficMetrics(events);
  const conversions = computeConversionMetrics(events);
  const retention = computeRetentionSignals(events);
  const subscription = computeSubscriptionMetrics(subscriptions);
  const pipeline = computeLeadPipelineMetrics(autoLeads);
  const partnerQuality = computePartnerLeadQuality(autoLeads);
  const channels = computeChannelBreakdown(events).slice(0, 6);

  const arpuTry =
    subscription.totalBillable > 0
      ? Math.round(subscription.mrrTry / subscription.totalBillable)
      : 0;

  const revenueCents = events
    .filter((r) =>
      ['paid_conversion', 'checkout_completed', 'checkout_complete', 'revenue_attributed'].includes(
        r.event_name
      )
    )
    .reduce((s, r) => s + Number(r.revenue_cents || 0), 0);

  return {
    generatedAt: new Date().toISOString(),
    windowDays,
    sampleSize: {
      analyticsEvents: events.length,
      subscriptions: subscriptions.length,
      autoLeads: autoLeads.length
    },
    traffic,
    conversions,
    funnel: funnel.steps,
    northStar: funnel.northStar,
    retention: {
      returnVisits: retention.returnVisits,
      engagementEvents: retention.engagementEvents,
      lifecycleEnrolls: retention.lifecycleEnrolls,
      recoveryRatePct: retention.recoveryRatePct
    },
    churn: {
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      grossChurnSignalPct: subscription.grossChurnSignal,
      activeSubscriptions: subscription.activeSubscriptions,
      trialingSubscriptions: subscription.trialingSubscriptions
    },
    revenue: {
      mrrTry: subscription.mrrTry,
      arrTry: subscription.arrTry,
      arpuTry,
      attributedRevenueTry: Math.round(revenueCents / 100)
    },
    partnerLeadQuality: partnerQuality,
    pipeline: {
      estimatedTry: pipeline.pipelineEstimatedTry,
      actualTry: pipeline.pipelineActualTry,
      winRatePct: pipeline.winRate
    },
    topChannels: channels,
    ceoSummary: buildCeoSummary({
      traffic,
      conversions,
      subscription,
      arpuTry,
      partnerQuality,
      retention,
      funnel
    })
  };
}

function buildCeoSummary(ctx) {
  const lines = [];
  const { conversions, subscription, arpuTry, partnerQuality, retention, funnel } = ctx;

  lines.push(
    `Son ${EXECUTIVE_WINDOW_DAYS} gün: ${ctx.traffic.pageViews} sayfa görüntüleme, ${conversions.counts.leads} lead, ${conversions.counts.paid} ücretli dönüşüm.`
  );
  if (subscription.mrrTry) {
    lines.push(`MRR ~${subscription.mrrTry.toLocaleString('tr-TR')} ₺ · ARPU ~${arpuTry.toLocaleString('tr-TR')} ₺.`);
  }
  if (conversions.wizardCompletionPct != null) {
    lines.push(`Wizard tamamlama ${conversions.wizardCompletionPct}% · Checkout CR ${conversions.checkoutConversionPct ?? '—'}%.`);
  }
  if (partnerQuality.avgLeadScore != null) {
    lines.push(`Ortalama lead skoru ${partnerQuality.avgLeadScore} · partner win rate ${partnerQuality.partnerWinRatePct ?? '—'}%.`);
  }
  lines.push(
    `Retention dönüş ${retention.returnVisits} · churn sinyali (cancel at period end) ${subscription.cancelAtPeriodEnd}.`
  );
  if (funnel.northStar.landingToPaidPct != null) {
    lines.push(`Landing→paid ${funnel.northStar.landingToPaidPct}% (north star).`);
  }
  return lines;
}
