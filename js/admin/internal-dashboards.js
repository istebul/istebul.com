/**
 * P14 — Admin loaders for internal company dashboards.
 */
import { buildInternalDashboardContext } from '../features/dashboards/internal-dashboard-context.js';
import { renderInternalDashboard } from '../features/dashboards/internal-dashboard-views.js';

const CACHE_TTL_MS = 120000;
let cachedContext = null;
let cachedAt = 0;

/**
 * @param {object} deps
 * @param {import('@supabase/supabase-js').SupabaseClient} deps.sb
 * @param {function} deps.fetchAdminTable
 * @param {object} deps.SCALE_LIMITS
 * @param {function} deps.collectAdminWarnings
 */
export async function fetchInternalDashboardContext(deps) {
  const now = Date.now();
  if (cachedContext && now - cachedAt < CACHE_TTL_MS) {
    return cachedContext;
  }

  const { sb, fetchAdminTable, SCALE_LIMITS, collectAdminWarnings } = deps;
  const windowDays = SCALE_LIMITS.admin.executiveWindowDays || 30;
  const since = new Date(Date.now() - windowDays * 86400000).toISOString();
  const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 86400000).toISOString();

  const analyticsSelect =
    'event_name, session_id, attribution, properties, revenue_cents, funnel, created_at';
  const subSelect = 'status, current_period_start, current_period_end, cancel_at_period_end';
  const leadSelect =
    'lead_score, partner_status, estimated_revenue, actual_revenue, created_at';

  let alertRules = [];
  let ceoAlertRules = [];
  let partnerOpsConfig = {};
  let ceoAlertConfig = {};
  let supportFlows = [];

  try {
    const [rulesRes, ceoRulesRes, partnerCfgRes, ceoCfgRes, supportRes] = await Promise.all([
      fetch('/data/ops/alert-rules.json'),
      fetch('/data/ops/ceo-alert-rules.json'),
      fetch('/data/partner/partner-ops.json'),
      fetch('/data/ops/ceo-alerts.json'),
      fetch('/data/customer/support-workflows.json')
    ]);
    if (rulesRes.ok) alertRules = (await rulesRes.json()).rules || [];
    if (ceoRulesRes.ok) ceoAlertRules = (await ceoRulesRes.json()).rules || [];
    if (partnerCfgRes.ok) partnerOpsConfig = await partnerCfgRes.json();
    if (ceoCfgRes.ok) ceoAlertConfig = await ceoCfgRes.json();
    if (supportRes.ok) supportFlows = (await supportRes.json()).workflows || [];
  } catch {
    /* optional manifests */
  }

  const [
    subsRes,
    leadsRes,
    eventsRes,
    opsRes,
    dispatchRes,
    enrollRes,
    msgRes,
    endpointsRes,
    retryLeadsRes,
    ceoLeadsRes,
    faqRes
  ] = await Promise.all([
    fetchAdminTable(sb, {
      table: 'subscriptions',
      select: subSelect,
      limit: 2000,
      direct: (expr) => sb.from('subscriptions').select(expr || subSelect).limit(2000)
    }),
    fetchAdminTable(sb, {
      table: 'auto_leads',
      select: leadSelect,
      limit: 5000,
      direct: (expr) =>
        sb.from('auto_leads').select(expr || leadSelect).gte('created_at', since).limit(5000)
    }),
    fetchAdminTable(sb, {
      table: 'analytics_events',
      select: analyticsSelect,
      limit: SCALE_LIMITS.admin.executiveRowLimit || 2500,
      order: { column: 'created_at', ascending: false },
      direct: (expr) =>
        sb
          .from('analytics_events')
          .select(expr || analyticsSelect)
          .gte('created_at', since48h)
          .order('created_at', { ascending: false })
          .limit(SCALE_LIMITS.admin.executiveRowLimit || 2500)
    }),
    fetchAdminTable(sb, {
      table: 'operational_events',
      select: 'severity, category, event_name, created_at, source',
      limit: 2000,
      direct: () =>
        sb
          .from('operational_events')
          .select('severity, category, event_name, created_at, source')
          .gte('created_at', since48h)
          .order('created_at', { ascending: false })
          .limit(2000)
    }),
    fetchAdminTable(sb, {
      table: 'partner_lead_dispatch_logs',
      limit: 500,
      direct: () =>
        sb
          .from('partner_lead_dispatch_logs')
          .select('success, duration_ms, created_at')
          .gte('created_at', since24h)
          .limit(500)
    }),
    fetchAdminTable(sb, {
      table: 'lifecycle_enrollments',
      select: 'flow_id, status, enrolled_at',
      limit: 3000,
      direct: () =>
        sb
          .from('lifecycle_enrollments')
          .select('flow_id, status, enrolled_at')
          .gte('enrolled_at', since7d)
          .limit(3000)
    }),
    fetchAdminTable(sb, {
      table: 'lifecycle_messages',
      select: 'status, created_at',
      limit: 3000,
      direct: () =>
        sb
          .from('lifecycle_messages')
          .select('status, created_at')
          .gte('created_at', since7d)
          .limit(3000)
    }),
    fetchAdminTable(sb, {
      table: 'partner_endpoints',
      limit: 200,
      direct: () =>
        sb
          .from('partner_endpoints')
          .select(
            'id, name, route_type, is_active, health_status, circuit_open_until, last_success_at'
          )
          .limit(200)
    }),
    fetchAdminTable(sb, {
      table: 'auto_leads',
      select: 'id, partner_status, next_retry_at, dispatch_retry_count',
      limit: 1500,
      direct: () =>
        sb
          .from('auto_leads')
          .select('id, partner_status, next_retry_at, dispatch_retry_count')
          .in('partner_status', ['dispatch_failed', 'dispatch_dead', 'pending'])
          .limit(1500)
    }),
    fetchAdminTable(sb, {
      table: 'auto_leads',
      select: 'id, created_at, partner_status',
      limit: 2000,
      direct: () =>
        sb
          .from('auto_leads')
          .select('id, created_at, partner_status')
          .gte('created_at', since48h)
          .limit(2000)
    }),
    fetchAdminTable(sb, {
      table: 'faqs',
      select: 'id',
      limit: 500,
      direct: () => sb.from('faqs').select('id').limit(500)
    })
  ]);

  const warnings = collectAdminWarnings([
    subsRes,
    leadsRes,
    eventsRes,
    opsRes,
    dispatchRes,
    enrollRes,
    msgRes,
    endpointsRes,
    retryLeadsRes,
    ceoLeadsRes,
    faqRes
  ]);

  const sinceMs = new Date(since).getTime();
  const events = (eventsRes.data || []).filter((row) => {
    const ts = row.created_at ? new Date(row.created_at).getTime() : 0;
    return ts >= sinceMs;
  });

  const ctx = buildInternalDashboardContext({
    windowDays,
    analyticsEvents: events,
    subscriptions: subsRes.data || [],
    autoLeads: leadsRes.data || [],
    operationalEvents: opsRes.data || [],
    dispatchLogs24h: dispatchRes.data || [],
    endpoints: endpointsRes.data || [],
    retryLeads: retryLeadsRes.data || [],
    ceoLeads: ceoLeadsRes.data || [],
    lifecycle: {
      enrollments7d: enrollRes.data?.length || 0,
      failedMessages: (msgRes.data || []).filter((m) => m.status === 'failed').length
    },
    lifecycleEnrollments: enrollRes.data || [],
    lifecycleMessages: msgRes.data || [],
    alertRules,
    ceoAlertRules,
    ceoAlertConfig,
    partnerOpsConfig,
    supportFlows,
    faqCount: faqRes.data?.length ?? null,
    analyticsRowCap: SCALE_LIMITS.admin.executiveRowLimit || 2500
  });

  cachedContext = {
    ctx,
    warnings,
    fetchWarnings: [subsRes, leadsRes, eventsRes],
    analyticsEvents48h: eventsRes.data || []
  };
  cachedAt = now;
  return cachedContext;
}

export function invalidateInternalDashboardCache() {
  cachedContext = null;
  cachedAt = 0;
}

/**
 * @param {object} deps
 * @param {'ceo'|'growth'|'revenue'|'partner_ops'|'support'} kind
 * @param {string} rootId
 * @param {function} escapeHtml
 * @param {function} renderAdminWarningBanner
 */
export async function loadInternalDashboard(deps, kind, rootId, escapeHtml, renderAdminWarningBanner) {
  const el = document.getElementById(rootId);
  if (!el) return;

  el.innerHTML = '<div class="empty">Yükleniyor…</div>';

  try {
    const { ctx, warnings } = await fetchInternalDashboardContext(deps);
    el.innerHTML =
      renderAdminWarningBanner(warnings) + renderInternalDashboard(kind, ctx, escapeHtml);
  } catch (err) {
    el.innerHTML = `<p class="empty">Hata: ${escapeHtml(err?.message || String(err))}</p>`;
  }
}
