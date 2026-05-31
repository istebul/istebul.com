/**
 * Admin → Platform Analytics data + render (analytics_events, analytics_funnel_daily).
 */
import { fetchAdminTable, renderAdminDataSourceNotices } from './admin-query.js';
import { SCALE_LIMITS } from '../core/scale-limits.js';
import { escapeHtml } from '../core/dom-safe.js';

/**
 * Head count on analytics_events (admin RLS read policy).
 * @param {import('@supabase/supabase-js').SupabaseClient} sb
 * @param {{ sinceIso?: string | null }} [opts]
 */
export async function countAnalyticsEvents(sb, opts = {}) {
  let query = sb.from('analytics_events').select('id', { count: 'exact', head: true });
  if (opts.sinceIso) {
    query = query.gte('created_at', opts.sinceIso);
  }
  const { count, error } = await query;
  if (error) {
    return { count: null, error };
  }
  return { count: Number(count) || 0, error: null };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} sb
 * @param {string} [sinceIso]
 */
export async function fetchAnalyticsFunnelDailyRows(sb, sinceIso) {
  const { data, error } = await sb
    .from('analytics_funnel_daily')
    .select('day, funnel, funnel_step, events, sessions')
    .order('day', { ascending: false })
    .limit(500);

  if (error) {
    return { data: [], error };
  }

  let rows = data || [];
  if (sinceIso) {
    const sinceMs = new Date(sinceIso).getTime();
    rows = rows.filter((row) => {
      const ts = row.day ? new Date(row.day).getTime() : 0;
      return ts >= sinceMs;
    });
  }
  return { data: rows, error: null };
}

/**
 * @param {Array<Record<string, unknown>>} rows
 */
