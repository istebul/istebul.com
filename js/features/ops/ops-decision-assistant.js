/**
 * P15 — Operational decision assistant (deterministic insights from company metrics).
 */
import { percentDrop, filterByTimeRange } from './ceo-alert-engine.js';
import { computeConversionMetrics } from '../metrics/executive-dashboard.js';
import { countFunnelStep } from '../growth/growth-kpis.js';

/**
 * @typedef {object} OpsInsight
 * @property {string} id
 * @property {string} domain growth|funnel|churn|partner|pricing|conversion
 * @property {string} severity info|warning|critical
 * @property {string} title
 * @property {string} summary
 * @property {string[]} recommendations
 * @property {object} metrics
 */

/**
 * @param {string} severity
 * @param {string} domain
 * @param {string} id
 * @param {string} title
 * @param {string} summary
 * @param {string[]} recommendations
 * @param {object} metrics
 * @returns {OpsInsight}
 */
function insight(severity, domain, id, title, summary, recommendations, metrics = {}) {
  return { id, domain, severity, title, summary, recommendations, metrics };
}

/**
 * Funnel step drop between current and prior 24h.
 * @param {Array} events
 * @param {number} nowMs
 */
function detectFunnelStepAnomalies(events, nowMs = Date.now()) {
  const h24 = 86400000;
  const cur = filterByTimeRange(events, nowMs - h24, nowMs);
  const prior = filterByTimeRange(events, nowMs - 2 * h24, nowMs - h24);
  const steps = [
    ['landing_visit', 'Landing'],
    ['auto_start', 'Auto start'],
    ['wizard_complete', 'Wizard'],
    ['lead_submit', 'Lead'],
    ['checkout_start', 'Checkout'],
    ['checkout_complete', 'Checkout OK']
  ];
  const anomalies = [];

  for (const [key, label] of steps) {
    const curCount = countFunnelStep(cur, key);
    const priorCount = countFunnelStep(prior, key);
    const drop = percentDrop(curCount, priorCount);
    if (priorCount >= 10 && drop != null && drop >= 40) {
      anomalies.push({ step: label, key, curCount, priorCount, dropPct: drop });
    }
  }
  return anomalies;
}

/**
 * @param {object} ctx from buildInternalDashboardContext
 * @param {object} [opts]
 */
