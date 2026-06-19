/**
 * P11-exit — Admin views for acquisition / exit optionality.
 */

function formatTryAdmin(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `₺${Number(n).toLocaleString('tr-TR')}`;
}

/**
 * Live Supabase founder metrics (P11).
 * @param {object} metrics from computeExitOptionalityMetrics
 * @param {(s: string) => string} escapeHtml
 */
export function renderFounderExitMetrics(metrics, escapeHtml) {
  const esc = escapeHtml || ((s) => String(s ?? ''));
  const m = metrics || {};
  const att = m.acquisitionAttractiveness || {};

  if (!m.totalLeads && m.dataSource === 'config_only') {
    return `
    <div class="stat-card" style="margin-bottom:16px;padding:12px 14px;border-left:4px solid var(--muted)">
      <strong>Founder metrics</strong>
      <p class="text-muted-sm" style="margin:8px 0 0">Canlı lead verisi admin oturumunda yüklenir. CLI: <code>npm run metrics:exit:optionality</code></p>
    </div>`;
  }

  const rows = [
    ['Acquisition attractiveness', `${att.score ?? '—'}/100 · ${esc(att.band || '—')}`],
    ['Estimated ARR (blended)', formatTryAdmin(m.estimatedArrTry)],
    ['Total leads', m.totalLeads ?? 0],
    ['Qualified leads', m.qualifiedLeads ?? 0],
    ['Closed deals', m.closedDeals ?? 0],
    ['Conversion %', m.conversionPct != null ? `${m.conversionPct}%` : '—'],
    ['Partner concentration risk', `${m.partnerConcentration?.riskScore ?? '—'}/100`],
    ['Funnel efficiency', `${m.funnelEfficiency?.efficiencyPct ?? '—'}%`],
    ['Repeat usage proxy', `${m.repeatUsage?.repeatActorPct ?? '—'}%`],
    ['AI moat signal', `${m.aiMoat?.score ?? '—'}/100`],
    ['Data moat depth', `${m.dataMoat?.depthScore ?? '—'}/100`]
  ];

  return `
    <h3 style="margin:24px 0 12px">Founder metrics (live)</h3>
    <p class="text-muted-sm" style="margin:0 0 12px">Source: <code>${esc(m.dataSource || 'admin')}</code> ·
      <a href="/docs/exit-optionality-report.md" target="_blank" rel="noopener">exit-optionality-report.md</a>
    </p>
    <div class="table-wrap" style="margin-bottom:18px;overflow-x:auto">
      <table class="admin-table">
        <thead><tr><th>Metric</th><th>Value</th></tr></thead>
        <tbody>
          ${rows
            .map(
              ([label, val]) => `
            <tr><td>${esc(label)}</td><td><strong>${esc(String(val))}</strong></td></tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>
    ${
      (m.fetchErrors || []).length
        ? `<p class="text-muted-sm" style="color:var(--warning)">Warnings: ${esc(m.fetchErrors.join('; '))}</p>`
        : ''
    }
  `;
}

/**
 * @param {object} snapshot
 * @param {(s: string) => string} escapeHtml
 * @param {object} [founderMetrics]
 */
export function renderAcquisitionExitCenter(snapshot, escapeHtml, founderMetrics = null) {
  const esc = escapeHtml || ((s) => String(s ?? ''));
  const v = snapshot.executiveVerdict || {};

  const buyerRows = (snapshot.strategicBuyers || [])
    .slice(0, 7)
    .map(
      (b) => `
    <tr>
      <td>${esc(b.id)}</td>
      <td>${esc(b.examples?.join(', '))}</td>
      <td>${b.fitScore}%</td>
      <td class="text-muted-sm">${esc(b.scenario?.slice(0, 70))}…</td>
    </tr>`
    )
    .join('');

  const gapRows = (snapshot.exitReadinessGaps || [])
    .slice(0, 6)
    .map(
      (g) => `
    <tr>
      <td>${esc(g.severity)}</td>
      <td>${esc(g.gap)}</td>
      <td>${esc(g.owner)}</td>
    </tr>`
    )
    .join('');

  const scenarioCards = ['bootstrap', 'seed', 'strategicAcquisition']
    .map((key) => {
      const s = snapshot.scenarios?.[key];
      if (!s) return '';
      const val = s.valuationPreMoneyTry || s.valuationTry || s.valuationImpliedTry;
      const range = val ? `₺${(val.low / 1e6).toFixed(0)}–${(val.high / 1e6).toFixed(0)}M` : '—';
      return `<li><strong>${esc(s.name)}</strong> (${Math.round((s.probability || 0) * 100)}%) — ${range}</li>`;
    })
    .join('');

  const roadmap = (snapshot.roadmap90Days || [])
    .map((r) => `<li><strong>${esc(r.week)}</strong> ${esc(r.workstream)}: ${esc(r.tasks?.[0])}</li>`)
    .join('');

  return `
    <p class="text-muted-sm" style="margin:0 0 16px">
      P11 Exit / M&A · <code>npm run metrics:exit:optionality</code> ·
      <a href="/${esc(snapshot.playbookPath)}" target="_blank" rel="noopener">Playbook</a> ·
      <a href="/${esc(snapshot.docPath)}" target="_blank" rel="noopener">Investor report</a>
    </p>

    <div class="stat-card" style="margin-bottom:16px;padding:14px 16px;border-left:4px solid var(--warning)">
      <strong>Exit readiness ${v.exitReadinessPct ?? '—'}% · Investability ${v.investabilityPct ?? '—'}%</strong>
      <p class="text-muted-sm" style="margin:8px 0 0">Path: <strong>${esc(v.recommendedPath)}</strong></p>
      <ul style="margin:10px 0 0;padding-left:18px;font-size:13px;line-height:1.55">
        ${(snapshot.executiveSummary || []).map((line) => `<li>${esc(line)}</li>`).join('')}
      </ul>
    </div>

    <h3 style="margin:0 0 12px">Three scenarios</h3>
    <ul style="margin:0 0 18px;padding-left:18px;font-size:13px">${scenarioCards}</ul>

    <h3 style="margin:0 0 12px">Strategic buyers</h3>
    <div class="table-wrap" style="margin-bottom:18px;overflow-x:auto">
      <table class="admin-table">
        <thead><tr><th>Type</th><th>Examples</th><th>Fit</th><th>Scenario</th></tr></thead>
        <tbody>${buyerRows}</tbody>
      </table>
    </div>

    <h3 style="margin:0 0 12px">Exit readiness gaps</h3>
    <div class="table-wrap" style="margin-bottom:18px;overflow-x:auto">
      <table class="admin-table">
        <thead><tr><th>Severity</th><th>Gap</th><th>Owner</th></tr></thead>
        <tbody>${gapRows}</tbody>
      </table>
    </div>

    <h3 style="margin:0 0 12px">90-day roadmap</h3>
    <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.55">${roadmap}</ul>

    ${renderFounderExitMetrics(founderMetrics, esc)}
  `;
}
