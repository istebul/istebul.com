/**
 * P23 — Admin views for category dominance strategy.
 */

/**
 * @param {object} snapshot
 * @param {(s: string) => string} escapeHtml
 */
export function renderCategoryDominanceCenter(snapshot, escapeHtml) {
  const esc = escapeHtml || ((s) => String(s ?? ''));
  const scoreColor =
    snapshot.categoryOwnershipPct >= 60
      ? 'var(--success)'
      : snapshot.categoryOwnershipPct >= 45
        ? 'var(--warning)'
        : 'var(--danger)';

  const moatRows = (snapshot.moatPlans || [])
    .map(
      (m) => `
    <tr>
      <td>${esc(m.name)}</td>
      <td>${esc(m.status)}</td>
      <td>${m.strengthPct}%</td>
      <td class="text-muted-sm" style="max-width:220px">${esc(m.plays?.[0])}</td>
      <td class="text-muted-sm">${esc(m.blockers?.[0])}</td>
    </tr>`
    )
    .join('');

  const compRows = (snapshot.competitorLandscape || [])
    .map(
      (c) => `
    <tr>
      <td><strong>${esc(c.name)}</strong></td>
      <td>${esc(c.archetype)}</td>
      <td>${esc(c.threatLevel)}</td>
      <td class="text-muted-sm" style="max-width:200px">${esc(c.wedge)}</td>
      <td class="text-muted-sm" style="max-width:200px">${esc(c.isteBulCounter?.slice(0, 70))}…</td>
    </tr>`
    )
    .join('');

  const phaseList = (snapshot.dominancePhases || [])
    .map((p) => `<li><strong>${esc(p.id)}</strong> — ${esc(p.name)}</li>`)
    .join('');

  return `
    <p class="text-muted-sm" style="margin:0 0 16px">
      P23 Category Dominance · <code>npm run metrics:category:dominance</code> ·
      <a href="/${esc(snapshot.docPath)}" target="_blank" rel="noopener">Strategy playbook</a>
    </p>

    <div class="stat-card" style="margin-bottom:16px;padding:14px 16px;border-left:4px solid ${scoreColor}">
      <strong>Category ownership: ${snapshot.categoryOwnershipPct}%</strong>
      <span class="text-muted-sm"> · avg moat ${snapshot.avgMoatStrengthPct}% · ${esc(snapshot.categoryDefinition?.tagline)}</span>
      <ul style="margin:10px 0 0;padding-left:18px;font-size:13px;line-height:1.55">
        ${(snapshot.executiveSummary || []).map((line) => `<li>${esc(line)}</li>`).join('')}
      </ul>
    </div>

    <h3 style="margin:0 0 12px">Competitor landscape</h3>
    <div class="table-wrap" style="margin-bottom:18px;overflow-x:auto">
      <table class="admin-table">
        <thead><tr><th>Competitor</th><th>Archetype</th><th>Threat</th><th>Wedge</th><th>isteBul counter</th></tr></thead>
        <tbody>${compRows}</tbody>
      </table>
    </div>

    <h3 style="margin:0 0 12px">Six moat plans</h3>
    <div class="table-wrap" style="margin-bottom:18px;overflow-x:auto">
      <table class="admin-table">
        <thead><tr><th>Moat</th><th>Status</th><th>Score</th><th>Lead play</th><th>Blocker</th></tr></thead>
        <tbody>${moatRows}</tbody>
      </table>
    </div>

    <h3 style="margin:0 0 12px">Dominance phases</h3>
    <ul style="margin:0 0 12px;padding-left:18px;font-size:13px;line-height:1.55">${phaseList}</ul>

    <p class="text-muted-sm" style="margin:0;font-size:12px">
      Flywheel: ${esc((snapshot.flywheel?.steps || []).join(' → '))}
    </p>
  `;
}
