/**
 * Unified funnel dashboard — Auto, Konut, Tatil, Finans on one admin screen.
 */

/** Canonical funnel stage aliases for event → stage resolution. */
export const FUNNEL_STAGE_ALIASES = Object.freeze({
  visit: [
    'auto_page_view',
    'auto_form_started',
    'housing_page_view',
    'home_analysis_start',
    'vacation_start',
    'vacation_page_view',
    'finans_start',
    'finance_page_view',
    'finance_funnel_start',
    'konut_start',
    'category_page_view',
    'insurance_page_view',
    'page_view',
    'analysis_started'
  ],
  complete: [
    'wizard_complete',
    'analysis_completed',
    'auto_wizard_complete',
    'auto_form_submitted',
    'auto_results_rendered',
    'auto_results_view',
    'home_wizard_complete',
    'home_results_view',
    'housing_results_view',
    'vacation_wizard_complete',
    'vacation_results_view',
    'finans_results_view',
    'finance_results_view',
    'finance_funnel_complete',
    'results_viewed',
    'results_view',
    'insurance_results_view',
    'kasko_wizard_complete',
    'kasko_results_view'
  ],
  lead_open: [
    'lead_form_opened',
    'auto_modal_open',
    'insurance_interest',
    'home_lead_open',
    'vacation_lead_open'
  ],
  lead_submit: [
    'lead_submitted',
    'lead_submit',
    'auto_lead_submit',
    'finans_lead_submit',
    'lead_submitted',
    'vacation_lead_submit',
    'home_lead_submit',
    'insurance_lead_submit'
  ]
});

/**
 * Resolve a raw event name to a canonical funnel stage.
 * @param {string} eventName
 * @returns {'visit'|'complete'|'lead_open'|'lead_submit'|null}
 */
export function resolveFunnelStage(eventName) {
  const name = String(eventName || '').trim();
  if (!name) return null;
  for (const [stage, aliases] of Object.entries(FUNNEL_STAGE_ALIASES)) {
    if (aliases.includes(name)) return stage;
  }
  return null;
}

const CATEGORY_FUNNELS = Object.freeze([
  {
    id: 'auto',
    label: 'Auto',
    visit: ['auto_page_view', 'auto_form_started'],
    results: ['auto_results_rendered', 'auto_form_submitted', 'auto_wizard_complete', 'wizard_complete'],
    lead: ['auto_lead_submit', 'lead_submit']
  },
  {
    id: 'konut',
    label: 'Konut',
    visit: ['housing_page_view', 'home_analysis_start'],
    results: ['home_results_view', 'home_wizard_complete', 'housing_results_view'],
    lead: ['home_lead_submit']
  },
  {
    id: 'tatil',
    label: 'Tatil',
    visit: ['vacation_start', 'vacation_page_view'],
    results: ['vacation_results_view', 'vacation_wizard_complete'],
    lead: ['vacation_lead_submit']
  },
  {
    id: 'finans',
    label: 'Finans',
    visit: ['finans_start', 'finance_page_view', 'finance_funnel_start', 'category_page_view'],
    results: ['finans_results_view', 'finance_results_view', 'results_viewed', 'finance_funnel_complete'],
    lead: ['finans_lead_submit', 'lead_submitted']
  },
  {
    id: 'sigorta',
    label: 'Sigorta',
    visit: ['insurance_page_view', 'insurance_analysis_started', 'category_page_view'],
    results: ['insurance_results_view', 'results_viewed'],
    lead: ['lead_submitted', 'insurance_lead_submit'],
    lead_open: ['insurance_interest']
  },
  {
    id: 'kasko',
    label: 'Kasko',
    visit: ['category_page_view', 'page_view', 'kasko_analysis_started'],
    results: ['kasko_wizard_complete', 'kasko_results_view'],
    lead: ['lead_submitted', 'kasko_lead_submit']
  }
]);

function countByNames(rows, names) {
  const set = new Set(names);
  const sessions = new Set();
  let total = 0;
  for (const row of rows) {
    const name = row.event_name || row.event_type || '';
    if (!set.has(name)) continue;
    total += 1;
    const sid = row.session_id || row.metadata?.session_id;
    if (sid) sessions.add(sid);
  }
  return { total, sessions: sessions.size || total };
}

function pct(part, whole) {
  if (!whole) return '—';
  return `${Math.round((part / whole) * 1000) / 10}%`;
}

function normalizeEventRows(tableRows = []) {
  return tableRows.map((row) => ({
    event_name: row.event_name || row.event_type,
    session_id: row.session_id || row.metadata?.session_id,
    metadata: row.metadata
  }));
}

export function buildUnifiedFunnelMetrics(eventRows = []) {
  const rows = normalizeEventRows(eventRows);
  return CATEGORY_FUNNELS.map((cat) => {
    const visits = countByNames(rows, cat.visit);
    const results = countByNames(rows, cat.results);
    const leads = countByNames(rows, cat.lead);
    const visitBase = visits.sessions || visits.total;
    const resultBase = results.sessions || results.total;
    return {
      ...cat,
      visits: visits.total,
      visitSessions: visitBase,
      results: results.total,
      resultSessions: resultBase,
      leads: leads.total,
      leadSessions: leads.sessions || leads.total,
      visitToResult: pct(resultBase, visitBase),
      resultToLead: pct(leads.sessions || leads.total, resultBase),
      overallConversion: pct(leads.sessions || leads.total, visitBase)
    };
  });
}

export function renderUnifiedFunnelDashboard(metrics, escapeHtml) {
  const esc = escapeHtml;
  const bestLead = [...metrics].sort((a, b) => b.leads - a.leads)[0];
  const bestCr = [...metrics].sort((a, b) => {
    const aCr = parseFloat(a.overallConversion) || 0;
    const bCr = parseFloat(b.overallConversion) || 0;
    return bCr - aCr;
  })[0];

  return `
    <div class="unified-funnel-dashboard">
      <div class="stat-grid" style="margin-bottom:16px">
        <article class="stat-card"><div class="stat-label">En yüksek lead</div><div class="stat-value">${esc(bestLead?.label || '—')}</div><div class="stat-sub">${bestLead?.leads ?? 0} lead</div></article>
        <article class="stat-card"><div class="stat-label">En iyi dönüşüm</div><div class="stat-value">${esc(bestCr?.label || '—')}</div><div class="stat-sub">${esc(bestCr?.overallConversion || '—')}</div></article>
        <article class="stat-card"><div class="stat-label">Kategori sayısı</div><div class="stat-value">${metrics.length}</div><div class="stat-sub">Auto · Konut · Tatil · Finans · Sigorta · Kasko</div></article>
      </div>
      <div class="table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Kategori</th>
              <th>Ziyaret</th>
              <th>Sonuç görüntüleme</th>
              <th>Lead</th>
              <th>Ziyaret→Sonuç</th>
              <th>Sonuç→Lead</th>
              <th>Toplam dönüşüm</th>
            </tr>
          </thead>
          <tbody>
            ${metrics
              .map(
                (row) => `
              <tr>
                <td><strong>${esc(row.label)}</strong></td>
                <td>${row.visits}</td>
                <td>${row.results}</td>
                <td>${row.leads}</td>
                <td>${esc(row.visitToResult)}</td>
                <td>${esc(row.resultToLead)}</td>
                <td>${esc(row.overallConversion)}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
      <p class="text-muted-sm" style="margin-top:12px">Kategori karşılaştırması — analytics_events + dikey intake eventleri birleşik.</p>
    </div>`;
}
