/**
 * Platform Analytics — site-wide KPIs, category funnel, traffic sources.
 */
import { escapeHtml } from '../core/dom-safe.js';
import { LEGACY_TO_SITE_EVENT } from '../platform/site-analytics.js';

const FILTER_PRESETS = Object.freeze([
  { id: 'today', label: 'Bugün', days: 1 },
  { id: '7d', label: 'Son 7 gün', days: 7 },
  { id: '30d', label: 'Son 30 gün', days: 30 },
  { id: 'all', label: 'Tüm zamanlar', days: 365 }
]);

const SITE_CATEGORIES = [
  { id: 'auto', label: 'Otomobil' },
  { id: 'konut', label: 'Konut' },
  { id: 'tatil', label: 'Tatil' },
  { id: 'finansman', label: 'Finansman' },
  { id: 'sigorta', label: 'Sigorta' },
  { id: 'kasko', label: 'Kasko' }
];

const EVENT_ALIASES = Object.freeze({
  homepage_view: ['homepage_view', 'landing_visit'],
  category_card_click: ['category_card_click'],
  category_page_view: [
    'category_page_view',
    'page_view',
    'auto_page_view',
    'finance_page_view',
    'insurance_page_view',
    'housing_page_view',
    'vacation_page_view'
  ],
  analysis_started: [
    'analysis_started',
    'auto_form_started',
    'auto_analysis_started',
    'finance_funnel_start',
    'finans_start',
    'vacation_start',
    'home_analysis_start',
    'insurance_analysis_started'
  ],
  analysis_completed: [
    'analysis_completed',
    'auto_form_submitted',
    'auto_wizard_complete',
    'finance_funnel_complete'
  ],
  results_viewed: [
    'results_viewed',
    'auto_results_rendered',
    'auto_results_view',
    'results_view',
    'finance_results_view',
    'finans_results_view',
    'vacation_results_view',
    'home_results_view',
    'insurance_results_view'
  ],
  lead_form_opened: ['lead_form_opened', 'auto_modal_open', 'insurance_interest'],
  lead_submitted: [
    'lead_submitted',
    'lead_submit',
    'auto_lead_submit',
    'finans_lead_submit',
    'vacation_lead_submit',
    'home_lead_submit'
  ],
  pdf_downloaded: ['pdf_downloaded', 'insurance_pdf_download'],
  cta_clicked: ['cta_clicked', 'cta_click', 'hero_cta_click']
});

function pct(part, whole) {
  if (!whole) return '—';
  return `${Math.round((part / whole) * 1000) / 10}%`;
}

function rowCategory(row) {
  const props = row.properties || {};
  return (
    props.category ||
    row.funnel ||
    (row.page_path?.includes('/auto') ? 'auto' : null) ||
    'unknown'
  );
}

function matchesAlias(eventName, aliasKey) {
  const names = EVENT_ALIASES[aliasKey] || [aliasKey];
  if (names.includes(eventName)) return true;
  if (LEGACY_TO_SITE_EVENT[eventName] === aliasKey) return true;
  return false;
}

function countAlias(rows, aliasKey, { uniqueSessions = true } = {}) {
  const sessions = new Set();
  let total = 0;
  for (const row of rows) {
    if (!matchesAlias(row.event_name, aliasKey)) continue;
    total += 1;
    const sid = row.session_id;
    if (sid) sessions.add(sid);
  }
  return uniqueSessions ? sessions.size || total : total;
}

function countAliasForCategory(rows, aliasKey, categoryId) {
  const sessions = new Set();
  let total = 0;
  for (const row of rows) {
    if (!matchesAlias(row.event_name, aliasKey)) continue;
    if (rowCategory(row) !== categoryId) continue;
    total += 1;
    if (row.session_id) sessions.add(row.session_id);
  }
  return sessions.size || total;
}

function normalizePagePath(row) {
  const raw =
    row.page_path ||
    row.landing_page ||
    row.properties?.landing_page ||
    row.attribution?.landing_path ||
    '/';
  const path = String(raw).split('?')[0].split('#')[0].trim();
  return path || '/';
}

