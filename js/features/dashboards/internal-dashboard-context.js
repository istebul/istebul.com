/**
 * P14 — Shared data context for internal company dashboards.
 */
import { buildExecutiveDashboard, EXECUTIVE_WINDOW_DAYS } from '../metrics/executive-dashboard.js';
import {
  computeExecutiveFunnel,
  computeChannelBreakdown,
  computeRetentionSignals,
  countEvents,
  countFunnelStep
} from '../growth/growth-kpis.js';
import { buildPartnerOpsSnapshot } from '../partner/partner-ops-monitor.js';
import { buildCeoAlertSnapshot } from '../ops/ceo-alert-engine.js';
import { buildOpsCommandCenter } from '../ops/ops-command-center.js';
import { countEventsWithPrefix } from '../ops/ops-health.js';

/**
 * @param {object} raw
 */
export function buildInternalDashboardContext(raw = {}) {
  const windowDays = raw.windowDays ?? EXECUTIVE_WINDOW_DAYS;
  const events = raw.analyticsEvents || [];
  const since7dMs = Date.now() - 7 * 86400000;
  const events7d = events.filter((r) => {
    const ts = r.created_at ? new Date(r.created_at).getTime() : 0;
    return ts >= since7dMs;
  });

  const executive = buildExecutiveDashboard({
    analyticsEvents: events,
    subscriptions: raw.subscriptions || [],
    autoLeads: raw.autoLeads || [],
    windowDays
  });

  const partnerOps = buildPartnerOpsSnapshot({
    config: raw.partnerOpsConfig || {},
    dispatchLogs24h: raw.dispatchLogs24h || [],
    endpoints: raw.endpoints || [],
    leads: raw.retryLeads || [],
    alertRules: (raw.alertRules || []).filter((r) => r.domain === 'partner')
  });

  const ceoAlerts = buildCeoAlertSnapshot({
    config: raw.ceoAlertConfig || {},
    analyticsEvents: events,
    autoLeads: raw.ceoLeads || raw.autoLeads || [],
    operationalEvents: raw.operationalEvents || [],
    subscriptions: raw.subscriptions || [],
    dispatchLogs24h: raw.dispatchLogs24h || [],
    alertRules: raw.ceoAlertRules || []
  });

  const opsCenter = buildOpsCommandCenter({
    analyticsEvents: events,
    subscriptions: raw.subscriptions || [],
    autoLeads: raw.autoLeads || [],
    operationalEvents: raw.operationalEvents || [],
    partnerWebhookFails: (raw.dispatchLogs24h || []).filter((r) => r.success === false).length,
    partnerOps: partnerOps,
    lifecycle: raw.lifecycle || {},
    alertRules: raw.alertRules || [],
    windowDays,
    analyticsRowCap: raw.analyticsRowCap ?? 2500
  });

  const funnel7d = computeExecutiveFunnel(events7d);
  const channels = computeChannelBreakdown(events).slice(0, 10);
  const retention = computeRetentionSignals(events);

  const lifecycleEnrollments = raw.lifecycleEnrollments || [];
  const lifecycleMessages = raw.lifecycleMessages || [];
  const failedMessages = lifecycleMessages.filter((m) => m.status === 'failed').length;
  const activeEnrollments = lifecycleEnrollments.filter((e) => e.status === 'active').length;

  const supportEvents = events.filter((r) =>
    String(r.event_name || '').includes('support') ||
    r.event_name === 'decision_feedback_contact' ||
    r.event_name === 'help_widget_open'
  ).length;

  const checkoutAbandon = countEvents(events, 'checkout_abandoned');
  const revOpsSignals = {
    cancelAtPeriodEnd: executive.churn.cancelAtPeriodEnd,
    mrrTry: executive.revenue.mrrTry,
    checkoutAbandon,
    failedPaymentEvents: events.filter((r) => r.event_name === 'payment_failed').length
  };

  return {
    version: 'p14.0',
    generatedAt: new Date().toISOString(),
    windowDays,
    sampleSize: executive.sampleSize,
    executive,
    ceoAlerts,
    partnerOps,
    opsCenter,
    growth: {
      funnel7d,
      northStar7d: funnel7d.northStar,
      channels,
      experiments: {
        exposures: countEvents(events, 'growth_experiment_exposure'),
        conversions: countEvents(events, 'growth_experiment_conversion')
      },
      paid: {
        clickCapture: countEvents(events, 'paid_click_capture'),
        conversionSignals: countEvents(events, 'paid_conversion_signal')
      },
      retention
    },
    revenue: {
      ...executive.revenue,
      churn: executive.churn,
      pipeline: executive.pipeline,
      conversions: executive.conversions,
      revOpsSignals
    },
    support: {
      faqCount: raw.faqCount ?? null,
      activeEnrollments,
      failedMessages,
      enrollments7d: lifecycleEnrollments.length,
      supportEvents,
      flows: raw.supportFlows || []
    },
    ops: {
      stripeWebhookFails24h: countEventsWithPrefix(
        (raw.operationalEvents || []).filter((r) => {
          const ts = r.created_at ? new Date(r.created_at).getTime() : 0;
          return ts >= Date.now() - 86400000;
        }),
        'webhook_stripe'
      )
    }
  };
}