export function aggregateFunnelDailyFromEvents(rows) {
  const buckets = new Map();
  for (const row of rows || []) {
    if (!row.funnel || !row.funnel_step || !row.created_at) continue;
    const dayKey = String(row.created_at).slice(0, 10);
    const key = `${dayKey}|${row.funnel}|${row.funnel_step}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        day: dayKey,
        funnel: row.funnel,
        funnel_step: row.funnel_step,
        events: 0,
        sessions: new Set()
      };
      buckets.set(key, bucket);
    }
    bucket.events += 1;
    if (row.session_id) bucket.sessions.add(row.session_id);
  }
  return Array.from(buckets.values())
    .map((b) => ({
      day: b.day,
      funnel: b.funnel,
      funnel_step: b.funnel_step,
      events: b.events,
      sessions: b.sessions.size
    }))
    .sort((a, b) => String(b.day).localeCompare(String(a.day)));
}

/**
 * @param {Array<Record<string, unknown>>} rows
 */
export function buildEventCategoryCounts(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const cat = String(row.event_category || 'unknown');
    map.set(cat, (map.get(cat) || 0) + 1);
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

function filterRowsSince(rows, sinceMs) {
  return (rows || []).filter((row) => {
    const ts = row.created_at ? new Date(row.created_at).getTime() : 0;
    return ts >= sinceMs;
  });
}

function renderSummaryCards({ totalCount, windowCount, loadedCount, windowDays, sourceLabel }) {
  return `
    <div class="stat-grid" style="margin-bottom:16px">
      <div class="stat-card">
        <div class="stat-label">Toplam event</div>
        <div class="stat-value">${Number(totalCount).toLocaleString('tr-TR')}</div>
        <div class="stat-sub"><code>analytics_events</code></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Son ${windowDays} gün</div>
        <div class="stat-value">${Number(windowCount).toLocaleString('tr-TR')}</div>
        <div class="stat-sub">count (created_at)</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Yüklenen örnek</div>
        <div class="stat-value">${Number(loadedCount).toLocaleString('tr-TR')}</div>
        <div class="stat-sub">${escapeHtml(sourceLabel || '—')}</div>
      </div>
    </div>
  `;
}

function renderCategoryDistribution(categoryCounts) {
  if (!categoryCounts.length) return '';
  return `
    <div style="height:12px"></div>
    <h3 style="margin:0 0 14px 0;">event_category dağılımı</h3>
    <table class="table">
      <thead><tr><th>Kategori</th><th>Event (yüklenen örnek)</th></tr></thead>
      <tbody>
        ${categoryCounts
          .map(
            ([cat, n]) => `
          <tr>
            <td><code>${escapeHtml(cat)}</code></td>
            <td><strong>${n}</strong></td>
          </tr>`
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderFunnelDailySection(funnelRows) {
  if (!funnelRows?.length) return '';
  const top = funnelRows.slice(0, 40);
  return `
    <div style="height:20px"></div>
    <h3 style="margin:0 0 14px 0;">Funnel günlük özeti (analytics_funnel_daily)</h3>
    <table class="table">
      <thead><tr><th>Gün</th><th>Funnel</th><th>Adım</th><th>Events</th><th>Sessions</th></tr></thead>
      <tbody>
        ${top
          .map(
            (r) => `
          <tr>
            <td>${escapeHtml(r.day ? new Date(r.day).toLocaleDateString('tr-TR') : '—')}</td>
            <td>${escapeHtml(r.funnel || '—')}</td>
            <td>${escapeHtml(r.funnel_step || '—')}</td>
            <td><strong>${Number(r.events) || 0}</strong></td>
            <td>${Number(r.sessions) || 0}</td>
          </tr>`
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderRecentAnalyticsEventsTable(displayRows, limit = 50) {
  const recent = (displayRows || []).slice(0, limit);
  if (!recent.length) return '';
  return `
    <div style="height:20px"></div>
    <h3 style="margin:0 0 14px 0;">Son platform eventleri (analytics_events)</h3>
    <table class="table">
      <thead><tr><th>Zaman</th><th>Event</th><th>Kategori</th><th>Funnel</th><th>Session</th></tr></thead>
      <tbody>
        ${recent
          .map(
            (row) => `
          <tr>
            <td>${escapeHtml(row.created_at ? new Date(row.created_at).toLocaleString('tr-TR') : '—')}</td>
            <td><code>${escapeHtml(row.event_name || '—')}</code></td>
            <td>${escapeHtml(row.event_category || '—')}</td>
            <td>${escapeHtml(row.funnel_step || row.funnel || '—')}</td>
            <td class="text-muted-sm">${escapeHtml(row.session_id ? `${String(row.session_id).slice(0, 14)}…` : '—')}</td>
          </tr>`
          )
          .join('')}
      </tbody>
    </table>
  `;
}

/**
 * Load counts + event rows + funnel daily for Platform Analytics.
 * @param {import('@supabase/supabase-js').SupabaseClient} sb
 */
export async function loadPlatformAnalyticsData(sb) {
  const windowDays = SCALE_LIMITS.admin.executiveWindowDays || 30;
  const sinceIso = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const sinceMs = new Date(sinceIso).getTime();
  const rowLimit = SCALE_LIMITS.admin.analyticsRowLimit;

  const [totalRes, windowRes, analyticsRes, funnelRes] = await Promise.all([
    countAnalyticsEvents(sb),
    countAnalyticsEvents(sb, { sinceIso }),
    fetchAdminTable(sb, {
      table: 'analytics_events',
      select: '*',
      limit: rowLimit,
      order: { column: 'created_at', ascending: false },
      direct: () =>
        sb.from('analytics_events').select('*').order('created_at', { ascending: false }).limit(rowLimit)
    }),
    fetchAnalyticsFunnelDailyRows(sb, sinceIso)
  ]);

  const fetchedRows = analyticsRes.data || [];
  const windowedRows = filterRowsSince(fetchedRows, sinceMs);
  const funnelFromView = funnelRes.data || [];
  const funnelDaily = funnelFromView.length
    ? funnelFromView
    : aggregateFunnelDailyFromEvents(fetchedRows);

  return {
    windowDays,
    sinceIso,
    totalCount: totalRes.count,
    windowCount: windowRes.count,
    totalError: totalRes.error,
    windowError: windowRes.error,
    analyticsRes,
    funnelRes,
    fetchedRows,
    windowedRows,
    funnelDaily,
    funnelFromView,
    displayRows: windowedRows.length ? windowedRows : fetchedRows,
    categoryCounts: buildEventCategoryCounts(windowedRows.length ? windowedRows : fetchedRows)
  };
}

export function renderPlatformAnalyticsSummary(data) {
  const sourceLabel =
    data.analyticsRes.source === 'admin-action' ?
      'admin-action'
    : data.analyticsRes.source === 'direct' ?
      'direct'
    : data.analyticsRes.source || '—';

  return (
    renderSummaryCards({
      totalCount: data.totalCount ?? '—',
      windowCount: data.windowCount ?? '—',
      loadedCount: data.fetchedRows.length,
      windowDays: data.windowDays,
      sourceLabel
    }) +
    renderCategoryDistribution(data.categoryCounts) +
    renderFunnelDailySection(data.funnelDaily) +
    renderRecentAnalyticsEventsTable(data.displayRows)
  );
}

/**
 * @param {HTMLElement} el
 * @param {import('@supabase/supabase-js').SupabaseClient} sb
 * @param {(rows: unknown[]) => string} renderDashboardBody
 */
export async function mountPlatformAnalyticsScreen(el, sb, renderDashboardBody) {
  el.innerHTML = '<div class="empty">Yükleniyor…</div>';

  let data;
  try {
    data = await loadPlatformAnalyticsData(sb);
  } catch (err) {
    el.innerHTML = `<p class="empty">Hata: ${escapeHtml(err?.message || String(err))}</p>`;
    return;
  }

  const banner = renderAdminDataSourceNotices([data.analyticsRes]);
  const totalCount = data.totalCount;
  const hasTableData = totalCount != null && totalCount > 0;
  const hasFunnelData = (data.funnelDaily || []).length > 0;

  if (data.totalError && !hasTableData && !hasFunnelData) {
    el.innerHTML = `${banner}<p class="empty">analytics_events okunamadı: ${escapeHtml(data.totalError.message || String(data.totalError))}</p>`;
    return;
  }

  if (!hasTableData && !hasFunnelData) {
    const funnelHint =
      data.funnelRes.error ?
        ` Funnel view: ${escapeHtml(data.funnelRes.error.message || String(data.funnelRes.error))}.`
      : '';
    el.innerHTML = `${banner}<p class="empty">analytics_events tablosunda kayıt yok (count=0).${funnelHint}</p>`;
    return;
  }

  if (hasTableData && !data.fetchedRows.length) {
    const fetchErr =
      data.analyticsRes.error?.message ||
      data.analyticsRes.directError ||
      'Liste sorgusu boş döndü';
    el.innerHTML = `${banner}<p class="empty">analytics_events tablosunda <strong>${totalCount}</strong> kayıt var (count), ancak event listesi yüklenemedi: ${escapeHtml(fetchErr)}</p>`;
    return;
  }

  const windowNote = `<p class="text-muted-sm" style="margin:0 0 12px">Kaynak: <code>public.analytics_events</code> · funnel: <code>public.analytics_funnel_daily</code></p>`;

  el.innerHTML = `
    ${banner}
    ${windowNote}
    ${renderPlatformAnalyticsSummary(data)}
    ${renderDashboardBody(data.displayRows)}
  `;
}
