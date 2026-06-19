/**
 * P11 EXIT / M&A optionality — live Supabase metrics + attractiveness scoring.
 * Used by CLI (`scripts/acquisition-exit-snapshot.cjs`) and admin founder metrics.
 */

import {
  computeSubscriptionMetrics,
  computeLeadPipelineMetrics,
  computeProductFunnelMetrics
} from '../js/features/metrics/investor-kpis.js';
import { conversionRate, countFunnelStep } from '../js/features/growth/growth-kpis.js';

export const QUALIFIED_PARTNER_STATUSES = Object.freeze([
  'qualified',
  'demo',
  'pilot',
  'negotiation',
  'dispatched',
  'sent',
  'delivered',
  'accepted'
]);

export const CLOSED_DEAL_STATUSES = Object.freeze([
  'paid',
  'closed',
  'won',
  'delivered',
  'funded',
  'purchased'
]);

const AI_MOAT_EVENTS = Object.freeze([
  'ai_narration',
  'ai_explanation',
  'auto_ai_summary',
  'moat_ai_panel'
]);

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} sb
 */
export async function fetchSupabaseExitInputs(sb, options = {}) {
  const leadLimit = options.leadLimit ?? 10000;
  const eventLimit = options.eventLimit ?? 5000;

  const leadSelect =
    'id, lead_score, partner_status, partner_endpoint_id, estimated_revenue, actual_revenue, decision_session_id, created_at, phone, user_id';
  const subSelect = 'status, current_period_start, current_period_end, cancel_at_period_end';
  const eventSelect = 'event_name, session_id, created_at';

  const [leadsRes, subsRes, eventsRes, moatRes] = await Promise.all([
    sb.from('auto_leads').select(leadSelect).order('created_at', { ascending: false }).limit(leadLimit),
    sb.from('subscriptions').select(subSelect).limit(5000),
    sb
      .from('analytics_events')
      .select(eventSelect)
      .order('created_at', { ascending: false })
      .limit(eventLimit),
    sb.from('moat_flywheel_snapshot').select('*').maybeSingle()
  ]);

  const errors = [];
  if (leadsRes.error) errors.push(`auto_leads: ${leadsRes.error.message}`);
  if (subsRes.error && subsRes.error.code !== '42P01') errors.push(`subscriptions: ${subsRes.error.message}`);
  if (eventsRes.error) errors.push(`analytics_events: ${eventsRes.error.message}`);
  if (moatRes.error && moatRes.error.code !== '42P01') errors.push(`moat_flywheel: ${moatRes.error.message}`);

  return {
    leads: leadsRes.data || [],
    subscriptions: subsRes.data || [],
    analyticsEvents: eventsRes.data || [],
    moatFlywheel: moatRes.data || null,
    errors
  };
}

/**
 * Partner revenue concentration (HHI-style risk 0–100).
 */
export function computePartnerConcentrationRisk(leads = []) {
  const rows = Array.isArray(leads) ? leads : [];
  const byPartner = new Map();

  for (const row of rows) {
    const key = row.partner_endpoint_id || 'unassigned';
    const rev = Number(row.actual_revenue || row.estimated_revenue || 0);
    byPartner.set(key, (byPartner.get(key) || 0) + rev);
  }

  const total = [...byPartner.values()].reduce((s, v) => s + v, 0);
  if (total <= 0 || byPartner.size <= 1) {
    return {
      riskScore: byPartner.size <= 1 && rows.length > 5 ? 72 : 35,
      topPartnerSharePct: byPartner.size ? Math.round(100 / byPartner.size) : 0,
      activePartners: byPartner.size,
      note: total > 0 ? 'Revenue-weighted concentration' : 'Lead-count proxy (no revenue booked)'
    };
  }

  let hhi = 0;
  let topShare = 0;
  for (const share of byPartner.values()) {
    const pct = share / total;
    hhi += pct * pct;
    topShare = Math.max(topShare, pct);
  }

  const riskScore = Math.min(100, Math.round(topShare * 70 + hhi * 30));

  return {
    riskScore,
    topPartnerSharePct: Math.round(topShare * 100),
    activePartners: byPartner.size,
    hhi: Math.round(hhi * 1000) / 1000,
    note: 'Higher score = more concentration risk'
  };
}

