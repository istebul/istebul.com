/**
 * P21 — Admin views for hiring architecture.
 */

/**
 * @param {object} snapshot
 * @param {(s: string) => string} escapeHtml
 */
export function renderHiringArchitectureCenter(snapshot, escapeHtml) {
  const esc = escapeHtml || ((s) => String(s ?? ''));

  const sequenceList = (snapshot.hireSequence || [])
    .map(
      (s, i) =>
        `<li>${i + 1}. <strong>${esc(s.roleId)}</strong> — ${esc(s.trigger)}</li>`
    )
    .join('');

  const roleBlocks = (snapshot.roles || [])
    .map((role) => {
      const kpis = (role.kpis || [])
        .map(
          (k) =>
            `<li>${esc(k.label)}: ${esc(k.target)} <span class="text-muted-sm">(${esc(k.source)})</span></li>`
        )
        .join('');
      const d90 = (role.first90Days || [])
        .map((d) => `<li>Day ${d.day}: ${esc(d.goal)}</li>`)
        .join('');
      return `
      <details style="margin-bottom:12px;border:1px solid var(--border);border-radius:8px;padding:8px 12px">
        <summary style="cursor:pointer;font-weight:600">
          ${esc(role.title)} · urgency ${role.urgencyScore ?? 0} · reports to ${esc(role.reportsTo)}
        </summary>
        <p class="text-muted-sm" style="margin:8px 0 6px;font-size:12px"><strong>Neden:</strong> ${esc(role.why)}</p>
        <p class="text-muted-sm" style="margin:4px 0 6px;font-size:12px"><strong>Ne zaman:</strong> ${esc(role.when?.hireTrigger)}</p>
        <p style="margin:0 0 6px;font-size:13px"><strong>KPI</strong></p>
        <ul style="margin:0 0 10px;padding-left:18px;font-size:12px">${kpis}</ul>
        <p style="margin:0 0 6px;font-size:13px"><strong>İlk 90 gün</strong></p>
        <ul style="margin:0;padding-left:18px;font-size:12px">${d90}</ul>
      </details>`;
    })
    .join('');

  const squadRows = (snapshot.scalableTeamDesign?.squads || [])
    .map(
      (s) =>
        `<tr><td>${esc(s.id)}</td><td>${esc(s.lead)}</td><td>${esc((s.members || []).join(', '))}</td><td>${esc(s.metric)}</td></tr>`
    )
    .join('');

  return `
    <p class="text-muted-sm" style="margin:0 0 16px">
      P21 Hiring Architecture · <code>npm run metrics:hiring:architecture</code> ·
      <a href="/${esc(snapshot.docPath)}" target="_blank" rel="noopener">Playbook</a>
    </p>

    <div class="stat-card" style="margin-bottom:16px;padding:14px 16px;border-left:4px solid var(--primary)">
      <strong>Next hire: ${esc(snapshot.nextRecommendedHire?.roleId || '—')}</strong>
      <ul style="margin:10px 0 0;padding-left:18px;font-size:13px;line-height:1.55">
        ${(snapshot.executiveSummary || []).map((line) => `<li>${esc(line)}</li>`).join('')}
      </ul>
    </div>

    <h3 style="margin:0 0 12px">Hire sequence (metric-triggered)</h3>
    <ol style="margin:0 0 18px;padding-left:18px;font-size:13px;line-height:1.55">${sequenceList}</ol>

    <h3 style="margin:0 0 12px">Squads (scalable team design)</h3>
    <div class="table-wrap" style="margin-bottom:18px;overflow-x:auto">
      <table class="admin-table">
        <thead><tr><th>Squad</th><th>Lead</th><th>Roles</th><th>North-star</th></tr></thead>
        <tbody>${squadRows}</tbody>
      </table>
    </div>

    <h3 style="margin:0 0 12px">Roles (8)</h3>
    ${roleBlocks}
  `;
}
