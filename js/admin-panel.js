import { getSupabaseClient } from './core/supabase.js';
import { invokeAdminFunction, adminList } from './core/admin-client.js';
import { escapeHtml, safeAttr, safeJsonParse, safeExternalUrl } from './core/dom-safe.js';
import { normalizePhoneForWhatsapp } from './core/phone.js';
import { countLeadsByNormalizedStatus } from './core/lead-status.js';
import { mapAuthError } from './features/auth/auth-errors.js';

const sb = getSupabaseClient();

if (!sb) {
  document.body.innerHTML = `
    <div class="admin-config-error">
      <div>
        <h2>Supabase yapılandırması eksik</h2>
        <p>SUPABASE_URL veya SUPABASE_ANON_KEY yüklenemedi.</p>
      </div>
    </div>
  `;
  throw new Error('Supabase config missing');
}
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
  clearLoginError();
  if (!email || !password) {
    showLoginError('E-posta ve şifre alanlarını doldurun.');
    return;
  }
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
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
  loadDashboard();
  loadSettings();
  loadAnnouncements();
  loadFaqs();
  loadPosts();
  loadListings();
  loadUsers();
  loadAutoLeads();
  loadAutoAnalytics();
  loadPlatformAnalytics();
  loadInvestorMetrics();
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
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  if (el) el.classList.add('active');

  const titleEl = document.getElementById('admin-mobile-title');
  if (titleEl && el?.textContent) {
    titleEl.textContent = el.textContent.replace(/^\s*\S+\s*/, '').trim() || 'Admin';
  }

  if (name === 'partner-endpoints') {
    loadPartnerEndpoints();
  }
  if (name === 'partner-applications') {
    loadPartnerApplications();
  }
  if (name === 'partner-dispatch-logs') {
    loadPartnerDispatchLogs();
  }
  if (name === 'platform-analytics') {
    loadPlatformAnalytics();
  }
  if (name === 'investor-metrics') {
    loadInvestorMetrics();
  }
  if (name === 'observability') {
    loadOperationalHealth();
  }
}

