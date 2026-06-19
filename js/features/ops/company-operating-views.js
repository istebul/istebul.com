/**
 * P20 — Admin views for Company Operating System.
 */

/**
 * @param {object} snapshot
 * @param {(s: string) => string} escapeHtml
 */
export function renderCompanyOperatingSystem(snapshot, escapeHtml) {
  const esc = escapeHtml || ((s) => String(s ?? ''));
  const indepColor =
    snapshot.independenceScore >= 80
      ? 'var(--success)'
      : snapshot.independenceScore >= 50
        ? 'var(--warning)'
        : 'var(--danger)';

  const checkList = (snapshot.founderIndependenceChecks || [])
    .map(
      (c) =>
        `<li>${c.pass ? '✓' : '○'} <strong>${esc(c.check)}</strong> — ${esc(c.detail)} <span class="text-muted-sm">(${esc(c.owner)})</span></li>`
    )
    .join('');

  const reviewBlocks = (snapshot.reviews || [])
    .map((r) => {
      const d = r.data;
      const agenda = (d.agenda || [])
        .map((a) => `<li>${a.order}. ${esc(a.topic)} (${a.minutes}m)</li>`)
        .join('');
      const artifacts = (d.preReadArtifacts || [])
        .map(
          (a) =>
            `<li>${esc(a.label)}${a.npm ? ` · <code>${esc(a.npm)}</code>` : ''}${a.path ? ` · <code>${esc(a.path)}</code>` : ''}</li>`
        )
        .join('');
      return `
      <details style="margin-bottom:12px;border:1px solid var(--border);border-radius:8px;padding:8px 12px">
        <summary style="cursor:pointer;font-weight:600">${esc(d.title)} · ${esc(d.cadence)} · owner ${esc(d.owner)}</summary>
        <p class="text-muted-sm" style="margin:8px 0 6px">${d.durationMinutes} min</p>
        <p style="margin:0 0 6px;font-size:13px"><strong>Pre-read</strong></p>
        <ul style="margin:0 0 10px;padding-left:18px;font-size:12px">${artifacts}</ul>
        <p style="margin:0 0 6px;font-size:13px"><strong>Agenda</strong></p>
        <ul style="margin:0;padding-left:18px;font-size:12px">${agenda}</ul>
      </details>`;
    })
    .join('');

  const kpiRows = (snapshot.reviews?.find((r) => r.key === 'weeklyKpiReview')?.data?.kpiScorecard || [])
    .map(
      (k) =>
        `<tr><td>${esc(k.label)}</td><td>${esc(k.owner)}</td><td><code>${esc(k.source)}</code></td><td>${esc(k.targetDirection)}${k.target != null ? ` ${k.target}` : ''}</td></tr>`
    )
    .join('');

  const queueRows = (snapshot.roadmapNow || [])
    .map(
      (q) =>
        `<tr><td>${esc(q.id)}</td><td>${esc(q.title)}</td><td>${esc(q.owner)}</td><td>${q.riceScore ?? '—'}</td></tr>`
    )
    .join('');

  const decisionRows = (snapshot.decisionRecords || [])
    .slice(0, 8)
    .map(
      (d) =>
        `<tr>
          <td><code>${esc(d.id)}</code></td>
          <td>${esc(d.status)}</td>
          <td>${esc(d.type)}</td>
          <td>${esc(d.title?.slice(0, 60))}</td>
          <td>${esc(d.owner)}</td>
        </tr>`
    )
    .join('');

  const riceDoc = snapshot.roadmapFramework || {};

  return `
    <p class="text-muted-sm" style="margin:0 0 16px">
      P20 Company OS · <code>npm run metrics:company:operating</code> ·
      <a href="/${esc(snapshot.docPath)}" target="_blank" rel="noopener">Playbook</a> ·
      <a href="/docs/templates/DECISION_RECORD_TEMPLATE.md" target="_blank" rel="noopener">Decision template</a>
    </p>

    <div class="stat-card" style="margin-bottom:16px;padding:14px 16px;border-left:4px solid ${indepColor}">
      <strong>Founder-independence: ${snapshot.independenceScore}%</strong>
      <ul style="margin:10px 0 0;padding-left:18px;font-size:13px;line-height:1.55">
        ${(snapshot.executiveSummary || []).map((line) => `<li>${esc(line)}</li>`).join('')}
      </ul>
    </div>

    <h3 style="margin:0 0 12px">Independence checks</h3>
    <ul style="margin:0 0 18px;padding-left:18px;font-size:13px;line-height:1.55">${checkList}</ul>

    <h3 style="margin:0 0 12px">Weekly KPI scorecard (sources)</h3>
    <div class="table-wrap" style="margin-bottom:18px;overflow-x:auto">
      <table class="admin-table">
        <thead><tr><th>Metric</th><th>Owner</th><th>Source</th><th>Target</th></tr></thead>
        <tbody>${kpiRows || '<tr><td colspan="4">—</td></tr>'}</tbody>
      </table>
    </div>

    <h3 style="margin:0 0 12px">Review cadences</h3>
    ${reviewBlocks}

    <h3 style="margin:0 0 12px">Roadmap now (${esc(riceDoc.name || 'RICE')})</h3>
    <div class="table-wrap" style="margin-bottom:18px;overflow-x:auto">
      <table class="admin-table">
        <thead><tr><th>ID</th><th>Item</th><th>Owner</th><th>RICE</th></tr></thead>
        <tbody>${queueRows || '<tr><td colspan="4">—</td></tr>'}</tbody>
      </table>
    </div>

    <h3 style="margin:0 0 12px">Decision log</h3>
    <div class="table-wrap" style="margin-bottom:12px;overflow-x:auto">
      <table class="admin-table">
        <thead><tr><th>ID</th><th>Status</th><th>Type</th><th>Title</th><th>Owner</th></tr></thead>
        <tbody>${decisionRows}</tbody>
      </table>
    </div>
    <p class="text-muted-sm" style="margin:0;font-size:12px">
      Storage: <code>data/ops/decision-log.json</code> ·
      ${snapshot.decisionStats?.proposed ?? 0} proposed ·
      ${snapshot.decisionStats?.approved ?? 0} approved
    </p>
  `;
}
