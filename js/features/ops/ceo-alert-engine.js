/**
 * P13 — CEO alerting: comparative metrics for early intervention.
 */
import { computeConversionMetrics } from '../metrics/executive-dashboard.js';
import { countEventsWithPrefix } from './ops-health.js';
import { countFunnelStep } from '../growth/growth-kpis.js';
import { evaluateAlertRules } from './ops-alert-engine.js';

/**
 * @param {Array<{ created_at?: string }>} rows
 * @param {number} startMs inclusive
 * @param {number} endMs exclusive
 */
export function filterByTimeRange(rows, startMs, endMs) {
  return (rows || []).filter((row) => {
    const ts = row.created_at ? new Date(row.created_at).getTime() : 0;
    return ts >= startMs && ts <= endMs;
  });
}

/**
 * @param {number|null} current
 * @param {number|null} prior
 */
export function percentDrop(current, prior) {
  if (prior == null || current == null || prior <= 0) return null;
  return Math.round(((prior - current) / prior) * 1000) / 10;
}

/**
 * @param {object} input
 * @param {Array} input.analyticsEvents
 * @param {Array} input.autoLeads
 * @param {Array} input.operationalEvents
 * @param {Array} input.subscriptions
 * @param {Array} input.dispatchLogs24h
 * @param {object} [input.config] from ceo-alerts.json thresholds
 * @param {number} [input.nowMs]
 */
