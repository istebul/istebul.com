import { getSupabaseClient, isSupabaseConfigured, SUPABASE_CONFIG_ERROR } from './core/supabase.js';
import { invokeAdminFunction, adminList } from './core/admin-client.js';
import { escapeHtml, safeAttr, safeJsonParse, safeExternalUrl } from './core/dom-safe.js';
import { normalizePhoneForWhatsapp } from './core/phone.js';
import { countLeadsByNormalizedStatus } from './core/lead-status.js';
import { mapAuthError } from './features/auth/auth-errors.js';
import {
  describeRetryState,
  computePartnerOpsKpis,
  aggregatePartnerFunnelEvents,
  partnerStatusBadge,
  CRM_PIPELINE_QUICK,
  funnelConversionPct
} from './features/admin/partner-ops.js';
import { computeMoatDashboard } from './features/admin/moat-intelligence.js';
import {
  buildMoatMetricsFromAdminData,
  renderMoatArchitectureAdminStrip
} from './features/moat/moat-architecture-ui.js';
import { SCALE_LIMITS } from './core/scale-limits.js';
import {
  fetchAdminTable,
  fetchAdminRowById,
  renderAdminDataSourceNotices
} from './admin/admin-query.js';
import {
  computeExecutiveFunnel,
  computeChannelBreakdown,
  computeRetentionSignals,
  computePaidPlatformBreakdown
} from './features/growth/growth-kpis.js';
import {
  initPartnerSalesMachineAdmin,
  computeOnboardingVelocity,
  velocityBadgeClass,
  scorePartnerApplication,
  recommendNextSalesAction,
  logPartnerSalesTouch,
  logPartnerCrmStageChange,
  computePartnerPipelineForecast,
  SALES_TOUCH_TYPES
} from './features/sales/partner-sales-machine.js';
import {
  normalizePartnerCrmStatus,
  partnerCrmStatusOptions,
  getPartnerCrmWinProbability,
  renderPartnerPipelineBoardHtml
} from './features/sales/partner-crm-pipeline.js';
import { registerAdminPageHandlers, showAdminPage } from './admin/admin-page-routing.js';
import { initAdminShell } from './admin/admin-shell.js';
import { initVacationAdmin } from './admin/vacation-admin.js';
import { initVerticalAdmin } from './admin/vertical-admin.js';
import { initHousingAdmin } from './admin/housing-admin.js';
import { initFinanceAdmin } from './admin/finance-admin.js';
import { initSigortaAdmin } from './admin/sigorta-admin.js';
import { loadPaymentsAdminPage } from './admin/payments-admin.js';
import { fetchOpsJson } from './admin/fetch-ops-json.js';
import { enrichLeadQualFields } from './admin/lead-qual-fields.js';
import {
  bindPartnerApplicationsAdminUi,
  getPartnerApplicationFormMarkup,
  handlePartnerApplicationAdminAction,
  loadPartnerApplications as loadPartnerApplicationsPage
} from './admin/partner-applications-admin.js';
import { renderLeadAiSummaryHtml } from './features/admin/lead-ai-intelligence.js';
import { fetchActivePartnerPool } from './features/partner/partner-pool.js';
import { DEFAULT_CAMPAIGNS, normalizePublicCampaign } from './features/content/public-content.js';
import {
  buildSiteAnalyticsMetrics,
  buildPagePathDetail,
  filterRowsByPreset,
  renderSiteAnalyticsDashboard,
  renderPagePathDetailPanel,
  renderPlatformAnalyticsEmptyGuide,
  exportPlatformAnalyticsCsv,
  FILTER_PRESETS
} from './admin/platform-site-analytics-dashboard.js';
import {
  ANALYTICS_DATA_MODES,
  ANALYTICS_DATA_MODE_LABELS,
  filterAnalyticsRows,
  renderAnalyticsDataModeToolbar,
  fetchAnalyticsCleanStartAt
} from './admin/analytics-traffic-filters.js';
import {
  getDeviceHash,
  markCurrentDeviceAsInternalTest
} from './core/analytics-internal.js';

let activeDrawerLeadId = null;
let platformAnalyticsFilter = '7d';
let platformAnalyticsDataMode = ANALYTICS_DATA_MODES.REAL;
let unifiedFunnelDataMode = ANALYTICS_DATA_MODES.REAL;
let autoAnalyticsDataMode = ANALYTICS_DATA_MODES.REAL;
let analyticsCleanStartAt = null;
let lastPlatformSiteMetrics = null;
let lastPlatformAnalyticsRows = null;

function renderAdminConfigError(message) {
  document.body.innerHTML = `
    <div class="admin-config-error">
      <div>
        <h2>Kimlik doğrulama servisi yapılandırılamadı</h2>
        <p>${escapeHtml(message)}</p>
        <p class="text-muted-sm">Cloudflare Pages veya GitHub Actions ortamında <code>SUPABASE_URL</code> ve <code>SUPABASE_ANON_KEY</code> tanımlı olmalı; ardından <code>npm run build</code> ile yeniden deploy edin.</p>
      </div>
    </div>
  `;
}

if (!isSupabaseConfigured()) {
  renderAdminConfigError(SUPABASE_CONFIG_ERROR);
  throw new Error('Supabase config missing');
}

const sb = getSupabaseClient();
let currentUser = null;

function showLoginError(message) {
  const err = document.getElementById('login-error');
  if (!err) return;
  err.textContent = message;
  err.style.display = 'block';
}

function clearLoginError() {
  const err = document.getElementById('login-error');
  if (!err) return;
  err.textContent = '';
  err.style.display = 'none';
}

async function login() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  clearLoginError();
  if (!isSupabaseConfigured()) {
    showLoginError(SUPABASE_CONFIG_ERROR);
    return;
  }
  if (!email || !password) {
    showLoginError('E-posta ve şifre alanlarını doldurun.');
    return;
  }
  const idleLabel = btn?.textContent || 'Giriş yap';
  if (btn) {
    btn.disabled = true;
    btn.classList.add('is-loading');
    btn.setAttribute('aria-busy', 'true');
    btn.textContent = 'Giriş yapılıyor…';
  }
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (btn) {
    btn.disabled = false;
    btn.classList.remove('is-loading');
    btn.removeAttribute('aria-busy');
    btn.textContent = idleLabel;
  }
  if (error) {
    showLoginError(mapAuthError(error, 'Giriş yapılamadı.'));
    return;
  }
  currentUser = data.user;
  showApp();
}

async function logout() {
  await sb.auth.signOut();
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
}

async function showApp() {
  const { data: profile, error } = await sb
    .from('profiles')
    .select('role, is_banned')
    .eq('id', currentUser.id)
    .single();

  if (error || !profile || profile.role !== 'admin' || profile.is_banned === true) {
    await sb.auth.signOut();
    currentUser = null;
    document.getElementById('app').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    showLoginError('Bu panele erişim yetkiniz yok.');
    return;
  }

  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  const email = currentUser?.email || '';
  document.getElementById('user-email').textContent = email;
  document.getElementById('user-avatar').textContent = email[0]?.toUpperCase() || 'A';
  const topEmail = document.getElementById('admin-topbar-email');
  const topAvatar = document.getElementById('admin-topbar-avatar');
  if (topEmail) topEmail.textContent = email;
  if (topAvatar) topAvatar.textContent = email[0]?.toUpperCase() || 'A';
  initPartnerApplicationsShell();
  loadDashboard();
  loadSettings();
  loadAnnouncements();
  loadCampaigns();
  loadFaqs();
  loadPosts();
  loadListings();
  loadUsers();
  loadAutoLeads();
  loadAutoAnalytics();
  loadPlatformAnalytics();
  loadExecutiveKpis();
  loadOperationalHealth();
  loadPartnerEndpoints();
  loadPartnerApplications();
  loadPartnerDispatchLogs();
}

function closeAdminSidebar() {
  document.body.classList.remove('admin-sidebar-open');
  const btn = document.getElementById('admin-menu-btn');
  const overlay = document.getElementById('admin-sidebar-overlay');
  if (btn) btn.setAttribute('aria-expanded', 'false');
  if (overlay) overlay.setAttribute('aria-hidden', 'true');
}

function initAdminMobileNav() {
  const btn = document.getElementById('admin-menu-btn');
  const overlay = document.getElementById('admin-sidebar-overlay');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const open = !document.body.classList.contains('admin-sidebar-open');
    document.body.classList.toggle('admin-sidebar-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (overlay) overlay.setAttribute('aria-hidden', open ? 'false' : 'true');
  });

  overlay?.addEventListener('click', closeAdminSidebar);

  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      if (window.matchMedia('(max-width: 900px)').matches) {
        closeAdminSidebar();
      }
    });
  });
}

function showPage(name, el) {
  showAdminPage(name, el);
}

async function invalidateDashboardCache() {
  const { invalidateInternalDashboardCache } = await import('./admin/internal-dashboards.js');
  invalidateInternalDashboardCache();
}

async function refreshInternalDashboard(kind, rootId) {
  await invalidateDashboardCache();
  await loadCompanyDashboard(kind, rootId);
}

async function refreshOpsAiAssistant() {
  await invalidateDashboardCache();
  await loadOpsAiAssistantPage();
}

async function loadOpsAiAssistantPage() {
  const { loadOpsAiAssistant } = await import('./admin/ops-ai-assistant.js');
  await loadOpsAiAssistant(
    internalDashboardDeps(),
    escapeHtml,
    renderAdminDataSourceNotices
  );
}

function internalDashboardDepsBase() {
  return {
    sb,
    fetchAdminTable,
    SCALE_LIMITS
  };
}

const internalDashboardDeps = () => ({
  ...internalDashboardDepsBase(),
  async getAnalyticsEvents48h() {
    const { fetchInternalDashboardContext } = await import('./admin/internal-dashboards.js');
    const packed = await fetchInternalDashboardContext(internalDashboardDepsBase());
    return packed.analyticsEvents48h || [];
  }
});

async function loadCompanyDashboard(kind, rootId) {
  const { loadInternalDashboard } = await import('./admin/internal-dashboards.js');
  await loadInternalDashboard(
    internalDashboardDeps(),
    kind,
    rootId,
    escapeHtml,
    renderAdminDataSourceNotices
  );
}