/**
 * Sayfa path kırılımı — oturum ve dönüşüm adımları.
 * @param {object[]} rows
 * @param {number} [limit]
 */
export function buildPagePathRows(rows, limit = 25) {
  const map = new Map();
  for (const row of rows) {
    const path = normalizePagePath(row);
    if (!map.has(path)) {
      map.set(path, { path, events: 0, sessions: new Set(), analysis: 0, leads: 0, views: 0 });
    }
    const bucket = map.get(path);
    bucket.events += 1;
    if (row.session_id) bucket.sessions.add(row.session_id);
    if (
      matchesAlias(row.event_name, 'category_page_view') ||
      matchesAlias(row.event_name, 'homepage_view')
    ) {
      bucket.views += 1;
    }
    if (matchesAlias(row.event_name, 'analysis_started')) bucket.analysis += 1;
    if (matchesAlias(row.event_name, 'lead_submitted')) bucket.leads += 1;
  }
  return [...map.values()]
    .map((b) => ({
      path: b.path,
      events: b.events,
      sessions: b.sessions.size || b.events,
      views: b.views,
      analysis: b.analysis,
      leads: b.leads,
      conversion: pct(b.leads, b.sessions.size || b.events)
    }))
    .sort((a, b) => b.sessions - a.sessions || b.events - a.events)
    .slice(0, limit);
}

/**
 * En sık event adları (bölüm/aksiyon proxy).
 * @param {object[]} rows
 * @param {number} [limit]
 */
