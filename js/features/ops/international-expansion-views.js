/**
 * P22 — Admin views for international expansion audit.
 */

/**
 * @param {object} snapshot
 * @param {(s: string) => string} escapeHtml
 */
export function renderInternationalExpansionCenter(snapshot, escapeHtml) {
  const esc = escapeHtml || ((s) => String(s ?? ''));
  const scoreColor =
    snapshot.globalReadinessPct >= 70
      ? 'var(--success)'
      : snapshot.globalReadinessPct >= 50
        ? 'var(--warning)'
        : 'var(--danger)';

  const dimRows = (snapshot.dimensions || [])
    .map(
      (d) => `
    <tr>
      <td>${esc(d.name)}</td>
      <td>${esc(d.status)}</td>
      <td>${d.readinessPct}%</td>
      <td class="text-muted-sm" style="max-width:200px">${esc(d.gaps?.[0])}</td>
      <td class="text-muted-sm" style="max-width:200px">${esc(d.quickWin)}</td>
    </tr>`
    )
    .join('');

  const marketRows = (snapshot.priorityMarkets || [])
    .slice(0, 8)
    .map(
      (m) => `
    <tr>
      <td>${m.rank}</td>
      <td><strong>${esc(m.country)}</strong></td>
      <td>${esc(m.locale)} / ${esc(m.currency)}</td>
      <td>${m.readinessScore}%</td>
      <td>${esc(m.phase)}</td>
      <td class="text-muted-sm">${esc(m.rationale?.slice(0, 80))}…</td>
    </tr>`
    )
    .join('');

  const phaseList = (snapshot.roadmapPhases || [])
    .map((p) => `<li><strong>${esc(p.id)}</strong> — ${esc(p.name)}</li>`)
    .join('');

  return `
    <p class="text-muted-sm" style="margin:0 0 16px">
      P22 International Expansion · <code>npm run metrics:international:audit</code> ·
      <a href="/${esc(snapshot.docPath)}" target="_blank" rel="noopener">Audit playbook</a>
    </p>

    <div class="stat-card" style="margin-bottom:16px;padding:14px 16px;border-left:4px solid ${scoreColor}">
      <strong>Global readiness: ${snapshot.globalReadinessPct}%</strong>
      <span class="text-muted-sm"> · baseline ${esc(snapshot.baselineMarket?.name)} (${esc(snapshot.baselineMarket?.status)})</span>
      <ul style="margin:10px 0 0;padding-left:18px;font-size:13px;line-height:1.55">
        ${(snapshot.executiveSummary || []).map((line) => `<li>${esc(line)}</li>`).join('')}
      </ul>
    </div>

    <h3 style="margin:0 0 12px">10 pillars (post-Turkey)</h3>
    <div class="table-wrap" style="margin-bottom:18px;overflow-x:auto">
      <table class="admin-table">
        <thead><tr><th>Pillar</th><th>Status</th><th>Score</th><th>Gap</th><th>Quick win</th></tr></thead>
        <tbody>${dimRows}</tbody>
      </table>
    </div>

    <h3 style="margin:0 0 12px">Priority expansion markets</h3>
    <div class="table-wrap" style="margin-bottom:18px;overflow-x:auto">
      <table class="admin-table">
        <thead><tr><th>#</th><th>Country</th><th>Locale</th><th>Score</th><th>Wave</th><th>Rationale</th></tr></thead>
        <tbody>${marketRows}</tbody>
      </table>
    </div>

    <h3 style="margin:0 0 12px">Domain strategy</h3>
    <p class="text-muted-sm" style="margin:0 0 12px;font-size:13px">
      Phase 1: ${esc(snapshot.domainStrategy?.phase1)} ·
      x-default: ${esc(snapshot.domainStrategy?.xDefaultRecommendation)}
    </p>

    <h3 style="margin:0 0 12px">Roadmap phases</h3>
    <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.55">${phaseList}</ul>
  `;
}
