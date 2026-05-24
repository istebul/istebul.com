/**
 * CEO-level executive metrics (deterministic, auditable).
 * Complements investor-kpis with engagement, unit economics, and growth signals.
 */

import {
  computeSubscriptionMetrics,
  computeLeadPipelineMetrics,
  buildInvestorSnapshot
} from './investor-kpis.js';

const MS_DAY = 86400000;

export const WON_PARTNER_STATUSES = Object.freeze([
  'paid',
  'closed',
  'won',
  'delivered',
  'funded',
  'purchased'
]);

export const QUALIFIED_PRIORITIES = Object.freeze(['warm', 'hot', 'very_hot']);

export const DEFAULT_EXECUTIVE_ASSUMPTIONS = Object.freeze({
  /** Minimum lead_score for qualified (matches auto-intake warm threshold). */
  qualifiedLeadMinScore: 50,
  /** Gross margin for LTV model (percent). */
  grossMarginPct: 70,
  /** Assumed average Pro subscriber lifetime (months) when cohort churn unavailable. */
  avgSubscriptionLifetimeMonths: 18,
  /** Marketing spend TRY in trailing 30d — null means CAC not computed. */
  marketingSpendTry30d: null
});

/**
 * Stable visitor identity for DAU/WAU/MAU (consent-gated analytics).
 */
export function analyticsIdentityKey(row = {}) {
  if (row.user_id) return `u:${row.user_id}`;
  if (row.anonymous_id) return `a:${row.anonymous_id}`;
  if (row.session_id) return `s:${row.session_id}`;
  return null;
}