async function loadOperationalHealth() {
  const el = document.getElementById('observability-root');
  if (!el) return;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    severityRes,
    healthRes,
    eventsRes,
    dispatchRes,
    auditRes,
    failedLeadsRes
  ] = await Promise.all([
    sb.from('ops_severity_24h').select('*'),
    sb.from('ops_health_24h').select('*').order('errors', { ascending: false }).limit(40),
    sb.from('operational_events')
      .select('created_at, severity, category, event_name, source, fingerprint, properties, http_status, duration_ms')
      .gte('created_at', since)
      .in('severity', ['critical', 'error'])
      .order('created_at', { ascending: false })
      .limit(80),
    sb.from('partner_lead_dispatch_logs')
      .select('created_at, lead_id, partner_route, endpoint_name, http_status, success, error_message')
      .eq('success', false)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(30),
    sb.from('admin_audit_logs')
      .select('created_at, actor_email, action, entity_table, summary')
      .order('created_at', { ascending: false })
      .limit(40),
    sb.from('auto_leads')
      .select('id, created_at, email, partner_status, last_dispatch_error')
      .eq('partner_status', 'dispatch_failed')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20)
  ]);

  const { summarizeBySeverity, summarizeByCategory, countEventsWithPrefix } =
    await import('./features/ops/ops-health.js');

  const severityRows = severityRes.data || [];
  const bySeverity = summarizeBySeverity([]);
  for (const row of severityRows) {
    bySeverity[row.severity] = Number(row.events) || 0;
  }

  const recentEvents = eventsRes.data || [];
  const byCategory = summarizeByCategory(recentEvents);

  const webhookFails = countEventsWithPrefix(recentEvents, 'webhook_') +
    (dispatchRes.data?.length || 0);
  const authFails = countEventsWithPrefix(recentEvents, 'auth_');
  const paymentFails = countEventsWithPrefix(recentEvents, 'payment_') +
    countEventsWithPrefix(recentEvents, 'webhook_stripe');
  const perfWarns = countEventsWithPrefix(recentEvents, 'performance_');
  const abuseHits = countEventsWithPrefix(recentEvents, 'abuse_');

  const healthTable = (healthRes.data || []).slice(0, 15);

  el.innerHTML = `
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

    ${eventsRes.error ? `<p class="empty">Ops events: ${escapeHtml(eventsRes.error.message)} (migration deploy?)</p>` : ''}

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
    ${(failedLeadsRes.data || []).length ? `
      <table class="table">
        <thead><tr><th>Lead</th><th>Zaman</th><th>Status</th><th>Hata</th></tr></thead>
        <tbody>
          ${failedLeadsRes.data.map((row) => `
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
    ${(dispatchRes.data || []).length ? `
      <table class="table">
        <thead><tr><th>Zaman</th><th>Route</th><th>Endpoint</th><th>HTTP</th><th>Hata</th></tr></thead>
        <tbody>
          ${dispatchRes.data.map((row) => `
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

async function loadInvestorMetrics() {
  const el = document.getElementById('investor-metrics-root');
  if (!el) return;

  const { buildInvestorSnapshot } = await import('./features/metrics/investor-kpis.js');

  let subscriptions = [];
  let leads = [];
  let events = [];

  try {
    [subscriptions, leads, events] = await Promise.all([
      adminList(sb, {
        table: 'subscriptions',
        select: 'status, current_period_start, current_period_end, cancel_at_period_end',
        limit: 2000
      }).catch(() => []),
      adminList(sb, {
        table: 'auto_leads',
        select: 'estimated_revenue, actual_revenue, partner_status',
        limit: 5000
      }),
      adminList(sb, {
        table: 'analytics_events',
        select: 'event_name',
        order: { column: 'created_at', ascending: false },
        limit: 2500
      })
    ]);
  } catch (error) {
    el.innerHTML = `<p class="empty">Hata: ${escapeHtml(error.message)}</p>`;
    return;
  }

  const snapshot = buildInvestorSnapshot({
    subscriptions,
    leads,
    analyticsEvents: events
  });

  const sub = snapshot.subscription;
  const pipe = snapshot.pipeline;
  const funnel = snapshot.funnel;

  el.innerHTML = `
    <p class="text-muted" style="margin:0 0 16px 0;">Son güncelleme: ${escapeHtml(snapshot.generatedAt)} · Data room: <code>docs/investor/DATA_ROOM_INDEX.md</code></p>
    <h3 style="margin:0 0 14px 0;">Pro subscription (MRR)</h3>
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">MRR (TRY, normalized)</div><div class="stat-value">${sub.mrrTry.toLocaleString('tr-TR')} ₺</div></div>
      <div class="stat-card"><div class="stat-label">ARR (TRY)</div><div class="stat-value">${sub.arrTry.toLocaleString('tr-TR')} ₺</div></div>
      <div class="stat-card"><div class="stat-label">Active subs</div><div class="stat-value">${sub.activeSubscriptions}</div></div>
      <div class="stat-card"><div class="stat-label">Trialing</div><div class="stat-value">${sub.trialingSubscriptions}</div></div>
      <div class="stat-card"><div class="stat-label">Cancel at period end</div><div class="stat-value">${sub.cancelAtPeriodEnd}</div><div class="stat-sub">${sub.grossChurnSignal}% of billable</div></div>
    </div>

    <div style="height:20px"></div>
    <h3 style="margin:0 0 14px 0;">Partner lead pipeline</h3>
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">Leads</div><div class="stat-value">${pipe.leadCount}</div></div>
      <div class="stat-card"><div class="stat-label">Pipeline (estimated)</div><div class="stat-value">${pipe.pipelineEstimatedTry.toLocaleString('tr-TR')} ₺</div></div>
      <div class="stat-card"><div class="stat-label">Realized (CRM)</div><div class="stat-value">${pipe.pipelineActualTry.toLocaleString('tr-TR')} ₺</div></div>
      <div class="stat-card"><div class="stat-label">Partner wins</div><div class="stat-value">${pipe.partnerWinCount}</div><div class="stat-sub">Win rate ${pipe.winRate ?? '—'}%</div></div>
      <div class="stat-card"><div class="stat-label">Blended ARR signal</div><div class="stat-value">${snapshot.blendedArrTry.toLocaleString('tr-TR')} ₺</div><div class="stat-sub">Pro ARR + realized pipeline</div></div>
    </div>

    <div style="height:20px"></div>
    <h3 style="margin:0 0 14px 0;">Product funnel (sample n=${funnel.sampleSize})</h3>
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">Page views</div><div class="stat-value">${funnel.pageViews}</div></div>
      <div class="stat-card"><div class="stat-label">Checkout completed</div><div class="stat-value">${funnel.checkoutCompleted}</div><div class="stat-sub">${funnel.checkoutConversionPct ?? '—'}% of started</div></div>
      <div class="stat-card"><div class="stat-label">Leads</div><div class="stat-value">${funnel.leads}</div><div class="stat-sub">${funnel.leadConversionPct ?? '—'}% of views</div></div>
    </div>

    <div style="height:20px"></div>
    <details>
      <summary>Snapshot JSON (investor export)</summary>
      <pre style="white-space:pre-wrap;font-size:12px;max-height:320px;overflow:auto;">${escapeHtml(JSON.stringify(snapshot, null, 2))}</pre>
    </details>
    <ul class="text-muted" style="margin-top:12px;font-size:13px;">
      ${snapshot.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}
    </ul>
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


async function loadDashboard() {
  try {
    const [u, l, a, f, p] = await Promise.all([
      sb.from('profiles').select('*', { count: 'exact', head: true }),
      sb.from('listings').select('*', { count: 'exact', head: true }),
      sb.from('announcements').select('*', { count: 'exact', head: true }).eq('is_active', true),
      sb.from('faqs').select('*', { count: 'exact', head: true }),
      sb.from('posts').select('*', { count: 'exact', head: true }).eq('is_published', true)
    ]);
    document.getElementById('stat-users').textContent = u.count ?? '—';
    document.getElementById('stat-listings').textContent = l.count ?? '—';
    document.getElementById('stat-ann').textContent = a.count ?? '—';
    document.getElementById('stat-faqs').textContent = f.count ?? '—';
    document.getElementById('stat-posts').textContent = p.count ?? '—';
  } catch(e) {}
}

const KEYS = ['phone','email','address','instagram','twitter','facebook','linkedin','youtube','tiktok',
              'site-name','site-subtitle','hero-eyebrow','hero-title','hero-desc','title','description','auto_whatsapp_phone'];

async function loadSettings() {
  const { data } = await sb.from('site_settings').select('*');
  if (!data) return;
  const map = {};
  data.forEach(r => map[r.key] = r.value);
  KEYS.forEach(f => {
    const el = document.getElementById('s-' + f);
    if (el && map[f] !== undefined) el.value = map[f];
  });
  if (map['maintenance'] === 'true') document.getElementById('s-maintenance').checked = true;
}

async function saveSettings() {
  const rows = KEYS.map(f => ({ key: f, value: document.getElementById('s-' + f)?.value || '' }));
  rows.push({ key: 'maintenance', value: document.getElementById('s-maintenance').checked ? 'true' : 'false' });
  await adminAction({ action: 'upsert_settings', table: 'site_settings', id: 'settings', values: rows });
  toast('Kaydedildi!');
}

async function loadAnnouncements() {
  const { data } = await sb.from('announcements').select('*').order('created_at', { ascending: false });
  const el = document.getElementById('announcements-list');
  if (!data?.length) { el.innerHTML = '<p class="empty">Henüz duyuru yok.</p>'; return; }
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
  const { data } = await sb.from('faqs').select('*').order('order_num').order('created_at', { ascending: false });
  const el = document.getElementById('faqs-list');
  if (!data?.length) { el.innerHTML = '<p class="empty">Henüz SSS yok.</p>'; return; }
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

function autoSlug() {
  const title = document.getElementById('post-title').value;
  document.getElementById('post-slug').value = title.toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').trim();
}

async function loadPosts() {
  const { data } = await sb.from('posts').select('*').order('created_at', { ascending: false });
  const el = document.getElementById('posts-list');
  if (!data?.length) { el.innerHTML = '<p class="empty">Henüz yazı yok.</p>'; return; }
  el.innerHTML = '<table class="table"><thead><tr><th>Başlık</th><th>Slug</th><th>Durum</th><th>Tarih</th><th></th></tr></thead><tbody>' +
    data.map(p => `<tr><td><strong>${escapeHtml(p.title||'—')}</strong></td><td class="text-muted text-xs">/${escapeHtml(p.slug||'—')}</td><td><span class="badge ${p.is_published?'badge-green':'badge-yellow'}">${p.is_published?'Yayında':'Taslak'}</span></td><td class="text-muted cell-nowrap">${new Date(p.created_at).toLocaleDateString('tr-TR')}</td><td><div class="table-actions"><button class="btn btn-ghost btn-sm" data-action="toggle-post" data-id="${safeAttr(p.id)}" data-active="${p.is_published}">${p.is_published?'Taslağa al':'Yayınla'}</button><button class="btn btn-danger btn-sm" data-action="delete-post" data-id="${safeAttr(p.id)}">Sil</button></div></td></tr>`).join('') + '</tbody></table>';
}

async function savePost() {
  const title = document.getElementById('post-title').value.trim();
  const slug = document.getElementById('post-slug').value.trim() || title.toLowerCase().replace(/\s+/g,'-');
  const content = document.getElementById('post-content').value.trim();
  const is_published = document.getElementById('post-published').checked;
  if (!title) { toast('Başlık zorunlu', 'error'); return; }
  await adminAction({ action: 'insert', table: 'posts', id: 'new', values: { title, slug, content, is_published } });
  toast('Yazı eklendi');
  document.getElementById('post-title').value = '';
  document.getElementById('post-slug').value = '';
  document.getElementById('post-content').value = '';
  loadPosts(); loadDashboard();
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

async function loadListings() {
  const { data } = await sb.from('listings').select('*').order('created_at', { ascending: false }).limit(100);
  const el = document.getElementById('listings-list');
  if (!data?.length) { el.innerHTML = '<p class="empty">Henüz ilan yok.</p>'; return; }
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
  const { data } = await sb.from('profiles').select('*').order('created_at', { ascending: false }).limit(100);
  const el = document.getElementById('users-list');
  if (!data?.length) { el.innerHTML = '<p class="empty">Henüz kullanıcı yok.</p>'; return; }
  el.innerHTML = '<table class="table"><thead><tr><th>Ad</th><th>E-posta</th><th>Rol</th><th>Kayıt</th><th></th></tr></thead><tbody>' +
    data.map(u => {
      const isAdmin = u.role === 'admin';
      const isSelf = u.id === currentUser?.id;
      const actions = [];

      if (!isAdmin) {
        actions.push(`<button class="btn btn-ghost btn-sm" data-action="set-user-role" data-id="${safeAttr(u.id)}" data-role="admin">Admin yap</button>`);
      }

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
    analytics.track(eventName, metadata, {
      category: 'admin',
      funnel: 'crm',
      funnel_step: eventName,
      force: true
    });
    analytics.flush();
  } catch {}
}

async function trackAdminAutoEvent(eventName, metadata = {}) {
  return trackAdminCrmEvent(eventName, metadata);
}

async function loadAutoAnalytics() {
  const el = document.getElementById('auto-analytics-list');
  if (!el) return;

  let events = [];
  let leadRows = [];

  try {
    [events, leadRows] = await Promise.all([
      adminList(sb, {
        table: 'auto_events',
        order: { column: 'created_at', ascending: false },
        limit: 500
      }),
      adminList(sb, {
        table: 'auto_leads',
        select: 'status, follow_up_at, follow_up_done, partner_status, estimated_revenue, actual_revenue',
        limit: 1000
      })
    ]);
  } catch (error) {
    el.innerHTML = `<p class="empty">Hata: ${escapeHtml(error.message)}</p>`;
    return;
  }

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
    decision_feedback_contact: 'Uzman destek isteği'
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

async function loadPlatformAnalytics() {
  const el = document.getElementById('platform-analytics-root');
  if (!el) return;

  const { data, error } = await sb
    .from('analytics_events')
    .select('event_name, event_category, funnel, funnel_step, revenue_cents, attribution, created_at, session_id')
    .order('created_at', { ascending: false })
    .limit(2500);

  if (error) {
    el.innerHTML = `<p class="empty">Hata: ${escapeHtml(error.message)}</p>`;
    return;
  }

  const rows = data || [];
  if (!rows.length) {
    el.innerHTML = '<p class="empty">Henüz platform analytics event yok. Migration ve analytics-ingest deploy sonrası veri akışı başlar.</p>';
    return;
  }

  const pageViews = countEvents(rows, 'page_view') + countEvents(rows, 'auto_page_view');
  const authModal = countEvents(rows, 'auth_modal_open');
  const authLoginOk = countEvents(rows, 'auth_login_success');
  const authRegisterOk = countEvents(rows, 'auth_register_success');
  const checkoutStarted = countFunnelStep(rows, 'checkout_start');
  const checkoutCompleted = countFunnelStep(rows, 'checkout_complete');
  const paidConversions = countFunnelStep(rows, 'paid_conversion');
  const leadSubmit = countEvents(rows, 'lead_submit') + countEvents(rows, 'auto_lead_submit');
  const partnerOk = countEvents(rows, 'partner_dispatch_success');
  const partnerFail = countEvents(rows, 'partner_dispatch_failed');
  const financeStart = countEvents(rows, 'finance_funnel_start');
  const ctaClicks = countEvents(rows, 'cta_click');
  const pricingViews = countFunnelStep(rows, 'pricing_view');
  const checkoutAbandoned = countEvents(rows, 'checkout_abandoned');
  const partnerLanding = countEvents(rows, 'partner_landing_view');
  const partnerApply = countEvents(rows, 'partner_application_submit');
  const partnerOnboarding = countEvents(rows, 'partner_onboarding_view');
  const partnerWebhookDraft = countEvents(rows, 'partner_webhook_draft_saved');
  const referralLand = countEvents(rows, 'growth_referral_land');
  const referralShare = countEvents(rows, 'growth_referral_share');
  const referralConvert = countEvents(rows, 'growth_referral_convert');
  const referralLinkCreated = countEvents(rows, 'referral_link_created');
  const referralLinkClicked = countEvents(rows, 'referral_link_clicked');
  const referralSignup = countEvents(rows, 'referral_signup');
  const referralConversion = countEvents(rows, 'referral_conversion');
  const upsellViews = countEvents(rows, 'upsell_view');
  const upsellClicks = countEvents(rows, 'upsell_click');
  const upsellConversions = countEvents(rows, 'upsell_conversion');
  const lifecycleEnroll = countEvents(rows, 'lifecycle_enroll_requested');
  const growthChannelRows = rows.filter((row) => row.event_category === 'growth');
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
    const count = countEvents(rows, eventName);
    const prev = index > 0 ? countEvents(rows, autoSteps[index - 1][0]) : count;
    const drop = index > 0 && prev ? Math.max(0, prev - count) : 0;
    return { label, count, drop, conv: index > 0 ? conversionPct(count, prev) : '100%' };
  });

  const attributionMap = rows
    .filter((row) => row.event_name === 'revenue_attributed' || row.event_name === 'checkout_completed')
    .reduce((acc, row) => {
      const source = row.attribution?.utm_source || 'direct';
      acc[source] = (acc[source] || 0) + Number(row.revenue_cents || 0);
      return acc;
    }, {});

  const crmEvents = rows.filter((row) => row.event_name.startsWith('crm_'));

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
    const count = countFunnelStep(rows, key);
    const prevKey = index > 0 ? executiveFunnel[index - 1][0] : null;
    const prev = prevKey ? countFunnelStep(rows, prevKey) : count;
    return { label, count, conv: index > 0 ? conversionPct(count, prev) : '—' };
  });

  const channelRevenue = sumRevenueCentsByChannel(
    rows,
    ['paid_conversion', 'checkout_completed', 'checkout_complete', 'revenue_attributed']
  );
  const channelLeads = rows
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
      status: 'integrating'
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
  const { data, error } = await sb
    .from('partner_endpoints')
    .select('*')
    .order('priority_weight', { ascending: false });

  const el = document.getElementById('partner-endpoints-list');
  if (!el) return;

  if (error) {
    el.innerHTML = `<p class="empty">Hata: ${escapeHtml(error.message)}</p>`;
    return;
  }

  if (!data?.length) {
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

async function loadPartnerApplications() {
  const { data, error } = await sb
    .from('partner_applications')
    .select('*, partner_endpoint_id, onboarding_token, webhook_url_draft, billing_plan, utm_source')
    .order('created_at', { ascending: false })
    .limit(200);

  const el = document.getElementById('partner-applications-list');
  if (!el) return;

  if (error) {
    el.innerHTML = `<p class="empty">Hata: ${escapeHtml(error.message)}</p>`;
    return;
  }

  if (!data?.length) {
    el.innerHTML = '<p class="empty">Başvuru yok.</p>';
    return;
  }

  const statusLabels = {
    new: 'Yeni',
    contacted: 'İletişim',
    qualified: 'Uygun',
    integrating: 'Entegrasyon',
    live: 'Canlı',
    rejected: 'Red'
  };

  el.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Firma</th>
          <th>İletişim</th>
          <th>Kategori</th>
          <th>Webhook</th>
          <th>Durum</th>
          <th>Tarih</th>
          <th>Plan</th>
          <th>İşlem</th>
        </tr>
      </thead>
      <tbody>
        ${data.map((row) => `
          <tr>
            <td><strong>${escapeHtml(row.company_name)}</strong><br><small>${escapeHtml(row.contact_name)}</small></td>
            <td>${escapeHtml(row.phone)}<br><small>${escapeHtml(row.email)}</small></td>
            <td>${escapeHtml(row.category)}${row.city ? `<br><small>${escapeHtml(row.city)}</small>` : ''}</td>
            <td>${row.webhook_ready ? 'Hazır' : 'Manuel'}${row.webhook_url_draft ? `<br><small title="${safeAttr(row.webhook_url_draft)}">Taslak URL</small>` : ''}</td>
            <td>
              <select class="status-select" data-action="update-partner-application-status" data-id="${safeAttr(row.id)}">
                ${Object.entries(statusLabels).map(([value, label]) =>
                  `<option value="${value}" ${row.status === value ? 'selected' : ''}>${label}</option>`
                ).join('')}
              </select>
            </td>
            <td>${formatShortDate(row.created_at)}</td>
            <td><small>${escapeHtml(row.billing_plan || 'pilot')}</small>${row.utm_source ? `<br><small>utm:${escapeHtml(row.utm_source)}</small>` : ''}</td>
            <td class="table-actions">
              ${row.onboarding_token ? `<a class="btn btn-ghost btn-sm" href="/partner-basvuru.html?token=${encodeURIComponent(row.onboarding_token)}&step=2" target="_blank" rel="noopener">Onboarding</a>` : ''}
              ${!row.partner_endpoint_id ? `<button type="button" class="btn btn-primary btn-sm" data-action="provision-partner-application" data-id="${safeAttr(row.id)}">Endpoint oluştur</button>` : '<span class="badge badge-green">Endpoint var</span>'}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function loadPartnerDispatchLogs() {
  const leadFilter = document.getElementById('dispatch-log-lead-filter')?.value?.trim() || '';
  const el = document.getElementById('partner-dispatch-logs-list');
  if (!el) return;

  let query = sb
    .from('partner_lead_dispatch_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(150);

  if (leadFilter) {
    query = query.eq('lead_id', leadFilter);
  }

  const { data, error } = await query;

  if (error) {
    el.innerHTML = `<p class="empty">Hata: ${escapeHtml(error.message)}</p>`;
    return;
  }

  if (!data?.length) {
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
  return text.length > 34 ? text.slice(0, 34) + '…' : text;
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
    return;
  }

  const searchValue = (document.getElementById('auto-leads-search')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('auto-leads-status-filter')?.value || '';
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
      lead.priority
    ].filter(Boolean).join(' ').toLowerCase();

    const followDate = lead.follow_up_at ? new Date(lead.follow_up_at) : null;
    const isFollowDone = lead.follow_up_done === true;
    const matchesFollow =
      !followFilter ||
      (followFilter === 'today' && followDate && followDate <= todayEnd && !isFollowDone) ||
      (followFilter === 'overdue' && followDate && followDate < now && !isFollowDone) ||
      (followFilter === 'open' && followDate && !isFollowDone) ||
      (followFilter === 'done' && isFollowDone);

    return matchesStatus && matchesNotes && matchesFollow && (!searchValue || haystack.includes(searchValue));
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
          <th>Partner Durumu</th>
          <th>Retry</th>
          <th>Son Hata</th>
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
            <td>${renderPartnerStatusSelect(lead)}</td>
<td>${lead.dispatch_retry_count || 0}</td>
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
                ${['dispatch_failed', 'dispatch_dead'].includes(lead.partner_status) ? `<button class="btn btn-ghost btn-sm" data-action="view-lead-dispatch-logs" data-id="${lead.id}">Log</button>` : ''}
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

function openLeadDrawer(lead) {
  const drawer = document.getElementById('lead-drawer');
  const overlay = document.getElementById('lead-drawer-overlay');
  const content = document.getElementById('lead-drawer-content');

  if (!drawer || !overlay || !content) return;

  const fmt = (v) => escapeHtml(v || '—');
  const label = (map, value) => map[value] || value || '—';

  const usageLabels = { family: 'Aile', city: 'Şehir', long: 'Uzun yol' };
  const bodyLabels = { suv: 'SUV', sedan: 'Sedan', hatchback: 'Hatchback' };
  const fuelLabels = { any: 'Fark etmez', gasoline: 'Benzin', diesel: 'Dizel', hybrid: 'Hibrit', electric: 'Elektrikli' };
  const loanLabels = { yes: 'Evet', no: 'Hayır' };
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

  content.innerHTML = `
    <div class="table-actions" style="margin-bottom:14px;flex-wrap:wrap;gap:10px;">
      ${lead.phone ? `<button class="btn btn-success btn-sm" data-action="track-whatsapp-click" data-email="${lead.email || ''}" data-phone="${lead.phone || ''}" data-whatsapp-url="${whatsappUrl}">WhatsApp</button>` : ''}
      ${lead.phone ? `<a class="btn btn-ghost btn-sm" href="tel:${lead.phone}">Ara</a>` : ''}
      <button class="btn btn-warning btn-sm" data-action="manual-dispatch" data-id="${lead.id}">Partner Gönder</button>
      ${['dispatch_failed','dispatch_dead'].includes(lead.partner_status) ? `<button class="btn btn-ghost btn-sm" data-action="view-lead-dispatch-logs" data-id="${lead.id}">Teslimat Log</button>` : ''}
      <button class="btn btn-success btn-sm" data-action="simulate-partner-won" data-id="${lead.id}" data-phone="${lead.phone || ''}">Partner Won Test</button>
      <button class="btn btn-danger btn-sm" data-action="simulate-partner-lost" data-id="${lead.id}" data-phone="${lead.phone || ''}">Partner Lost Test</button>
      <button class="btn btn-ghost btn-sm" data-action="complete-follow-up" data-id="${lead.id}">Takibi Tamamla</button>

      <input
        type="datetime-local"
        class="form-input"
        id="follow-up-date"
        value="${lead.follow_up_at ? new Date(lead.follow_up_at).toISOString().slice(0,16) : ''}"
        style="max-width:220px;"
      >
      <button class="btn btn-ghost btn-sm" data-action="save-follow-up" data-id="${lead.id}">Takip Kaydet</button>
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
      <div class="lead-detail-item"><div class="lead-detail-label">Son Not</div><div class="lead-detail-value">${escapeHtml(fmt(lead.notes))}</div></div>
      <div class="lead-detail-item"><div class="lead-detail-label">Tarih</div><div class="lead-detail-value">${lead.created_at ? new Date(lead.created_at).toLocaleString('tr-TR') : '—'}</div></div>
    </div>
  `;

  drawer.classList.add('open');
  overlay.classList.add('open');
}

function closeLeadDrawer() {
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
  await adminAction({ action: 'update', table: 'profiles', id, values: { role } });
  const labels = { admin: 'Admin yapıldı', user: 'Yetki kaldırıldı' };
  toast(labels[role] || 'Rol güncellendi');
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

  document.querySelectorAll('[data-action="save-settings"]').forEach((el) => {
    el.addEventListener('click', saveSettings);
  });

  document.querySelector('[data-action="save-announcement"]')?.addEventListener('click', saveAnnouncement);
  document.querySelector('[data-action="save-faq"]')?.addEventListener('click', saveFaq);
  document.querySelector('[data-action="save-post"]')?.addEventListener('click', savePost);

  document.addEventListener('click', (event) => {
    const el = event.target.closest('[data-action]');
    if (!el) return;

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

    if (action === 'retry-dispatch' || action === 'manual-dispatch') {
      manualDispatchLead(id, true);
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

    if (action === 'edit-partner-endpoint') {
      editPartnerEndpoint(id, el.dataset.name, el.dataset.webhook);
      return;
    }

    if (action === 'update-partner-application-status') {
      adminAction({
        action: 'update',
        table: 'partner_applications',
        id,
        values: { status: el.value }
      }).then(() => {
        toast('Başvuru durumu güncellendi', 'success');
        loadPartnerApplications();
      });
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

    if (action === 'toggle-ann') toggleAnn(id, isActive);
    if (action === 'delete-ann') deleteAnn(id);
    if (action === 'toggle-faq') toggleFaq(id, isActive);
    if (action === 'delete-faq') deleteFaq(id);
    if (action === 'toggle-post') togglePost(id, isActive);
    if (action === 'delete-post') deletePost(id);
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


  ['auto-leads-search', 'auto-leads-status-filter', 'auto-leads-notes-only'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', loadAutoLeads);
    document.getElementById(id)?.addEventListener('change', loadAutoLeads);
  });

bindAdminPanelEvents();


const overdueStyle = document.createElement('style');
overdueStyle.textContent = `
.lead-overdue {
  background: rgba(220, 38, 38, 0.08);
}
`;
document.head.appendChild(overdueStyle);