export function computeRepeatUsageProxy(leads = [], events = []) {
  const leadRows = Array.isArray(leads) ? leads : [];
  const eventRows = Array.isArray(events) ? events : [];

  const phones = new Map();
  for (const l of leadRows) {
    const key = l.user_id || l.phone || l.decision_session_id;
    if (!key) continue;
    phones.set(key, (phones.get(key) || 0) + 1);
  }

  const repeatLeads = [...phones.values()].filter((c) => c >= 2).length;
  const uniqueActors = phones.size || 1;

  const sessions = new Set();
  for (const e of eventRows) {
    if (e.session_id) sessions.add(e.session_id);
  }

  const autoComplete = countFunnelStep(eventRows, 'wizard_complete');
  const autoStart = countFunnelStep(eventRows, 'auto_start') || countFunnelStep(eventRows, 'landing_visit');

  return {
    repeatActorCount: repeatLeads,
    repeatActorPct: Math.round((repeatLeads / uniqueActors) * 100),
    uniqueActors,
    returningSessionProxyPct: sessions.size
      ? Math.min(100, Math.round((autoComplete / Math.max(sessions.size, 1)) * 100))
      : null,
    wizardReturnSignal: conversionRate(autoComplete, autoStart)
  };
}

export function computeAiMoatSignal(leads = [], events = []) {
  const leadRows = Array.isArray(leads) ? leads : [];
  const eventRows = Array.isArray(events) ? events : [];

  const withSession = leadRows.filter((l) => l.decision_session_id).length;
  const sessionCoveragePct = leadRows.length
    ? Math.round((withSession / leadRows.length) * 100)
    : 0;

  const aiEvents = eventRows.filter((e) => AI_MOAT_EVENTS.includes(e.event_name)).length;
  const aiEventDensity = eventRows.length ? Math.round((aiEvents / eventRows.length) * 1000) / 10 : 0;

  const score = Math.min(
    100,
    Math.round(sessionCoveragePct * 0.55 + Math.min(aiEventDensity * 8, 35) + (withSession > 10 ? 10 : 0))
  );

  return {
    score,
    decisionSessionCoveragePct: sessionCoveragePct,
    leadsWithDecisionSession: withSession,
    aiRelatedEvents: aiEvents,
    aiEventDensityPct: aiEventDensity
  };
}

export function computeDataMoatDepth(moatFlywheel = null, leads = []) {
  const m = moatFlywheel || {};
  const leadRows = Array.isArray(leads) ? leads : [];

  const signals = [
    m.outcome_signals_90d ?? 0,
    m.decision_feedback_90d ?? 0,
    m.product_feedback_90d ?? 0,
    m.leads_calibrated ?? 0
  ];
  const signalSum = signals.reduce((a, b) => a + Number(b), 0);
  const endpoints = Number(m.partner_endpoints_active ?? 0);
  const sessionLeads = leadRows.filter((l) => l.decision_session_id).length;

  const depthScore = Math.min(
    100,
    Math.round(
      Math.min(signalSum / 2, 40) +
        Math.min(endpoints * 4, 24) +
        Math.min(sessionLeads / 3, 20) +
        (m.leads_with_session > 0 ? 16 : 0)
    )
  );

  return {
    depthScore,
    outcomeSignals90d: m.outcome_signals_90d ?? null,
    decisionFeedback90d: m.decision_feedback_90d ?? null,
    partnerEndpointsActive: endpoints,
    leadsWithSession: m.leads_with_session ?? sessionLeads,
    calibratedLeads: m.leads_calibrated ?? null
  };
}

export function computeFunnelEfficiency(events = []) {
  const rows = Array.isArray(events) ? events : [];
  const landing = countFunnelStep(rows, 'landing_visit') || countFunnelStep(rows, 'page_view');
  const autoStart = countFunnelStep(rows, 'auto_start');
  const wizardComplete = countFunnelStep(rows, 'wizard_complete');
  const leads = countFunnelStep(rows, 'lead_submit');
  const checkoutComplete = countFunnelStep(rows, 'checkout_complete');

  const efficiencyPct = Math.round(
    (conversionRate(wizardComplete, autoStart || landing) || 0) * 0.35 +
      (conversionRate(leads, wizardComplete || autoStart) || 0) * 0.35 +
      (conversionRate(checkoutComplete, leads || wizardComplete) || 0) * 0.3
  );

  return {
    efficiencyPct,
    landingToWizardPct: conversionRate(wizardComplete, autoStart || landing),
    wizardToLeadPct: conversionRate(leads, wizardComplete || autoStart),
    leadToPaidPct: conversionRate(checkoutComplete, leads || wizardComplete)
  };
}