export function buildOpsDecisionBrief(ctx, opts = {}) {
  const insights = [];
  const ex = ctx.executive;
  const g = ctx.growth;
  const r = ctx.revenue;
  const p = ctx.partnerOps;
  const ceo = ctx.ceoAlerts;
  const pricing = opts.pricingReference || { proMonthlyTry: 299, proAnnualTry: 2870, trialDays: 7 };
  const events = opts.analyticsEvents || [];

  const funnelAnomalies = detectFunnelStepAnomalies(events);
  const conv = ceo.metrics?.conversion || {};
  const churn = ceo.metrics?.churn || {};
  const checkoutSig = ceo.metrics?.checkout || {};

  if (conv.crashSignal === 1) {
    insights.push(
      insight(
        'critical',
        'funnel',
        'funnel_crash_24h',
        'Funnel anomaly — conversion crash',
        `Landing→lead CR dropped ${conv.funnelDropPct}% vs prior 24h (${conv.funnelCrPct24h}% now).`,
        [
          'Check hero CTA and auto wizard errors in last deploy window.',
          'Review CRO experiments — pause losing variants via growth dashboard.',
          'Confirm analytics-ingest is not under-counting (CEO analytics anomaly rule).'
        ],
        conv
      )
    );
  }

  for (const a of funnelAnomalies.slice(0, 3)) {
    insights.push(
      insight(
        'warning',
        'funnel',
        `funnel_step_drop_${a.key}`,
        `Funnel anomaly — ${a.step}`,
        `${a.step} volume down ${a.dropPct}% (24h: ${a.curCount} vs prior ${a.priorCount}).`,
        [
          `Inspect drop-off between prior step and ${a.step} in Platform Analytics.`,
          'Run mobile UX check on affected surface (375–430px).',
          'Align lifecycle recovery enrollments if abandon events rose.'
        ],
        a
      )
    );
  }

  const topChannel = g.channels?.[0];
  const weakChannel = g.channels?.find((c) => c.leads >= 3 && c.paid === 0);
  insights.push(
    insight(
      g.experiments?.conversions > 0 ? 'info' : 'warning',
      'growth',
      'growth_recommendations',
      'Growth recommendations',
      topChannel
        ? `Top channel: ${topChannel.channel} (${topChannel.leads} leads). Experiments: ${g.experiments?.exposures ?? 0} exposures / ${g.experiments?.conversions ?? 0} conversions.`
        : 'Insufficient channel signal — widen analytics window or verify UTM capture.',
      [
        topChannel && topChannel.leads > 0 && topChannel.paid === 0
          ? `Double down on ${topChannel.channel} with paid_conversion tracking on thank-you page.`
          : 'Refresh top-of-funnel creative on primary acquisition channel.',
        (g.paid?.clickCapture ?? 0) > 5
          ? 'Reconcile paid_click_capture vs paid_conversion_signal — CAC report.'
          : 'Enable paid landing experiments from data/growth/experiments.json.',
        weakChannel
          ? `Channel "${weakChannel.channel}" has leads but no paid — audit checkout path for that source.`
          : 'Schedule weekly growth command center export (npm run metrics:growth:command).'
      ],
      { topChannel, experiments: g.experiments, paid: g.paid }
    )
  );

  if (churn.churnAlertSignal === 1 || (r.churn?.cancelAtPeriodEnd ?? 0) >= 2) {
    insights.push(
      insight(
        'warning',
        'churn',
        'churn_analysis',
        'Churn analysis',
        `${r.churn?.cancelAtPeriodEnd ?? 0} subscriptions set to cancel at period end · MRR ${(r.mrrTry ?? 0).toLocaleString('tr-TR')} ₺.`,
        [
          'Trigger churn_rescue and downgrade_save lifecycle flows (RevOps).',
          'Personal outreach for high-LTV accounts with cancel_at_period_end.',
          'Review Stripe webhook health if churn events spiked without product change.'
        ],
        { cancelAtPeriodEnd: r.churn?.cancelAtPeriodEnd, mrrTry: r.mrrTry, churnEvents7d: churn.churnEvents7d }
      )
    );
  }

  const pq = ex.partnerLeadQuality;
  const dispatchRate = p.dispatchMonitoring?.successRatePct24h;
  if (
    (pq.dispatchFailPct ?? 0) > 15 ||
    (dispatchRate != null && dispatchRate < 80) ||
    (p.webhookHealth?.unhealthyCount ?? 0) > 0
  ) {
    insights.push(
      insight(
        p.sla?.breached ? 'critical' : 'warning',
        'partner',
        'partner_quality',
        'Partner quality analysis',
        `Dispatch success ${dispatchRate ?? '—'}% (24h) · CRM dispatch rate ${pq.dispatchRatePct ?? '—'}% · ${p.retryAutomation?.dispatch_failed ?? 0} failed retries.`,
        [
          'Run partner:ops:run and confirm partner-retry cron (every 15m).',
          (p.webhookHealth?.unhealthyCount ?? 0) > 0
            ? 'Reset unhealthy endpoints after HMAC/URL verification.'
            : 'Review min_lead_score and route caps on hot leads.',
          'Calibrate partner win rate vs lead_score — outcome capture for closed deals.'
        ],
        { partnerOps: p.webhookHealth, partnerQuality: pq }
      )
    );
  } else {
    insights.push(
      insight(
        'info',
        'partner',
        'partner_quality_ok',
        'Partner quality — stable',
        `Dispatch ${dispatchRate ?? '—'}% · win rate ${pq.partnerWinRatePct ?? '—'}% · avg score ${pq.avgLeadScore ?? '—'}.`,
        ['Maintain SLA monitoring; review inactive endpoints weekly.'],
        { partnerQuality: pq }
      )
    );
  }

  const c = r.conversions?.counts || {};
  const checkoutCr = r.conversions?.checkoutConversionPct;
  insights.push(
    insight(
      (r.revOpsSignals?.checkoutAbandon ?? 0) >= 10 ? 'warning' : 'info',
      'conversion',
      'conversion_insights',
      'Conversion insights',
      `Wizard ${ex.conversions?.wizardCompletionPct ?? '—'}% · Checkout ${checkoutCr ?? '—'}% (${c.checkoutComplete}/${c.checkoutStart}) · Paid ${ex.conversions?.paidConversionPct ?? '—'}%.`,
      [
        (c.checkoutStart ?? 0) > (c.checkoutComplete ?? 0) * 2
          ? 'Enroll checkout_abandon_recovery — verify lifecycle-cron.'
          : 'A/B test pricing CTA on /planlar (pricing_cta_q2 experiment).',
        (ex.conversions?.wizardCompletionPct ?? 100) < 50
          ? 'Shorten auto wizard — perceived performance audit on mobile.'
          : 'Track checkout_start → paid_conversion in executive KPI export.'
      ],
      { counts: c, conversions: ex.conversions }
    )
  );

  insights.push(
    insight(
      (r.revOpsSignals?.checkoutAbandon ?? 0) >= 5 ? 'warning' : 'info',
      'pricing',
      'pricing_insights',
      'Pricing insights',
      `Pro ₺${pricing.proMonthlyTry}/mo · annual ₺${pricing.proAnnualTry} · ${pricing.trialDays}d trial. MRR ${(r.mrrTry ?? 0).toLocaleString('tr-TR')} ₺ · ${r.revOpsSignals?.checkoutAbandon ?? 0} checkout abandons in window.`,
      [
        (r.churn?.trialingSubscriptions ?? 0) > (r.churn?.activeSubscriptions ?? 1) * 0.3
          ? 'Trial→paid nudge: renewal_nudge + upgrade_prompt flows for trialing users.'
          : 'Merchandise annual plan savings on pricing page (monthly vs annual).',
        (r.revOpsSignals?.failedPaymentEvents ?? 0) > 0
          ? 'Investigate failed_payment_recovery enrollments and Stripe decline reasons.'
          : 'Partner CPL bands: align sales deck with realized pipeline TRY.'
      ],
      { pricing, mrrTry: r.mrrTry, revOps: r.revOpsSignals }
    )
  );

  const severityRank = { critical: 0, warning: 1, info: 2 };
  insights.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  const overallSeverity = insights.some((i) => i.severity === 'critical')
    ? 'critical'
    : insights.some((i) => i.severity === 'warning')
      ? 'warning'
      : 'ok';

  return {
    version: 'p15.0',
    generatedAt: new Date().toISOString(),
    overallSeverity,
    windowDays: ctx.windowDays,
    insightCount: insights.length,
    insights,
    triggeredCeoAlerts: ceo.alerts?.triggered?.length ?? 0,
    opsHealth: ctx.opsCenter?.overallHealth ?? 'unknown'
  };
}

/**
 * Compact brief for LLM — numbers only from brief (no PII).
 * @param {ReturnType<typeof buildOpsDecisionBrief>} brief
 */
export function buildSanitizedOpsBriefForAi(brief) {
  return JSON.stringify({
    overallSeverity: brief.overallSeverity,
    windowDays: brief.windowDays,
    insightCount: brief.insightCount,
    insights: (brief.insights || []).map((i) => ({
      domain: i.domain,
      severity: i.severity,
      title: i.title,
      summary: i.summary,
      metrics: i.metrics
    }))
  });
}