export function buildCeoAlertMetrics(input = {}) {
  const nowMs = input.nowMs ?? Date.now();
  const t = input.config?.thresholds || {};
  const h24 = 24 * 60 * 60 * 1000;
  const d7 = 7 * h24;

  const curStart = nowMs - h24;
  const priorStart = nowMs - 2 * h24;
  const churnCurStart = nowMs - d7;
  const churnPriorStart = nowMs - 2 * d7;

  const events = input.analyticsEvents || [];
  const eventsCur = filterByTimeRange(events, curStart, nowMs);
  const eventsPrior = filterByTimeRange(events, priorStart, curStart);

  const convCur = computeConversionMetrics(eventsCur);
  const convPrior = computeConversionMetrics(eventsPrior);

  const landingCur = convCur.counts?.landing ?? 0;
  const funnelCrCur = convCur.funnelConversionPct ?? 0;
  const funnelCrPrior = convPrior.funnelConversionPct ?? 0;
  const funnelDropPct = percentDrop(funnelCrCur, funnelCrPrior);

  const conversionCrash =
    landingCur >= (t.conversionMinLanding24h ?? 20) &&
    (funnelCrPrior ?? 0) >= (t.conversionPriorMinPct ?? 3) &&
    (funnelDropPct ?? 0) >= (t.conversionDropPctMin ?? 35);

  const checkoutStart = countFunnelStep(eventsCur, 'checkout_start');
  const checkoutComplete = countFunnelStep(eventsCur, 'checkout_complete');
  const checkoutAbandon = eventsCur.filter((r) => r.event_name === 'checkout_abandoned').length;
  const paymentFailed = eventsCur.filter((r) =>
    ['payment_failed', 'checkout_failed'].includes(r.event_name)
  ).length;

  const checkoutFailures = Math.max(
    0,
    checkoutStart - checkoutComplete,
    checkoutAbandon,
    paymentFailed
  );
  const checkoutFailureRatePct = checkoutStart
    ? Math.round((checkoutFailures / checkoutStart) * 1000) / 10
    : 0;

  const checkoutFailureAlert =
    checkoutFailures >= (t.checkoutFailureCount24h ?? 4) ||
    (checkoutStart >= 3 &&
      checkoutFailureRatePct >= (t.checkoutFailureRatePct ?? 45));

  const opsCur = filterByTimeRange(input.operationalEvents || [], curStart, nowMs);
  const stripeWebhookFails = countEventsWithPrefix(opsCur, 'webhook_stripe');

  const dispatchFails = (input.dispatchLogs24h || []).filter((r) => r.success === false).length;

  const subs = input.subscriptions || [];
  const cancelAtPeriodEnd7d = subs.filter((s) => s.cancel_at_period_end === true).length;

  const churnEventsCur = opsCur.filter((r) =>
    String(r.event_name || '').includes('cancel') ||
    String(r.event_name || '').includes('churn')
  ).length;
  const churnEventsPrior = filterByTimeRange(input.operationalEvents || [], churnPriorStart, churnCurStart).filter(
    (r) =>
      String(r.event_name || '').includes('cancel') ||
      String(r.event_name || '').includes('churn')
  ).length;

  const churnSpike =
    churnEventsPrior > 0 &&
    churnEventsCur >= churnEventsPrior * (t.churnSpikeMultiplier ?? 2);
  const churnAlert =
    cancelAtPeriodEnd7d >= (t.churnCancelAtPeriodEnd7d ?? 3) || churnSpike;

  const leadsCurAnalytics = convCur.counts?.leads ?? 0;
  const leadsPriorAnalytics = convPrior.counts?.leads ?? 0;

  const leadsCurDb = filterByTimeRange(input.autoLeads || [], curStart, nowMs).length;
  const leadsPriorDb = filterByTimeRange(input.autoLeads || [], priorStart, curStart).length;

  const leadsCur = Math.max(leadsCurAnalytics, leadsCurDb);
  const leadsPrior = Math.max(leadsPriorAnalytics, leadsPriorDb);
  const leadDropPct = percentDrop(leadsCur, leadsPrior);
  const leadDropAlert =
    (leadsPrior ?? 0) >= (t.leadPriorMin24h ?? 5) &&
    (leadDropPct ?? 0) >= (t.leadDropPctMin ?? 45);

  const eventsCurCount = eventsCur.length;
  const eventsPriorCount = eventsPrior.length;
  const analyticsDropPct = percentDrop(eventsCurCount, eventsPriorCount);
  const analyticsVolumeDrop =
    (eventsPriorCount ?? 0) >= (t.analyticsPriorMinEvents24h ?? 40) &&
    (analyticsDropPct ?? 0) >= (t.analyticsVolumeDropPctMin ?? 40);

  return {
    conversion: {
      funnelCrPct24h: funnelCrCur,
      funnelCrPctPrior24h: funnelCrPrior,
      funnelDropPct: funnelDropPct ?? 0,
      landing24h: landingCur,
      crashSignal: conversionCrash ? 1 : 0
    },
    checkout: {
      starts24h: checkoutStart,
      completes24h: checkoutComplete,
      abandon24h: checkoutAbandon,
      paymentFailed24h: paymentFailed,
      failureCount24h: checkoutFailures,
      failureRatePct: checkoutFailureRatePct,
      failureAlertSignal: checkoutFailureAlert ? 1 : 0
    },
    stripe: {
      webhookFailCount24h: stripeWebhookFails
    },
    partner: {
      dispatchFailCount24h: dispatchFails
    },
    churn: {
      cancelAtPeriodEnd7d,
      churnEvents7d: churnEventsCur,
      churnSpikeSignal: churnSpike ? 1 : 0,
      churnAlertSignal: churnAlert ? 1 : 0
    },
    leads: {
      leads24h: leadsCur,
      leadsPrior24h: leadsPrior,
      leadDropPct: leadDropPct ?? 0,
      dropAlertSignal: leadDropAlert ? 1 : 0
    },
    analytics: {
      events24h: eventsCurCount,
      eventsPrior24h: eventsPriorCount,
      volumeDropPct: analyticsDropPct ?? 0,
      volumeDropAlertSignal: analyticsVolumeDrop ? 1 : 0
    }
  };
}

/**
 * @param {object} input same as buildCeoAlertMetrics + alertRules
 */
export function buildCeoAlertSnapshot(input = {}) {
  const metrics = buildCeoAlertMetrics(input);
  const alerts = evaluateAlertRules(metrics, input.alertRules || []);

  let overallHealth = 'healthy';
  if (alerts.overallSeverity === 'critical') overallHealth = 'critical';
  else if (alerts.overallSeverity === 'error') overallHealth = 'error';
  else if (alerts.triggered.length) overallHealth = 'warning';

  return {
    version: 'p13.0',
    generatedAt: new Date().toISOString(),
    channel: 'ceo',
    overallHealth,
    metrics,
    alerts,
    runbooks: [
      { label: 'CEO alerting', path: 'docs/CEO_ALERTING.md' },
      { label: 'Ops command center', path: 'docs/P9_DIGITAL_COMPANY_OPS.md' },
      { label: 'Partner ops', path: 'docs/PARTNER_OPS_AUTOMATION.md' }
    ]
  };
}