export function computeAcquisitionAttractivenessScore(parts = {}) {
  const {
    conversionPct = 0,
    estimatedArrTry = 0,
    partnerConcentrationRisk = 50,
    funnelEfficiencyPct = 0,
    repeatActorPct = 0,
    aiMoatScore = 0,
    dataMoatDepthScore = 0
  } = parts;

  const arrComponent = Math.min(25, Math.round(Math.log10(Math.max(estimatedArrTry, 1)) * 6));
  const conversionComponent = Math.min(20, Math.round(conversionPct / 5));
  const funnelComponent = Math.min(15, Math.round(funnelEfficiencyPct / 7));
  const retentionComponent = Math.min(12, Math.round(repeatActorPct / 8));
  const aiComponent = Math.min(14, Math.round(aiMoatScore / 7));
  const dataComponent = Math.min(14, Math.round(dataMoatDepthScore / 7));
  const concentrationPenalty = Math.min(20, Math.round(partnerConcentrationRisk / 5));

  const raw =
    arrComponent +
    conversionComponent +
    funnelComponent +
    retentionComponent +
    aiComponent +
    dataComponent -
    concentrationPenalty;

  const score = Math.max(0, Math.min(100, Math.round(raw)));

  let band = 'early';
  if (score >= 70) band = 'strategic_dialogue_ready';
  else if (score >= 55) band = 'seed_ready';
  else if (score >= 40) band = 'bootstrap_proof';

  return {
    score,
    band,
    components: {
      arrComponent,
      conversionComponent,
      funnelComponent,
      retentionComponent,
      aiComponent,
      dataComponent,
      concentrationPenalty
    }
  };
}

/**
 * @param {object} input
 */
export function computeExitOptionalityMetrics(input = {}) {
  const leads = input.leads || [];
  const subscriptions = input.subscriptions || [];
  const analyticsEvents = input.analyticsEvents || [];
  const moatFlywheel = input.moatFlywheel || null;

  const subscription = computeSubscriptionMetrics(subscriptions);
  const pipeline = computeLeadPipelineMetrics(leads);
  const funnel = computeProductFunnelMetrics(analyticsEvents);

  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter(
    (l) =>
      QUALIFIED_PARTNER_STATUSES.includes(l.partner_status) ||
      Number(l.lead_score || 0) >= 70
  ).length;
  const closedDeals = leads.filter((l) => CLOSED_DEAL_STATUSES.includes(l.partner_status)).length;

  const conversionPct =
    totalLeads > 0 ? Math.round((closedDeals / totalLeads) * 100) : pipeline.winRate;

  const qualifiedConversionPct =
    qualifiedLeads > 0 ? Math.round((closedDeals / qualifiedLeads) * 100) : null;

  const estimatedArrTry = subscription.arrTry + pipeline.pipelineActualTry;
  const partnerConcentration = computePartnerConcentrationRisk(leads);
  const funnelEfficiency = computeFunnelEfficiency(analyticsEvents);
  const repeatUsage = computeRepeatUsageProxy(leads, analyticsEvents);
  const aiMoat = computeAiMoatSignal(leads, analyticsEvents);
  const dataMoat = computeDataMoatDepth(moatFlywheel, leads);

  const acquisitionAttractiveness = computeAcquisitionAttractivenessScore({
    conversionPct: conversionPct || 0,
    estimatedArrTry,
    partnerConcentrationRisk: partnerConcentration.riskScore,
    funnelEfficiencyPct: funnelEfficiency.efficiencyPct,
    repeatActorPct: repeatUsage.repeatActorPct,
    aiMoatScore: aiMoat.score,
    dataMoatDepthScore: dataMoat.depthScore
  });

  return {
    generatedAt: input.generatedAt || new Date().toISOString(),
    dataSource: input.dataSource || 'supabase',
    totalLeads,
    qualifiedLeads,
    closedDeals,
    conversionPct,
    qualifiedConversionPct,
    estimatedArrTry,
    subscriptionMrrTry: subscription.mrrTry,
    subscriptionArrTry: subscription.arrTry,
    pipelineEstimatedTry: pipeline.pipelineEstimatedTry,
    pipelineActualTry: pipeline.pipelineActualTry,
    partnerConcentration,
    funnelEfficiency,
    repeatUsage,
    aiMoat,
    dataMoat,
    acquisitionAttractiveness,
    funnelSample: funnel,
    pipeline,
    subscription,
    fetchErrors: input.errors || []
  };
}

/**
 * @param {object} params
 */
export function buildExitOptionalityReport({
  metrics,
  configSnapshot = null,
  generatedAt = new Date().toISOString()
} = {}) {
  const m = metrics || computeExitOptionalityMetrics({ dataSource: 'empty' });
  const config = configSnapshot || {};

  return {
    version: 'p11-exit-metrics.1',
    generatedAt,
    phaseName: config.phaseName || 'P11 — Acquisition / exit optionality',
    dataSource: m.dataSource,
    founderMetrics: m,
    staticVerdict: config.executiveVerdict || null,
    acquisitionAttractiveness: m.acquisitionAttractiveness,
    reportPath: 'docs/exit-optionality-report.md',
    distPath: 'dist/exit-optionality-snapshot.json'
  };
}

function formatTry(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return `₺${Number(n).toLocaleString('tr-TR')}`;
}