function parseTs(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Count distinct identities with activity in (now - days, now].
 */
export function countActiveUsers(rows = [], { days = 1, now = new Date(), getTimestamp, getKey } = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const end = now.getTime();
  const start = end - days * MS_DAY;
  const seen = new Set();

  for (const row of list) {
    const ts = getTimestamp(row);
    if (ts == null || ts <= start || ts > end) continue;
    const key = getKey(row);
    if (key) seen.add(key);
  }

  return seen.size;
}

export function computeActiveUserMetrics(
  analyticsEvents = [],
  analyticsSessions = [],
  { now = new Date() } = {}
) {
  const eventRows = Array.isArray(analyticsEvents) ? analyticsEvents : [];
  const sessionRows = Array.isArray(analyticsSessions) ? analyticsSessions : [];

  const eventActivity = eventRows.map((r) => ({
    ...r,
    _ts: parseTs(r.created_at),
    _key: analyticsIdentityKey(r)
  }));

  const sessionActivity = sessionRows
    .filter((r) => r.user_id)
    .map((r) => ({
      ...r,
      _ts: parseTs(r.updated_at || r.created_at),
      _key: `u:${r.user_id}`
    }));

  const combined = [...eventActivity, ...sessionActivity];

  const opts = {
    now,
    getTimestamp: (r) => r._ts,
    getKey: (r) => r._key
  };

  const dau = countActiveUsers(combined, { ...opts, days: 1 });
  const wau = countActiveUsers(combined, { ...opts, days: 7 });
  const mau = countActiveUsers(combined, { ...opts, days: 30 });
  const mauPrev = countActiveUsers(combined, {
    ...opts,
    days: 30,
    now: new Date(now.getTime() - 30 * MS_DAY)
  });

  const stickinessPct = mau > 0 ? Math.round((dau / mau) * 100) : null;
  const mauGrowthPct =
    mauPrev > 0 ? Math.round(((mau - mauPrev) / mauPrev) * 100) : mau > 0 ? 100 : null;

  return {
    dau,
    wau,
    mau,
    mauPreviousPeriod: mauPrev,
    stickinessPct,
    mauGrowthPct,
    sampleEventRows: eventRows.length,
    sampleSessionRows: sessionRows.length
  };
}

export function isQualifiedLead(lead = {}, { minScore = 50 } = {}) {
  const priority = String(lead.priority || '');
  if (QUALIFIED_PRIORITIES.includes(priority)) return true;
  return (Number(lead.lead_score) || 0) >= minScore;
}

export function isWonLead(lead = {}) {
  return WON_PARTNER_STATUSES.includes(String(lead.partner_status || ''));
}

export function computeExecutiveLeadMetrics(leads = [], assumptions = {}) {
  const rows = Array.isArray(leads) ? leads : [];
  const minScore = assumptions.qualifiedLeadMinScore ?? DEFAULT_EXECUTIVE_ASSUMPTIONS.qualifiedLeadMinScore;

  const qualified = rows.filter((l) => isQualifiedLead(l, { minScore }));
  const won = rows.filter(isWonLead);

  const now = Date.now();
  const inWindow = (lead, days) => {
    const t = parseTs(lead.created_at);
    if (t == null) return false;
    return t > now - days * MS_DAY;
  };

  const last30 = rows.filter((l) => inWindow(l, 30));
  const prev30 = rows.filter((l) => {
    const t = parseTs(l.created_at);
    if (t == null) return false;
    return t <= now - 30 * MS_DAY && t > now - 60 * MS_DAY;
  });

  const qualifiedLast30 = last30.filter((l) => isQualifiedLead(l, { minScore }));
  const wonLast30 = last30.filter(isWonLead);

  return {
    leadVolume: rows.length,
    leadVolume30d: last30.length,
    leadVolumeGrowthPct:
      prev30.length > 0
        ? Math.round(((last30.length - prev30.length) / prev30.length) * 100)
        : last30.length > 0
          ? 100
          : null,
    qualifiedLeads: qualified.length,
    qualifiedRatePct: rows.length ? Math.round((qualified.length / rows.length) * 100) : null,
    qualified30d: qualifiedLast30.length,
    wins: won.length,
    wins30d: wonLast30.length,
    closeRatePct: qualified.length ? Math.round((won.length / qualified.length) * 100) : null,
    closeRate30dPct: qualifiedLast30.length
      ? Math.round((wonLast30.length / qualifiedLast30.length) * 100)
      : null,
    winRatePct: rows.length ? Math.round((won.length / rows.length) * 100) : null
  };
}

export function computeExecutiveRevenueMetrics(subscriptions = [], leads = []) {
  const sub = computeSubscriptionMetrics(subscriptions);
  const pipe = computeLeadPipelineMetrics(leads);

  return {
    subscriptionMrrTry: sub.mrrTry,
    subscriptionArrTry: sub.arrTry,
    subscriptionBillable: sub.totalBillable,
    partnerRevenueTry: pipe.pipelineActualTry,
    partnerPipelineTry: pipe.pipelineEstimatedTry,
    totalRevenueSignalTry: sub.mrrTry * 12 + pipe.pipelineActualTry,
    blendedArrTry: sub.arrTry + pipe.pipelineActualTry
  };
}

export function computeExecutiveFunnel(analyticsEvents = [], leads = [], assumptions = {}) {
  const events = Array.isArray(analyticsEvents) ? analyticsEvents : [];
  const count = (name) => events.filter((r) => r.event_name === name).length;

  const pageViews = count('page_view') + count('auto_page_view');
  const engaged =
    count('cta_click') +
    count('auto_cta_click') +
    events.filter((r) => r.funnel_step || r.funnel).length;
  const checkoutStarted = count('checkout_started');
  const checkoutCompleted = count('checkout_completed');
  const leadSubmits = count('lead_submit') + count('auto_lead_submit');

  const leadRows = Array.isArray(leads) ? leads : [];
  const minScore = assumptions.qualifiedLeadMinScore ?? DEFAULT_EXECUTIVE_ASSUMPTIONS.qualifiedLeadMinScore;
  const qualified = leadRows.filter((l) => isQualifiedLead(l, { minScore })).length;
  const won = leadRows.filter(isWonLead).length;

  const stages = [
    { key: 'visit', label: 'Visit', count: pageViews },
    { key: 'engage', label: 'Engage', count: engaged },
    { key: 'lead', label: 'Lead', count: Math.max(leadSubmits, leadRows.length) },
    { key: 'qualified', label: 'Qualified', count: qualified },
    { key: 'won', label: 'Won', count: won },
    { key: 'subscribe', label: 'Subscribe', count: checkoutCompleted }
  ];

  const top = pageViews || leadRows.length || 1;

  return {
    sampleSize: events.length,
    stages: stages.map((s, i) => {
      const prev = i > 0 ? stages[i - 1].count : s.count;
      return {
        ...s,
        pctOfTop: Math.round((s.count / top) * 100),
        stepConversionPct: prev > 0 ? Math.round((s.count / prev) * 100) : null
      };
    }),
    checkoutConversionPct: checkoutStarted
      ? Math.round((checkoutCompleted / checkoutStarted) * 100)
      : null
  };
}

export function computeChurnMetrics(subscriptions = []) {
  const rows = Array.isArray(subscriptions) ? subscriptions : [];
  const billable = rows.filter((s) => ['active', 'trialing'].includes(s.status));
  const cancelScheduled = billable.filter((s) => s.cancel_at_period_end).length;
  const canceled = rows.filter((s) => s.status === 'canceled').length;

  const billableCount = billable.length || 1;

  return {
    cancelAtPeriodEnd: cancelScheduled,
    canceledSubscriptions: canceled,
    logoChurnSignalPct: Math.round((cancelScheduled / billableCount) * 100),
    grossChurnSignalPct: Math.round(((cancelScheduled + canceled) / Math.max(rows.length, 1)) * 100)
  };
}

export function computeUnitEconomics(
  revenue = {},
  leads = {},
  subscriptions = [],
  analyticsEvents = [],
  assumptions = {}
) {
  const a = { ...DEFAULT_EXECUTIVE_ASSUMPTIONS, ...assumptions };
  const sub = computeSubscriptionMetrics(subscriptions);
  const billable = Math.max(sub.totalBillable, 1);
  const arpuMonthlyTry = Math.round(sub.mrrTry / billable);

  const wonCount = Math.max(leads.wins || 0, 1);
  const leadRows = Array.isArray(leads._rows) ? leads._rows : [];
  const wonLeads = leadRows.filter(isWonLead);
  const partnerRevenuePerWin =
    wonLeads.length > 0
      ? Math.round(
          wonLeads.reduce((s, l) => s + Number(l.actual_revenue || 0), 0) / wonLeads.length
        )
      : 0;

  const margin = (a.grossMarginPct || 70) / 100;
  const lifetimeMonths = a.avgSubscriptionLifetimeMonths || 18;
  const subscriptionLtvTry = Math.round(arpuMonthlyTry * lifetimeMonths * margin);
  const partnerLtvTry = partnerRevenuePerWin;
  const blendedLtvTry = Math.round(subscriptionLtvTry + partnerLtvTry * 0.25);

  let cacTry = null;
  let ltvToCac = null;
  const spend = a.marketingSpendTry30d;

  if (spend != null && Number(spend) > 0) {
    const events = Array.isArray(analyticsEvents) ? analyticsEvents : [];
    const now = Date.now();
    const newPaidProxy = events.filter((e) => {
      if (e.event_name !== 'checkout_completed') return false;
      const t = parseTs(e.created_at);
      return t != null && t > now - 30 * MS_DAY;
    }).length;

    const divisor = Math.max(newPaidProxy, 1);
    cacTry = Math.round(Number(spend) / divisor);
    ltvToCac = cacTry > 0 ? Math.round((blendedLtvTry / cacTry) * 10) / 10 : null;
  }

  return {
    arpuMonthlyTry,
    subscriptionLtvTry,
    partnerLtvTry,
    blendedLtvTry,
    cacTry,
    ltvToCac,
    assumptionsUsed: {
      grossMarginPct: a.grossMarginPct,
      avgSubscriptionLifetimeMonths: a.avgSubscriptionLifetimeMonths,
      marketingSpendTry30d: a.marketingSpendTry30d
    }
  };
}

export function computeGrowthSummary({
  activeUsers = {},
  leads = {},
  revenue = {},
  churn = {}
} = {}) {
  return {
    mauGrowthPct: activeUsers.mauGrowthPct ?? null,
    leadVolumeGrowthPct: leads.leadVolumeGrowthPct ?? null,
    revenueSignalGrowthPct: null,
    logoChurnSignalPct: churn.logoChurnSignalPct ?? null
  };
}

/**
 * Full CEO snapshot for admin UI and JSON export.
 */
export function buildExecutiveSnapshot({
  subscriptions = [],
  leads = [],
  analyticsEvents = [],
  analyticsSessions = [],
  assumptions = {},
  now = new Date()
} = {}) {
  const investor = buildInvestorSnapshot({ subscriptions, leads, analyticsEvents });

  const activeUsers = computeActiveUserMetrics(analyticsEvents, analyticsSessions, { now });
  const leadMetrics = computeExecutiveLeadMetrics(leads, assumptions);
  const revenue = computeExecutiveRevenueMetrics(subscriptions, leads);
  const funnel = computeExecutiveFunnel(analyticsEvents, leads, assumptions);
  const churn = computeChurnMetrics(subscriptions);
  const unitEconomics = computeUnitEconomics(
    revenue,
    { ...leadMetrics, _rows: leads },
    subscriptions,
    analyticsEvents,
    assumptions
  );
  const growth = computeGrowthSummary({ activeUsers, leads: leadMetrics, revenue, churn });

  return {
    generatedAt: now.toISOString(),
    activeUsers,
    leads: leadMetrics,
    revenue,
    funnel,
    churn,
    unitEconomics,
    growth,
    investor,
    notes: [
      'DAU/WAU/MAU use distinct user_id, anonymous_id, or session_id from analytics (admin sample).',
      'Qualified leads: priority warm/hot/very_hot or lead_score ≥ 50 (auto-intake).',
      'Close rate = won ÷ qualified (partner_status in paid/closed/won/delivered/funded/purchased).',
      'CAC requires marketingSpendTry30d in export env or assumptions — otherwise null.',
      'LTV blends modeled Pro ARPU lifetime (margin-adjusted) plus avg partner win revenue.',
      'Partner revenue is CRM actual_revenue until settlement automation is live.'
    ]
  };
}