async function loadOperationalHealth() {
  const el = document.getElementById('observability-root');
  if (!el) return;

  el.innerHTML = '<div class="empty">Yükleniyor…</div>';

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const opsModule = await import('./features/ops/ops-health.js');
  const {
    summarizeByCategory,
    countEventsWithPrefix,
    rollupSeverity24h,
    rollupHealth24h
  } = opsModule;

  const [opsEventsRes, dispatchRes, auditRes, leadsRes] = await Promise.all([
    fetchAdminTable(sb, {
      table: 'operational_events',
      select: 'created_at, severity, category, event_name, source, fingerprint, properties, http_status, duration_ms',
      limit: 2000,
      order: { column: 'created_at', ascending: false },
      direct: () =>
        sb
          .from('operational_events')
          .select('created_at, severity, category, event_name, source, fingerprint, properties, http_status, duration_ms')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(2000)
    }),
    fetchAdminTable(sb, {
      table: 'partner_lead_dispatch_logs',
      limit: 300,
      order: { column: 'created_at', ascending: false },
      direct: () =>
        sb
          .from('partner_lead_dispatch_logs')
          .select('created_at, lead_id, partner_route, endpoint_name, http_status, success, error_message')
          .order('created_at', { ascending: false })
          .limit(300)
    }),
    fetchAdminTable(sb, {
      table: 'admin_audit_logs',
      select: 'created_at, actor_email, action, entity_table, summary',
      limit: 80,
      order: { column: 'created_at', ascending: false },
      direct: () =>
        sb
          .from('admin_audit_logs')
          .select('created_at, actor_email, action, entity_table, summary')
          .order('created_at', { ascending: false })
          .limit(80)
    }),
    fetchAdminTable(sb, {
      table: 'auto_leads',
      select: 'id, created_at, email, partner_status, last_dispatch_error',
      limit: 500,
      order: { column: 'created_at', ascending: false },
      direct: () => sb.from('auto_leads').select('id, created_at, email, partner_status, last_dispatch_error').limit(500)
    })
  ]);

  const opsHealthBatch = [opsEventsRes, dispatchRes, auditRes, leadsRes];
  const allOpsEvents = opsEventsRes.data || [];
  const sinceMs = new Date(since).getTime();
  const severityRows = rollupSeverity24h(allOpsEvents);
  const bySeverity = { critical: 0, error: 0, warning: 0, info: 0 };
  for (const row of severityRows) {
    bySeverity[row.severity] = Number(row.events) || 0;
  }

  const recentEvents = allOpsEvents.filter((row) => {
    const ts = row.created_at ? new Date(row.created_at).getTime() : 0;
    return (
      ts >= sinceMs &&
      ['critical', 'error'].includes(String(row.severity || '').toLowerCase())
    );
  });
  const failedDispatchLogs = (dispatchRes.data || []).filter(
    (row) => row.success === false && new Date(row.created_at).getTime() >= sinceMs
  );
  const failedLeads = (leadsRes.data || [])
    .filter(
      (row) =>
        row.partner_status === 'dispatch_failed' &&
        new Date(row.created_at).getTime() >= sinceMs
    )
    .slice(0, 20);
  const byCategory = summarizeByCategory(recentEvents);

  const webhookFails =
    countEventsWithPrefix(recentEvents, 'webhook_') + failedDispatchLogs.length;
  const authFails = countEventsWithPrefix(recentEvents, 'auth_');
  const paymentFails = countEventsWithPrefix(recentEvents, 'payment_') +
    countEventsWithPrefix(recentEvents, 'webhook_stripe');
  const perfWarns = countEventsWithPrefix(recentEvents, 'performance_');
  const abuseHits = countEventsWithPrefix(recentEvents, 'abuse_');

  const healthTable = rollupHealth24h(allOpsEvents).slice(0, 15);

  el.innerHTML = `
    ${renderAdminDataSourceNotices(opsHealthBatch)}
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Critical (24h)</div>
        <div class="stat-value" style="color:var(--danger)">${bySeverity.critical || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Errors (24h)</div>
        <div class="stat-value" style="color:var(--danger)">${bySeverity.error || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Warnings (24h)</div>
        <div class="stat-value">${bySeverity.warning || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Webhook / dispatch fails</div>
        <div class="stat-value">${webhookFails}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Auth failures</div>
        <div class="stat-value">${authFails}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Payment failures</div>
        <div class="stat-value">${paymentFails}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Performance regressions</div>
        <div class="stat-value">${perfWarns}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Abuse signals</div>
        <div class="stat-value">${abuseHits}</div>
      </div>
    </div>

    <p class="text-muted-sm mb-12">Sentry (client) + <code>operational_events</code> + partner dispatch logs + admin audit. Export: <code>npm run metrics:ops</code></p>

    ${opsEventsRes.error && !allOpsEvents.length ? `<p class="empty">Ops events yüklenemedi: ${escapeHtml(opsEventsRes.error.message)} — <code>supabase/migrations/20260530_operational_observability.sql</code> deploy edin.</p>` : ''}

    <h3 style="margin:16px 0 10px">Top signals (24h rollup)</h3>
    ${healthTable.length ? `
      <table class="table">
        <thead><tr><th>Category</th><th>Event</th><th>Severity</th><th>Count</th><th>Errors</th><th>Last</th></tr></thead>
        <tbody>
          ${healthTable.map((row) => `
            <tr>
              <td>${escapeHtml(row.category)}</td>
              <td><code>${escapeHtml(row.event_name)}</code></td>
              <td>${escapeHtml(row.severity)}</td>
              <td>${row.events}</td>
              <td>${row.errors}</td>
              <td>${row.last_seen ? formatShortDate(row.last_seen) : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<p class="empty">Henüz operational event yok.</p>'}

    <h3 style="margin:20px 0 10px">Recent critical / error events</h3>
    ${recentEvents.length ? `
      <table class="table">
        <thead><tr><th>Zaman</th><th>Severity</th><th>Event</th><th>Source</th><th>Detail</th></tr></thead>
        <tbody>
          ${recentEvents.slice(0, 40).map((row) => `
            <tr>
              <td>${formatShortDate(row.created_at)}</td>
              <td><span class="badge ${row.severity === 'critical' ? 'badge-red' : 'badge-yellow'}">${escapeHtml(row.severity)}</span></td>
              <td><code>${escapeHtml(row.event_name)}</code></td>
              <td>${escapeHtml(row.source)}</td>
              <td title="${safeAttr(JSON.stringify(row.properties || {}))}">${escapeHtml(formatDispatchError(row.properties?.error_message || row.properties?.message || row.fingerprint || '—'))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<p class="empty">Son 24 saatte critical/error yok.</p>'}

    <h3 style="margin:20px 0 10px">Lead delivery failures</h3>
    ${failedLeads.length ? `
      <table class="table">
        <thead><tr><th>Lead</th><th>Zaman</th><th>Status</th><th>Hata</th></tr></thead>
        <tbody>
          ${failedLeads.map((row) => `
            <tr>
              <td><code>${escapeHtml(String(row.id).slice(0, 8))}…</code></td>
              <td>${formatShortDate(row.created_at)}</td>
              <td>${escapeHtml(row.partner_status)}</td>
              <td>${escapeHtml(formatDispatchError(row.last_dispatch_error))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<p class="empty">dispatch_failed lead yok.</p>'}

    <h3 style="margin:20px 0 10px">Partner webhook failures (log)</h3>
    ${failedDispatchLogs.length ? `
      <table class="table">
        <thead><tr><th>Zaman</th><th>Route</th><th>Endpoint</th><th>HTTP</th><th>Hata</th></tr></thead>
        <tbody>
          ${failedDispatchLogs.map((row) => `
            <tr>
              <td>${formatShortDate(row.created_at)}</td>
              <td>${escapeHtml(row.partner_route)}</td>
              <td>${escapeHtml(row.endpoint_name || '—')}</td>
              <td>${row.http_status ?? '—'}</td>
              <td>${escapeHtml(formatDispatchError(row.error_message))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<p class="empty">Webhook fail log yok.</p>'}

    <h3 style="margin:20px 0 10px">Admin audit (son 40)</h3>
    ${(auditRes.data || []).length ? `
      <table class="table">
        <thead><tr><th>Zaman</th><th>Actor</th><th>Action</th><th>Entity</th><th>Summary</th></tr></thead>
        <tbody>
          ${auditRes.data.map((row) => `
            <tr>
              <td>${formatShortDate(row.created_at)}</td>
              <td>${escapeHtml(row.actor_email || '—')}</td>
              <td>${escapeHtml(row.action)}</td>
              <td>${escapeHtml(row.entity_table)}</td>
              <td>${escapeHtml(row.summary || '—')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<p class="empty">Audit kaydı yok.</p>'}
  `;
}

async function loadOpsCommandCenter() {
  const el = document.getElementById('ops-command-center-root');
  if (!el) return;

  el.innerHTML = '<div class="empty">Yükleniyor…</div>';

  const { buildOpsCommandCenter } = await import('./features/ops/ops-command-center.js');
  const { buildPartnerOpsSnapshot } = await import('./features/partner/partner-ops-monitor.js');
  const { buildCeoAlertSnapshot } = await import('./features/ops/ceo-alert-engine.js');
  const windowDays = SCALE_LIMITS.admin.executiveWindowDays || 30;
  const since = new Date(Date.now() - windowDays * 86400000).toISOString();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 86400000).toISOString();

  let alertRules = [];
  let ceoAlertRules = [];
  let partnerOpsConfig = { sla: { dispatchLatencyP95Ms: 900000 } };
  let ceoAlertConfig = { thresholds: {} };
  try {
    const rulesJson = await fetchOpsJson('/data/ops/alert-rules.json', 'alert-rules', { rules: [] });
    alertRules = rulesJson.rules || [];
    const ceoJson = await fetchOpsJson('/data/ops/ceo-alert-rules.json', 'ceo-alert-rules', {
      rules: []
    });
    ceoAlertRules = ceoJson.rules || [];
    ceoAlertConfig = await fetchOpsJson('/data/ops/ceo-alerts.json', 'ceo-alerts', { thresholds: {} });
    const partnerCfgRes = await fetch('/data/partner/partner-ops.json');
    if (partnerCfgRes.ok) partnerOpsConfig = await partnerCfgRes.json();
  } catch {
    /* optional */
  }

  const analyticsSelect =
    'event_name, session_id, attribution, properties, revenue_cents, funnel, created_at';
  const subSelect = 'status, current_period_start, current_period_end, cancel_at_period_end';
  const leadSelect =
    'lead_score, partner_status, estimated_revenue, actual_revenue, created_at';

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
    ceoLeadsRes
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
      order: { column: 'created_at', ascending: false },
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
      order: { column: 'created_at', ascending: false },
      direct: () =>
        sb
          .from('partner_lead_dispatch_logs')
          .select('success, created_at, duration_ms')
          .gte('created_at', since24h)
          .limit(500)
    }),
    fetchAdminTable(sb, {
      table: 'lifecycle_enrollments',
      select: 'flow_id, status, enrolled_at',
      limit: 3000,
      order: { column: 'enrolled_at', ascending: false },
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
    })
  ]);

  const opsCommandBatch = [
    subsRes,
    leadsRes,
    eventsRes,
    opsRes,
    dispatchRes,
    enrollRes,
    msgRes,
    endpointsRes,
    retryLeadsRes,
    ceoLeadsRes
  ];

  const sinceMs = new Date(since).getTime();
  const events = (eventsRes.data || []).filter((row) => {
    const ts = row.created_at ? new Date(row.created_at).getTime() : 0;
    return ts >= sinceMs;
  });

  const failedDispatch = (dispatchRes.data || []).filter((r) => r.success === false).length;
  const failedMessages = (msgRes.data || []).filter((r) => r.status === 'failed').length;

  const partnerOpsSnapshot = buildPartnerOpsSnapshot({
    config: partnerOpsConfig,
    dispatchLogs24h: dispatchRes.data || [],
    endpoints: endpointsRes.data || [],
    leads: retryLeadsRes.data || [],
    alertRules: alertRules.filter((r) => r.domain === 'partner')
  });

  const center = buildOpsCommandCenter({
    analyticsEvents: events,
    subscriptions: subsRes.data || [],
    autoLeads: leadsRes.data || [],
    operationalEvents: opsRes.data || [],
    partnerWebhookFails: failedDispatch,
    partnerOps: partnerOpsSnapshot,
    lifecycle: {
      enrollments7d: enrollRes.data?.length || 0,
      failedMessages
    },
    alertRules,
    windowDays,
    analyticsRowCap: SCALE_LIMITS.admin.executiveRowLimit || 2500
  });

  const p12 = center.partnerOps || partnerOpsSnapshot;

  const ceoSnap = buildCeoAlertSnapshot({
    config: ceoAlertConfig,
    analyticsEvents: events,
    autoLeads: ceoLeadsRes.data || [],
    operationalEvents: opsRes.data || [],
    subscriptions: subsRes.data || [],
    dispatchLogs24h: dispatchRes.data || [],
    alertRules: ceoAlertRules
  });

  const healthColor =
    center.overallHealth === 'healthy' || center.overallHealth === 'ok'
      ? 'var(--success)'
      : center.overallHealth === 'critical'
        ? 'var(--danger)'
        : 'var(--warning)';

  el.innerHTML = `
    ${renderAdminDataSourceNotices(opsCommandBatch)}
    <p class="text-muted-sm" style="margin:0 0 16px">
      P9 Ops + P12 Partner + P13 CEO alerts · <code>npm run metrics:ops:center</code> · <code>npm run ceo:alerts:run</code>
    </p>

    <div class="stat-card" style="margin-bottom:16px;padding:14px 16px;border-left:4px solid ${healthColor}">
      <strong>Overall: ${escapeHtml(center.overallHealth)}</strong>
      <span class="text-muted-sm"> · ${center.alerts.triggeredCount} alert rule(s) triggered</span>
      <ul style="margin:10px 0 0;padding-left:18px;font-size:13px;line-height:1.55">
        ${(center.executiveSummary || []).slice(0, 5).map((line) => `<li>${escapeHtml(line)}</li>`).join('')}
      </ul>
    </div>

    <h3 style="margin:0 0 12px">Automation domains</h3>
    <div class="stat-grid">
      ${center.domains
        .map(
          (d) => `
        <div class="stat-card">
          <div class="stat-label">${escapeHtml(d.label)}</div>
          <div class="stat-value" style="font-size:14px">${escapeHtml(d.status)}</div>
          <ul class="text-muted-sm" style="margin:8px 0 0;padding-left:16px;font-size:12px">
            ${d.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join('')}
          </ul>
        </div>`
        )
        .join('')}
    </div>

    <div style="height:18px"></div>
    <h3 style="margin:0 0 12px">P13 CEO alerts (early intervention)</h3>
    <div class="stat-card" style="margin-bottom:12px;padding:12px 14px;border-left:4px solid ${ceoSnap.overallHealth === 'critical' ? 'var(--danger)' : ceoSnap.overallHealth === 'healthy' ? 'var(--success)' : 'var(--warning)'}">
      <strong>CEO health: ${escapeHtml(ceoSnap.overallHealth)}</strong>
      <span class="text-muted-sm"> · ${ceoSnap.alerts.triggeredCount} rule(s) · hourly <code>ceo-alerts.yml</code></span>
    </div>
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Funnel CR</div>
        <div class="stat-value">${ceoSnap.metrics.conversion.funnelCrPct24h ?? '—'}%</div>
        <div class="text-muted-sm">Δ prior ${ceoSnap.metrics.conversion.funnelDropPct ?? 0}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Checkout</div>
        <div class="stat-value">${ceoSnap.metrics.checkout.failureCount24h ?? 0} issues</div>
        <div class="text-muted-sm">Stripe WH fails ${ceoSnap.metrics.stripe.webhookFailCount24h ?? 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Leads 24h</div>
        <div class="stat-value">${ceoSnap.metrics.leads.leads24h ?? 0}</div>
        <div class="text-muted-sm">prior ${ceoSnap.metrics.leads.leadsPrior24h ?? 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Analytics vol</div>
        <div class="stat-value">${ceoSnap.metrics.analytics.events24h ?? 0}</div>
        <div class="text-muted-sm">drop ${ceoSnap.metrics.analytics.volumeDropPct ?? 0}%</div>
      </div>
    </div>
    ${
      ceoSnap.alerts.triggered.length
        ? `<ul style="margin:12px 0 0;padding-left:18px;font-size:13px">${ceoSnap.alerts.triggered
            .map((a) => `<li><strong>${escapeHtml(a.severity)}</strong> — ${escapeHtml(a.message)}</li>`)
            .join('')}</ul>`
        : '<p class="text-muted-sm" style="margin:12px 0 0">No CEO threshold alerts in current window.</p>'
    }

    <div style="height:18px"></div>
    <h3 style="margin:0 0 12px">P12 Partner delivery ops (24h)</h3>
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Dispatch success</div>
        <div class="stat-value">${escapeHtml(String(p12.dispatchMonitoring?.successRatePct24h ?? '—'))}%</div>
        <div class="text-muted-sm">${p12.dispatchMonitoring?.attempts24h ?? 0} attempts · p95 ${Math.round((p12.dispatchMonitoring?.p95DurationMs ?? 0) / 1000)}s</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">SLA (&lt;15m p95)</div>
        <div class="stat-value">${p12.sla?.breached ? '⚠️ Breach' : '✓ OK'}</div>
        <div class="text-muted-sm">target ${Math.round((p12.sla?.targetP95Ms ?? 900000) / 60000)}m</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Retry queue</div>
        <div class="stat-value">${p12.retryAutomation?.retryDueNow ?? 0} due</div>
        <div class="text-muted-sm">failed ${p12.retryAutomation?.dispatch_failed ?? 0} · dead ${p12.retryAutomation?.dispatch_dead ?? 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Webhook health</div>
        <div class="stat-value">${p12.webhookHealth?.unhealthyCount ?? 0} unhealthy</div>
        <div class="text-muted-sm">circuit ${p12.webhookHealth?.circuitOpenCount ?? 0} · inactive ${p12.webhookHealth?.inactiveEndpointCount ?? 0}</div>
      </div>
    </div>

    <div style="height:18px"></div>
    <h3 style="margin:0 0 12px">Triggered alerts</h3>
    ${
      center.alerts.triggered.length
        ? `<table class="table">
        <thead><tr><th>Severity</th><th>Domain</th><th>Message</th><th>Metric</th><th>Value</th></tr></thead>
        <tbody>
          ${center.alerts.triggered
            .map(
              (a) => `
            <tr>
              <td><span class="badge ${a.severity === 'critical' ? 'badge-red' : 'badge-yellow'}">${escapeHtml(a.severity)}</span></td>
              <td>${escapeHtml(a.domain)}</td>
              <td>${escapeHtml(a.message)}</td>
              <td><code>${escapeHtml(a.metric)}</code></td>
              <td>${escapeHtml(String(a.value))}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>`
        : '<p class="empty">No threshold alerts in current window.</p>'
    }

    <div style="height:18px"></div>
    <h3 style="margin:0 0 12px">Runbooks</h3>
    <ul style="font-size:13px;line-height:1.6">
      ${center.runbooks
        .map((r) => `<li><code>${escapeHtml(r.path)}</code> — ${escapeHtml(r.label)}</li>`)
        .join('')}
    </ul>
  `;
}

async function loadStartupOperatingCenter() {
  const el = document.getElementById('startup-operating-center-root');
  if (!el) return;

  el.innerHTML = '<div class="empty">Yükleniyor…</div>';

  const { buildStartupOperatingSnapshot } = await import(
    './features/ops/startup-operating-center.js'
  );
  const { renderStartupOperatingCenter } = await import(
    './features/ops/startup-operating-views.js'
  );
  const { buildOpsCommandCenter } = await import('./features/ops/ops-command-center.js');

  let config = { version: 'p18.0', scalePillars: [], bottlenecks: [], quickWins: [] };
  let alertRules = [];
  try {
    config = await fetchOpsJson(
      '/data/ops/startup-operating-mode.json',
      'startup-operating-mode',
      config
    );
    const rulesJson = await fetchOpsJson('/data/ops/alert-rules.json', 'alert-rules', { rules: [] });
    alertRules = rulesJson.rules || [];
  } catch {
    /* optional */
  }

  const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const analyticsSelect =
    'event_name, session_id, attribution, properties, revenue_cents, funnel, created_at';

  let opsCenter = null;
  try {
    const [eventsRes, subsRes, opsRes] = await Promise.all([
      fetchAdminTable(sb, {
        table: 'analytics_events',
        select: analyticsSelect,
        limit: SCALE_LIMITS.admin.executiveRowLimit || 2500,
        order: { column: 'created_at', ascending: false },
        direct: () =>
          sb
            .from('analytics_events')
            .select(analyticsSelect)
            .gte('created_at', since48h)
            .order('created_at', { ascending: false })
            .limit(SCALE_LIMITS.admin.executiveRowLimit || 2500)
      }),
      fetchAdminTable(sb, {
        table: 'subscriptions',
        select: 'status, cancel_at_period_end',
        limit: 2000,
        direct: (expr) => sb.from('subscriptions').select(expr || 'status, cancel_at_period_end').limit(2000)
      }),
      fetchAdminTable(sb, {
        table: 'operational_events',
        select: 'severity, category, event_name, created_at, source',
        limit: 1500,
        direct: () =>
          sb
            .from('operational_events')
            .select('severity, category, event_name, created_at, source')
            .gte('created_at', since24h)
            .order('created_at', { ascending: false })
            .limit(1500)
      })
    ]);

    const startupBatch = [eventsRes, subsRes, opsRes];
    opsCenter = buildOpsCommandCenter({
      analyticsEvents: eventsRes.data || [],
      subscriptions: subsRes.data || [],
      autoLeads: [],
      operationalEvents: opsRes.data || [],
      alertRules,
      windowDays: SCALE_LIMITS.admin.executiveWindowDays || 30,
      analyticsRowCap: SCALE_LIMITS.admin.executiveRowLimit || 2500
    });

    const snapshot = buildStartupOperatingSnapshot({ config, opsCenter });
    el.innerHTML =
      renderAdminDataSourceNotices(startupBatch) + renderStartupOperatingCenter(snapshot, escapeHtml);
    return;
  } catch {
    /* static config only */
  }

  const snapshot = buildStartupOperatingSnapshot({ config, opsCenter });
  el.innerHTML = renderStartupOperatingCenter(snapshot, escapeHtml);
}

async function loadScaleArchitectureCenter() {
  const el = document.getElementById('scale-architecture-root');
  if (!el) return;

  el.innerHTML = '<div class="empty">Yükleniyor…</div>';

  const { buildScaleArchitectureReport } = await import(
    './features/ops/scale-architecture-matrix.js'
  );
  const { renderScaleArchitectureCenter } = await import(
    './features/ops/scale-architecture-views.js'
  );
  const { buildOpsCommandCenter } = await import('./features/ops/ops-command-center.js');

  let config = { version: 'p19.0', dimensions: [] };
  let alertRules = [];
  try {
    config = await fetchOpsJson(
      '/data/ops/scale-architecture-scenarios.json',
      'scale-architecture-scenarios',
      config
    );
    const rulesJson = await fetchOpsJson('/data/ops/alert-rules.json', 'alert-rules', { rules: [] });
    alertRules = rulesJson.rules || [];
  } catch {
    /* optional */
  }

  let liveSignals = null;
  try {
    const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const analyticsSelect =
      'event_name, session_id, attribution, properties, revenue_cents, funnel, created_at';
    const [eventsRes, opsRes] = await Promise.all([
      fetchAdminTable(sb, {
        table: 'analytics_events',
        select: analyticsSelect,
        limit: SCALE_LIMITS.admin.executiveRowLimit || 2500,
        order: { column: 'created_at', ascending: false },
        direct: () =>
          sb
            .from('analytics_events')
            .select(analyticsSelect)
            .gte('created_at', since48h)
            .order('created_at', { ascending: false })
            .limit(SCALE_LIMITS.admin.executiveRowLimit || 2500)
      }),
      fetchAdminTable(sb, {
        table: 'operational_events',
        select: 'severity, category, event_name, created_at, source',
        limit: 1000,
        direct: () =>
          sb
            .from('operational_events')
            .select('severity, category, event_name, created_at, source')
            .gte('created_at', since48h)
            .order('created_at', { ascending: false })
            .limit(1000)
      })
    ]);

    const scaleBatch = [eventsRes, opsRes];
    const opsCenter = buildOpsCommandCenter({
      analyticsEvents: eventsRes.data || [],
      subscriptions: [],
      autoLeads: [],
      operationalEvents: opsRes.data || [],
      alertRules,
      windowDays: SCALE_LIMITS.admin.executiveWindowDays || 30,
      analyticsRowCap: SCALE_LIMITS.admin.executiveRowLimit || 2500
    });
    liveSignals = {
      analyticsAtCap: Boolean(opsCenter.metrics?.analytics?.eventsAtCap),
      triggeredAlerts: opsCenter.alerts?.triggeredCount ?? 0,
      opsHealth: opsCenter.overallHealth
    };

    const report = buildScaleArchitectureReport({ config, liveSignals });
    el.innerHTML =
      renderAdminDataSourceNotices(scaleBatch) + renderScaleArchitectureCenter(report, escapeHtml);
    return;
  } catch {
    /* static matrix */
  }

  const report = buildScaleArchitectureReport({ config, liveSignals });
  el.innerHTML = renderScaleArchitectureCenter(report, escapeHtml);
}

async function loadCompanyOperatingSystem() {
  const el = document.getElementById('company-operating-system-root');
  if (!el) return;

  el.innerHTML = '<div class="empty">Yükleniyor…</div>';

  const { buildCompanyOperatingSnapshot } = await import(
    './features/ops/company-operating-system.js'
  );
  const { renderCompanyOperatingSystem } = await import(
    './features/ops/company-operating-views.js'
  );

  let config = { version: 'p20.0' };
  let decisionLog = { records: [], roadmapQueue: [] };
  try {
    [config, decisionLog] = await Promise.all([
      fetchOpsJson('/data/ops/company-operating-system.json', 'company-operating-system', config),
      fetchOpsJson('/data/ops/decision-log.json', 'decision-log', decisionLog)
    ]);
  } catch {
    /* optional */
  }

  const snapshot = buildCompanyOperatingSnapshot({
    config,
    decisionLog,
    artifactStatus: { opsAutomation: true }
  });
  el.innerHTML = renderCompanyOperatingSystem(snapshot, escapeHtml);
}

async function loadHiringArchitecture() {
  const el = document.getElementById('hiring-architecture-root');
  if (!el) return;

  el.innerHTML = '<div class="empty">Yükleniyor…</div>';

  const { buildHiringArchitectureSnapshot } = await import(
    './features/ops/hiring-architecture.js'
  );
  const { renderHiringArchitectureCenter } = await import(
    './features/ops/hiring-architecture-views.js'
  );

  let config = { version: 'p21.0', roles: [] };
  try {
    config = await fetchOpsJson('/data/ops/hiring-architecture.json', 'hiring-architecture', config);
  } catch {
    /* optional */
  }

  let liveSignals = {};
  try {
    const { buildOpsCommandCenter } = await import('./features/ops/ops-command-center.js');
    const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const [eventsRes, dispatchRes] = await Promise.all([
      fetchAdminTable(sb, {
        table: 'analytics_events',
        select: 'event_name, created_at',
        limit: SCALE_LIMITS.admin.executiveRowLimit || 2500,
        direct: () =>
          sb
            .from('analytics_events')
            .select('event_name, created_at')
            .gte('created_at', since48h)
            .limit(SCALE_LIMITS.admin.executiveRowLimit || 2500)
      }),
      fetchAdminTable(sb, {
        table: 'partner_lead_dispatch_logs',
        limit: 300,
        direct: () =>
          sb
            .from('partner_lead_dispatch_logs')
            .select('success, created_at')
            .gte('created_at', since48h)
            .limit(300)
      })
    ]);
    const failed = (dispatchRes.data || []).filter((r) => r.success === false).length;
    const total = (dispatchRes.data || []).length;
    const center = buildOpsCommandCenter({
      analyticsEvents: eventsRes.data || [],
      subscriptions: [],
      autoLeads: [],
      operationalEvents: [],
      partnerWebhookFails: failed,
      windowDays: 30,
      analyticsRowCap: SCALE_LIMITS.admin.executiveRowLimit || 2500
    });
    liveSignals = {
      opsHealth: center.overallHealth,
      analyticsAtCap: Boolean(center.metrics?.analytics?.eventsAtCap),
      dispatchRatePct: total ? Math.round(((total - failed) / total) * 100) : 100,
      partnerLeads30d: 0
    };
  } catch {
    /* static */
  }

  const snapshot = buildHiringArchitectureSnapshot({ config, liveSignals });
  el.innerHTML = renderHiringArchitectureCenter(snapshot, escapeHtml);
}

async function loadInternationalExpansion() {
  const el = document.getElementById('international-expansion-root');
  if (!el) return;

  el.innerHTML = '<div class="empty">Yükleniyor…</div>';

  try {
    const { buildInternationalExpansionSnapshot } = await import(
      './features/ops/international-expansion-audit.js'
    );
    const { renderInternationalExpansionCenter } = await import(
      './features/ops/international-expansion-views.js'
    );

    const config = await fetchOpsJson(
      '/data/ops/international-expansion-audit.json',
      'international-expansion-audit',
      { version: 'p22.0', dimensions: [], priorityMarkets: [] }
    );
    const snapshot = buildInternationalExpansionSnapshot({ config });
    el.innerHTML = renderInternationalExpansionCenter(snapshot, escapeHtml);
  } catch (err) {
    console.error('[admin] international-expansion', err);
    el.innerHTML = `<div class="empty" style="color:#f87171">Veri yüklenemedi: ${escapeHtml(err.message || String(err))}</div>`;
  }
}

async function loadCategoryDominance() {
  const el = document.getElementById('category-dominance-root');
  if (!el) return;

  el.innerHTML = '<div class="empty">Yükleniyor…</div>';

  try {
    const { buildCategoryDominanceSnapshot } = await import(
      './features/ops/category-dominance-strategy.js'
    );
    const { renderCategoryDominanceCenter } = await import(
      './features/ops/category-dominance-views.js'
    );

    const config = await fetchOpsJson(
      '/data/ops/category-dominance-strategy.json',
      'category-dominance-strategy',
      { version: 'p23.0', competitorLandscape: [], moatPlans: [] }
    );
    const snapshot = buildCategoryDominanceSnapshot({ config });
    el.innerHTML = renderCategoryDominanceCenter(snapshot, escapeHtml);
  } catch (err) {
    console.error('[admin] category-dominance', err);
    el.innerHTML = `<div class="empty" style="color:#f87171">Veri yüklenemedi: ${escapeHtml(err.message || String(err))}</div>`;
  }
}

async function loadCompetitorAttack() {
  const el = document.getElementById('competitor-attack-root');
  if (!el) return;

  el.innerHTML = '<div class="empty">Yükleniyor…</div>';

  try {
    const { buildCompetitorAttackSnapshot } = await import(
      './features/ops/competitor-attack-scenario.js'
    );
    const { renderCompetitorAttackCenter } = await import(
      './features/ops/competitor-attack-views.js'
    );

    const config = await fetchOpsJson(
      '/data/ops/competitor-attack-scenario.json',
      'competitor-attack-scenario',
      { version: 'p24.0', attackScenarios: [], defensePlans: [] }
    );
    const snapshot = buildCompetitorAttackSnapshot({ config });
    el.innerHTML = renderCompetitorAttackCenter(snapshot, escapeHtml);
  } catch (err) {
    console.error('[admin] competitor-attack', err);
    el.innerHTML = `<div class="empty" style="color:#f87171">Veri yüklenemedi: ${escapeHtml(err.message || String(err))}</div>`;
  }
}

async function loadExpansionPrioritization() {
  const el = document.getElementById('expansion-prioritization-root');
  if (!el) return;

  el.innerHTML = '<div class="empty">Yükleniyor…</div>';

  try {
    const { buildExpansionPrioritizationSnapshot } = await import(
      './features/ops/expansion-roadmap-prioritization.js'
    );
    const { renderExpansionPrioritizationCenter } = await import(
      './features/ops/expansion-roadmap-prioritization-views.js'
    );

    const config = await fetchOpsJson(
      '/data/ops/expansion-roadmap-prioritization.json',
      'expansion-roadmap-prioritization',
      { version: 'p25.0', categories: [], prioritizationCriteria: [] }
    );
    const snapshot = buildExpansionPrioritizationSnapshot({ config });
    el.innerHTML = renderExpansionPrioritizationCenter(snapshot, escapeHtml);
  } catch (err) {
    console.error('[admin] expansion-prioritization', err);
    el.innerHTML = `<div class="empty" style="color:#f87171">Veri yüklenemedi: ${escapeHtml(err.message || String(err))}</div>`;
  }
}

async function loadStrategicPartnerships() {
  const el = document.getElementById('strategic-partnerships-root');
  if (!el) return;

  el.innerHTML = '<div class="empty">Yükleniyor…</div>';

  try {
    const { buildStrategicPartnershipSnapshot } = await import(
      './features/ops/strategic-partnership-roadmap.js'
    );
    const { renderStrategicPartnershipCenter } = await import(
      './features/ops/strategic-partnership-views.js'
    );

    const config = await fetchOpsJson(
      '/data/ops/strategic-partnership-roadmap.json',
      'strategic-partnership-roadmap',
      { version: 'p26.0', partnerTypes: [], scoringDimensions: [] }
    );
    const snapshot = buildStrategicPartnershipSnapshot({ config });
    el.innerHTML = renderStrategicPartnershipCenter(snapshot, escapeHtml);
  } catch (err) {
    console.error('[admin] strategic-partnerships', err);
    el.innerHTML = `<div class="empty" style="color:#f87171">Veri yüklenemedi: ${escapeHtml(err.message || String(err))}</div>`;
  }
}

async function loadAcquisitionExit() {
  const el = document.getElementById('acquisition-exit-root');
  if (!el) return;

  el.innerHTML = '<div class="empty">Yükleniyor…</div>';

  try {
    const { buildAcquisitionExitSnapshot } = await import(
      './features/ops/acquisition-exit-optionality.js'
    );
    const { renderAcquisitionExitCenter } = await import('./features/ops/acquisition-exit-views.js');
    const { computeExitOptionalityMetrics } = await import('../metrics/exit-optionality.js');

    const config = await fetchOpsJson(
      '/data/ops/acquisition-exit-optionality.json',
      'acquisition-exit-optionality',
      { version: 'p11-exit.0', scenarios: [], strategicBuyers: [] }
    );
    const snapshot = buildAcquisitionExitSnapshot({ config });

    const windowDays = SCALE_LIMITS.admin.executiveWindowDays || 30;
    const since = new Date(Date.now() - windowDays * 86400000).toISOString();
    const leadSelect =
      'id, lead_score, partner_status, partner_endpoint_id, estimated_revenue, actual_revenue, decision_session_id, created_at, phone, user_id';
    const subSelect = 'status, current_period_start, current_period_end, cancel_at_period_end';
    const eventSelect = 'event_name, session_id, created_at';

    const [subsRes, leadsRes, eventsRes] = await Promise.all([
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
        direct: (expr) => sb.from('auto_leads').select(expr || leadSelect).limit(5000)
      }),
      fetchAdminTable(sb, {
        table: 'analytics_events',
        select: eventSelect,
        limit: SCALE_LIMITS.admin.executiveRowLimit || 2500,
        order: { column: 'created_at', ascending: false },
        direct: (expr) =>
          sb
            .from('analytics_events')
            .select(expr || eventSelect)
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(SCALE_LIMITS.admin.executiveRowLimit || 2500)
      })
    ]);

    const exitBatch = [subsRes, leadsRes, eventsRes];
    const founderMetrics = computeExitOptionalityMetrics({
      leads: leadsRes.data || [],
      subscriptions: subsRes.data || [],
      analyticsEvents: eventsRes.data || [],
      moatFlywheel: null,
      dataSource: 'admin_live',
      errors: [subsRes, leadsRes, eventsRes]
        .filter((r) => r.error)
        .map((r) => r.error?.message)
        .filter(Boolean)
    });

    el.innerHTML =
      renderAdminDataSourceNotices(exitBatch) +
      renderAcquisitionExitCenter(snapshot, escapeHtml, founderMetrics);
  } catch (err) {
    console.error('[admin] acquisition-exit', err);
    el.innerHTML = `<div class="empty" style="color:#f87171">Veri yüklenemedi: ${escapeHtml(err.message || String(err))}</div>`;
  }
}

async function loadExecutiveKpis() {
  const el = document.getElementById('investor-metrics-root');
  if (!el) return;

  el.innerHTML = '<div class="empty">Yükleniyor…</div>';

  const { buildExecutiveDashboard } = await import('./features/metrics/executive-dashboard.js');
  const windowDays = SCALE_LIMITS.admin.executiveWindowDays || 30;
  const since = new Date(Date.now() - windowDays * 86400000).toISOString();
  const analyticsSelect =
    'event_name, session_id, attribution, properties, revenue_cents, funnel, created_at';
  const subSelect = 'status, current_period_start, current_period_end, cancel_at_period_end';
  const leadSelect =
    'lead_score, partner_status, estimated_revenue, actual_revenue, created_at';

  const [subsRes, leadsRes, eventsRes] = await Promise.all([
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
        sb
          .from('auto_leads')
          .select(expr || leadSelect)
          .gte('created_at', since)
          .limit(5000)
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
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(SCALE_LIMITS.admin.executiveRowLimit || 2500)
    })
  ]);

  const executiveKpiBatch = [subsRes, leadsRes, eventsRes];
  const sinceMs = new Date(since).getTime();
  const events = (eventsRes.data || []).filter((row) => {
    const ts = row.created_at ? new Date(row.created_at).getTime() : 0;
    return ts >= sinceMs;
  });

  const allFailed =
    !events.length &&
    !(leadsRes.data || []).length &&
    !(subsRes.data || []).length &&
    [subsRes, leadsRes, eventsRes].every((r) => r.source === 'failed');

  if (allFailed) {
    const msg =
      eventsRes.error?.message ||
      leadsRes.error?.message ||
      subsRes.error?.message ||
      'Veri yüklenemedi';
    el.innerHTML = `${renderAdminDataSourceNotices(executiveKpiBatch)}<p class="empty">Hata: ${escapeHtml(msg)}</p>`;
    return;
  }

  const dash = buildExecutiveDashboard({
    analyticsEvents: events,
    subscriptions: subsRes.data || [],
    autoLeads: leadsRes.data || [],
    windowDays
  });

  const supportTickets = events.filter((e) =>
    ['support_ticket_submitted', 'support_escalation', 'support_intent_routed'].includes(
      e.event_name
    )
  ).length;

  const { buildInvestorSnapshot } = await import('./features/metrics/investor-kpis.js');
  const { buildUnitEconomicsModel, mergeAssumptions } = await import(
    './features/investor/unit-economics-model.js'
  );
  const { renderUnitEconomicsPanel } = await import('./features/investor/unit-economics-views.js');

  let assumptionsRaw = null;
  let paidSpend = null;
  try {
    const [aRes, pRes] = await Promise.all([
      fetch('/data/investor/unit-economics-model.json'),
      fetch('/data/growth/paid-spend.json')
    ]);
    if (aRes.ok) assumptionsRaw = await aRes.json();
    if (pRes.ok) paidSpend = await pRes.json();
  } catch {
    /* planning defaults */
  }

  const investor = buildInvestorSnapshot({
    subscriptions: subsRes.data || [],
    leads: leadsRes.data || [],
    analyticsEvents: events
  });

  const unitModel = buildUnitEconomicsModel({
    windowDays,
    assumptions: assumptionsRaw ? mergeAssumptions(assumptionsRaw) : undefined,
    executive: dash,
    investor,
    paidSpend,
    supportTicketsInWindow: supportTickets
  });

  const unitEconomicsHtml = renderUnitEconomicsPanel(unitModel, escapeHtml);

  const fmtPct = (v) => (v == null ? '—' : `${v}%`);
  const c = dash.conversions.counts;

  el.innerHTML = `
    ${renderAdminDataSourceNotices(executiveKpiBatch)}
    <p class="text-muted-sm" style="margin:0 0 16px">CEO decision dashboard · Son ${windowDays} gün · ${dash.sampleSize.analyticsEvents} analytics event · Export: <code>npm run metrics:executive</code></p>

    <div class="stat-card" style="margin-bottom:16px;padding:14px 16px;background:rgba(37,99,235,0.08);border-radius:10px">
      <strong>Executive summary</strong>
      <ul style="margin:10px 0 0;padding-left:18px;font-size:13px;line-height:1.55">
        ${dash.ceoSummary.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}
      </ul>
    </div>

    <h3 style="margin:0 0 12px">Traffic &amp; revenue</h3>
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">Page views</div><div class="stat-value">${dash.traffic.pageViews}</div><div class="stat-sub">${dash.traffic.uniqueSessions ?? '—'} sessions</div></div>
      <div class="stat-card"><div class="stat-label">Auto starts</div><div class="stat-value">${dash.traffic.autoStarts}</div></div>
      <div class="stat-card"><div class="stat-label">MRR</div><div class="stat-value">${dash.revenue.mrrTry.toLocaleString('tr-TR')} ₺</div></div>
      <div class="stat-card"><div class="stat-label">ARPU</div><div class="stat-value">${dash.revenue.arpuTry.toLocaleString('tr-TR')} ₺</div><div class="stat-sub">${dash.churn.activeSubscriptions} active · ${dash.churn.trialingSubscriptions} trial</div></div>
      <div class="stat-card"><div class="stat-label">Attributed revenue</div><div class="stat-value">${dash.revenue.attributedRevenueTry.toLocaleString('tr-TR')} ₺</div></div>
      <div class="stat-card"><div class="stat-label">Churn signal</div><div class="stat-value">${dash.churn.cancelAtPeriodEnd}</div><div class="stat-sub">${dash.churn.grossChurnSignalPct}% cancel at period end</div></div>
    </div>

    <div style="height:18px"></div>
    <h3 style="margin:0 0 12px">Conversion rates</h3>
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">Funnel (landing→lead)</div><div class="stat-value">${fmtPct(dash.conversions.funnelConversionPct)}</div><div class="stat-sub">${c.leads} / ${c.landing}</div></div>
      <div class="stat-card"><div class="stat-label">Wizard completion</div><div class="stat-value">${fmtPct(dash.conversions.wizardCompletionPct)}</div><div class="stat-sub">${c.wizardComplete} / ${c.autoStarts}</div></div>
      <div class="stat-card"><div class="stat-label">Lead conversion</div><div class="stat-value">${fmtPct(dash.conversions.leadConversionPct)}</div></div>
      <div class="stat-card"><div class="stat-label">Checkout conversion</div><div class="stat-value">${fmtPct(dash.conversions.checkoutConversionPct)}</div><div class="stat-sub">${c.checkoutComplete} / ${c.checkoutStart}</div></div>
      <div class="stat-card"><div class="stat-label">Paid conversion</div><div class="stat-value">${fmtPct(dash.conversions.paidConversionPct)}</div><div class="stat-sub">${c.paid} paid</div></div>
      <div class="stat-card"><div class="stat-label">Referral conversion</div><div class="stat-value">${fmtPct(dash.conversions.referralConversionPct)}</div><div class="stat-sub">${c.referralConvert} / ${c.referralLand}</div></div>
    </div>

    <div style="height:18px"></div>
    <h3 style="margin:0 0 12px">Retention</h3>
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">Return visits</div><div class="stat-value">${dash.retention.returnVisits}</div></div>
      <div class="stat-card"><div class="stat-label">Engagement events</div><div class="stat-value">${dash.retention.engagementEvents}</div></div>
      <div class="stat-card"><div class="stat-label">Lifecycle enrolls</div><div class="stat-value">${dash.retention.lifecycleEnrolls}</div></div>
      <div class="stat-card"><div class="stat-label">Abandon recovery</div><div class="stat-value">${fmtPct(dash.retention.recoveryRatePct)}</div></div>
    </div>

    <div style="height:18px"></div>
    <h3 style="margin:0 0 12px">Partner lead quality</h3>
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">Leads (CRM)</div><div class="stat-value">${dash.partnerLeadQuality.totalLeads}</div></div>
      <div class="stat-card"><div class="stat-label">Avg lead score</div><div class="stat-value">${dash.partnerLeadQuality.avgLeadScore ?? '—'}</div><div class="stat-sub">${dash.partnerLeadQuality.highIntentLeads} high intent (≥70)</div></div>
      <div class="stat-card"><div class="stat-label">Dispatch success</div><div class="stat-value">${fmtPct(dash.partnerLeadQuality.dispatchRatePct)}</div></div>
      <div class="stat-card"><div class="stat-label">Partner win rate</div><div class="stat-value">${fmtPct(dash.partnerLeadQuality.partnerWinRatePct)}</div></div>
      <div class="stat-card"><div class="stat-label">Pipeline realized</div><div class="stat-value">${dash.pipeline.actualTry.toLocaleString('tr-TR')} ₺</div><div class="stat-sub">est. ${dash.pipeline.estimatedTry.toLocaleString('tr-TR')} ₺</div></div>
    </div>

    <div style="height:18px"></div>
    <h3 style="margin:0 0 12px">Executive funnel (step CR)</h3>
    <table class="table">
      <thead><tr><th>Step</th><th>Events</th><th>Step CR</th><th>From landing</th></tr></thead>
      <tbody>
        ${dash.funnel.map((row) => `
          <tr>
            <td>${escapeHtml(row.label)}</td>
            <td><strong>${row.count}</strong></td>
            <td>${row.stepCrPct == null ? '—' : `${row.stepCrPct}%`}</td>
            <td>${row.overallCrPct == null ? '—' : `${row.overallCrPct}%`}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div style="height:18px"></div>
    <h3 style="margin:0 0 12px">Top acquisition channels</h3>
    <table class="table">
      <thead><tr><th>Channel</th><th>Leads</th><th>Paid</th><th>Revenue ₺</th></tr></thead>
      <tbody>
        ${dash.topChannels.length ? dash.topChannels.map((ch) => `
          <tr>
            <td>${escapeHtml(ch.channel)}</td>
            <td>${ch.leads}</td>
            <td>${ch.paid}</td>
            <td>${(ch.revenueCents / 100).toLocaleString('tr-TR')}</td>
          </tr>
        `).join('') : '<tr><td colspan="4">Henüz kanal verisi yok</td></tr>'}
      </tbody>
    </table>

    ${unitEconomicsHtml}

    <details style="margin-top:16px">
      <summary>Snapshot JSON (board export)</summary>
      <pre style="white-space:pre-wrap;font-size:12px;max-height:360px;overflow:auto;">${escapeHtml(JSON.stringify({ executive: dash, unitEconomics: unitModel }, null, 2))}</pre>
    </details>
  `;
}

function getFunctionsBaseUrl() {
  const url = window.__env?.SUPABASE_URL || '';
  return url ? `${url.replace(/\/$/, '')}/functions/v1` : '';
}

function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = (type === 'success' ? '✓ ' : '✗ ') + msg;
  t.className = 'toast ' + type + ' show';
  setTimeout(() => t.classList.remove('show'), 3000);
}

async function adminAction(payload) {
  try {
    return await invokeAdminFunction(sb, payload);
  } catch (error) {
    const detail = error?.message || 'İşlem başarısız';
    console.error('admin-action failed:', detail);
    toast('Hata: ' + detail, 'error');
    throw error;
  }
}

const vacationAdmin = initVacationAdmin({ sb, adminAction, toast });
const verticalAdmin = initVerticalAdmin({ sb });
const housingAdmin = initHousingAdmin({ sb, adminAction, toast });
const financeAdmin = initFinanceAdmin({ sb, adminAction, toast });
const sigortaAdmin = initSigortaAdmin({ sb, adminAction, toast });

async function loadDashboard() {
  const setStat = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  try {
    const [profilesRes, listingsRes, annRes, faqsRes, postsRes, settingsRes, leadsRes] =
      await Promise.all([
        fetchAdminTable(sb, {
          table: 'profiles',
          select: 'id',
          limit: 5000,
          direct: () => sb.from('profiles').select('id').limit(5000)
        }),
        fetchAdminTable(sb, {
          table: 'listings',
          select: 'id',
          limit: 5000,
          direct: () => sb.from('listings').select('id').limit(5000)
        }),
        fetchAdminTable(sb, {
          table: 'announcements',
          select: 'id, is_active',
          limit: 2000,
          direct: () => sb.from('announcements').select('id, is_active').limit(2000)
        }),
        fetchAdminTable(sb, {
          table: 'faqs',
          select: 'id',
          limit: 2000,
          direct: () => sb.from('faqs').select('id').limit(2000)
        }),
        fetchAdminTable(sb, {
          table: 'posts',
          select: 'id, is_published',
          limit: 2000,
          direct: () => sb.from('posts').select('id, is_published').limit(2000)
        }),
        fetchAdminTable(sb, {
          table: 'site_settings',
          select: 'key, value',
          limit: 500,
          direct: () => sb.from('site_settings').select('key, value').limit(500)
        }),
        fetchAdminTable(sb, {
          table: 'auto_leads',
          select: 'status, created_at',
          limit: 5000,
          direct: () => sb.from('auto_leads').select('status, created_at').limit(5000)
        })
      ]);

    setStat('stat-users', profilesRes.data?.length ?? '—');
    setStat('stat-listings', listingsRes.data?.length ?? '—');
    setStat(
      'stat-ann',
      (annRes.data || []).filter((row) => row.is_active).length || '—'
    );
    setStat('stat-faqs', faqsRes.data?.length ?? '—');
    setStat(
      'stat-posts',
      (postsRes.data || []).filter((row) => row.is_published).length || '—'
    );

    const statCampaigns = document.getElementById('stat-campaigns');
    if (statCampaigns) {
      let activeCampaigns = DEFAULT_CAMPAIGNS.length;
      const campaignSetting = (settingsRes.data || []).find(
        (row) => row.key === 'public_campaigns'
      );
      if (campaignSetting?.value) {
        try {
          const parsed = JSON.parse(campaignSetting.value);
          activeCampaigns = Array.isArray(parsed)
            ? parsed.filter((c) => c?.is_active !== false).length
            : 0;
        } catch {
          activeCampaigns = 0;
        }
      }
      statCampaigns.textContent = String(activeCampaigns);
    }

    const leads = leadsRes.data || [];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayLeads = leads.filter((row) => row.created_at && new Date(row.created_at) >= todayStart);
    const newLeads = leads.filter((row) => !row.status || row.status === 'new');
    const wonLeads = leads.filter((row) => ['won', 'closed'].includes(row.status));
    const completedForms = leads.filter((row) => row.status && row.status !== 'new');

    setStat('stat-analyses-today', String(todayLeads.length || 0));
    setStat('stat-forms-done', String(completedForms.length || 0));
    setStat('stat-new-leads', String(newLeads.length || 0));
    setStat('dash-pill-new', String(newLeads.length || 0));
    const convPct =
      leads.length > 0 ? Math.round((wonLeads.length / leads.length) * 1000) / 10 : 0;
    setStat('stat-conversion', leads.length ? `%${convPct}` : '—');
    setStat('stat-system-alerts', '0');
  } catch {
    /* dashboard stats are best-effort */
  }
}

const KEYS = ['phone','email','address','instagram','twitter','facebook','linkedin','youtube','tiktok',
              'site-name','site-subtitle','hero-eyebrow','hero-title','hero-desc','title','description','auto_whatsapp_phone',
              'analytics_clean_start_at','live_finance_feed_url'];
const BOOLEAN_SETTING_KEYS = ['maintenance','live_providers_enabled','home_category_auto_enabled','home_category_konut_enabled','home_category_tatil_enabled','home_category_finans_enabled','home_category_sigorta_enabled','home_category_kasko_enabled'];

async function loadSettings() {
  const res = await fetchAdminTable(sb, {
    table: 'site_settings',
    limit: 500,
    direct: () => sb.from('site_settings').select('*')
  });
  const data = res.data;
  if (!data?.length) return;
  const map = {};
  data.forEach(r => map[r.key] = r.value);
  KEYS.forEach(f => {
    const el = document.getElementById('s-' + f);
    if (el && map[f] !== undefined) el.value = map[f];
  });
  BOOLEAN_SETTING_KEYS.forEach((key) => {
    const el = document.getElementById('s-' + key);
    if (!el) return;
    const value = map[key];
    el.checked = value == null ? true : String(value).toLowerCase() === 'true';
  });
  const cleanStart = map.analytics_clean_start_at;
  analyticsCleanStartAt = cleanStart || null;
  const cleanEl = document.getElementById('s-analytics_clean_start_at');
  if (cleanEl && cleanStart) {
    try {
      const d = new Date(cleanStart);
      if (!Number.isNaN(d.getTime())) {
        cleanEl.value = d.toISOString().slice(0, 16);
      }
    } catch {
      /* ignore */
    }
  }
  loadAnalyticsExclusionSettings();
  warnIfSocialSettingsEmpty();
}

async function loadAnalyticsExclusionSettings() {
  const listEl = document.getElementById('analytics-exclusion-list');
  if (!listEl) return;
  try {
    const res = await invokeAdminFunction(sb, {
      action: 'list_analytics_exclusions'
    });
    const rows = res?.data || [];
    if (!rows.length) {
      listEl.innerHTML = '<p class="text-muted-sm">Henüz dahili IP/cihaz kuralı yok.</p>';
      return;
    }
    listEl.innerHTML = `
      <table class="table">
        <thead><tr><th>Tür</th><th>Hash</th><th>Etiket</th><th></th></tr></thead>
        <tbody>
          ${rows
            .map(
              (row) => `
            <tr>
              <td>${escapeHtml(row.type)}</td>
              <td><code>${escapeHtml(String(row.value_hash).slice(0, 16))}…</code></td>
              <td>${escapeHtml(row.label || '—')}</td>
              <td><button type="button" class="btn btn-danger btn-sm" data-action="analytics-delete-exclusion" data-id="${safeAttr(row.id)}">Sil</button></td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>`;
  } catch (err) {
    listEl.innerHTML = `<p class="empty">Kurallar yüklenemedi: ${escapeHtml(err.message)}</p>`;
  }
}

async function addAnalyticsInternalIp() {
  const ip = document.getElementById('analytics-internal-ip')?.value?.trim();
  const label = document.getElementById('analytics-internal-ip-label')?.value?.trim() || 'Admin IP';
  if (!ip) {
    toast('IP adresi girin', 'error');
    return;
  }
  await invokeAdminFunction(sb, {
    action: 'add_analytics_ip_exclusion',
    values: { ip, label }
  });
  toast('IP hash eklendi');
  document.getElementById('analytics-internal-ip').value = '';
  loadAnalyticsExclusionSettings();
}

async function markAnalyticsTestDevice() {
  markCurrentDeviceAsInternalTest();
  const device_hash = await getDeviceHash();
  await invokeAdminFunction(sb, {
    action: 'register_analytics_device_exclusion',
    values: { device_hash, label: 'Admin panel — bu cihaz' }
  });
  const status = document.getElementById('analytics-device-status');
  if (status) {
    status.textContent = 'Bu cihaz test cihazı olarak işaretlendi. Bu tarayıcıdan gelen eventler internal sayılır.';
  }
  toast('Test cihazı kaydedildi');
  loadAnalyticsExclusionSettings();
}

const SOCIAL_SETTING_KEYS = ['instagram', 'twitter', 'facebook', 'linkedin', 'youtube', 'tiktok'];

function warnIfSocialSettingsEmpty({ notify = false } = {}) {
  const filled = SOCIAL_SETTING_KEYS.filter((key) => {
    const el = document.getElementById(`s-${key}`);
    return el?.value?.trim();
  });
  const hint = document.getElementById('social-settings-hint');
  if (!filled.length) {
    if (hint) hint.textContent = 'Uyarı: Tüm sosyal alanlar boş — sitede ikon görünmez.';
    if (notify) toast('Sosyal medya alanları boş — footer ikonları gizli kalacak.', 'error');
    return false;
  }
  if (hint) {
    hint.textContent = `Footer’da ${filled.length} platform yayında (${filled.join(', ')}).`;
  }
  return true;
}

async function saveSettings() {
  warnIfSocialSettingsEmpty({ notify: true });
  const rows = KEYS.map((f) => {
    let value = document.getElementById('s-' + f)?.value || '';
    if (f === 'analytics_clean_start_at' && value) {
      try {
        const d = new Date(value);
        if (!Number.isNaN(d.getTime())) value = d.toISOString();
      } catch {
        /* keep raw */
      }
    }
    return { key: f, value };
  });
  BOOLEAN_SETTING_KEYS.forEach((key) => {
    const el = document.getElementById('s-' + key);
    if (!el) return;
    rows.push({ key, value: el.checked ? 'true' : 'false' });
  });
  await adminAction({ action: 'upsert_settings', table: 'site_settings', id: 'settings', values: rows });
  const cleanRow = rows.find((r) => r.key === 'analytics_clean_start_at');
  if (cleanRow?.value) analyticsCleanStartAt = cleanRow.value;
  toast('Kaydedildi!');
}

async function loadAnnouncements() {
  const el = document.getElementById('announcements-list');
  const res = await fetchAdminTable(sb, {
    table: 'announcements',
    limit: 200,
    order: { column: 'created_at', ascending: false },
    direct: () => sb.from('announcements').select('*').order('created_at', { ascending: false })
  });
  const data = res.data || [];
  if (!data.length) {
    el.innerHTML = res.error
      ? `<p class="empty">Duyurular yüklenemedi: ${escapeHtml(res.error.message)}</p>`
      : '<p class="empty">Henüz duyuru yok.</p>';
    return;
  }
  el.innerHTML = '<table class="table"><thead><tr><th>Başlık</th><th>İçerik</th><th>Durum</th><th>Tarih</th><th></th></tr></thead><tbody>' +
    data.map(a => `<tr><td><strong>${escapeHtml(a.title||'—')}</strong></td><td class="cell-truncate">${escapeHtml(a.content||'—')}</td><td><span class="badge ${a.is_active?'badge-green':'badge-red'}">${a.is_active?'Aktif':'Pasif'}</span></td><td class="text-muted cell-nowrap">${new Date(a.created_at).toLocaleDateString('tr-TR')}</td><td><div class="table-actions"><button class="btn btn-ghost btn-sm" data-action="toggle-ann" data-id="${safeAttr(a.id)}" data-active="${a.is_active}">${a.is_active?'Durdur':'Yayınla'}</button><button class="btn btn-danger btn-sm" data-action="delete-ann" data-id="${safeAttr(a.id)}">Sil</button></div></td></tr>`).join('') + '</tbody></table>';
}

async function saveAnnouncement() {
  const title = document.getElementById('a-title').value.trim();
  const content = document.getElementById('a-content').value.trim();
  const is_active = document.getElementById('a-active').checked;
  if (!title) { toast('Başlık zorunlu', 'error'); return; }
  await adminAction({ action: 'insert', table: 'announcements', id: 'new', values: { title, content, is_active } });
  toast('Duyuru eklendi');
  document.getElementById('a-title').value = '';
  document.getElementById('a-content').value = '';
  loadAnnouncements(); loadDashboard();
}

async function toggleAnn(id, current) {
  await adminAction({ action: 'update', table: 'announcements', id, values: { is_active: !current } });
  toast(current ? 'Durduruldu' : 'Yayınlandı');
  loadAnnouncements();
}

async function deleteAnn(id) {
  if (!confirm('Silmek istediğinize emin misiniz?')) return;
  await adminAction({ action: 'delete', table: 'announcements', id });
  toast('Silindi');
  loadAnnouncements(); loadDashboard();
}

async function loadFaqs() {
  const el = document.getElementById('faqs-list');
  const res = await fetchAdminTable(sb, {
    table: 'faqs',
    limit: 300,
    order: { column: 'order_num', ascending: true },
    direct: () =>
      sb.from('faqs').select('*').order('order_num').order('created_at', { ascending: false })
  });
  const data = res.data || [];
  if (!data.length) {
    el.innerHTML = res.error
      ? `<p class="empty">SSS yüklenemedi: ${escapeHtml(res.error.message)}</p>`
      : '<p class="empty">Henüz SSS yok.</p>';
    return;
  }
  el.innerHTML = '<table class="table"><thead><tr><th>#</th><th>Soru</th><th>Durum</th><th></th></tr></thead><tbody>' +
    data.map(f => `<tr><td class="text-muted">${f.order_num||0}</td><td>${escapeHtml(f.question||'—')}</td><td><span class="badge ${f.is_active?'badge-green':'badge-red'}">${f.is_active?'Aktif':'Pasif'}</span></td><td><div class="table-actions"><button class="btn btn-ghost btn-sm" data-action="toggle-faq" data-id="${safeAttr(f.id)}" data-active="${f.is_active}">${f.is_active?'Gizle':'Göster'}</button><button class="btn btn-danger btn-sm" data-action="delete-faq" data-id="${safeAttr(f.id)}">Sil</button></div></td></tr>`).join('') + '</tbody></table>';
}

async function saveFaq() {
  const question = document.getElementById('faq-question').value.trim();
  const answer = document.getElementById('faq-answer').value.trim();
  const order_num = parseInt(document.getElementById('faq-order').value) || 0;
  const is_active = document.getElementById('faq-active').checked;
  if (!question) { toast('Soru zorunlu', 'error'); return; }
  await adminAction({ action: 'insert', table: 'faqs', id: 'new', values: { question, answer, order_num, is_active } });
  toast('SSS eklendi');
  document.getElementById('faq-question').value = '';
  document.getElementById('faq-answer').value = '';
  loadFaqs(); loadDashboard();
}

async function toggleFaq(id, current) {
  await adminAction({ action: 'update', table: 'faqs', id, values: { is_active: !current } });
  toast(current ? 'Gizlendi' : 'Gösterildi');
  loadFaqs();
}

async function deleteFaq(id) {
  if (!confirm('Silmek istediğinize emin misiniz?')) return;
  await adminAction({ action: 'delete', table: 'faqs', id });
  toast('Silindi');
  loadFaqs(); loadDashboard();
}

let editingPostId = null;
let adminPostsCache = [];

function autoSlug() {
  const title = document.getElementById('post-title').value;
  document.getElementById('post-slug').value = title.toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').trim();
}

function previewPostCover() {
  const url = document.getElementById('post-cover')?.value.trim();
  const box = document.getElementById('post-cover-preview');
  if (!box) return;
  if (!url) {
    box.innerHTML = '<span class="text-muted-sm">Kapak URL girildiğinde önizleme burada görünür.</span>';
    return;
  }
  box.innerHTML = `<img src="${escapeHtml(url)}" alt="" loading="lazy">`;
}

function resetPostForm() {
  editingPostId = null;
  const titleEl = document.getElementById('post-form-title');
  if (titleEl) titleEl.textContent = 'Yeni haber / rehber';
  document.getElementById('post-title').value = '';
  document.getElementById('post-slug').value = '';
  document.getElementById('post-excerpt').value = '';
  document.getElementById('post-cover').value = '';
  document.getElementById('post-source-label').value = '';
  document.getElementById('post-source-url').value = '';
  document.getElementById('post-content').value = '';
  document.getElementById('post-published').checked = false;
  document.getElementById('post-featured').checked = false;
  const cancelBtn = document.querySelector('[data-action="cancel-post-edit"]');
  const saveBtn = document.querySelector('[data-action="save-post"]');
  if (cancelBtn) cancelBtn.hidden = true;
  if (saveBtn) saveBtn.textContent = 'Kaydet';
  previewPostCover();
}

function editPostById(id) {
  const post = adminPostsCache.find((p) => String(p.id) === String(id));
  if (!post) {
    toast('Yazı bulunamadı', 'error');
    return;
  }
  editingPostId = post.id;
  document.getElementById('post-form-title').textContent = 'Haber düzenle';
  document.getElementById('post-title').value = post.title || '';
  document.getElementById('post-slug').value = post.slug || '';
  document.getElementById('post-excerpt').value = post.excerpt || '';
  document.getElementById('post-cover').value = post.cover_image_url || '';
  document.getElementById('post-source-label').value = post.source_label || '';
  document.getElementById('post-source-url').value = post.source_url || '';
  document.getElementById('post-content').value = post.content || '';
  document.getElementById('post-category').value = post.category || 'auto';
  document.getElementById('post-published').checked = Boolean(post.is_published);
  document.getElementById('post-featured').checked = Boolean(post.is_featured);
  document.querySelector('[data-action="cancel-post-edit"]').hidden = false;
  document.querySelector('[data-action="save-post"]').textContent = 'Güncelle';
  previewPostCover();
  document.getElementById('post-editor-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  toast('Düzenleme modu');
}

async function loadPosts() {
  const el = document.getElementById('posts-list');
  const filter = document.getElementById('post-list-filter')?.value || '';
  const res = await fetchAdminTable(sb, {
    table: 'posts',
    limit: 200,
    order: { column: 'created_at', ascending: false },
    direct: () => sb.from('posts').select('*').order('created_at', { ascending: false })
  });
  let data = res.data || [];
  adminPostsCache = data;
  if (filter) data = data.filter((p) => (p.category || 'auto') === filter);
  if (!data.length) {
    el.innerHTML = res.error
      ? `<p class="empty">Yazılar yüklenemedi: ${escapeHtml(res.error.message)}</p>`
      : '<p class="empty">Henüz yazı yok.</p>';
    return;
  }
  el.innerHTML =
    '<table class="table"><thead><tr><th>Görsel</th><th>Başlık</th><th>Kategori</th><th>Durum</th><th>Tarih</th><th></th></tr></thead><tbody>' +
    data
      .map((p) => {
        const thumb = p.cover_image_url
          ? `<img src="${escapeHtml(p.cover_image_url)}" alt="" loading="lazy">`
          : '<span class="text-muted text-xs">—</span>';
        return `<tr>
        <td class="ib-post-thumb-cell">${thumb}</td>
        <td><strong>${escapeHtml(p.title || '—')}</strong>${p.is_featured ? ' <span class="badge badge-blue">Ana sayfa</span>' : ''}</td>
        <td class="text-muted text-xs">${escapeHtml(p.category || 'auto')}</td>
        <td><span class="badge ${p.is_published ? 'badge-green' : 'badge-yellow'}">${p.is_published ? 'Yayında' : 'Taslak'}</span></td>
        <td class="text-muted cell-nowrap">${new Date(p.created_at).toLocaleDateString('tr-TR')}</td>
        <td><div class="table-actions">
          <button class="btn btn-ghost btn-sm" data-action="edit-post" data-id="${safeAttr(p.id)}">Düzenle</button>
          <button class="btn btn-ghost btn-sm" data-action="toggle-post-featured" data-id="${safeAttr(p.id)}" data-active="${p.is_featured}">${p.is_featured ? 'Öne çıkandan al' : 'Ana sayfa'}</button>
          <button class="btn btn-ghost btn-sm" data-action="toggle-post" data-id="${safeAttr(p.id)}" data-active="${p.is_published}">${p.is_published ? 'Taslağa al' : 'Yayınla'}</button>
          <button class="btn btn-danger btn-sm" data-action="delete-post" data-id="${safeAttr(p.id)}">Sil</button>
        </div></td></tr>`;
      })
      .join('') +
    '</tbody></table>';
}

async function savePost() {
  const title = document.getElementById('post-title').value.trim();
  const slug = document.getElementById('post-slug').value.trim() || title.toLowerCase().replace(/\s+/g, '-');
  const content = document.getElementById('post-content').value.trim();
  const excerpt = document.getElementById('post-excerpt').value.trim();
  const category = document.getElementById('post-category').value || 'auto';
  const cover_image_url = document.getElementById('post-cover').value.trim() || null;
  const source_label = document.getElementById('post-source-label').value.trim() || null;
  const source_url = document.getElementById('post-source-url').value.trim() || null;
  const is_published = document.getElementById('post-published').checked;
  const is_featured = document.getElementById('post-featured').checked;
  if (!title) {
    toast('Başlık zorunlu', 'error');
    return;
  }
  const values = {
    title,
    slug,
    content,
    excerpt,
    category,
    cover_image_url,
    source_label,
    source_url,
    is_published,
    is_featured
  };
  if (editingPostId) {
    await adminAction({ action: 'update', table: 'posts', id: editingPostId, values });
    toast('Haber güncellendi');
  } else {
    await adminAction({ action: 'insert', table: 'posts', id: 'new', values });
    toast('Haber eklendi');
  }
  resetPostForm();
  loadPosts();
  loadDashboard();
}

async function togglePostFeatured(id, current) {
  await adminAction({ action: 'update', table: 'posts', id, values: { is_featured: !current } });
  toast(!current ? 'Ana sayfada gösterilecek' : 'Ana sayfadan kaldırıldı');
  loadPosts();
}

if (typeof window !== 'undefined') {
  window.previewPostCover = previewPostCover;
  window.loadPosts = loadPosts;
}

async function togglePost(id, current) {
  await adminAction({ action: 'update', table: 'posts', id, values: { is_published: !current } });
  toast(current ? 'Taslağa alındı' : 'Yayınlandı');
  loadPosts(); loadDashboard();
}

async function deletePost(id) {
  if (!confirm('Silmek istediğinize emin misiniz?')) return;
  await adminAction({ action: 'delete', table: 'posts', id });
  toast('Silindi');
  loadPosts(); loadDashboard();
}

const CAMPAIGNS_SETTING_KEY = 'public_campaigns';
let adminCampaigns = [];
let adminCampaignsHasKey = false;

async function readCampaignsFromSettings() {
  const { data, error } = await sb
    .from('site_settings')
    .select('key,value')
    .eq('key', CAMPAIGNS_SETTING_KEY)
    .maybeSingle();
  if (error) throw error;
  if (!data?.value) {
    return { hasKey: false, list: [] };
  }
  try {
    const parsed = JSON.parse(data.value);
    const list = Array.isArray(parsed)
      ? parsed.map((c, i) => normalizePublicCampaign(c, i))
      : [];
    return { hasKey: true, list };
  } catch {
    return { hasKey: true, list: [] };
  }
}

async function persistCampaigns(list) {
  const payload = list.map((c) => ({
    id: c.id,
    title: c.title,
    summary: c.summary,
    cta_label: c.cta_label,
    cta_href: c.cta_href,
    badge: c.badge,
    ends_at: c.ends_at,
    is_active: c.is_active,
    sort_order: c.sort_order
  }));
  await adminAction({
    action: 'upsert_settings',
    table: 'site_settings',
    id: 'settings',
    values: [{ key: CAMPAIGNS_SETTING_KEY, value: JSON.stringify(payload) }]
  });
  adminCampaigns = list;
  adminCampaignsHasKey = true;
}

function campaignIdFromTitle(title) {
  const slug = String(title || '')
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  return slug || `campaign-${Date.now()}`;
}

function resetCampaignForm() {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  };
  set('c-id', '');
  const titleEl = document.getElementById('campaign-form-title');
  if (titleEl) titleEl.textContent = 'Yeni kampanya';
  set('c-title', '');
  set('c-badge', '');
  set('c-summary', '');
  set('c-cta-label', 'Detay');
  set('c-cta-href', '');
  set('c-ends', '');
  set('c-sort', '0');
  const active = document.getElementById('c-active');
  if (active) active.checked = true;
}

function formatCampaignEnds(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return escapeHtml(String(value));
  return d.toLocaleDateString('tr-TR');
}

async function loadCampaigns() {
  const el = document.getElementById('campaigns-list');
  const hint = document.getElementById('campaigns-source-hint');
  if (!el) return;

  try {
    const { hasKey, list } = await readCampaignsFromSettings();
    adminCampaigns = list;
    adminCampaignsHasKey = hasKey;

    if (hint) {
      hint.textContent = hasKey
        ? 'Kaynak: site_settings (public_campaigns). Aktif kampanyalar /kampanyalar sayfasında listelenir.'
        : 'Henüz admin kaydı yok — sitede varsayılan kampanyalar gösteriliyor. İlk kayıt bu listeyi devralır.';
    }

    if (!list.length) {
      el.innerHTML = hasKey
        ? '<p class="empty">Kayıtlı kampanya yok. Yeni ekleyin veya varsayılanları yükleyin.</p>'
        : '<p class="empty">Varsayılan kampanyalar sitede aktif. Kalıcı yönetim için kaydedin veya varsayılanları yükleyin.</p>';
      return;
    }

    const sorted = [...list].sort(
      (a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, 'tr')
    );
    el.innerHTML =
      '<table class="table"><thead><tr><th>Sıra</th><th>Başlık</th><th>Rozet</th><th>CTA</th><th>Bitiş</th><th>Durum</th><th></th></tr></thead><tbody>' +
      sorted
        .map(
          (c) => `<tr>
        <td class="text-muted">${c.sort_order}</td>
        <td><strong>${escapeHtml(c.title)}</strong><div class="text-muted text-xs cell-truncate">${escapeHtml(c.summary)}</div></td>
        <td>${escapeHtml(c.badge)}</td>
        <td class="text-xs"><span class="text-muted">${escapeHtml(c.cta_label)}</span> → ${escapeHtml(c.cta_href)}</td>
        <td class="text-muted cell-nowrap">${formatCampaignEnds(c.ends_at)}</td>
        <td><span class="badge ${c.is_active ? 'badge-green' : 'badge-red'}">${c.is_active ? 'Aktif' : 'Pasif'}</span></td>
        <td><div class="table-actions">
          <button class="btn btn-ghost btn-sm" data-action="edit-campaign" data-id="${safeAttr(c.id)}">Düzenle</button>
          <button class="btn btn-ghost btn-sm" data-action="toggle-campaign" data-id="${safeAttr(c.id)}" data-active="${c.is_active}">${c.is_active ? 'Durdur' : 'Yayınla'}</button>
          <button class="btn btn-danger btn-sm" data-action="delete-campaign" data-id="${safeAttr(c.id)}">Sil</button>
        </div></td>
      </tr>`
        )
        .join('') +
      '</tbody></table>';
  } catch (err) {
    el.innerHTML = `<p class="empty">Kampanyalar yüklenemedi: ${escapeHtml(err?.message || 'bilinmeyen hata')}</p>`;
  }
}

async function saveCampaign() {
  const editId = document.getElementById('c-id')?.value?.trim();
  const title = document.getElementById('c-title')?.value?.trim();
  const summary = document.getElementById('c-summary')?.value?.trim();
  const cta_label = document.getElementById('c-cta-label')?.value?.trim() || 'Detay';
  const cta_href = document.getElementById('c-cta-href')?.value?.trim() || '/auto/';
  const badge = document.getElementById('c-badge')?.value?.trim() || 'Kampanya';
  const endsRaw = document.getElementById('c-ends')?.value?.trim();
  const sort_order = parseInt(document.getElementById('c-sort')?.value, 10) || 0;
  const is_active = document.getElementById('c-active')?.checked !== false;
  const ends_at = endsRaw || null;

  if (!title) {
    toast('Başlık zorunlu', 'error');
    return;
  }

  let list = [...adminCampaigns];
  if (!adminCampaignsHasKey && !list.length) {
    list = DEFAULT_CAMPAIGNS.map((c, i) => normalizePublicCampaign(c, i));
  }

  const id = editId || campaignIdFromTitle(title);
  const next = normalizePublicCampaign(
    { id, title, summary, cta_label, cta_href, badge, ends_at, is_active, sort_order },
    list.length
  );

  const idx = list.findIndex((c) => c.id === id);
  if (idx >= 0) list[idx] = next;
  else list.push(next);

  await persistCampaigns(list);
  toast(editId ? 'Kampanya güncellendi' : 'Kampanya eklendi');
  resetCampaignForm();
  loadCampaigns();
  loadDashboard();
}

function editCampaign(id) {
  const c = adminCampaigns.find((row) => row.id === id);
  if (!c) {
    toast('Kampanya bulunamadı', 'error');
    return;
  }
  document.getElementById('c-id').value = c.id;
  const titleEl = document.getElementById('campaign-form-title');
  if (titleEl) titleEl.textContent = 'Kampanyayı düzenle';
  document.getElementById('c-title').value = c.title;
  document.getElementById('c-badge').value = c.badge;
  document.getElementById('c-summary').value = c.summary;
  document.getElementById('c-cta-label').value = c.cta_label;
  document.getElementById('c-cta-href').value = c.cta_href;
  document.getElementById('c-ends').value = c.ends_at ? String(c.ends_at).slice(0, 10) : '';
  document.getElementById('c-sort').value = String(c.sort_order);
  document.getElementById('c-active').checked = c.is_active;
  document.getElementById('page-campaigns')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function toggleCampaign(id) {
  const list = adminCampaigns.map((c) =>
    c.id === id ? { ...c, is_active: !c.is_active } : c
  );
  await persistCampaigns(list);
  toast('Kampanya durumu güncellendi');
  loadCampaigns();
  loadDashboard();
}

async function deleteCampaign(id) {
  if (!confirm('Bu kampanyayı silmek istediğinize emin misiniz?')) return;
  const list = adminCampaigns.filter((c) => c.id !== id);
  await persistCampaigns(list);
  toast('Kampanya silindi');
  if (document.getElementById('c-id')?.value === id) resetCampaignForm();
  loadCampaigns();
  loadDashboard();
}

async function seedDefaultCampaigns() {
  if (
    !confirm(
      'Varsayılan kampanyalar site ayarlarına yazılacak. Mevcut public_campaigns kaydı varsa üzerine yazılır. Devam?'
    )
  ) {
    return;
  }
  const list = DEFAULT_CAMPAIGNS.map((c, i) => normalizePublicCampaign(c, i));
  await persistCampaigns(list);
  toast('Varsayılan kampanyalar yüklendi');
  resetCampaignForm();
  loadCampaigns();
  loadDashboard();
}

async function loadListings() {
  const el = document.getElementById('listings-list');
  const res = await fetchAdminTable(sb, {
    table: 'listings',
    limit: 100,
    order: { column: 'created_at', ascending: false },
    direct: () =>
      sb.from('listings').select('*').order('created_at', { ascending: false }).limit(100)
  });
  const data = res.data || [];
  if (!data.length) {
    el.innerHTML = res.error
      ? `<p class="empty">İlanlar yüklenemedi: ${escapeHtml(res.error.message)}</p>`
      : '<p class="empty">Henüz ilan yok.</p>';
    return;
  }
  el.innerHTML = '<table class="table"><thead><tr><th>Başlık</th><th>Kategori</th><th>Fiyat</th><th>Durum</th><th>Tarih</th><th></th></tr></thead><tbody>' +
    data.map(l => `<tr><td><strong>${escapeHtml(l.title||l.name||'—')}</strong></td><td><span class="badge badge-blue">${escapeHtml(l.category||l.type||'—')}</span></td><td class="cell-nowrap">${l.price?Number(l.price).toLocaleString('tr-TR')+' ₺':'—'}</td><td><span class="badge ${!l.status||l.status==='active'?'badge-green':'badge-red'}">${l.status||'aktif'}</span></td><td class="text-muted cell-nowrap">${l.created_at?new Date(l.created_at).toLocaleDateString('tr-TR'):'—'}</td><td><div class="table-actions"><button class="btn btn-warning btn-sm" data-action="feature-listing" data-id="${safeAttr(l.id)}" data-active="${!!l.is_featured}">${l.is_featured?'Öne çıkarmayı kaldır':'Öne çıkar'}</button><button class="btn btn-danger btn-sm" data-action="delete-listing" data-id="${safeAttr(l.id)}">Sil</button></div></td></tr>`).join('') + '</tbody></table>';
}

async function featureListing(id, current) {
  await adminAction({ action: 'update', table: 'listings', id, values: { is_featured: !current } });
  toast(current ? 'Kaldırıldı' : 'Öne çıkarıldı');
  loadListings();
}

async function deleteListing(id) {
  if (!confirm('Bu ilanı silmek istediğinize emin misiniz?')) return;
  await adminAction({ action: 'delete', table: 'listings', id });
  toast('İlan silindi');
  loadListings(); loadDashboard();
}

async function loadUsers() {
  const el = document.getElementById('users-list');
  if (!el) return;

  el.innerHTML = '<div class="empty">Yükleniyor…</div>';

  const res = await fetchAdminTable(sb, {
    table: 'profiles',
    limit: 100,
    order: { column: 'created_at', ascending: false },
    direct: () =>
      sb.from('profiles').select('*').order('created_at', { ascending: false }).limit(100)
  });
  const data = res.data || [];
  if (!data.length) {
    el.innerHTML = res.error
      ? `<p class="empty">Kullanıcılar yüklenemedi: ${escapeHtml(res.error.message)}</p>`
      : '<p class="empty">Henüz kullanıcı yok.</p>';
    return;
  }
  el.innerHTML = '<table class="table"><thead><tr><th>Ad</th><th>E-posta</th><th>Rol</th><th>Kayıt</th><th></th></tr></thead><tbody>' +
    data.map(u => {
      const isAdmin = u.role === 'admin';
      const isSelf = u.id === currentUser?.id;
      const actions = [];

      if (isAdmin && !isSelf) {
        actions.push(`<button class="btn btn-ghost btn-sm" data-action="set-user-role" data-id="${safeAttr(u.id)}" data-role="user">Yetki kaldır</button>`);
      }

      if (!isSelf) {
        actions.push(`<button class="btn btn-danger btn-sm" data-action="ban-user" data-id="${safeAttr(u.id)}">Engelle</button>`);
      }

      const displayName = escapeHtml(u.full_name || u.name || '—');
      const email = escapeHtml(u.email || '—');
      const role = escapeHtml(u.role || 'kullanıcı');
      const createdAt = u.created_at ? new Date(u.created_at).toLocaleDateString('tr-TR') : '—';

      return `<tr><td><strong>${displayName}</strong></td><td class="text-muted">${email}</td><td><span class="badge ${u.role==='admin'?'badge-blue':u.role==='moderator'?'badge-yellow':'badge-green'}">${role}</span></td><td class="text-muted cell-nowrap">${createdAt}</td><td><div class="table-actions">${actions.join('')}</div></td></tr>`;
    }).join('') + '</tbody></table>';
}


async function trackAdminCrmEvent(eventName, metadata = {}) {
  try {
    const { analytics } = await import('./core/analytics.js');
    await analytics.track(
      eventName,
      { ...metadata, admin_crm: true },
      {
        category: 'admin',
        funnel: 'crm',
        funnel_step: eventName,
        force: true
      }
    );
    analytics.flush();
  } catch {
    /* admin CRM telemetry is best-effort */
  }
}

async function trackAdminAutoEvent(eventName, metadata = {}) {
  return trackAdminCrmEvent(eventName, metadata);
}

async function loadAutoAnalytics(dataMode = autoAnalyticsDataMode) {
  const el = document.getElementById('auto-analytics-list');
  if (!el) return;

  autoAnalyticsDataMode = dataMode;
  el.innerHTML = '<div class="empty">Yükleniyor…</div>';

  if (!analyticsCleanStartAt) {
    analyticsCleanStartAt = await fetchAnalyticsCleanStartAt(sb);
  }

  const windowDays = SCALE_LIMITS.admin.analyticsWindowDays || 30;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const analyticsSelect =
    'event_name, email, phone, created_at, session_id, is_internal, internal_reason, traffic_type, properties, utm_source';

  let events = [];
  let leadRows = [];

  try {
    const [analyticsRes, leadList] = await Promise.all([
      fetchAdminTable(sb, {
        table: 'analytics_events',
        select: analyticsSelect,
        limit: SCALE_LIMITS.admin.analyticsRowLimit,
        order: { column: 'created_at', ascending: false },
        direct: () =>
          sb
            .from('analytics_events')
            .select(analyticsSelect)
            .gte('created_at', since)
            .like('event_name', 'auto_%')
            .order('created_at', { ascending: false })
            .limit(SCALE_LIMITS.admin.analyticsRowLimit)
      }),
      adminList(sb, {
        table: 'auto_leads',
        select: 'status, follow_up_at, follow_up_done, partner_status, estimated_revenue, actual_revenue',
        limit: 1000
      })
    ]);
    leadRows = leadList;
    const rawAnalytics = (analyticsRes.data || []).filter((row) =>
      String(row.event_name || '').startsWith('auto_')
    );
    events = filterAnalyticsRows(
      rawAnalytics,
      dataMode,
      dataMode === ANALYTICS_DATA_MODES.REAL ? analyticsCleanStartAt : null
    );
    if (!events.length && dataMode === ANALYTICS_DATA_MODES.REAL) {
      const legacy = await adminList(sb, {
        table: 'auto_events',
        order: { column: 'created_at', ascending: false },
        limit: 500
      });
      events = legacy.filter((row) => {
        const ts = row.created_at ? new Date(row.created_at).getTime() : 0;
        return ts >= new Date(since).getTime();
      });
    }
  } catch (error) {
    el.innerHTML = `<p class="empty">Hata: ${escapeHtml(error.message)}</p>`;
    return;
  }

  const dataModeToolbar = renderAnalyticsDataModeToolbar(dataMode);
  const modeNote = `<p class="text-muted-sm" style="margin:0 0 12px">${escapeHtml(ANALYTICS_DATA_MODE_LABELS[dataMode] || dataMode)} · Temiz başlangıç: ${analyticsCleanStartAt ? new Date(analyticsCleanStartAt).toLocaleString('tr-TR') : '—'}</p>`;

  const counts = events.reduce((acc, event) => {
    acc[event.event_name] = (acc[event.event_name] || 0) + 1;
    return acc;
  }, {});

  const labels = {
    auto_page_view: 'Auto sayfa ziyareti',
    auto_form_started: 'Form başladı',
    auto_form_submitted: 'Form gönderildi',
    auto_analysis_started: 'Analiz başlatıldı',
    auto_results_rendered: 'Sonuç render',
    auto_modal_submitted: 'Modal gönderildi',
    auto_hot_lead_detected: 'Hot lead tespit',
    auto_quiz_submit: 'Eski quiz gönderimi',
    auto_email_submit: 'Eski email/telefon submit',
    auto_results_view: 'Sonuç görüntülendi',
    auto_modal_open: 'Lead formu açıldı',
    auto_lead_submit: 'Lead bırakıldı',
    auto_finance_click: 'Finansman tıklama',
    auto_whatsapp_click: 'WhatsApp iletişimi',
    decision_feedback_helpful: 'Karar faydalı',
    decision_feedback_unclear: 'Daha açıklama istiyor',
    decision_feedback_contact: 'Uzman destek isteği',
    feedback_requested: 'Ürün geri bildirimi istendi',
    feedback_submitted: 'Ürün geri bildirimi gönderildi',
    recommendation_success: 'Öneri başarı (kullanıcı)',
    recommendation_rejected: 'Öneri red (kullanıcı)'
  };

  const pageViews = counts.auto_page_view || 0;
  const formStarted = counts.auto_form_started || counts.auto_analysis_started || counts.auto_quiz_submit || 0;
  const formSubmitted = counts.auto_form_submitted || counts.auto_results_view || counts.auto_results_rendered || 0;
  const analysisStarted = (counts.auto_analysis_started || 0) + (counts.auto_quiz_submit || 0);
  const resultsRendered = counts.auto_results_rendered || counts.auto_results_view || 0;
  const modalSubmitted = counts.auto_modal_submitted || counts.auto_lead_submit || 0;
  const hotLeadDetected = counts.auto_hot_lead_detected || 0;

  const pct = (value, base) => base ? Math.round((value / base) * 100) + '%' : '—';


  const totalExpectedRevenue = leadRows.reduce(
    (sum, lead) => sum + Number(lead.estimated_revenue || 0),
    0
  );

  const totalActualRevenue = leadRows.reduce(
    (sum, lead) => sum + Number(lead.actual_revenue || 0),
    0
  );

  const wonPartners = leadRows.filter(
    lead => lead.partner_status === 'won'
  ).length;

  const partnerTracked = leadRows.filter(
    lead => lead.partner_status && lead.partner_status !== 'pending'
  ).length;

  const revenuePerLead = leadRows.length
    ? Math.round(totalActualRevenue / leadRows.length)
    : 0;

  const revenuePerVisit = pageViews
    ? Math.round(totalActualRevenue / pageViews)
    : 0;

  const partnerWinRate = partnerTracked
    ? Math.round((wonPartners / partnerTracked) * 100)
    : 0;

  const analyticsCards = [
    ['auto_page_view', labels.auto_page_view, pageViews, 'trafik'],
    ['auto_form_started', labels.auto_form_started, formStarted, pct(formStarted, pageViews)],
    ['auto_form_submitted', labels.auto_form_submitted, formSubmitted, pct(formSubmitted, formStarted)],
    ['auto_results_rendered', labels.auto_results_rendered, resultsRendered, pct(resultsRendered, formSubmitted)],
    ['auto_modal_open', labels.auto_modal_open, counts.auto_modal_open || 0, pct(counts.auto_modal_open || 0, resultsRendered)],
    ['auto_modal_submitted', labels.auto_modal_submitted, modalSubmitted, pct(modalSubmitted, counts.auto_modal_open || 0)],
    ['auto_lead_submit', labels.auto_lead_submit, counts.auto_lead_submit || 0, pct(counts.auto_lead_submit || 0, modalSubmitted || 1)],
    ['auto_hot_lead_detected', labels.auto_hot_lead_detected, hotLeadDetected, 'priority'],
    ['auto_whatsapp_click', labels.auto_whatsapp_click, counts.auto_whatsapp_click || 0, pct(counts.auto_whatsapp_click || 0, resultsRendered)],
    ['expected_revenue', 'Beklenen Gelir', totalExpectedRevenue.toLocaleString('tr-TR') + ' ₺', 'pipeline'],
    ['actual_revenue', 'Gerçek Gelir', totalActualRevenue.toLocaleString('tr-TR') + ' ₺', 'cash'],
    ['revenue_per_lead', 'Lead Başına Gelir', revenuePerLead.toLocaleString('tr-TR') + ' ₺', 'unit'],
    ['revenue_per_visit', 'Ziyaret Başına Gelir', revenuePerVisit.toLocaleString('tr-TR') + ' ₺', 'traffic'],
    ['partner_win_rate', 'Partner Win Rate', partnerWinRate + '%', 'conversion']
  ];

  const leadCounts = countLeadsByNormalizedStatus(leadRows);

  const totalLeads = leadRows.length;
  const crmPct = (value) => totalLeads ? Math.round((value / totalLeads) * 100) + '%' : '—';

  const now = new Date();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const overdueCount = leadRows.filter(
    lead => lead.follow_up_at && !lead.follow_up_done && new Date(lead.follow_up_at) < now
  ).length;

  const todayCount = leadRows.filter(
    lead => lead.follow_up_at && !lead.follow_up_done && new Date(lead.follow_up_at) <= todayEnd
  ).length;

  const activeCount = leadRows.filter(
    lead => lead.follow_up_at && !lead.follow_up_done
  ).length;

  const opsCards = [
    ['🔴 Geciken', overdueCount, 'acil'],
    ['🟠 Bugün', todayCount, 'takip'],
    ['🟢 Aktif', activeCount, 'pipeline'],
    ['⚪ Toplam', totalLeads, 'lead']
  ];

  const crmCards = [
    ['Toplam Lead', totalLeads, '100%'],
    ['Yeni', leadCounts.new || 0, crmPct(leadCounts.new || 0)],
    ['İlk temas', leadCounts.first_contact || 0, crmPct(leadCounts.first_contact || 0)],
    ['Ulaşılamadı', leadCounts.unreachable || 0, crmPct(leadCounts.unreachable || 0)],
    ['Tekrar ara', leadCounts.callback || 0, crmPct(leadCounts.callback || 0)],
    ['Teklif gönderildi', leadCounts.proposal_sent || 0, crmPct(leadCounts.proposal_sent || 0)],
    ['Finansman', leadCounts.financing || 0, crmPct(leadCounts.financing || 0)],
    ['Sigorta', leadCounts.insurance || 0, crmPct(leadCounts.insurance || 0)],
    ['Kazanıldı', leadCounts.won || 0, crmPct(leadCounts.won || 0)],
    ['Kaybedildi', leadCounts.lost || 0, crmPct(leadCounts.lost || 0)],
    ['Test/Spam', leadCounts.spam || 0, crmPct(leadCounts.spam || 0)]
  ];

  el.innerHTML = `
    ${dataModeToolbar}
    ${modeNote}
    <h3 style="margin:0 0 14px 0;">Operasyon</h3>
    <div class="stat-grid">
      ${opsCards.map(([label, value, sub]) => `
        <div class="stat-card">
          <div class="stat-label">${label}</div>
          <div class="stat-value">${value}</div>
          <div class="stat-sub">${sub}</div>
        </div>
      `).join('')}
    </div>

    <div style="height:20px"></div>

    <h3 style="margin:0 0 14px 0;">CRM Funnel</h3>
    <div class="stat-grid">
      ${crmCards.map(([label, value, sub]) => `
        <div class="stat-card">
          <div class="stat-label">${label}</div>
          <div class="stat-value">${value}</div>
          <div class="stat-sub">${sub}</div>
        </div>
      `).join('')}
    </div>

    <div style="height:20px"></div>

    <h3 style="margin:0 0 14px 0;">Acquisition Funnel</h3>
    <div class="stat-grid">
      ${analyticsCards.map(([key, label, value, sub]) => `
        <div class="stat-card">
          <div class="stat-label">${label}</div>
          <div class="stat-value">${value}</div>
          <div class="stat-sub">${sub}</div>
        </div>
      `).join('')}
    </div>

    <div style="height:20px"></div>

    ${events.length ? `
      <table class="table">
        <thead>
          <tr>
            <th>Event</th>
            <th>Email</th>
            <th>Telefon</th>
            <th>Tarih</th>
          </tr>
        </thead>
        <tbody>
          ${events.slice(0, 100).map(event => `
            <tr>
              <td><strong>${labels[event.event_name] || event.event_name}</strong></td>
              <td>${escapeHtml(event.email || '—')}</td>
              <td>${escapeHtml(event.phone || '—')}</td>
              <td>${event.created_at ? new Date(event.created_at).toLocaleString('tr-TR') : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<p class="empty">Henüz analytics event yok.</p>'}
  `;

  el.querySelectorAll('[data-analytics-data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      loadAutoAnalytics(btn.getAttribute('data-analytics-data-mode') || ANALYTICS_DATA_MODES.REAL);
    });
  });
}








function countEvents(rows, name) {
  return rows.filter((row) => row.event_name === name).length;
}

function countEventsAny(rows, names) {
  const allowed = new Set(names);
  return rows.filter((row) => allowed.has(row.event_name)).length;
}

/** Canonical funnel step + legacy aliases for migration dashboards. */
const GROWTH_FUNNEL_ALIASES = {
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

function countFunnelStep(rows, canonical) {
  const names = [canonical, ...(GROWTH_FUNNEL_ALIASES[canonical] || [])];
  return countEventsAny(rows, names);
}

function sumRevenueCentsByChannel(rows, eventNames) {
  const allowed = new Set(eventNames);
  return rows
    .filter((row) => allowed.has(row.event_name))
    .reduce((acc, row) => {
      const props = row.properties || row.attribution || {};
      const channel =
        props.growth_channel ||
        row.attribution?.growth_channel ||
        row.attribution?.utm_source ||
        row.funnel ||
        'direct';
      acc[channel] = (acc[channel] || 0) + Number(row.revenue_cents || 0);
      return acc;
    }, {});
}

function conversionPct(numerator, denominator) {
  return denominator ? `${Math.round((numerator / denominator) * 100)}%` : '—';
}

function renderGrowthCommandCenter(rows) {
  const funnel = computeExecutiveFunnel(rows);
  const channels = computeChannelBreakdown(rows);
  const retention = computeRetentionSignals(rows);
  const ns = funnel.northStar;

  const paidPlatforms = computePaidPlatformBreakdown(rows);
  const experimentExposures = rows.filter((r) => r.event_name === 'growth_experiment_exposure').length;
  const experimentConversions = rows.filter((r) => r.event_name === 'growth_experiment_conversion').length;
  const paidSignals = rows.filter((r) => r.event_name === 'paid_conversion_signal').length;
  const paidClicks = rows.filter((r) => r.event_name === 'paid_click_capture').length;

  return `
    <div class="growth-command-center" style="margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid var(--border,#e5e7eb)">
      <h3 style="margin:0 0 8px 0">Growth Command Center</h3>
      <p class="text-muted" style="margin:0 0 14px;font-size:13px">North star: qualified leads → paid conversion. Export: <code>npm run metrics:growth</code> · <code>npm run metrics:growth:command</code></p>
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-label">Leads (north star)</div><div class="stat-value">${ns.qualifiedLeads}</div><div class="stat-sub">${ns.landingToLeadPct ?? '—'}% landing→lead</div></div>
        <div class="stat-card"><div class="stat-label">Paid conversions</div><div class="stat-value">${ns.paidConversions}</div><div class="stat-sub">${ns.landingToPaidPct ?? '—'}% landing→paid</div></div>
        <div class="stat-card"><div class="stat-label">Checkout CR</div><div class="stat-value">${ns.checkoutCrPct ?? '—'}%</div><div class="stat-sub">${ns.checkoutComplete} / ${ns.checkoutStart} starts</div></div>
        <div class="stat-card"><div class="stat-label">Retention returns</div><div class="stat-value">${retention.returnVisits}</div><div class="stat-sub">${retention.recoveryRatePct ?? '—'}% abandon recovery</div></div>
        <div class="stat-card"><div class="stat-label">Paid click capture</div><div class="stat-value">${paidClicks}</div><div class="stat-sub">${paidSignals} conversion signals</div></div>
        <div class="stat-card"><div class="stat-label">Experiments</div><div class="stat-value">${experimentExposures}</div><div class="stat-sub">${experimentConversions} conversions · ${experimentExposures ? conversionPct(experimentConversions, experimentExposures) : '—'}</div></div>
      </div>
      <div style="height:14px"></div>
      <h4 style="margin:0 0 10px 0;font-size:14px">Paid platforms (P5.1)</h4>
      <table class="table" style="margin-bottom:16px">
        <thead><tr><th>Platform</th><th>Clicks</th><th>Landings</th><th>Leads</th><th>Checkout</th><th>Paid</th><th>Lead CR</th></tr></thead>
        <tbody>
          ${paidPlatforms.length ? paidPlatforms.map((p) => `
            <tr>
              <td>${escapeHtml(p.platform)}</td>
              <td>${p.clicks}</td>
              <td>${p.landings}</td>
              <td>${p.leads}</td>
              <td>${p.checkouts}</td>
              <td>${p.paid}</td>
              <td>${p.leadCrPct ?? '—'}%</td>
            </tr>
          `).join('') : '<tr><td colspan="7">Henüz paid platform verisi yok — UTM + click ID ile trafik bekleniyor.</td></tr>'}
        </tbody>
      </table>
      <h4 style="margin:0 0 10px 0;font-size:14px">Acquisition channels (leads)</h4>
      <table class="table">
        <thead><tr><th>Channel</th><th>Leads</th><th>Checkouts</th><th>Paid</th><th>Revenue ₺</th></tr></thead>
        <tbody>
          ${channels.slice(0, 8).map((ch) => `
            <tr>
              <td>${escapeHtml(ch.channel)}</td>
              <td>${ch.leads}</td>
              <td>${ch.checkouts}</td>
              <td>${ch.paid}</td>
              <td>${(ch.revenueCents / 100).toLocaleString('tr-TR')}</td>
            </tr>
          `).join('') || '<tr><td colspan="5">Henüz kanal verisi yok</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

async function loadPlatformAnalytics(filterId = platformAnalyticsFilter, dataMode = platformAnalyticsDataMode) {
  const el = document.getElementById('platform-analytics-root');
  if (!el) return;

  platformAnalyticsFilter = filterId;
  platformAnalyticsDataMode = dataMode;
  el.innerHTML = '<div class="empty">Yükleniyor…</div>';

  if (!analyticsCleanStartAt) {
    analyticsCleanStartAt = await fetchAnalyticsCleanStartAt(sb);
  }

  const preset = FILTER_PRESETS.find((p) => p.id === filterId) || FILTER_PRESETS[1];
  const windowDays = preset.id === 'all' ? 365 : preset.days;
  const rowLimit =
    preset.id === 'all' || preset.id === '30d'
      ? SCALE_LIMITS.admin.executiveRowLimit
      : SCALE_LIMITS.admin.analyticsRowLimit;

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const sinceMs = new Date(since).getTime();
  const selectExpr =
    'event_name, event_category, funnel, funnel_step, revenue_cents, attribution, created_at, session_id, properties, page_path, is_internal, internal_reason, traffic_type, utm_source, utm_medium, utm_campaign, referrer, landing_page';

  const analyticsRes = await fetchAdminTable(sb, {
    table: 'analytics_events',
    select: selectExpr,
    limit: rowLimit,
    order: { column: 'created_at', ascending: false },
    direct: () =>
      sb
        .from('analytics_events')
        .select(selectExpr)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(rowLimit)
  });

  const analyticsBanner = renderAdminDataSourceNotices([analyticsRes]);

  if (analyticsRes.error && !(analyticsRes.data || []).length) {
    lastPlatformAnalyticsRows = null;
    el.innerHTML = `${analyticsBanner}${renderPlatformAnalyticsEmptyGuide({
      fetchError: analyticsRes.error.message
    })}`;
    bindPlatformAnalyticsToolbar(el, filterId, dataMode);
    return;
  }

  const rows = (analyticsRes.data || []).filter((row) => {
    const ts = row.created_at ? new Date(row.created_at).getTime() : 0;
    return ts >= sinceMs;
  });

  const timeFiltered = filterRowsByPreset(rows, filterId);
  const filteredRows = filterAnalyticsRows(
    timeFiltered,
    dataMode,
    dataMode === ANALYTICS_DATA_MODES.REAL ? analyticsCleanStartAt : null
  );

  if (!rows.length || !filteredRows.length) {
    lastPlatformAnalyticsRows = filteredRows.length ? filteredRows : null;
    el.innerHTML = `${analyticsBanner}${renderAnalyticsDataModeToolbar(dataMode)}${renderPlatformAnalyticsEmptyGuide({
      rawRowCount: rows.length,
      filteredRowCount: filteredRows.length,
      dataMode
    })}`;
    bindPlatformAnalyticsToolbar(el, filterId, dataMode);
    return;
  }

  lastPlatformAnalyticsRows = filteredRows;
  const siteMetrics = buildSiteAnalyticsMetrics(filteredRows);
  lastPlatformSiteMetrics = siteMetrics;
  const dataModeToolbar = renderAnalyticsDataModeToolbar(dataMode);
  const siteDashboard = renderSiteAnalyticsDashboard(siteMetrics, {
    filterId,
    windowNote: `${preset.label} · ${ANALYTICS_DATA_MODE_LABELS?.[dataMode] || dataMode} · en fazla ${rowLimit} event. Temiz başlangıç: ${analyticsCleanStartAt ? new Date(analyticsCleanStartAt).toLocaleString('tr-TR') : '—'}`
  });

  const windowNote = `<p class="text-muted-sm" style="margin:0 0 12px">Legacy platform özeti · ${escapeHtml(preset.label)}.</p>`;

  const kpiRows = filteredRows;
  const pageViews = countEvents(kpiRows, 'page_view') + countEvents(kpiRows, 'auto_page_view');
  const authModal = countEvents(kpiRows, 'auth_modal_open');
  const authLoginOk = countEvents(kpiRows, 'auth_login_success');
  const authRegisterOk = countEvents(kpiRows, 'auth_register_success');
  const checkoutStarted = countFunnelStep(kpiRows, 'checkout_start');
  const checkoutCompleted = countFunnelStep(kpiRows, 'checkout_complete');
  const paidConversions = countFunnelStep(kpiRows, 'paid_conversion');
  const leadSubmit = countEvents(kpiRows, 'lead_submit') + countEvents(kpiRows, 'auto_lead_submit');
  const partnerOk = countEvents(kpiRows, 'partner_dispatch_success');
  const partnerFail = countEvents(kpiRows, 'partner_dispatch_failed');
  const financeStart = countEvents(kpiRows, 'finance_funnel_start');
  const ctaClicks = countEvents(kpiRows, 'cta_click');
  const pricingViews = countFunnelStep(kpiRows, 'pricing_view');
  const checkoutAbandoned = countEvents(kpiRows, 'checkout_abandoned');
  const partnerLanding = countEvents(kpiRows, 'partner_landing_view');
  const partnerApply = countEvents(kpiRows, 'partner_application_submit');
  const partnerOnboarding = countEvents(kpiRows, 'partner_onboarding_view');
  const partnerWebhookDraft = countEvents(kpiRows, 'partner_webhook_draft_saved');
  const referralLand = countEvents(kpiRows, 'growth_referral_land');
  const referralShare = countEvents(kpiRows, 'growth_referral_share');
  const referralConvert = countEvents(kpiRows, 'growth_referral_convert');
  const referralLinkCreated = countEvents(kpiRows, 'referral_link_created');
  const referralLinkClicked = countEvents(kpiRows, 'referral_link_clicked');
  const referralSignup = countEvents(kpiRows, 'referral_signup');
  const referralConversion = countEvents(kpiRows, 'referral_conversion');
  const upsellViews = countEvents(kpiRows, 'upsell_view');
  const upsellClicks = countEvents(kpiRows, 'upsell_click');
  const upsellConversions = countEvents(kpiRows, 'upsell_conversion');
  const lifecycleEnroll = countEvents(kpiRows, 'lifecycle_enroll_requested');
  const growthChannelRows = kpiRows.filter((row) => row.event_category === 'growth');
  const growthByChannel = growthChannelRows.reduce((acc, row) => {
    const channel = row.funnel || row.attribution?.growth_channel || 'growth';
    acc[channel] = (acc[channel] || 0) + 1;
    return acc;
  }, {});

  const autoSteps = [
    ['auto_page_view', 'Sayfa'],
    ['auto_form_started', 'Form başladı'],
    ['auto_form_submitted', 'Form gönderildi'],
    ['auto_results_rendered', 'Sonuç'],
    ['auto_modal_open', 'Lead modal'],
    ['auto_lead_submit', 'Lead']
  ];

  const dropoffRows = autoSteps.map(([eventName, label], index) => {
    const count = countEvents(kpiRows, eventName);
    const prev = index > 0 ? countEvents(kpiRows, autoSteps[index - 1][0]) : count;
    const drop = index > 0 && prev ? Math.max(0, prev - count) : 0;
    return { label, count, drop, conv: index > 0 ? conversionPct(count, prev) : '100%' };
  });

  const attributionMap = kpiRows
    .filter((row) => row.event_name === 'revenue_attributed' || row.event_name === 'checkout_completed')
    .reduce((acc, row) => {
      const source = row.attribution?.utm_source || 'direct';
      acc[source] = (acc[source] || 0) + Number(row.revenue_cents || 0);
      return acc;
    }, {});

  const crmEvents = kpiRows.filter((row) => row.event_name.startsWith('crm_'));

  const executiveFunnel = [
    ['landing_visit', 'Landing ziyaret'],
    ['hero_cta_click', 'Hero CTA'],
    ['auto_start', 'Auto başlangıç'],
    ['wizard_step', 'Wizard adım'],
    ['wizard_complete', 'Wizard tamam'],
    ['results_view', 'Sonuç görüntüleme'],
    ['lead_submit', 'Lead gönderimi'],
    ['pricing_view', 'Pricing görüntüleme'],
    ['checkout_start', 'Checkout başlangıç'],
    ['checkout_complete', 'Checkout tamam'],
    ['paid_conversion', 'Ücretli dönüşüm']
  ];

  const executiveRows = executiveFunnel.map(([key, label], index) => {
    const count = countFunnelStep(kpiRows, key);
    const prevKey = index > 0 ? executiveFunnel[index - 1][0] : null;
    const prev = prevKey ? countFunnelStep(kpiRows, prevKey) : count;
    return { label, count, conv: index > 0 ? conversionPct(count, prev) : '—' };
  });

  const channelRevenue = sumRevenueCentsByChannel(
    kpiRows,
    ['paid_conversion', 'checkout_completed', 'checkout_complete', 'revenue_attributed']
  );
  const channelLeads = kpiRows
    .filter((row) => row.event_name === 'lead_submit' || row.event_name === 'auto_lead_submit')
    .reduce((acc, row) => {
      const props = row.properties || {};
      const channel =
        props.growth_channel ||
        row.attribution?.growth_channel ||
        row.attribution?.utm_source ||
        'direct';
      acc[channel] = (acc[channel] || 0) + 1;
      return acc;
    }, {});

  el.innerHTML = `
    ${analyticsBanner}
    ${dataModeToolbar}
    ${siteDashboard}
    <div style="height:24px"></div>
    ${windowNote}
    ${renderGrowthCommandCenter(kpiRows)}
    <h3 style="margin:0 0 14px 0;">Executive growth funnel (kanal bazlı)</h3>
    <p class="text-muted" style="margin:0 0 12px;font-size:13px;">Tutarlı event isimleri; legacy alias’lar toplamda bir kez sayılır. Gelir: paid_conversion + checkout.</p>
    <table class="table">
      <thead><tr><th>Adım</th><th>Olay</th><th>Önceki adıma CR</th></tr></thead>
      <tbody>
        ${executiveRows.map((row) => `
          <tr>
            <td>${escapeHtml(row.label)}</td>
            <td><strong>${row.count}</strong></td>
            <td>${row.conv}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div style="height:20px"></div>
    <h3 style="margin:0 0 14px 0;">Kanal → gelir (₺, revenue_cents)</h3>
    <div class="stat-grid">
      ${Object.entries(channelRevenue).length ? Object.entries(channelRevenue)
    .sort((a, b) => b[1] - a[1])
    .map(([channel, cents]) => `
        <div class="stat-card">
          <div class="stat-label">${escapeHtml(channel)}</div>
          <div class="stat-value">${(cents / 100).toLocaleString('tr-TR')} ₺</div>
          <div class="stat-sub">${channelLeads[channel] || 0} lead</div>
        </div>
      `).join('') : '<p class="empty">Henüz ücretli dönüşüm yok.</p>'}
    </div>

    <div style="height:20px"></div>
    <h3 style="margin:0 0 14px 0;">Conversion özeti</h3>
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">Page views</div><div class="stat-value">${pageViews}</div></div>
      <div class="stat-card"><div class="stat-label">CTA clicks</div><div class="stat-value">${ctaClicks}</div><div class="stat-sub">${conversionPct(ctaClicks, pageViews)}</div></div>
      <div class="stat-card"><div class="stat-label">Auth conversion</div><div class="stat-value">${authLoginOk + authRegisterOk}</div><div class="stat-sub">${conversionPct(authLoginOk + authRegisterOk, authModal)}</div></div>
      <div class="stat-card"><div class="stat-label">Signup</div><div class="stat-value">${authRegisterOk}</div><div class="stat-sub">${conversionPct(authRegisterOk, authModal)}</div></div>
      <div class="stat-card"><div class="stat-label">Checkout</div><div class="stat-value">${checkoutCompleted}</div><div class="stat-sub">${conversionPct(checkoutCompleted, checkoutStarted)}</div></div>
      <div class="stat-card"><div class="stat-label">Paid conversion</div><div class="stat-value">${paidConversions}</div><div class="stat-sub">${conversionPct(paidConversions, checkoutStarted)}</div></div>
      <div class="stat-card"><div class="stat-label">Lead conversion</div><div class="stat-value">${leadSubmit}</div><div class="stat-sub">${conversionPct(leadSubmit, pageViews)}</div></div>
      <div class="stat-card"><div class="stat-label">Partner dispatch OK</div><div class="stat-value">${partnerOk}</div><div class="stat-sub">${conversionPct(partnerOk, partnerOk + partnerFail)}</div></div>
      <div class="stat-card"><div class="stat-label">Finance funnel</div><div class="stat-value">${financeStart}</div></div>
    </div>

    <div style="height:20px"></div>
    <h3 style="margin:0 0 14px 0;">Auto funnel drop-off</h3>
    <table class="table">
      <thead><tr><th>Adım</th><th>Olay</th><th>Düşüş</th><th>Adım CR</th></tr></thead>
      <tbody>
        ${dropoffRows.map((row) => `
          <tr>
            <td>${escapeHtml(row.label)}</td>
            <td>${row.count}</td>
            <td>${row.drop || '—'}</td>
            <td>${row.conv}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div style="height:20px"></div>
    <h3 style="margin:0 0 14px 0;">Partner acquisition (P2)</h3>
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">Partner landing</div><div class="stat-value">${partnerLanding}</div></div>
      <div class="stat-card"><div class="stat-label">Applications</div><div class="stat-value">${partnerApply}</div><div class="stat-sub">${conversionPct(partnerApply, partnerLanding)}</div></div>
      <div class="stat-card"><div class="stat-label">Onboarding views</div><div class="stat-value">${partnerOnboarding}</div><div class="stat-sub">${conversionPct(partnerOnboarding, partnerApply)}</div></div>
      <div class="stat-card"><div class="stat-label">Webhook drafts</div><div class="stat-value">${partnerWebhookDraft}</div></div>
      <div class="stat-card"><div class="stat-label">Dispatch OK</div><div class="stat-value">${partnerOk}</div><div class="stat-sub">${conversionPct(partnerOk, partnerOk + partnerFail)}</div></div>
    </div>

    <div style="height:20px"></div>
    <h3 style="margin:0 0 14px 0;">Growth engine (P1)</h3>
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">Pricing views</div><div class="stat-value">${pricingViews}</div><div class="stat-sub">${conversionPct(checkoutStarted, pricingViews)} → checkout</div></div>
      <div class="stat-card"><div class="stat-label">Checkout abandoned</div><div class="stat-value">${checkoutAbandoned}</div><div class="stat-sub">${conversionPct(checkoutAbandoned, checkoutStarted)}</div></div>
      <div class="stat-card"><div class="stat-label">Referral land</div><div class="stat-value">${referralLand}</div></div>
      <div class="stat-card"><div class="stat-label">Referral share</div><div class="stat-value">${referralShare}</div></div>
      <div class="stat-card"><div class="stat-label">Referral convert</div><div class="stat-value">${referralConvert}</div><div class="stat-sub">${conversionPct(referralConvert, referralLand)}</div></div>
      <div class="stat-card"><div class="stat-label">Link created</div><div class="stat-value">${referralLinkCreated}</div></div>
      <div class="stat-card"><div class="stat-label">Link clicked</div><div class="stat-value">${referralLinkClicked}</div><div class="stat-sub">${conversionPct(referralSignup, referralLinkClicked)} → signup</div></div>
      <div class="stat-card"><div class="stat-label">Referral signup</div><div class="stat-value">${referralSignup}</div></div>
      <div class="stat-card"><div class="stat-label">Referral conversion</div><div class="stat-value">${referralConversion}</div><div class="stat-sub">${conversionPct(referralConversion, referralSignup)}</div></div>
      <div class="stat-card"><div class="stat-label">Lifecycle enroll</div><div class="stat-value">${lifecycleEnroll}</div></div>
      <div class="stat-card"><div class="stat-label">Upsell views</div><div class="stat-value">${upsellViews}</div><div class="stat-sub">${conversionPct(upsellClicks, upsellViews)} click</div></div>
      <div class="stat-card"><div class="stat-label">Upsell conversion</div><div class="stat-value">${upsellConversions}</div><div class="stat-sub">${conversionPct(upsellConversions, upsellClicks)}</div></div>
    </div>
    ${Object.keys(growthByChannel).length ? `
      <div style="height:12px"></div>
      <div class="stat-grid">
        ${Object.entries(growthByChannel).map(([channel, count]) => `
          <div class="stat-card">
            <div class="stat-label">${escapeHtml(channel)}</div>
            <div class="stat-value">${count}</div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <div style="height:20px"></div>
    <h3 style="margin:0 0 14px 0;">Revenue attribution (UTM)</h3>
    <div class="stat-grid">
      ${Object.entries(attributionMap).length ? Object.entries(attributionMap).map(([source, cents]) => `
        <div class="stat-card">
          <div class="stat-label">${escapeHtml(source)}</div>
          <div class="stat-value">${(cents / 100).toLocaleString('tr-TR')} ₺</div>
        </div>
      `).join('') : '<p class="empty">Henüz revenue_attributed event yok.</p>'}
    </div>

    <div style="height:20px"></div>
    <h3 style="margin:0 0 14px 0;">Admin CRM outcomes</h3>
    <p class="text-muted">${crmEvents.length} CRM event (son 2500 kayıt içinde)</p>
  `;

  bindPlatformAnalyticsToolbar(el, filterId, dataMode);
}

function bindPlatformAnalyticsToolbar(el, filterId, dataMode) {
  if (!el) return;
  el.querySelectorAll('[data-site-analytics-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      loadPlatformAnalytics(btn.getAttribute('data-site-analytics-filter') || '7d', platformAnalyticsDataMode);
    });
  });
  el.querySelectorAll('[data-analytics-data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      loadPlatformAnalytics(platformAnalyticsFilter, btn.getAttribute('data-analytics-data-mode') || ANALYTICS_DATA_MODES.REAL);
    });
  });
  el.querySelectorAll('[data-action="export-platform-csv"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const kind = btn.getAttribute('data-kind');
      const result = exportPlatformAnalyticsCsv(lastPlatformSiteMetrics, kind);
      if (result.ok) toast('CSV indirildi');
      else if (result.error === 'empty') toast('Dışa aktarılacak satır yok', 'error');
      else toast('Önce veri yükleyin', 'error');
    });
  });
  el.querySelectorAll('[data-page-target="settings"]').forEach((btn) => {
    btn.addEventListener('click', () => showPage('settings', btn));
  });
  el.querySelectorAll('[data-action="analytics-path-detail"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const path = btn.getAttribute('data-path');
      if (!path || !lastPlatformAnalyticsRows?.length) {
        toast('Önce veri yükleyin', 'error');
        return;
      }
      const panel = document.getElementById('platform-path-detail-panel');
      const detail = buildPagePathDetail(lastPlatformAnalyticsRows, path);
      if (panel) {
        panel.outerHTML = renderPagePathDetailPanel(detail);
        document
          .getElementById('platform-path-detail-panel')
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  });
}

async function createPartnerEndpoint() {
  const name = document.getElementById('partner-name')?.value?.trim();
  const routeType = document.getElementById('partner-route-type')?.value;
  const webhookUrl = document.getElementById('partner-webhook-url')?.value?.trim();
  const priorityWeight = Number(document.getElementById('partner-priority-weight')?.value || 100);
  const dailyCapRaw = document.getElementById('partner-daily-cap')?.value;
  const notes = document.getElementById('partner-notes')?.value || '';

  if (!name || !routeType || !webhookUrl) {
    toast('Partner adı, yönlendirme tipi ve webhook URL zorunlu.', 'error');
    return;
  }

  await adminAction({
    action: 'insert',
    table: 'partner_endpoints',
    id: 'new',
    values: {
      name,
      route_type: routeType,
      webhook_url: webhookUrl,
      is_active: true,
      priority_weight: priorityWeight,
      daily_cap: dailyCapRaw ? Number(dailyCapRaw) : null,
      notes
    }
  });

  toast('Partner kanalı eklendi');
  ['partner-name', 'partner-webhook-url', 'partner-daily-cap', 'partner-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  loadPartnerEndpoints();
}

async function provisionPartnerFromApplication(applicationId) {
  const { data: app, error } = await sb
    .from('partner_applications')
    .select('*')
    .eq('id', applicationId)
    .maybeSingle();

  if (error || !app) {
    toast('Başvuru bulunamadı.', 'error');
    return;
  }

  const webhookUrl = app.webhook_url_draft
    || window.prompt('Webhook URL (HTTPS):', 'https://');
  if (!webhookUrl) return;

  const endpointName = app.company_name.slice(0, 80);

  await adminAction({
    action: 'insert',
    table: 'partner_endpoints',
    id: 'new',
    values: {
      name: endpointName,
      route_type: app.category,
      webhook_url: webhookUrl,
      is_active: false,
      priority_weight: 100,
      daily_cap: null,
      notes: `Provisioned from application ${app.id}`
    }
  });

  const { data: endpointRow, error: lookupError } = await sb
    .from('partner_endpoints')
    .select('id')
    .eq('webhook_url', webhookUrl)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError || !endpointRow?.id) {
    toast('Endpoint oluşturuldu ancak ID alınamadı — listeyi yenileyin.', 'error');
    loadPartnerEndpoints();
    return;
  }

  const endpointId = endpointRow.id;

  await adminAction({
    action: 'update',
    table: 'partner_applications',
    id: applicationId,
    values: {
      partner_endpoint_id: endpointId,
      status: 'negotiation'
    }
  });

  toast('Partner endpoint oluşturuldu — test sonrası aktif edin.');
  loadPartnerApplications();
  loadPartnerEndpoints();
}

async function editPartnerEndpoint(id, currentName, currentWebhook) {
  const name = window.prompt('Partner adı:', currentName || '');
  if (!name) return;
  const webhookUrl = window.prompt('Webhook URL:', currentWebhook || '');
  if (!webhookUrl) return;

  await adminAction({
    action: 'update',
    table: 'partner_endpoints',
    id,
    values: {
      name: name.trim(),
      webhook_url: webhookUrl.trim()
    }
  });

  toast('Partner endpoint güncellendi');
  loadPartnerEndpoints();
}

async function togglePartnerEndpoint(id, active) {
  await adminAction({
    action: 'update',
    table: 'partner_endpoints',
    id,
    values: {
      is_active: active === 'true'
    }
  });

  toast('Partner kanalı güncellendi');
  loadPartnerEndpoints();
}

async function loadPartnerEndpoints() {
  const el = document.getElementById('partner-endpoints-list');
  if (!el) return;

  const res = await fetchAdminTable(sb, {
    table: 'partner_endpoints',
    limit: 200,
    order: { column: 'created_at', ascending: false },
    direct: () =>
      sb.from('partner_endpoints').select('*').order('priority_weight', { ascending: false })
  });

  if (res.error && !(res.data || []).length) {
    el.innerHTML = `${renderAdminDataSourceNotices([res])}<p class="empty">Hata: ${escapeHtml(res.error.message)}</p>`;
    return;
  }

  const data = res.data || [];
  if (!data.length) {
    el.innerHTML = '<p class="empty">Partner endpoint yok.</p>';
    return;
  }

  el.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Partner</th>
          <th>Yönlendirme</th>
          <th>Durum</th>
          <th>Öncelik</th>
          <th>Günlük Limit</th>
          <th>Bugün Gönderilen</th>
          <th>Sağlık</th>
          <th>Başarılı</th>
          <th>Başarısız</th>
          <th>İşlem</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(row => `
          <tr>
            <td><strong>${escapeHtml(row.name)}</strong></td>
            <td>${escapeHtml({
              dealer_partner: 'Bayi / Galeri',
              finance_partner: 'Finansman',
              insurance_partner: 'Sigorta',
              premium_report: 'Premium Rapor',
              general_sales: 'Genel Satış'
            }[row.route_type] || row.route_type)}</td>
            <td>${row.is_active ? 'Aktif' : 'Pasif'}</td>
            <td>${row.priority_weight || 0}</td>
            <td>${row.daily_cap || '∞'}</td>
            <td>${row.sent_today || 0}</td>
            <td><span class="badge ${row.health_status === 'healthy' ? 'badge-green' : row.health_status === 'degraded' ? 'badge-yellow' : 'badge-red'}">${escapeHtml(row.health_status || 'healthy')}</span></td>
            <td>${row.success_count || 0}</td>
            <td>${row.fail_count || 0}</td>
            <td class="table-actions">
              <button class="btn btn-ghost btn-sm" data-action="edit-partner-endpoint" data-id="${safeAttr(row.id)}" data-name="${safeAttr(row.name)}" data-webhook="${safeAttr(row.webhook_url)}">Düzenle</button>
              <button class="btn btn-ghost btn-sm" data-action="toggle-partner-endpoint" data-id="${safeAttr(row.id)}" data-active="${row.is_active ? 'false' : 'true'}">
                ${row.is_active ? 'Pasif yap' : 'Aktif yap'}
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

const partnerApplicationsCtx = () => ({
  sb,
  adminAction,
  toast,
  escapeHtml,
  safeAttr,
  renderAdminDataSourceNotices
});

function initPartnerApplicationsShell() {
  const shell = document.getElementById('partner-applications-shell');
  if (!shell || shell.dataset.ready === '1') return;
  shell.innerHTML = getPartnerApplicationFormMarkup();
  shell.dataset.ready = '1';
  bindPartnerApplicationsAdminUi(partnerApplicationsCtx());
}

async function loadPartnerApplications() {
  initPartnerApplicationsShell();
  await loadPartnerApplicationsPage(partnerApplicationsCtx());
}

async function loadPartnerDispatchLogs() {
  const leadFilter = document.getElementById('dispatch-log-lead-filter')?.value?.trim() || '';
  const el = document.getElementById('partner-dispatch-logs-list');
  if (!el) return;

  const res = await fetchAdminTable(sb, {
    table: 'partner_lead_dispatch_logs',
    limit: 150,
    order: { column: 'created_at', ascending: false },
    direct: () => {
      let query = sb
        .from('partner_lead_dispatch_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(150);
      if (leadFilter) {
        query = query.eq('lead_id', leadFilter);
      }
      return query;
    }
  });

  if (res.error && !(res.data || []).length) {
    el.innerHTML = `${renderAdminDataSourceNotices([res])}<p class="empty">Hata: ${escapeHtml(res.error.message)}</p>`;
    return;
  }

  let data = res.data || [];
  if (leadFilter && res.source === 'admin-action') {
    data = data.filter((row) => String(row.lead_id) === leadFilter);
  }

  if (!data.length) {
    el.innerHTML = '<p class="empty">Teslimat logu yok.</p>';
    return;
  }

  el.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Zaman</th>
          <th>Lead</th>
          <th>Route</th>
          <th>Endpoint</th>
          <th>Kaynak</th>
          <th>HTTP</th>
          <th>Süre</th>
          <th>Sonuç</th>
          <th>Hata</th>
        </tr>
      </thead>
      <tbody>
        ${data.map((row) => `
          <tr>
            <td>${formatShortDate(row.created_at)}</td>
            <td><code>${escapeHtml(String(row.lead_id || '').slice(0, 8))}…</code></td>
            <td>${escapeHtml(row.partner_route)}</td>
            <td>${escapeHtml(row.endpoint_name || '—')}</td>
            <td>${escapeHtml(row.trigger_source)}</td>
            <td>${row.http_status ?? '—'}</td>
            <td>${row.duration_ms != null ? row.duration_ms + 'ms' : '—'}</td>
            <td>${row.success ? '<span class="badge badge-green">OK</span>' : '<span class="badge badge-red">FAIL</span>'}</td>
            <td title="${safeAttr(row.error_message || '')}">${escapeHtml(formatDispatchError(row.error_message))}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function manualDispatchLead(leadId, force = false) {
  const { data: sessionData } = await sb.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) {
    toast('Oturum bulunamadı', 'error');
    return;
  }

  const { data, error } = await sb.functions.invoke('partner-dispatch', {
    body: { lead_id: leadId, force },
    headers: { Authorization: `Bearer ${token}` }
  });

  if (error) {
    toast(error.message || 'Dispatch başarısız', 'error');
    return;
  }

  if (data?.ok) {
    toast(`Partner teslimatı: ${data.endpoint || 'OK'}`, 'success');
  } else {
    toast(data?.error || data?.reason || 'Dispatch başarısız', 'error');
  }

  loadAutoLeads();
  loadPartnerDispatchLogs();
  loadPartnerEndpoints();
  if (activeDrawerLeadId) refreshOpenLeadDrawer();
}

function formatShortDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDispatchError(value) {
  if (!value) return '—';
  const text = String(value);
  return text.length > 48 ? text.slice(0, 48) + '…' : text;
}

function renderPartnerOpsKpiStrip(leads) {
  const root = document.getElementById('partner-ops-kpi-root');
  if (!root) return;
  const kpi = computePartnerOpsKpis(leads);
  const cards = [
    ['Sıcak lead', kpi.hot, 'hot / very_hot'],
    ['Bekliyor', kpi.pending, 'partner pending'],
    ['Teslim', kpi.dispatched, 'webhook OK'],
    ['Hata', kpi.dispatch_failed, 'retry kuyruğu'],
    ['Dead', kpi.dispatch_dead, '5/5 retry'],
    ['Geciken takip', kpi.overdueFollowUp, 'follow-up']
  ];
  root.innerHTML = cards.map(([label, value, sub]) => `
    <div class="partner-ops-stat">
      <div class="partner-ops-stat-label">${escapeHtml(label)}</div>
      <div class="partner-ops-stat-value">${value}</div>
      <div class="partner-ops-stat-sub">${escapeHtml(sub)}</div>
    </div>
  `).join('');
}

async function loadPartnerOpsFunnel() {
  const root = document.getElementById('partner-ops-funnel-root');
  if (!root) return;

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await sb
    .from('analytics_events')
    .select('event_name')
    .gte('created_at', since)
    .in('event_name', [
      'partner_landing_view',
      'partner_application_submit',
      'partner_onboarding_view',
      'partner_webhook_draft_saved',
      'partner_onboarding_complete',
      'partner_dispatch_success',
      'partner_dispatch_failed'
    ])
    .limit(SCALE_LIMITS.admin.partnerFunnelRowLimit);

  if (error || !data?.length) {
    root.hidden = true;
    return;
  }

  const c = aggregatePartnerFunnelEvents(data);
  const steps = [
    ['Landing', c.partner_landing_view],
    ['Başvuru', c.partner_application_submit],
    ['Onboarding', c.partner_onboarding_view],
    ['Webhook', c.partner_webhook_draft_saved],
    ['Tamam', c.partner_onboarding_complete],
    ['Dispatch OK', c.partner_dispatch_success]
  ];

  root.hidden = false;
  root.innerHTML = `
    <h4>Partner acquisition funnel (son 30 gün)</h4>
    <div class="partner-ops-funnel-steps">
      ${steps.map(([label, count], i) => {
        const prev = i > 0 ? steps[i - 1][1] : 0;
        const conv = i > 0 ? ` · ${funnelConversionPct(count, prev)}` : '';
        return `${i > 0 ? '<span class="partner-ops-funnel-arrow">→</span>' : ''}
          <span class="partner-ops-funnel-step">${escapeHtml(label)}: <strong>${count}</strong>${escapeHtml(conv)}</span>`;
      }).join('')}
      <span class="partner-ops-funnel-step">Dispatch fail: <strong>${c.partner_dispatch_failed}</strong></span>
    </div>
    <p class="text-muted-sm" style="margin-top:8px;">Platform analytics; RLS ile yalnızca yetkili admin görür.</p>
  `;
}

function renderRetryCell(lead) {
  const retry = describeRetryState(lead);
  return `
    <div class="partner-retry-cell" title="${safeAttr(lead.last_dispatch_error || '')}">
      <strong>${escapeHtml(retry.headline)}</strong>
      <span>${escapeHtml(retry.detail)}</span>
    </div>`;
}

function renderPartnerStatusBadgeHtml(status) {
  const meta = partnerStatusBadge(status);
  return `<span class="badge ${meta.badge}">${escapeHtml(meta.label)}</span>`;
}

async function fetchLeadDispatchLogs(leadId) {
  if (!leadId) return [];
  const res = await fetchAdminTable(sb, {
    table: 'partner_lead_dispatch_logs',
    limit: 500,
    order: { column: 'created_at', ascending: false },
    direct: () =>
      sb
        .from('partner_lead_dispatch_logs')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(10)
  });
  return (res.data || []).filter((row) => row.lead_id === leadId).slice(0, 10);
}

async function refreshOpenLeadDrawer() {
  if (!activeDrawerLeadId) return;
  const res = await fetchAdminRowById(sb, {
    table: 'auto_leads',
    id: activeDrawerLeadId
  });
  if (res.data) await openLeadDrawer(res.data);
}

function formatFollowUpLabel(lead) {
  if (lead.follow_up_done) return 'Tamamlandı';
  if (!lead.follow_up_at) return '—';

  const date = new Date(lead.follow_up_at);
  const now = new Date();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const nextDayStart = new Date(todayStart);
  nextDayStart.setDate(nextDayStart.getDate() + 2);

  if (date < now) return 'Gecikti';
  if (date >= todayStart && date < tomorrowStart) return 'Bugün';
  if (date >= tomorrowStart && date < nextDayStart) return 'Yarın';

  return date.toLocaleDateString('tr-TR');
}



function getFollowUpBadgeClass(label) {
  if (label === 'Gecikti') return 'badge-red';
  if (label === 'Bugün') return 'badge-yellow';
  if (label === 'Yarın') return 'badge-blue';
  if (label === 'Tamamlandı') return 'badge-green';
  return '';
}


async function renderMoatArchitectureStrip(leads = [], feedback = [], signals = []) {
  const root = document.getElementById('moat-architecture-root');
  if (!root) return;

  let productFeedback = [];
  try {
    productFeedback = await adminList(sb, {
      table: 'product_feedback',
      order: { column: 'created_at', ascending: false },
      limit: 500
    });
  } catch {
    /* migration pending */
  }

  const useful = productFeedback.filter((r) => r.useful_rating === 'yes').length;
  const metrics = buildMoatMetricsFromAdminData(leads, feedback, signals, {
    productFeedbackTotal: productFeedback.length,
    productFeedbackUseful: useful
  });

  root.innerHTML = renderMoatArchitectureAdminStrip(metrics);
}

async function renderMoatIntelligenceStrip(leads = []) {
  const root = document.getElementById('moat-intelligence-root');
  if (!root) return;

  let feedback = [];
  let signals = [];
  try {
    feedback = await adminList(sb, {
      table: 'decision_feedback',
      order: { column: 'created_at', ascending: false },
      limit: 500
    });
  } catch {
    /* migration may be pending */
  }

  try {
    signals = await adminList(sb, {
      table: 'outcome_signal_events',
      order: { column: 'created_at', ascending: false },
      limit: 2000
    });
  } catch {
    /* migration may be pending */
  }

  const dash = computeMoatDashboard(leads, feedback, signals);
  const helpful = dash.feedbackCounts.helpful || 0;
  const unclear = dash.feedbackCounts.unclear || 0;
  const contact = dash.feedbackCounts.contact || 0;

  const segmentRows = dash.topSegments.length
    ? dash.topSegments
        .map(
          (s) => `
        <tr>
          <td><code>${escapeHtml(s.segment_key)}</code></td>
          <td>${s.sample_size}</td>
          <td>${s.win_rate_pct != null ? `${s.win_rate_pct}%` : '—'}</td>
          <td>${s.avg_match_score ?? '—'}</td>
        </tr>`
        )
        .join('')
    : '<tr><td colspan="4" class="text-muted">Henüz ≥3 lead içeren segment yok</td></tr>';

  root.innerHTML = `
    <div class="partner-ops-stat">
      <div class="partner-ops-stat-label">Outcome graph</div>
      <div class="partner-ops-stat-value">${dash.outcomeCount}</div>
      <div class="partner-ops-stat-sub">partner kapanış</div>
    </div>
    <div class="partner-ops-stat">
      <div class="partner-ops-stat-label">Skor kalibrasyonu</div>
      <div class="partner-ops-stat-value">${dash.calibratedLeadCount}</div>
      <div class="partner-ops-stat-sub">outcome-informed</div>
    </div>
    <div class="partner-ops-stat">
      <div class="partner-ops-stat-label">Decision session</div>
      <div class="partner-ops-stat-value">${dash.decisionLinkedCount}</div>
      <div class="partner-ops-stat-sub">lead bağlantısı</div>
    </div>
    <div class="partner-ops-stat">
      <div class="partner-ops-stat-label">Feedback loop</div>
      <div class="partner-ops-stat-value">${dash.feedbackTotal}</div>
      <div class="partner-ops-stat-sub">faydalı ${helpful} · belirsiz ${unclear} · destek ${contact}</div>
    </div>
    <div class="partner-ops-stat">
      <div class="partner-ops-stat-label">Outcome signals</div>
      <div class="partner-ops-stat-value">${dash.outcomeSignalTotal || 0}</div>
      <div class="partner-ops-stat-sub">kural tabanlı kalibrasyon girdisi</div>
    </div>
    <details class="moat-segment-details" style="grid-column:1/-1;margin-top:8px;">
      <summary>Outcome signal dağılımı (90g)</summary>
      <table class="table" style="margin-top:10px;">
        <thead><tr><th>Sinyal</th><th>Adet</th></tr></thead>
        <tbody>${
          Object.keys(dash.outcomeSignalByType || {}).length
            ? Object.entries(dash.outcomeSignalByType)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(
                  ([type, count]) =>
                    `<tr><td><code>${escapeHtml(type)}</code></td><td>${count}</td></tr>`
                )
                .join('')
            : '<tr><td colspan="2" class="text-muted">Henüz outcome signal yok</td></tr>'
        }</tbody>
      </table>
      <p class="text-muted-sm" style="margin-top:8px;">KVKK: kişisel veri saklanmaz; skor kalibrasyonu deterministik kurallarla uygulanır (ML eğitimi iddiası yok).</p>
    </details>
    <details class="moat-segment-details" style="grid-column:1/-1;margin-top:12px;">
      <summary>Segment benchmark (anonim, k≥3)</summary>
      <table class="table" style="margin-top:10px;">
        <thead><tr><th>Segment</th><th>n</th><th>Win %</th><th>Ort. uyum</th></tr></thead>
        <tbody>${segmentRows}</tbody>
      </table>
    </details>
  `;

  await renderMoatArchitectureStrip(leads, feedback, signals);
}

async function loadAutoLeads() {
  const el = document.getElementById('auto-leads-list');
  if (!el) return;

  let data = [];

  try {
    data = await adminList(sb, {
      table: 'auto_leads',
      order: { column: 'created_at', ascending: false },
      limit: 1000
    });
    data.sort((a, b) => {
      const scoreDiff = (Number(b.lead_score) || 0) - (Number(a.lead_score) || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  } catch (error) {
    el.innerHTML = `<p class="empty">Hata: ${escapeHtml(error.message)}</p>`;
    return;
  }

  if (!data?.length) {
    el.innerHTML = '<p class="empty">Henüz lead yok.</p>';
    await renderMoatIntelligenceStrip([]);
    await renderMoatArchitectureStrip([], [], []);
    return;
  }

  await renderMoatIntelligenceStrip(data);
  renderPartnerOpsKpiStrip(data);
  loadPartnerOpsFunnel();

  const searchValue = (document.getElementById('auto-leads-search')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('auto-leads-status-filter')?.value || '';
  const partnerFilter = document.getElementById('auto-leads-partner-filter')?.value || '';
  const notesOnly = document.getElementById('auto-leads-notes-only')?.checked || false;
  const followFilter = document.getElementById('auto-leads-follow-filter')?.value || '';
  const now = new Date();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const filteredData = data.filter((lead) => {
    const matchesStatus =
      !statusFilter ||
      (statusFilter === 'hot_only' && ['hot', 'very_hot'].includes(lead.priority)) ||
      (statusFilter === 'dispatch_failed' && lead.partner_status === 'dispatch_failed') ||
      (statusFilter === 'dispatch_dead' && lead.partner_status === 'dispatch_dead') ||
      (statusFilter === 'dispatched' && lead.partner_status === 'dispatched') ||
      (statusFilter === 'won_only' && lead.partner_status === 'won') ||
      (statusFilter === 'hide_test' && lead.status !== 'test_spam') ||
      lead.status === statusFilter;
    const hasNotes = !!(lead.notes || '').trim();
    const matchesNotes = !notesOnly || hasNotes;
    const haystack = [
      lead.email,
      lead.phone,
      lead.notes,
      lead.interest_type,
      lead.usage,
      lead.body,
      lead.fuel,
      lead.vehicle,
      lead.priority,
      lead.purchase_timeline,
      lead.financing_intent,
      lead.trade_in,
      lead.urgency,
      lead.contact_preference
    ].filter(Boolean).join(' ').toLowerCase();

    const followDate = lead.follow_up_at ? new Date(lead.follow_up_at) : null;
    const isFollowDone = lead.follow_up_done === true;
    const matchesFollow =
      !followFilter ||
      (followFilter === 'today' && followDate && followDate <= todayEnd && !isFollowDone) ||
      (followFilter === 'overdue' && followDate && followDate < now && !isFollowDone) ||
      (followFilter === 'open' && followDate && !isFollowDone) ||
      (followFilter === 'done' && isFollowDone);

    const matchesPartner = !partnerFilter || lead.partner_status === partnerFilter;

    return matchesStatus && matchesPartner && matchesNotes && matchesFollow && (!searchValue || haystack.includes(searchValue));
  });

  if (!filteredData.length) {
    el.innerHTML = '<p class="empty">Filtreye uygun lead bulunamadı.</p>';
    return;
  }

  el.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Telefon</th>
          <th>Bütçe</th>
          <th>Skor</th>
          <th>Öncelik</th>
          <th>Partner</th>
          <th>Retry / teslimat</th>
          <th>Son hata</th>
          <th>Tahmini Gelir</th>
          <th>Gerçek Gelir</th>
          <th>Durum</th>
          <th>Takip</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${filteredData.map(lead => `
          <tr
            class="${lead.follow_up_at && !lead.follow_up_done && new Date(lead.follow_up_at) < new Date() ? 'lead-overdue' : ''}"
            data-action="view-auto-lead"
            data-lead='${safeAttr(JSON.stringify(lead))}'>
            <td>
              ${lead.phone || '—'}
              ${lead.growth_channel ? `<div class="text-muted" style="font-size:11px;margin-top:4px">${escapeHtml(lead.growth_channel)}${lead.referral_code ? ` · ref:${escapeHtml(lead.referral_code)}` : ''}</div>` : ''}
            </td>
            <td>${lead.budget ? Number(lead.budget).toLocaleString('tr-TR') + ' ₺' : '—'}</td>
            <td><strong>${lead.lead_score || 0}</strong></td>
            <td><span class="badge ${
              lead.priority === 'very_hot' ? 'badge-red' :
              lead.priority === 'hot' ? 'badge-yellow' :
              lead.priority === 'warm' ? 'badge-blue' :
              'badge-green'
            }">${lead.priority || 'cold'}</span></td>
            <td>
              <div style="margin-bottom:6px;">${renderPartnerStatusBadgeHtml(lead.partner_status)}</div>
              ${renderPartnerStatusSelect(lead)}
            </td>
            <td>${renderRetryCell(lead)}</td>
            <td title="${safeAttr(lead.last_dispatch_error || '')}">${escapeHtml(formatDispatchError(lead.last_dispatch_error))}</td>
<td>
  <input class="form-input" data-action="update-estimated-revenue" data-id="${lead.id}" value="${lead.estimated_revenue || ''}" placeholder="₺">
</td>
<td>
  <input class="form-input" data-action="update-actual-revenue" data-id="${lead.id}" value="${lead.actual_revenue || ''}" placeholder="₺">
</td>

            <td>
              <select class="status-select status-${lead.status || 'new'}" data-action="update-auto-status" data-id="${lead.id}">
                <option value="new" ${lead.status === 'new' ? 'selected' : ''}>Yeni</option>
                <option value="first_contact" ${lead.status === 'first_contact' || lead.status === 'called' ? 'selected' : ''}>İlk temas</option>
                <option value="unreachable" ${lead.status === 'unreachable' ? 'selected' : ''}>Ulaşılamadı</option>
                <option value="callback" ${lead.status === 'callback' ? 'selected' : ''}>Tekrar ara</option>
                <option value="proposal_sent" ${lead.status === 'proposal_sent' || lead.status === 'interested' ? 'selected' : ''}>Teklif gönderildi</option>
                <option value="financing" ${lead.status === 'financing' ? 'selected' : ''}>Finansman süreci</option>
                <option value="insurance" ${lead.status === 'insurance' ? 'selected' : ''}>Sigorta süreci</option>
                <option value="won" ${lead.status === 'won' || lead.status === 'closed' ? 'selected' : ''}>Kazanıldı</option>
                <option value="lost" ${lead.status === 'lost' || lead.status === 'rejected' ? 'selected' : ''}>Kaybedildi</option>
                <option value="spam" ${lead.status === 'spam' ? 'selected' : ''}>Test/Spam</option>
              </select>
            </td>
            <td>
              ${(() => {
                const followLabel = formatFollowUpLabel(lead);
                const badgeClass = getFollowUpBadgeClass(followLabel);
                return badgeClass
                  ? `<span class="badge ${badgeClass}">${followLabel}</span>`
                  : followLabel;
              })()}
            </td>
            <td>
              <div class="table-actions">
                ${lead.phone ? `<a class="btn btn-success btn-sm" href="https://wa.me/${normalizePhoneForWhatsapp(lead.phone)}?text=Merhaba%2C%20isteBul%20Auto%20talebinizi%20gördük.%20Size%20uygun%20teklifleri%20hazırlayabiliriz." target="_blank" rel="noopener">WhatsApp</a>` : ''}
                ${['dispatch_failed', 'dispatch_dead', 'pending', 'dispatched'].includes(lead.partner_status) ? `<button class="btn btn-warning btn-sm" data-action="manual-dispatch" data-id="${lead.id}">Partner Gönder</button>` : ''}
                ${['dispatch_failed', 'dispatch_dead', 'dispatched', 'pending'].includes(lead.partner_status) ? `<button class="btn btn-ghost btn-sm" data-action="view-lead-dispatch-logs" data-id="${lead.id}">Log</button>` : ''}
                ${['dispatch_failed', 'dispatch_dead'].includes(lead.partner_status) ? `<button class="btn btn-warning btn-sm" data-action="retry-dispatch" data-id="${lead.id}">Retry</button>` : ''}
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}


function getPartnerStatusOptions(route) {
  const workflows = {
    insurance_partner: [
      ['pending', 'Bekliyor'],
      ['dispatched', 'Partnere Gönderildi'],
      ['dispatch_failed', 'Gönderim Hatası'],
      ['dispatch_dead', 'Gönderim Durduruldu'],
      ['contacted', 'İletişime Geçildi'],
      ['quote_sent', 'Teklif Gönderildi'],
      ['policy_issued', 'Poliçe Kesildi'],
      ['paid', 'Paid'],
      ['closed', 'Closed']
    ],
    dealer_partner: [
      ['pending', 'Bekliyor'],
      ['dispatched', 'Partnere Gönderildi'],
      ['accepted', 'Partner Kabul'],
      ['dispatch_failed', 'Gönderim Hatası'],
      ['dispatch_dead', 'Gönderim Durduruldu'],
      ['contacted', 'İletişime Geçildi'],
      ['offer_sent', 'Teklif Gönderildi'],
      ['test_drive', 'Test Sürüşü'],
      ['negotiation', 'Negotiation'],
      ['won', 'Kazanıldı'],
      ['delivered', 'Teslim Edildi'],
      ['lost', 'Kaybedildi']
    ],
    finance_partner: [
      ['pending', 'Bekliyor'],
      ['docs_requested', 'Docs Requested'],
      ['preapproved', 'Preapproved'],
      ['approved', 'Approved'],
      ['funded', 'Funded'],
      ['closed', 'Closed']
    ],
    premium_report: [
      ['pending', 'Bekliyor'],
      ['purchased', 'Purchased'],
      ['delivered', 'Teslim Edildi']
    ],
    general_sales: [
      ['pending', 'Bekliyor'],
      ['dispatched', 'Partnere Gönderildi'],
      ['dispatch_failed', 'Gönderim Hatası'],
      ['dispatch_dead', 'Gönderim Durduruldu'],
      ['contacted', 'İletişime Geçildi'],
      ['quoted', 'Teklif Verildi'],
      ['won', 'Kazanıldı'],
      ['lost', 'Kaybedildi']
    ]
  };

  return workflows[route] || workflows.general_sales;
}

function isRevenueRealizedPartnerStatus(route, status) {
  const realizedByRoute = {
    insurance_partner: ['paid', 'closed'],
    dealer_partner: ['won', 'delivered'],
    finance_partner: ['funded', 'closed'],
    premium_report: ['purchased', 'delivered'],
    general_sales: ['won', 'closed']
  };

  return (realizedByRoute[route] || realizedByRoute.general_sales).includes(status);
}

function renderPartnerStatusSelect(lead) {
  const options = getPartnerStatusOptions(lead.partner_route)
    .map(([value, label]) =>
      `<option value="${value}" ${lead.partner_status === value ? 'selected' : ''}>${label}</option>`
    )
    .join('');

  return `
<select
  class="status-select"
  data-action="update-partner-status"
  data-id="${lead.id}"
>
  ${options}
</select>`;
}

function renderDispatchPanelHtml(lead, logs) {
  const retry = describeRetryState(lead);
  const toneClass = `lead-drawer-retry--${retry.tone === 'success' ? 'success' : retry.tone === 'danger' ? 'danger' : retry.tone === 'warning' ? 'warning' : ''}`;

  const logsHtml = logs.length ? `
    <table class="dispatch-log-mini">
      <thead><tr><th>Zaman</th><th>Endpoint</th><th>HTTP</th><th>Sonuç</th></tr></thead>
      <tbody>
        ${logs.map((row) => `
          <tr>
            <td>${formatShortDate(row.created_at)}</td>
            <td>${escapeHtml(row.endpoint_name || '—')}</td>
            <td>${row.http_status ?? '—'}</td>
            <td>${row.success ? '<span class="badge badge-green">OK</span>' : `<span class="badge badge-red" title="${safeAttr(row.error_message || '')}">FAIL</span>`}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : '<p class="text-muted-sm">Henüz teslimat denemesi yok.</p>';

  return `
    <section class="lead-drawer-section ${toneClass}">
      <h4>Partner teslimat</h4>
      <p><strong>${escapeHtml(retry.headline)}</strong></p>
      <p class="text-muted-sm">${escapeHtml(retry.detail)}</p>
      ${lead.last_dispatch_error ? `<p class="text-muted-sm" style="margin-top:8px;">Son hata: <code>${escapeHtml(lead.last_dispatch_error)}</code></p>` : ''}
      ${lead.next_retry_at ? `<p class="text-muted-sm">next_retry_at: ${formatShortDate(lead.next_retry_at)}</p>` : ''}
      <div class="table-actions" style="margin-top:12px;flex-wrap:wrap;">
        <button class="btn btn-warning btn-sm" data-action="manual-dispatch" data-id="${lead.id}">Manuel gönder</button>
        ${['dispatch_failed', 'dispatch_dead'].includes(lead.partner_status) ? `<button class="btn btn-ghost btn-sm" data-action="retry-dispatch" data-id="${lead.id}">Retry (force)</button>` : ''}
        <button class="btn btn-ghost btn-sm" data-action="view-lead-dispatch-logs" data-id="${lead.id}">Tam log sayfası</button>
      </div>
      <div style="margin-top:12px;">${logsHtml}</div>
    </section>`;
}

async function openLeadDrawer(lead) {
  lead = enrichLeadQualFields(lead);
  const drawer = document.getElementById('lead-drawer');
  const overlay = document.getElementById('lead-drawer-overlay');
  const content = document.getElementById('lead-drawer-content');
  const titleEl = document.getElementById('lead-drawer-title');
  const subtitleEl = document.getElementById('lead-drawer-subtitle');

  if (!drawer || !overlay || !content) return;

  activeDrawerLeadId = lead.id;
  if (titleEl) titleEl.textContent = lead.contact_name || lead.phone || 'Lead detayı';
  if (subtitleEl) {
    subtitleEl.textContent = `Skor ${lead.lead_score || 0} · ${lead.priority || '—'} · ${lead.partner_route || '—'}`;
  }

  const fmt = (v) => escapeHtml(v || '—');
  const label = (map, value) => map[value] || value || '—';

  const usageLabels = { family: 'Aile', city: 'Şehir', long: 'Uzun yol' };
  const bodyLabels = { suv: 'SUV', sedan: 'Sedan', hatchback: 'Hatchback' };
  const fuelLabels = { any: 'Fark etmez', gasoline: 'Benzin', diesel: 'Dizel', hybrid: 'Hibrit', electric: 'Elektrikli' };
  const loanLabels = { yes: 'Evet', no: 'Hayır' };
  const timelineLabels = {
    '0-30': '0–30 gün',
    '1-3': '1–3 ay',
    '3-6': '3–6 ay',
    '6+': '6+ ay'
  };
  const tradeInLabels = { yes: 'Evet', no: 'Hayır' };
  const urgencyLabels = { low: 'Düşük', medium: 'Orta', high: 'Yüksek' };
  const contactPrefLabels = { phone: 'Telefon', whatsapp: 'WhatsApp', email: 'E-posta' };
  const statusLabels = {
    new: 'Yeni',
    called: 'İlk temas',
    interested: 'Teklif gönderildi',
    closed: 'Kazanıldı',
    rejected: 'Kaybedildi',
    first_contact: 'İlk temas',
    unreachable: 'Ulaşılamadı',
    callback: 'Tekrar ara',
    proposal_sent: 'Teklif gönderildi',
    financing: 'Finansman süreci',
    insurance: 'Sigorta süreci',
    won: 'Kazanıldı',
    lost: 'Kaybedildi',
    spam: 'Test/Spam'
  };

  const whatsappUrl = lead.phone ? `https://wa.me/${normalizePhoneForWhatsapp(lead.phone)}` : '';
  const notesHistory = Array.isArray(lead.notes_history) ? lead.notes_history : [];
  const normalizedStatus = lead.status === 'called' ? 'first_contact' : lead.status;

  const pipelineChips = CRM_PIPELINE_QUICK.map(([value, chipLabel]) => `
    <button type="button" class="lead-pipeline-chip${normalizedStatus === value || lead.status === value ? ' is-active' : ''}"
      data-action="drawer-set-status" data-id="${lead.id}" data-status="${value}">${escapeHtml(chipLabel)}</button>
  `).join('');

  const logs = await fetchLeadDispatchLogs(lead.id);
  const partnerPool = await fetchActivePartnerPool(sb);

  content.innerHTML = `
    ${renderDispatchPanelHtml(lead, logs)}
    ${renderLeadAiSummaryHtml(lead, escapeHtml, {
      partners: partnerPool.partners,
      source: partnerPool.source
    })}
    <section class="lead-drawer-section">
      <h4>CRM durumu</h4>
      <div class="lead-pipeline-chips">${pipelineChips}</div>
      <select class="status-select status-${lead.status || 'new'}" data-action="update-auto-status" data-id="${lead.id}" style="width:100%;margin-bottom:10px;">
        <option value="new" ${lead.status === 'new' ? 'selected' : ''}>Yeni</option>
        <option value="first_contact" ${lead.status === 'first_contact' || lead.status === 'called' ? 'selected' : ''}>İlk temas</option>
        <option value="callback" ${lead.status === 'callback' ? 'selected' : ''}>Tekrar ara</option>
        <option value="proposal_sent" ${lead.status === 'proposal_sent' || lead.status === 'interested' ? 'selected' : ''}>Teklif</option>
        <option value="won" ${lead.status === 'won' || lead.status === 'closed' ? 'selected' : ''}>Kazanıldı</option>
        <option value="lost" ${lead.status === 'lost' || lead.status === 'rejected' ? 'selected' : ''}>Kaybedildi</option>
      </select>
      <div>${renderPartnerStatusBadgeHtml(lead.partner_status)} ${renderPartnerStatusSelect(lead)}</div>
    </section>
    <div class="table-actions" style="margin-bottom:14px;flex-wrap:wrap;gap:10px;">
      ${lead.phone ? `<button class="btn btn-success btn-sm" data-action="track-whatsapp-click" data-email="${lead.email || ''}" data-phone="${lead.phone || ''}" data-whatsapp-url="${whatsappUrl}">WhatsApp</button>` : ''}
      ${lead.phone ? `<a class="btn btn-ghost btn-sm" href="tel:${lead.phone}">Ara</a>` : ''}
      <button class="btn btn-ghost btn-sm" data-action="log-lead-sales-touch" data-id="${lead.id}" data-touch="follow_up">Satış takibi</button>
      <button class="btn btn-ghost btn-sm" data-action="complete-follow-up" data-id="${lead.id}">Takibi tamamla</button>
      <input type="datetime-local" class="form-input" id="follow-up-date" value="${lead.follow_up_at ? new Date(lead.follow_up_at).toISOString().slice(0, 16) : ''}" style="max-width:220px;">
      <button class="btn btn-ghost btn-sm" data-action="save-follow-up" data-id="${lead.id}">Takip kaydet</button>
    </div>
    <div class="lead-detail-grid">
      <div class="lead-detail-item"><div class="lead-detail-label">Email</div><div class="lead-detail-value">${fmt(lead.email)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Telefon</div><div class="lead-detail-value">${fmt(lead.phone)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Ad</div><div class="lead-detail-value">${fmt(lead.contact_name)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Aranma zamanı</div><div class="lead-detail-value">${fmt(lead.preferred_contact_time)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Bütçe</div><div class="lead-detail-value">${lead.budget ? Number(lead.budget).toLocaleString('tr-TR') + ' ₺' : '—'}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Kullanım</div><div class="lead-detail-value">${label(usageLabels, lead.usage)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Kasa</div><div class="lead-detail-value">${label(bodyLabels, lead.body)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Yakıt</div><div class="lead-detail-value">${label(fuelLabels, lead.fuel)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Kredi</div><div class="lead-detail-value">${label(loanLabels, lead.loan)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Satın alma zamanı</div><div class="lead-detail-value">${label(timelineLabels, lead.purchase_timeline)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Finansman niyeti</div><div class="lead-detail-value">${label(loanLabels, lead.financing_intent)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Takas</div><div class="lead-detail-value">${label(tradeInLabels, lead.trade_in)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Aciliyet</div><div class="lead-detail-value">${label(urgencyLabels, lead.urgency)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">İletişim tercihi</div><div class="lead-detail-value">${label(contactPrefLabels, lead.contact_preference)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">İlgi</div><div class="lead-detail-value">${fmt(lead.interest_type)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Araç</div><div class="lead-detail-value">${fmt(lead.vehicle)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Lead Skoru</div><div class="lead-detail-value">${fmt(lead.lead_score)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Öncelik</div><div class="lead-detail-value">${fmt(lead.priority)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Partner</div><div class="lead-detail-value">${fmt(lead.partner_route)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Partner Durumu</div><div class="lead-detail-value">${fmt(lead.partner_status)}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Durum</div><div class="lead-detail-value">${label(statusLabels, lead.status)}</div></div>
      <div class="lead-detail-item">
        <div class="lead-detail-label">Yeni Not</div>
        <textarea id="new-lead-note" class="form-input" rows="3" placeholder="Yeni not ekle..."></textarea>
        <div style="height:8px"></div>
        <button class="btn btn-ghost btn-sm" data-action="add-lead-note" data-id="${lead.id}" data-history='${safeAttr(JSON.stringify(notesHistory))}'>Not Ekle</button>
      </div>
      <div class="lead-detail-item">
        <div class="lead-detail-label">Not Geçmişi</div>
        <div class="lead-detail-value">
          ${notesHistory.length ? notesHistory.slice().reverse().map((item) => `
            <div style="padding:8px 0;border-bottom:1px solid #2a3441;">
              <div style="font-size:12px;color:#94a3b8;">${item.at ? new Date(item.at).toLocaleString('tr-TR') : '—'}</div>
              <div>${escapeHtml(item.text || '—')}</div>
            </div>
          `).join('') : 'Henüz not geçmişi yok.'}
        </div>
      </div>
      <div class="lead-detail-item"><div class="lead-detail-label">AI özet</div><div class="lead-detail-value">${fmt(lead.ai_summary) !== '—' ? escapeHtml(fmt(lead.ai_summary)) : '<span class="text-muted-sm">—</span>'}${lead.ai_confidence ? ` <span class="badge badge-blue">${escapeHtml(lead.ai_confidence)}</span>` : ''}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Son Not</div><div class="lead-detail-value">${escapeHtml(fmt(lead.notes))}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Tarih</div><div class="lead-detail-value">${lead.created_at ? new Date(lead.created_at).toLocaleString('tr-TR') : '—'}</div></div>
    </div>
  `;

  drawer.classList.add('open');
  overlay.classList.add('open');
}

function closeLeadDrawer() {
  activeDrawerLeadId = null;
  document.getElementById('lead-drawer')?.classList.remove('open');
  document.getElementById('lead-drawer-overlay')?.classList.remove('open');
}




async function addLeadNote(id, history) {
  const input = document.getElementById('new-lead-note');
  const text = input?.value?.trim();

  if (!text) {
    toast('Not yazın');
    return;
  }

  const notesHistory = Array.isArray(history) ? history : [];
  const nextHistory = [
    ...notesHistory,
    {
      at: new Date().toISOString(),
      text
    }
  ];

  await adminAction({
    action: 'update',
    table: 'auto_leads',
    id,
    values: {
      notes: text,
      notes_history: nextHistory
    }
  });

  toast('Not geçmişe eklendi');
  closeLeadDrawer();
  loadAutoLeads();
}


async function completeFollowUp(id) {
  await adminAction({
    action: 'update',
    table: 'auto_leads',
    id,
    values: {
      follow_up_done: true
    }
  });

  toast('Takip tamamlandı');
  closeLeadDrawer();
  loadAutoLeads();
}

async function saveFollowUp(id) {
  const input = document.getElementById('follow-up-date');
  if (!input?.value) {
    toast('Takip tarihi seçin');
    return;
  }

  await adminAction({
    action: 'update',
    table: 'auto_leads',
    id,
    values: {
      follow_up_at: new Date(input.value).toISOString(),
      follow_up_done: false
    }
  });

  toast('Takip tarihi kaydedildi');
  loadAutoLeads();
}


async function updateAutoLeadStatus(id, status) {
  trackAdminCrmEvent('crm_lead_status_change', { lead_id: id, status });
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const twoDaysLater = new Date();
  twoDaysLater.setDate(twoDaysLater.getDate() + 2);

  const values = { status };

  if (status === 'first_contact' || status === 'called' || status === 'unreachable' || status === 'callback') {
    values.follow_up_at = tomorrow.toISOString();
    values.follow_up_done = false;
  }

  if (status === 'proposal_sent' || status === 'interested' || status === 'financing' || status === 'insurance') {
    values.follow_up_at = twoDaysLater.toISOString();
    values.follow_up_done = false;
  }

  if (status === 'won' || status === 'lost' || status === 'spam' || status === 'closed' || status === 'rejected') {
    values.follow_up_done = true;
  }

  if (status === 'new') {
    values.follow_up_at = null;
    values.follow_up_done = false;
  }

  await adminAction({
    action: 'update',
    table: 'auto_leads',
    id,
    values
  });

  toast('Lead durumu güncellendi');
  loadAutoLeads();
  loadAutoAnalytics();
  loadPartnerEndpoints();
  if (activeDrawerLeadId === id) refreshOpenLeadDrawer();
}

async function updateAutoLeadNotes(id, notes) {
  await adminAction({
    action: 'update',
    table: 'auto_leads',
    id,
    values: { notes }
  });

  toast('Not kaydedildi');
  loadAutoLeads();
}


async function exportAutoLeadsCsv() {
  const { data, error } = await sb
    .from('auto_leads')
    .select('*')
    .order('lead_score', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    toast(`CSV hata: ${error.message}`);
    return;
  }

  const rows = data || [];
  if (!rows.length) {
    toast('Dışa aktarılacak lead yok');
    return;
  }

  const headers = [
    'email',
    'phone',
    'budget',
    'usage',
    'body',
    'fuel',
    'loan',
    'interest_type',
    'vehicle',
    'lead_score',
    'priority',
    'partner_route',
    'partner_status',
    'status',
    'notes',
    'created_at'
  ];

  const escapeCsv = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((key) => escapeCsv(row[key])).join(','))
  ].join('\n');

  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);

  a.href = url;
  a.download = `auto-leads-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  toast('CSV indirildi');
}



async function setUserRole(id, role) {
  if (role === 'admin') {
    toast('Admin yetkisi panelden verilemez. Supabase üzerinden yönetin.', 'error');
    return;
  }
  await adminAction({ action: 'update', table: 'profiles', id, values: { role } });
  toast(role === 'user' ? 'Yetki kaldırıldı' : 'Rol güncellendi');
  loadUsers();
}

async function banUser(id) {
  if (!confirm('Bu kullanıcıyı engellemek istediğinize emin misiniz?')) return;
  await adminAction({ action: 'update', table: 'profiles', id, values: { is_banned: true } });
  toast('Kullanıcı engellendi');
  loadUsers();
}

sb.auth.getSession().then(({ data }) => {
  if (data.session) { currentUser = data.session.user; showApp(); }
});

async function loadUnifiedFunnelDashboard(dataMode = unifiedFunnelDataMode) {
  const el = document.getElementById('unified-funnel-root');
  if (!el) return;

  unifiedFunnelDataMode = dataMode;
  el.innerHTML = '<div class="empty">Yükleniyor…</div>';

  if (!analyticsCleanStartAt) {
    analyticsCleanStartAt = await fetchAnalyticsCleanStartAt(sb);
  }

  const since = new Date(Date.now() - SCALE_LIMITS.admin.analyticsWindowDays * 24 * 60 * 60 * 1000).toISOString();
  const selectExpr =
    'event_name, event_type, session_id, metadata, created_at, is_internal, traffic_type, properties';

  const [analyticsRes, housingRes, vacationRes] = await Promise.all([
    fetchAdminTable(sb, {
      table: 'analytics_events',
      select: selectExpr,
      limit: SCALE_LIMITS.admin.analyticsRowLimit,
      order: { column: 'created_at', ascending: false },
      direct: () =>
        sb.from('analytics_events').select(selectExpr).gte('created_at', since).order('created_at', { ascending: false }).limit(SCALE_LIMITS.admin.analyticsRowLimit)
    }),
    fetchAdminTable(sb, {
      table: 'housing_events',
      select: 'event_type, session_id, metadata, created_at',
      limit: 5000,
      order: { column: 'created_at', ascending: false },
      direct: () => sb.from('housing_events').select('event_type, session_id, metadata, created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(5000)
    }),
    fetchAdminTable(sb, {
      table: 'vacation_events',
      select: 'event_type, session_id, metadata, created_at',
      limit: 5000,
      order: { column: 'created_at', ascending: false },
      direct: () => sb.from('vacation_events').select('event_type, session_id, metadata, created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(5000)
    })
  ]);

  const { buildUnifiedFunnelMetrics, renderUnifiedFunnelDashboard } = await import('./admin/unified-funnel-dashboard.js');
  const filteredAnalytics = filterAnalyticsRows(
    analyticsRes.data || [],
    dataMode,
    dataMode === ANALYTICS_DATA_MODES.REAL ? analyticsCleanStartAt : null
  );
  const rows = [
    ...filteredAnalytics,
    ...(housingRes.data || []),
    ...(vacationRes.data || [])
  ];
  const metrics = buildUnifiedFunnelMetrics(rows);
  const banner = renderAdminDataSourceNotices([analyticsRes, housingRes, vacationRes]);
  const dataModeToolbar = renderAnalyticsDataModeToolbar(dataMode);
  const modeNote = `<p class="text-muted-sm" style="margin:0 0 12px">${escapeHtml(ANALYTICS_DATA_MODE_LABELS[dataMode] || dataMode)} · Platform eventleri ITE ile filtrelenir; konut/tatil legacy tabloları ham veridir.</p>`;
  el.innerHTML = `${banner}${dataModeToolbar}${modeNote}${renderUnifiedFunnelDashboard(metrics, escapeHtml)}`;

  el.querySelectorAll('[data-analytics-data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      loadUnifiedFunnelDashboard(btn.getAttribute('data-analytics-data-mode') || ANALYTICS_DATA_MODES.REAL);
    });
  });
}

registerAdminPageHandlers({
  dashboard: () => loadDashboard(),
  settings: () => loadSettings(),
  content: () => loadSettings(),
  announcements: () => loadAnnouncements(),
  campaigns: () => loadCampaigns(),
  faqs: () => loadFaqs(),
  blog: () => loadPosts(),
  listings: () => loadListings(),
  users: () => loadUsers(),
  'auto-leads': () => loadAutoLeads(),
  'vacation-analytics': () => vacationAdmin.loadVacationAnalytics(),
  'vacation-leads': () => vacationAdmin.loadVacationLeads(),
  'vertical-leads': () => verticalAdmin.loadVerticalLeads(),
  'vacation-scenarios': () => vacationAdmin.loadVacationScenarios(),
  'vacation-settings': () => vacationAdmin.loadVacationSettings(),
  'vacation-destinations': () => vacationAdmin.loadVacationDestinations(),
  'vacation-partners': () => vacationAdmin.loadVacationPartners(),
  'vacation-scoring': () => vacationAdmin.loadVacationScoring(),
  'housing-leads': () => housingAdmin.loadHousingLeads(),
  'housing-locations': () => housingAdmin.loadHousingLocations(),
  'housing-partners': () => housingAdmin.loadHousingPartners(),
  'housing-scoring': () => housingAdmin.loadHousingSettings(),
  'finance-leads': () => financeAdmin.loadFinanceLeads(),
  'finance-partners': () => financeAdmin.loadFinancePartners(),
  'finance-scoring': () => financeAdmin.loadFinanceScoring(),
  'sigorta-leads': () => sigortaAdmin.loadSigortaLeads(),
  'unified-funnel': () => loadUnifiedFunnelDashboard(),
  'auto-analytics': () => loadAutoAnalytics(),
  'platform-analytics': () => loadPlatformAnalytics(),
  'dashboard-ceo': () => refreshInternalDashboard('ceo', 'dashboard-ceo-root'),
  'dashboard-growth': () => refreshInternalDashboard('growth', 'dashboard-growth-root'),
  'dashboard-revenue': () => refreshInternalDashboard('revenue', 'dashboard-revenue-root'),
  'dashboard-partner-ops': () =>
    refreshInternalDashboard('partner_ops', 'dashboard-partner-ops-root'),
  'dashboard-support': () => refreshInternalDashboard('support', 'dashboard-support-root'),
  'ops-ai-assistant': () => refreshOpsAiAssistant(),
  'investor-metrics': () => loadExecutiveKpis(),
  observability: () => loadOperationalHealth(),
  'ops-command-center': () => loadOpsCommandCenter(),
  'startup-operating-center': () => loadStartupOperatingCenter(),
  'scale-architecture': () => loadScaleArchitectureCenter(),
  'company-operating-system': () => loadCompanyOperatingSystem(),
  'hiring-architecture': () => loadHiringArchitecture(),
  'international-expansion': () => loadInternationalExpansion(),
  'category-dominance': () => loadCategoryDominance(),
  'competitor-attack': () => loadCompetitorAttack(),
  'expansion-prioritization': () => loadExpansionPrioritization(),
  'strategic-partnerships': () => loadStrategicPartnerships(),
  'acquisition-exit': () => loadAcquisitionExit(),
  'partner-endpoints': () => loadPartnerEndpoints(),
  'partner-applications': async () => {
    await initPartnerSalesMachineAdmin().catch(() => {});
    await loadPartnerApplications();
  },
  'partner-dispatch-logs': () => loadPartnerDispatchLogs(),
  payments: () => loadPaymentsAdminPage()
});

function bindAdminPanelEvents() {
  document.getElementById('login-btn')?.addEventListener('click', login);
  document.getElementById('login-password')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') login();
  });
  document.getElementById('logout-btn')?.addEventListener('click', logout);

  document.querySelectorAll('[data-page-target]').forEach((el) => {
    el.addEventListener('click', () => {
      showPage(el.dataset.pageTarget, el);
      if (window.matchMedia('(max-width: 900px)').matches) {
        closeAdminSidebar();
      }
    });
  });

  initAdminMobileNav();
  initAdminShell();

  document.querySelectorAll('[data-action="save-settings"]').forEach((el) => {
    el.addEventListener('click', saveSettings);
  });

  document.querySelector('[data-action="save-announcement"]')?.addEventListener('click', saveAnnouncement);
  document.querySelector('[data-action="save-faq"]')?.addEventListener('click', saveFaq);
  document.querySelector('[data-action="save-post"]')?.addEventListener('click', savePost);
  document.querySelector('[data-action="save-campaign"]')?.addEventListener('click', saveCampaign);
  document.querySelector('[data-action="reset-campaign-form"]')?.addEventListener('click', resetCampaignForm);
  document.querySelector('[data-action="seed-default-campaigns"]')?.addEventListener('click', seedDefaultCampaigns);

  document.addEventListener('click', async (event) => {
    const el = event.target.closest('[data-action]');
    if (!el) return;

    if (await vacationAdmin.handleVacationAction(event, el)) return;
    if (await housingAdmin.handleHousingAction(event, el)) return;
    if (await financeAdmin.handleFinanceAction(event, el)) return;
    if (await sigortaAdmin.handleSigortaAction(event, el)) return;

    const { action, id, active, role } = el.dataset;
    const isActive = active === 'true';

    if (action === 'update-auto-status') {
      updateAutoLeadStatus(id, el.value);
      return;
    }

    if (action === 'update-partner-status') {
      let values = {
        partner_status: el.value
      };

      try {
        const row = el.closest('tr');
        const lead = row?.dataset?.lead ? JSON.parse(row.dataset.lead) : null;

        if (lead && isRevenueRealizedPartnerStatus(lead.partner_route, el.value)) {
          const estimatedInput = row?.querySelector('[data-action="update-estimated-revenue"]');
          const estimatedRevenue = Number(estimatedInput?.value || lead.estimated_revenue || 0);

          values = {
            ...values,
            actual_revenue: estimatedRevenue
          };
        }
      } catch {}

      adminAction({
        action: 'update',
        table: 'auto_leads',
        id,
        values
      }).then(() => {
        trackAdminCrmEvent('crm_partner_status_change', {
          lead_id: id,
          partner_status: el.value
        });
        toast('Partner durumu güncellendi', 'success');
        loadAutoLeads();
        loadAutoAnalytics();
        loadPlatformAnalytics();
      });

      return;
    }

    

    if (action === 'simulate-partner-won' || action === 'simulate-partner-lost') {
      const ANON = window.__env?.SUPABASE_ANON_KEY;
      const status = action === 'simulate-partner-won' ? 'won' : 'lost';
      const revenue = action === 'simulate-partner-won' ? 5000 : 0;

      const secret = prompt('Partner callback secret girin');
      if (!secret || !ANON) {
        toast('Secret veya env eksik', 'error');
        return;
      }

      const callbackUrl = `${getFunctionsBaseUrl()}/partner-callback`;
      if (!callbackUrl.startsWith('http')) {
        toast('SUPABASE_URL eksik', 'error');
        return;
      }

      fetch(callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: ANON,
          Authorization: `Bearer ${ANON}`,
          'x-partner-callback-secret': secret
        },
        body: JSON.stringify({
          lead_id: id,
          partner_status: status,
          actual_revenue: revenue,
          notes: 'admin callback simulation'
        })
      })
      .then(r => r.json())
      .then((res) => {
        if (res?.ok) {
          toast('Partner callback test başarılı', 'success');
          loadAutoLeads();
          loadAutoAnalytics();
        } else {
          toast(res?.error || 'Callback başarısız', 'error');
        }
      })
      .catch(() => toast('Callback hatası', 'error'));

      return;
    }

    if (action === 'log-lead-sales-touch') {
      logPartnerSalesTouch(el.dataset.touch || 'follow_up', {
        lead_id: id,
        force: true
      });
      toast('CRM satış dokunuşu kaydedildi', 'success');
      return;
    }

    if (action === 'drawer-set-status') {
      updateAutoLeadStatus(id, el.dataset.status);
      return;
    }

    if (action === 'retry-dispatch' || action === 'manual-dispatch') {
      manualDispatchLead(id, action === 'retry-dispatch');
      return;
    }

    if (action === 'view-lead-dispatch-logs') {
      const filter = document.getElementById('dispatch-log-lead-filter');
      if (filter) filter.value = id;
      showPage('partner-dispatch-logs', document.querySelector('[data-page-target="partner-dispatch-logs"]'));
      loadPartnerDispatchLogs();
      return;
    }

    if (action === 'reload-dispatch-logs') {
      loadPartnerDispatchLogs();
      return;
    }

    if (action === 'provision-partner-application') {
      provisionPartnerFromApplication(id);
      return;
    }

    if (
      await handlePartnerApplicationAdminAction(partnerApplicationsCtx(), action, el)
    ) {
      return;
    }

    if (action === 'edit-partner-endpoint') {
      editPartnerEndpoint(id, el.dataset.name, el.dataset.webhook);
      return;
    }

    if (action === 'update-partner-application-status') {
      const prev = el.dataset.previousStatus || '';
      const next = el.value;
      try {
        await adminAction({
          action: 'updatePartnerApplication',
          id,
          values: { status: next }
        });
        logPartnerCrmStageChange(prev, next, { application_id: id, force: true });
        toast('CRM aşaması güncellendi', 'success');
        await loadPartnerApplications();
      } catch (error) {
        toast(error.message || 'Durum güncellenemedi', 'error');
      }
      return;
    }

    if (action === 'log-partner-sales-touch') {
      const touchType = el.value;
      if (!touchType) return;
      logPartnerSalesTouch(touchType, {
        application_id: id,
        stage: el.dataset.stage,
        tier: el.dataset.tier,
        force: true
      });
      toast('Satış dokunuşu kaydedildi', 'success');
      el.value = '';
      return;
    }

    if (action === 'update-estimated-revenue') {
      adminAction({
        action: 'update',
        table: 'auto_leads',
        id,
        values: {
          estimated_revenue: Number(el.value || 0)
        }
      });
      return;
    }

    if (action === 'update-actual-revenue') {
      adminAction({
        action: 'update',
        table: 'auto_leads',
        id,
        values: {
          actual_revenue: Number(el.value || 0)
        }
      });
      return;
    }

    if (action === 'analytics-add-ip') {
      addAnalyticsInternalIp().catch((err) => toast(err.message || 'IP eklenemedi', 'error'));
      return;
    }
    if (action === 'analytics-mark-device') {
      markAnalyticsTestDevice().catch((err) => toast(err.message || 'Cihaz kaydedilemedi', 'error'));
      return;
    }
    if (action === 'analytics-delete-exclusion') {
      adminAction({ action: 'delete_analytics_exclusion', id })
        .then(() => {
          toast('Kural silindi');
          loadAnalyticsExclusionSettings();
        })
        .catch(() => {});
      return;
    }

    if (action === 'toggle-ann') toggleAnn(id, isActive);
    if (action === 'delete-ann') deleteAnn(id);
    if (action === 'toggle-faq') toggleFaq(id, isActive);
    if (action === 'delete-faq') deleteFaq(id);
    if (action === 'toggle-post') togglePost(id, isActive);
    if (action === 'delete-post') deletePost(id);
    if (action === 'edit-post') editPostById(id);
    if (action === 'toggle-post-featured') togglePostFeatured(id, isActive);
    if (action === 'cancel-post-edit') resetPostForm();
    if (action === 'edit-campaign') editCampaign(id);
    if (action === 'toggle-campaign') toggleCampaign(id);
    if (action === 'delete-campaign') deleteCampaign(id);
    if (action === 'feature-listing') featureListing(id, isActive);
    if (action === 'delete-listing') deleteListing(id);
    if (action === 'set-user-role') setUserRole(id, role);
    if (action === 'ban-user') banUser(id);
    if (action === 'export-auto-leads') exportAutoLeadsCsv();
    if (action === 'close-lead-drawer') closeLeadDrawer();
    if (action === 'complete-follow-up') completeFollowUp(id);
    if (action === 'save-follow-up') saveFollowUp(id);
    if (action === 'add-lead-note') addLeadNote(id, safeJsonParse(el.dataset.history, []));
    if (action === 'view-auto-lead') openLeadDrawer(safeJsonParse(el.dataset.lead));
    if (action === 'track-whatsapp-click') {
      event.preventDefault();
      trackAdminAutoEvent('auto_whatsapp_click', {
        email: el.dataset.email,
        phone: el.dataset.phone
      }).finally(() => {
        const safeUrl = safeExternalUrl(el.dataset.whatsappUrl);
        if (!safeUrl) {
          toast('Geçersiz WhatsApp bağlantısı', 'error');
          return;
        }
        window.open(safeUrl, '_blank', 'noopener');
      });
      return;
    }
  });
}


  document.getElementById('lead-drawer-overlay')?.addEventListener('click', closeLeadDrawer);

document.addEventListener('change', (event) => {
    const el = event.target.closest('[data-action="update-auto-notes"]');
    if (!el) return;

    updateAutoLeadNotes(el.dataset.id, el.value);
  });


  ['auto-leads-search', 'auto-leads-status-filter', 'auto-leads-follow-filter', 'auto-leads-partner-filter', 'auto-leads-notes-only'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', loadAutoLeads);
    document.getElementById(id)?.addEventListener('change', loadAutoLeads);
  });

  ['vacation-leads-search', 'vacation-leads-status-filter'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', () => vacationAdmin.loadVacationLeads());
    document.getElementById(id)?.addEventListener('change', () => vacationAdmin.loadVacationLeads());
  });
  ['housing-leads-search', 'housing-leads-status-filter'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', () => housingAdmin.loadHousingLeads());
    document.getElementById(id)?.addEventListener('change', () => housingAdmin.loadHousingLeads());
  });
  ['finance-leads-search', 'finance-leads-status-filter'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', () => financeAdmin.loadFinanceLeads());
    document.getElementById(id)?.addEventListener('change', () => financeAdmin.loadFinanceLeads());
  });
  ['sigorta-leads-search', 'sigorta-leads-status-filter'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', () => sigortaAdmin.loadSigortaLeads());
    document.getElementById(id)?.addEventListener('change', () => sigortaAdmin.loadSigortaLeads());
  });
  ['vertical-leads-search', 'vertical-leads-vertical-filter'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', () => verticalAdmin.loadVerticalLeads());
    document.getElementById(id)?.addEventListener('change', () => verticalAdmin.loadVerticalLeads());
  });

bindAdminPanelEvents();


const overdueStyle = document.createElement('style');
overdueStyle.textContent = `
.lead-overdue {
  background: rgba(220, 38, 38, 0.08);
}
`;
document.head.appendChild(overdueStyle);