/**
 * @param {ReturnType<buildExitOptionalityReport>} report
 */
export function renderExitOptionalityMarkdown(report) {
  const m = report.founderMetrics || {};
  const att = m.acquisitionAttractiveness || {};
  const v = report.staticVerdict || {};

  const lines = [
    '# isteBul — Exit / M&A Optionality Report',
    '',
    `**Generated:** ${report.generatedAt}  `,
    `**Data source:** ${report.dataSource}  `,
    `**Phase:** ${report.phaseName}`,
    '',
    '> Illustrative scoring for internal / data-room use. Not a valuation or investment offer.',
    '',
    '## Executive snapshot',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Acquisition attractiveness | **${att.score ?? '—'}/100** (${att.band ?? '—'}) |`,
    `| Estimated ARR (blended) | ${formatTry(m.estimatedArrTry)} |`,
    `| Total leads | ${m.totalLeads ?? 0} |`,
    `| Qualified leads | ${m.qualifiedLeads ?? 0} |`,
    `| Closed deals | ${m.closedDeals ?? 0} |`,
    `| Lead → close conversion | ${m.conversionPct ?? '—'}% |`,
    `| Qualified → close | ${m.qualifiedConversionPct ?? '—'}% |`,
    '',
    '## Config verdict (static playbook)',
    '',
    v.recommendedPath
      ? `- Path: **${v.recommendedPath}**`
      : '- Path: _(run with config snapshot)_',
    v.exitReadinessPct !== undefined && v.exitReadinessPct !== null
      ? `- Exit readiness: ${v.exitReadinessPct}% · Investability: ${v.investabilityPct}% · Acquirability: ${v.acquirabilityPct}%`
      : '',
    '',
    '## Founder metrics (Supabase)',
    '',
    '### Revenue',
    `- MRR (normalized): ${formatTry(m.subscriptionMrrTry)}`,
    `- Subscription ARR: ${formatTry(m.subscriptionArrTry)}`,
    `- Pipeline actual (CRM): ${formatTry(m.pipelineActualTry)}`,
    `- Pipeline estimated: ${formatTry(m.pipelineEstimatedTry)}`,
    '',
    '### Partner concentration',
    `- Risk score: ${m.partnerConcentration?.riskScore ?? '—'}/100`,
    `- Top partner share: ${m.partnerConcentration?.topPartnerSharePct ?? '—'}%`,
    `- Active partner endpoints (leads): ${m.partnerConcentration?.activePartners ?? '—'}`,
    '',
    '### Funnel efficiency',
    `- Composite efficiency: ${m.funnelEfficiency?.efficiencyPct ?? '—'}%`,
    `- Landing → wizard: ${m.funnelEfficiency?.landingToWizardPct ?? '—'}%`,
    `- Wizard → lead: ${m.funnelEfficiency?.wizardToLeadPct ?? '—'}%`,
    `- Lead → paid: ${m.funnelEfficiency?.leadToPaidPct ?? '—'}%`,
    '',
    '### Retention proxy',
    `- Repeat actors: ${m.repeatUsage?.repeatActorCount ?? 0} (${m.repeatUsage?.repeatActorPct ?? 0}% of unique)`,
    `- Wizard return signal: ${m.repeatUsage?.wizardReturnSignal ?? '—'}%`,
    '',
    '### AI moat signal',
    `- Score: ${m.aiMoat?.score ?? '—'}/100`,
    `- Decision session coverage: ${m.aiMoat?.decisionSessionCoveragePct ?? '—'}%`,
    `- AI-related events (sample): ${m.aiMoat?.aiRelatedEvents ?? 0}`,
    '',
    '### Data moat depth',
    `- Depth score: ${m.dataMoat?.depthScore ?? '—'}/100`,
    `- Outcome signals (90d): ${m.dataMoat?.outcomeSignals90d ?? '—'}`,
    `- Decision feedback (90d): ${m.dataMoat?.decisionFeedback90d ?? '—'}`,
    `- Active partner endpoints: ${m.dataMoat?.partnerEndpointsActive ?? '—'}`,
    '',
    '## Attractiveness components',
    '',
    att.components
      ? Object.entries(att.components)
          .map(([k, val]) => `- ${k}: ${val}`)
          .join('\n')
      : '_No score breakdown_',
    '',
    '## Refresh',
    '',
    '```bash',
    'SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run metrics:exit:optionality',
    '```',
    '',
    'Admin: **Exit / M&A (P11)** → Founder metrics section.',
    ''
  ];

  if (m.fetchErrors?.length) {
    lines.push('## Fetch warnings', '', ...m.fetchErrors.map((e) => `- ${e}`), '');
  }

  return lines.filter(Boolean).join('\n');
}
