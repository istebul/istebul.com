/**
 * P12 — Partner ops monitoring rollup (dispatch, retry, SLA, webhook health, inactivity).
 */
import { evaluateAlertRules } from '../ops/ops-alert-engine.js';

/**
 * @param {number[]} sorted ascending numbers
 * @param {number} p 0–100
 */
export function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

/**
 * @param {Array<{ success?: boolean, duration_ms?: number|null, created_at?: string }>} logs
 */
export function summarizeDispatchLogs24h(logs = []) {
  const durations = [];
  let success = 0;
  let fail = 0;

  for (const row of logs) {
    if (row.success === true) success += 1;
    else if (row.success === false) fail += 1;
    const ms = Number(row.duration_ms);
    if (Number.isFinite(ms) && ms >= 0) durations.push(ms);
  }

  durations.sort((a, b) => a - b);
  const total = success + fail;
  const successRatePct = total ? Math.round((success / total) * 1000) / 10 : 100;

  return {
    attempts24h: total,
    successCount24h: success,
    failCount24h: fail,
    successRatePct24h: successRatePct,
    p95DurationMs: percentile(durations, 95),
    p50DurationMs: percentile(durations, 50)
  };
}

/**
 * @param {Array<object>} leads
 * @param {string} [nowIso]
 */
export function summarizeRetryQueue(leads = [], nowIso = new Date().toISOString()) {
  const now = new Date(nowIso).getTime();
  let dispatch_failed = 0;
  let dispatch_dead = 0;
  let retryDueNow = 0;
  let pendingDispatch = 0;

  for (const lead of leads) {
    const status = String(lead.partner_status || '');
    if (status === 'dispatch_failed') {
      dispatch_failed += 1;
      const next = lead.next_retry_at ? new Date(lead.next_retry_at).getTime() : 0;
      if (!next || next <= now) retryDueNow += 1;
    } else if (status === 'dispatch_dead') {
      dispatch_dead += 1;
    } else if (status === 'pending') {
      pendingDispatch += 1;
    }
  }

  return {
    dispatch_failed,
    dispatch_dead,
    retryDueNow,
    pendingDispatch,
    retryAutomation: 'partner-retry every 15m (max 5 attempts)'
  };
}

/**
 * @param {Array<object>} endpoints
 * @param {object} config
 * @param {string} [nowIso]
 */
export function summarizeEndpointHealth(endpoints = [], config = {}, nowIso = new Date().toISOString()) {
  const now = Date.now();
  let unhealthy = 0;
  let degraded = 0;
  let healthy = 0;
  let circuitOpen = 0;
  let inactive = 0;
  const staleMs = (config.inactivityDays ?? 7) * 86400000;

  const inactiveEndpoints = [];

  for (const ep of endpoints) {
    const hs = String(ep.health_status || 'healthy');
    if (hs === 'unhealthy') unhealthy += 1;
    else if (hs === 'degraded') degraded += 1;
    else healthy += 1;

    if (ep.circuit_open_until && new Date(ep.circuit_open_until).getTime() > now) {
      circuitOpen += 1;
    }

    const lastOk = ep.last_success_at ? new Date(ep.last_success_at).getTime() : 0;
    const isActive = ep.is_active !== false;
    if (isActive && (!lastOk || now - lastOk > staleMs)) {
      inactive += 1;
      inactiveEndpoints.push({
        id: ep.id,
        name: ep.name,
        route_type: ep.route_type,
        last_success_at: ep.last_success_at || null,
        health_status: hs
      });
    }
  }

  return {
    totalActive: endpoints.filter((e) => e.is_active !== false).length,
    healthyCount: healthy,
    degradedCount: degraded,
    unhealthyCount: unhealthy,
    circuitOpenCount: circuitOpen,
    inactiveEndpointCount: inactive,
    inactiveEndpoints: inactiveEndpoints.slice(0, 10)
  };
}

/**
 * @param {object} input
 * @param {Array} input.dispatchLogs24h
 * @param {Array} input.endpoints
 * @param {Array} input.leads
 * @param {object} [input.config] from data/partner/partner-ops.json
 * @param {Array} [input.alertRules]
 */
export function buildPartnerOpsSnapshot(input = {}) {
  const config = input.config || {};
  const slaMs = config.sla?.dispatchLatencyP95Ms ?? 900000;
  const inactivityDays = config.inactivity?.endpointStaleDays ?? 7;

  const dispatch = summarizeDispatchLogs24h(input.dispatchLogs24h || []);
  const retry = summarizeRetryQueue(input.leads || [], input.nowIso);
  const endpoints = summarizeEndpointHealth(input.endpoints || [], {
    inactivityDays
  }, input.nowIso);

  const alertMetrics = {
    partner: {
      webhookFailCount: dispatch.failCount24h,
      dispatchRatePct: dispatch.successRatePct24h,
      dispatchP95Ms: dispatch.p95DurationMs,
      retryDueNow: retry.retryDueNow,
      dispatchDeadCount: retry.dispatch_dead,
      unhealthyEndpointCount: endpoints.unhealthyCount,
      degradedEndpointCount: endpoints.degradedCount,
      circuitOpenCount: endpoints.circuitOpenCount,
      inactiveEndpointCount: endpoints.inactiveEndpointCount,
      dispatchFailedLeads: retry.dispatch_failed
    }
  };

  const alerts = evaluateAlertRules(alertMetrics, input.alertRules || []);

  const slaBreached = dispatch.p95DurationMs > slaMs;
  const dispatchRateLow =
    dispatch.attempts24h > 0 &&
    dispatch.successRatePct24h < (config.sla?.dispatchSuccessRatePctMin ?? 85);

  let overallHealth = 'healthy';
  if (alerts.overallSeverity === 'critical') overallHealth = 'critical';
  else if (alerts.overallSeverity === 'error') overallHealth = 'error';
  else if (alerts.overallSeverity === 'warning' || slaBreached || dispatchRateLow) {
    overallHealth = 'warning';
  }

  return {
    version: 'p12.0',
    generatedAt: new Date().toISOString(),
    overallHealth,
    sla: {
      targetP95Ms: slaMs,
      actualP95Ms: dispatch.p95DurationMs,
      breached: slaBreached
    },
    dispatchMonitoring: dispatch,
    retryAutomation: retry,
    webhookHealth: {
      ...endpoints,
      inactiveEndpoints: endpoints.inactiveEndpoints
    },
    metrics: alertMetrics,
    alerts,
    runbooks: [
      { label: 'Partner webhooks', path: 'docs/partner-webhook-integration.md' },
      { label: 'Partner ops automation', path: 'docs/PARTNER_OPS_AUTOMATION.md' },
      { label: 'Ops command center', path: 'docs/P9_DIGITAL_COMPANY_OPS.md' }
    ]
  };
}
