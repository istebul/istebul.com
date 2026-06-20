/**
 * P19 — Admin views for scale architecture matrix.
 */

const TIER_LABELS = { '10k': '10K MAU', '100k': '100K MAU', '1m': '1M MAU' };

function riskBadge(risk, esc) {
  const r = String(risk || 'medium').toLowerCase();
  const color =
    r === 'critical' || r === 'high'
      ? 'var(--danger)'
      : r === 'medium'
        ? 'var(--warning)'
        : 'var(--success)';
  return `<span style="color:${color};font-weight:600">${esc(r)}</span>`;
}

/**
 * @param {object} report buildScaleArchitectureReport output
 * @param {(s: string) => string} escapeHtml
 */
export function renderScaleArchitectureCenter(report, escapeHtml) {
  const esc = escapeHtml || ((s) => String(s ?? ''));

  const confidenceCards = ['10k', '100k', '1m']
    .map(
      (tier) => `
    <div class="stat-card">
      <div class="stat-label">${esc(TIER_LABELS[tier])}</div>
      <div class="stat-value">${report.tierConfidence?.[tier] ?? '—'}%</div>
      <div class="text-muted-sm" style="font-size:12px">${esc(report.confidenceVerdict?.[tier])}</div>
    </div>`
    )
    .join('');

  const volumeRows = ['10k', '100k', '1m']
    .map((tier) => {
      const v = report.volumeEstimates?.[tier] || {};
      return `<tr>
        <td>${esc(TIER_LABELS[tier])}</td>
        <td>${(v.analyticsEventsPerMonth ?? 0).toLocaleString('en-US')}</td>
        <td>${(v.analyticsEventsPerDay ?? 0).toLocaleString('en-US')}</td>
        <td>${(v.aiCallsPerMonth ?? 0).toLocaleString('en-US')}</td>
        <td>${(v.lifecycleEmailsPerMonth ?? 0).toLocaleString('en-US')}</td>
      </tr>`;
    })
    .join('');

  const dimensionBlocks = (report.dimensions || [])
    .map((dim) => {
      const tierCells = ['10k', '100k', '1m']
        .map((tier) => {
          const t = dim.tiers?.[tier] || {};
          return `
        <div class="stat-card" style="padding:10px 12px;margin-bottom:8px">
          <div class="stat-label">${esc(TIER_LABELS[tier])} · ${riskBadge(t.risk, esc)}</div>
          <p class="text-muted-sm" style="margin:6px 0 4px;font-size:12px"><strong>Darboğaz:</strong> ${esc(t.bottleneck)}</p>
          <p class="text-muted-sm" style="margin:4px 0;font-size:12px"><strong>Azaltma:</strong> ${esc(t.mitigation)}</p>
          <p class="text-muted-sm" style="margin:4px 0 0;font-size:11px"><strong>Hızlı:</strong> ${esc(t.quickImplementation)}</p>
        </div>`;
        })
        .join('');
      return `
      <details style="margin-bottom:12px;border:1px solid var(--border);border-radius:8px;padding:8px 12px">
        <summary style="cursor:pointer;font-weight:600">${esc(dim.name)}</summary>
        <div style="margin-top:10px">${tierCells}</div>
      </details>`;
    })
    .join('');

  const guard = report.currentGuardrails || {};

  return `
    <p class="text-muted-sm" style="margin:0 0 16px">
      P19 Ölçek mimarisi · <code>npm run metrics:scale:architecture</code> ·
      <a href="/${esc(report.docPath)}" target="_blank" rel="noopener">Uygulama oyun planı</a>
    </p>

    <div class="stat-card" style="margin-bottom:16px;padding:14px 16px">
      <strong>Teknik ölçek güveni</strong>
      <ul style="margin:10px 0 0;padding-left:18px;font-size:13px;line-height:1.55">
        ${(report.executiveSummary || []).map((line) => `<li>${esc(line)}</li>`).join('')}
      </ul>
    </div>

    <h3 style="margin:0 0 12px">Senaryo bazlı güven</h3>
    <div class="stat-grid" style="margin-bottom:18px">${confidenceCards}</div>

    <h3 style="margin:0 0 12px">Hacim tahminleri (planlama)</h3>
    <div class="table-wrap" style="margin-bottom:18px;overflow-x:auto">
      <table class="admin-table">
        <thead>
          <tr><th>Kademe</th><th>Olay/ay</th><th>Olay/gün</th><th>AI çağrı/ay</th><th>Lifecycle e-posta/ay</th></tr>
        </thead>
        <tbody>${volumeRows}</tbody>
      </table>
    </div>

    <h3 style="margin:0 0 12px">Mevcut koruma limitleri (repo)</h3>
    <p class="text-muted-sm" style="margin:0 0 18px;font-size:12px">
      Analitik kuyruk ${guard.analyticsMaxQueue} · ingest ${guard.analyticsIngestPerIpPerMin}/min/IP ·
      batch ${guard.analyticsBatchMax} · saklama ${guard.analyticsRetentionDays}d ·
      AI ${guard.aiProxyPerIpPerMin}/min/IP, ${guard.aiSessionCallsPerHour}/session/h ·
      lifecycle ${guard.lifecycleSendsPerRun}/run · admin satır ${guard.adminExecutiveRowLimit}
    </p>

    <h3 style="margin:0 0 12px">Boyut matrisi (risk · darboğaz · azaltma · hızlı kazanım)</h3>
    ${dimensionBlocks}
  `;
}