export function buildTopEventRows(rows, limit = 20) {
  const map = new Map();
  for (const row of rows) {
    const name = String(row.event_name || 'unknown').slice(0, 80);
    const section =
      row.page_section ||
      row.funnel_step ||
      row.properties?.section ||
      row.properties?.placement ||
      '';
    const key = section ? `${name} · ${String(section).slice(0, 40)}` : name;
    if (!map.has(key)) {
      map.set(key, { label: key, eventName: name, section: section || '—', count: 0, sessions: new Set() });
    }
    const bucket = map.get(key);
    bucket.count += 1;
    if (row.session_id) bucket.sessions.add(row.session_id);
  }
  return [...map.values()]
    .map((b) => ({
      label: b.label,
      eventName: b.eventName,
      section: b.section,
      count: b.count,
      sessions: b.sessions.size || b.count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function trafficSourceKey(row) {
  const attr = row.attribution || {};
  const props = row.properties || {};
  return (
    row.utm_source ||
    attr.utm_source ||
    props.utm_source ||
    (attr.referrer || row.referrer ? 'referrer' : null) ||
    props.referrer ||
    row.referrer ||
    'direct'
  );
}

export function filterRowsByPreset(rows, presetId) {
  const preset = FILTER_PRESETS.find((p) => p.id === presetId) || FILTER_PRESETS[1];
  if (preset.id === 'all') return rows;
  const cutoff = Date.now() - preset.days * 24 * 60 * 60 * 1000;
  return rows.filter((row) => {
    const ts = row.created_at ? new Date(row.created_at).getTime() : 0;
    return ts >= cutoff;
  });
}

export function buildSiteAnalyticsMetrics(rows) {
  const visits = countAlias(rows, 'category_page_view') + countAlias(rows, 'homepage_view');
  const homepageVisits = countAlias(rows, 'homepage_view');
  const categoryClicks = countAlias(rows, 'category_card_click');
  const analysisStarted = countAlias(rows, 'analysis_started');
  const resultsViewed = countAlias(rows, 'results_viewed');
  const leads = countAlias(rows, 'lead_submitted');
  const pdfDownloads = countAlias(rows, 'pdf_downloaded');

  const categoryRows = SITE_CATEGORIES.map((cat) => {
    const visit = countAliasForCategory(rows, 'category_page_view', cat.id);
    const analysis = countAliasForCategory(rows, 'analysis_started', cat.id);
    const results = countAliasForCategory(rows, 'results_viewed', cat.id);
    const lead = countAliasForCategory(rows, 'lead_submitted', cat.id);
    return {
      ...cat,
      visit,
      analysis,
      results,
      lead,
      conversion: pct(lead, visit)
    };
  });

  const trafficMap = new Map();
  for (const row of rows) {
    const source = String(trafficSourceKey(row)).slice(0, 80);
    if (!trafficMap.has(source)) {
      trafficMap.set(source, { source, visits: new Set(), analysis: 0, leads: 0 });
    }
    const bucket = trafficMap.get(source);
    if (row.session_id) bucket.visits.add(row.session_id);
    if (matchesAlias(row.event_name, 'analysis_started')) bucket.analysis += 1;
    if (matchesAlias(row.event_name, 'lead_submitted')) bucket.leads += 1;
  }

  const trafficRows = [...trafficMap.values()]
    .map((b) => ({
      source: b.source,
      visits: b.visits.size,
      analysis: b.analysis,
      leads: b.leads,
      conversion: pct(b.leads, b.visits.size)
    }))
    .sort((a, b) => b.visits - a.visits);

  const pagePathRows = buildPagePathRows(rows);
  const topEventRows = buildTopEventRows(rows);

  return {
    visits,
    homepageVisits,
    categoryClicks,
    analysisStarted,
    resultsViewed,
    leads,
    pdfDownloads,
    visitToAnalysis: pct(analysisStarted, visits),
    analysisToResults: pct(resultsViewed, analysisStarted),
    resultsToLead: pct(leads, resultsViewed),
    categoryRows,
    trafficRows,
    pagePathRows,
    topEventRows
  };
}

export function renderSiteAnalyticsDashboard(metrics, { filterId = '7d', windowNote = '' } = {}) {
  const filters = FILTER_PRESETS.map(
    (p) =>
      `<button type="button" class="btn btn-sm ${p.id === filterId ? 'btn-primary' : 'btn-ghost'}" data-site-analytics-filter="${escapeHtml(p.id)}">${escapeHtml(p.label)}</button>`
  ).join('');

  return `
    <section class="platform-site-analytics" aria-labelledby="site-analytics-title">
      <div class="platform-site-analytics__head">
        <h3 id="site-analytics-title" style="margin:0">Site geneli ölçüm</h3>
        <div class="platform-site-analytics__filters" role="group" aria-label="Zaman aralığı">${filters}</div>
      </div>
      ${windowNote ? `<p class="text-muted-sm" style="margin:8px 0 12px">${escapeHtml(windowNote)}</p>` : ''}
      <div class="stat-grid platform-site-analytics__kpis">
        <div class="stat-card"><div class="stat-label">Toplam ziyaret</div><div class="stat-value">${metrics.visits}</div></div>
        <div class="stat-card"><div class="stat-label">Ana sayfa ziyaret</div><div class="stat-value">${metrics.homepageVisits}</div></div>
        <div class="stat-card"><div class="stat-label">Kategori seçimi</div><div class="stat-value">${metrics.categoryClicks}</div></div>
        <div class="stat-card"><div class="stat-label">Analiz başlatan</div><div class="stat-value">${metrics.analysisStarted}</div></div>
        <div class="stat-card"><div class="stat-label">Sonuç gören</div><div class="stat-value">${metrics.resultsViewed}</div></div>
        <div class="stat-card"><div class="stat-label">Lead bırakan</div><div class="stat-value">${metrics.leads}</div></div>
        <div class="stat-card"><div class="stat-label">PDF indiren</div><div class="stat-value">${metrics.pdfDownloads}</div></div>
        <div class="stat-card"><div class="stat-label">Ziyaret → Analiz</div><div class="stat-value">${metrics.visitToAnalysis}</div></div>
        <div class="stat-card"><div class="stat-label">Analiz → Sonuç</div><div class="stat-value">${metrics.analysisToResults}</div></div>
        <div class="stat-card"><div class="stat-label">Sonuç → Lead</div><div class="stat-value">${metrics.resultsToLead}</div></div>
      </div>

      <h4 style="margin:20px 0 10px">Kategori performansı</h4>
      <div class="table-scroll">
        <table class="table platform-site-analytics__table">
          <thead>
            <tr>
              <th>Kategori</th><th>Ziyaret</th><th>Analiz Başladı</th><th>Sonuç Görüldü</th><th>Lead</th><th>Dönüşüm Oranı</th>
            </tr>
          </thead>
          <tbody>
            ${metrics.categoryRows
              .map(
                (r) => `
              <tr>
                <td>${escapeHtml(r.label)}</td>
                <td>${r.visit}</td>
                <td>${r.analysis}</td>
                <td>${r.results}</td>
                <td>${r.lead}</td>
                <td>${r.conversion}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>

      <h4 style="margin:20px 0 10px">Sayfa trafiği (path)</h4>
      <p class="text-muted-sm" style="margin:0 0 8px">Hangi sayfada kaç oturum ve dönüşüm adımı gerçekleşti.</p>
      <div class="table-scroll">
        <table class="table platform-site-analytics__table">
          <thead>
            <tr>
              <th>Sayfa</th><th>Oturum</th><th>Event</th><th>Görüntüleme</th><th>Analiz</th><th>Lead</th><th>CR</th>
            </tr>
          </thead>
          <tbody>
            ${
              metrics.pagePathRows?.length
                ? metrics.pagePathRows
                    .map(
                      (r) => `
              <tr>
                <td><code>${escapeHtml(r.path)}</code></td>
                <td>${r.sessions}</td>
                <td>${r.events}</td>
                <td>${r.views}</td>
                <td>${r.analysis}</td>
                <td>${r.leads}</td>
                <td>${r.conversion}</td>
              </tr>`
                    )
                    .join('')
                : '<tr><td colspan="7">Henüz sayfa path verisi yok (cookie onayı + analytics-ingest gerekir)</td></tr>'
            }
          </tbody>
        </table>
      </div>

      <h4 style="margin:20px 0 10px">Bölüm ve aksiyonlar (event)</h4>
      <p class="text-muted-sm" style="margin:0 0 8px">En sık tetiklenen eventler; section/funnel_step varsa gösterilir.</p>
      <div class="table-scroll">
        <table class="table platform-site-analytics__table">
          <thead>
            <tr><th>Event</th><th>Bölüm</th><th>Adet</th><th>Oturum</th></tr>
          </thead>
          <tbody>
            ${
              metrics.topEventRows?.length
                ? metrics.topEventRows
                    .map(
                      (r) => `
              <tr>
                <td>${escapeHtml(r.eventName)}</td>
                <td>${escapeHtml(r.section)}</td>
                <td>${r.count}</td>
                <td>${r.sessions}</td>
              </tr>`
                    )
                    .join('')
                : '<tr><td colspan="4">Henüz event verisi yok</td></tr>'
            }
          </tbody>
        </table>
      </div>

      <h4 style="margin:20px 0 10px">Trafik kaynakları</h4>
      <div class="table-scroll">
        <table class="table platform-site-analytics__table">
          <thead>
            <tr><th>Kaynak</th><th>Ziyaret</th><th>Analiz</th><th>Lead</th><th>Dönüşüm</th></tr>
          </thead>
          <tbody>
            ${
              metrics.trafficRows.length
                ? metrics.trafficRows
                    .map(
                      (r) => `
              <tr>
                <td>${escapeHtml(r.source)}</td>
                <td>${r.visits}</td>
                <td>${r.analysis}</td>
                <td>${r.leads}</td>
                <td>${r.conversion}</td>
              </tr>`
                    )
                    .join('')
                : '<tr><td colspan="5">Henüz trafik kaynağı verisi yok</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}

export { FILTER_PRESETS };
