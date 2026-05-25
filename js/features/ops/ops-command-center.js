/**
 * P9 — Unified ops command center rollup (revenue, customer, partner, analytics, lifecycle, ops, AI).
 * P12 — Enriched partner ops metrics when `partnerOps` snapshot is provided.
 */
import { buildExecutiveDashboard, EXECUTIVE_WINDOW_DAYS } from '../metrics/executive-dashboard.js';
import {
  countEventsWithPrefix,
  rollupSeverity24h
} from './ops-health.js';
import { evaluateAlertRules } from './ops-alert-engine.js';
import { buildPartnerOpsSnapshot } from '../partner/partner-ops-monitor.js';

/**
 * @param {object} input
 * @param {Array} [input.analyticsEvents]
 * @param {Array} [input.subscriptions]
 * @param {Array} [input.autoLeads]
 * @param {Array} [input.operationalEvents]
 * @param {object} [input.lifecycle]
 * @param {number} [input.partnerWebhookFails]
 * @param {object} [input.partnerOps] pre-built P12 snapshot or raw inputs for buildPartnerOpsSnapshot
 * @param {Array} [input.alertRules]
 * @param {number} [input.windowDays]
 */
export function buildOpsCommandCenter(input = {}) {
  const windowDays = input.windowDays ?? EXECUTIVE_WINDOW_DAYS;
  const executive = buildExecutiveDashboard({
    analyticsEvents: input.analyticsEvents || [],
    subscriptions: input.subscriptions || [],
    autoLeads: input.autoLeads || [],
    windowDays
  });

  const opsEvents = input.operationalEvents || [];
  const severityRows = rollupSeverity24h(opsEvents);
  const bySeverity = { critical: 0, error: 0, warning: 0, info: 0 };
  for (const row of severityRows) {
    bySeverity[row.severity] = Number(row.events) || 0;
  }

  const recentOps = opsEvents.filter((row) =>
    ['critical', 'error'].includes(String(row.severity || '').toLowerCase())
  );

  const webhookFailCount =
    (input.partnerWebhookFails ?? 0) +
    countEventsWithPrefix(recentOps, 'webhook_');

  let partnerOpsSnapshot = null;
  if (input.partnerOps?.version === 'p12.0') {
    partnerOpsSnapshot = input.partnerOps;
  } else if (
    input.partnerOps?.dispatchLogs24h ||
    input.partnerOps?.endpoints ||
    input.partnerOps?.leads
  ) {
    partnerOpsSnapshot = buildPartnerOpsSnapshot({
      ...input.partnerOps,
      alertRules: []
    });
  }

  const p12 = partnerOpsSnapshot?.metrics?.partner || {};

  const checkoutAbandon = (input.analyticsEvents || []).filter(
    (r) => r.event_name === 'checkout_abandoned'
  ).length;

  const aiProxyHits = countEventsWithPrefix(opsEvents, 'ai_proxy') +
    countEventsWithPrefix(opsEvents, 'abuse_');

  const lifecycle = input.lifecycle || {};
  const failedMessages = lifecycle.failedMessages ?? 0;

  const eventsAtCap =
    executive.sampleSize?.analyticsEvents >= (input.analyticsRowCap ?? 20000)
      ? 1
      : 0;

  const alertMetrics = {
    ops: {
      criticalCount: bySeverity.critical,
      errorCount: bySeverity.error,
      warningCount: bySeverity.warning
    },
    partner: {
      webhookFailCount: Math.max(webhookFailCount, p12.webhookFailCount ?? 0),
      dispatchRatePct:
        p12.dispatchRatePct ??
        executive.partnerLeadQuality?.dispatchRatePct ??
        100,
      totalLeads: executive.partnerLeadQuality?.totalLeads ?? 0,
      dispatchP95Ms: p12.dispatchP95Ms ?? 0,
      retryDueNow: p12.retryDueNow ?? 0,
      dispatchDeadCount: p12.dispatchDeadCount ?? 0,
      unhealthyEndpointCount: p12.unhealthyEndpointCount ?? 0,
      circuitOpenCount: p12.circuitOpenCount ?? 0,
      inactiveEndpointCount: p12.inactiveEndpointCount ?? 0,
      dispatchFailedLeads: p12.dispatchFailedLeads ?? 0
    },
    revenue: {
      cancelAtPeriodEnd: executive.churn?.cancelAtPeriodEnd ?? 0,
      mrrTry: executive.revenue?.mrrTry ?? 0,
      checkoutAbandonEvents: checkoutAbandon
    },
    lifecycle: {
      failedMessages,
      enrollments7d: lifecycle.enrollments7d ?? 0
    },
    analytics: {
      eventsAtCap
    },
    ai: {
      proxyRateLimitHits: aiProxyHits
    }
  };

  const alerts = evaluateAlertRules(alertMetrics, input.alertRules || []);

  const domainStatus = (severity) => {
    if (severity === 'critical') return 'red';
    if (severity === 'error') return 'red';
    if (severity === 'warning') return 'yellow';
    return 'green';
  };

  const domainAlerts = (domainId) =>
    alerts.triggered.filter((a) => a.domain === domainId);

  const domains = [
    {
      id: 'revenue',
      label: 'Revenue Ops',
      status: domainStatus(
        domainAlerts('revenue').some((a) => a.severity === 'critical')
          ? 'critical'
          : domainAlerts('revenue').length
            ? 'warning'
            : 'ok'
      ),
      highlights: [
        `MRR ${(executive.revenue?.mrrTry ?? 0).toLocaleString('tr-TR')} ₺`,
        `Active subs ${executive.churn?.activeSubscriptions ?? 0}`,
        `Pipeline realized ${(executive.pipeline?.actualTry ?? 0).toLocaleString('tr-TR')} ₺`
      ],
      automations: ['stripe_webhook', 'metrics:executive', 'checkout_abandon_recovery']
    },
    {
      id: 'customer',
      label: 'Customer Ops',
      status: domainAlerts('customer').length ? 'yellow' : 'green',
      highlights: [
        `Lifecycle enrolls ${executive.retention?.lifecycleEnrolls ?? 0}`,
        `Return visits ${executive.retention?.returnVisits ?? 0}`,
        `Recovery rate ${executive.retention?.recoveryRatePct ?? 0}%`
      ],
      automations: ['lifecycle_cron', 'retention_habits', 'signup_nurture']
    },
    {
      id: 'partner',
      label: 'Partner Ops',
      status: domainStatus(
        domainAlerts('partner').some((a) => a.severity === 'critical')
          ? 'critical'
          : domainAlerts('partner').length
            ? 'warning'
            : 'ok'
      ),
      highlights: [
        `Dispatch ${alertMetrics.partner.dispatchRatePct ?? 0}% (24h)`,
        `p95 ${Math.round((alertMetrics.partner.dispatchP95Ms ?? 0) / 1000)}s`,
        `Retry due ${alertMetrics.partner.retryDueNow ?? 0}`,
        `Unhealthy EP ${alertMetrics.partner.unhealthyEndpointCount ?? 0}`
      ],
      automations: [
        'auto_intake_dispatch',
        'partner_retry',
        'partner_ops_monitor',
        'lead_alert_telegram'
      ]
    },
    {
      id: 'analytics',
      label: 'Analytics Automation',
      status: domainAlerts('analytics').length ? 'yellow' : 'green',
      highlights: [
        `Events sampled ${executive.sampleSize?.analyticsEvents ?? 0}`,
        `Funnel CR ${executive.conversions?.funnelConversionPct ?? 0}%`
      ],
      automations: ['analytics_ingest', 'metrics:growth:command']
    },
    {
      id: 'lifecycle',
      label: 'Lifecycle Automation',
      status: domainAlerts('lifecycle').length ? 'yellow' : 'green',
      highlights: [
        `Enrollments 7d ${lifecycle.enrollments7d ?? 0}`,
        `Failed messages ${failedMessages}`
      ],
      automations: ['lifecycle_cron', 'data/lifecycle/flows.json']
    },
    {
      id: 'operations',
      label: 'Operational Alerts',
      status: domainStatus(alerts.overallSeverity),
      highlights: [
        `Critical ${bySeverity.critical}`,
        `Errors ${bySeverity.error}`,
        `Triggered rules ${alerts.triggeredCount}`
      ],
      automations: ['ops_ingest', 'ops_automation_workflow', 'ops_alert_digest']
    },
    {
      id: 'ai',
      label: 'AI Decision Ops',
      status: domainAlerts('ai').length ? 'yellow' : 'green',
      highlights: [
        `Deterministic scoring live`,
        `AI proxy pressure signals ${aiProxyHits}`
      ],
      automations: ['ai_proxy', 'decision_intelligence', 'narration_budget']
    },
    {
      id: 'dashboards',
      label: 'Internal Dashboards',
      status: 'green',
      highlights: [
        'Executive KPIs',
        'Observability',
        'Ops Command Center'
      ],
      automations: ['admin-panel pages']
    }
  ];

  return {
    version: 'p9.0',
    partnerOps: partnerOpsSnapshot
      ? {
          overallHealth: partnerOpsSnapshot.overallHealth,
          sla: partnerOpsSnapshot.sla,
          dispatchMonitoring: partnerOpsSnapshot.dispatchMonitoring,
          retryAutomation: partnerOpsSnapshot.retryAutomation,
          webhookHealth: partnerOpsSnapshot.webhookHealth
        }
      : null,
    generatedAt: new Date().toISOString(),
    windowDays,
    overallHealth: alerts.overallSeverity === 'ok' ? 'healthy' : alerts.overallSeverity,
    executiveSummary: executive.ceoSummary || [],
    domains,
    metrics: alertMetrics,
    alerts,
    executive: {
      revenue: executive.revenue,
      churn: executive.churn,
      partnerLeadQuality: executive.partnerLeadQuality,
      conversions: executive.conversions,
      sampleSize: executive.sampleSize
    },
    runbooks: [
      { label: 'Deploy checklist', path: 'docs/DEPLOYMENT_CHECKLIST.md' },
      { label: 'Ops automation roadmap', path: 'docs/OPS_AUTOMATION_ROADMAP.md' },
      { label: 'Platform expansion', path: 'docs/EXPANSION_STRATEGY_ROADMAP.md' },
      { label: 'Partner webhooks', path: 'docs/partner-webhook-integration.md' }
    ]
  };
}
