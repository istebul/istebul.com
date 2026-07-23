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
        <summary style="cursor:pointer;font-weight:600">${esc(d.title)} · ${esc(d.cadence)} · sahip ${esc(d.owner)}</summary>
        <p class="text-muted-sm" style="margin:8px 0 6px">${d.durationMinutes} dk</p>
        <p style="margin:0 0 6px;font-size:13px"><strong>Ön okuma</strong></p>
        <ul style="margin:0 0 10px;padding-left:18px;font-size:12px">${artifacts}</ul>
        <p style="margin:0 0 6px;font-size:13px"><strong>Gündem</strong></p>
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
      P20 Şirket işletim sistemi · <code>npm run metrics:company:operating</code> ·
      <a href="/${esc(snapshot.docPath)}" target="_blank" rel="noopener">Oyun planı</a> ·
      <a href="/docs/templates/DECISION_RECORD_TEMPLATE.md" target="_blank" rel="noopener">Karar şablonu</a>
    </p>

    <div class="stat-card" style="margin-bottom:16px;padding:14px 16px;border-left:4px solid ${indepColor}">
      <strong>Kurucu bağımsızlığı: ${snapshot.independenceScore}%</strong>
      <ul style="margin:10px 0 0;padding-left:18px;font-size:13px;line-height:1.55">
        ${(snapshot.executiveSummary || []).map((line) => `<li>${esc(line)}</li>`).join('')}
      </ul>
    </div>

    <h3 style="margin:0 0 12px">Bağımsızlık kontrolleri</h3>
    <ul style="margin:0 0 18px;padding-left:18px;font-size:13px;line-height:1.55">${checkList}</ul>

    <h3 style="margin:0 0 12px">Haftalık KPI skor kartı (kaynaklar)</h3>
    <div class="table-wrap" style="margin-bottom:18px;overflow-x:auto">
      <table class="admin-table">
        <thead><tr><th>Metrik</th><th>Sahip</th><th>Kaynak</th><th>Hedef</th></tr></thead>
        <tbody>${kpiRows || '<tr><td colspan="4">—</td></tr>'}</tbody>
      </table>
    </div>

    <h3 style="margin:0 0 12px">İnceleme ritimleri</h3>
    ${reviewBlocks}

    <h3 style="margin:0 0 12px">Yol haritası — şimdi (${esc(riceDoc.name || 'RICE')})</h3>
    <div class="table-wrap" style="margin-bottom:18px;overflow-x:auto">
      <table class="admin-table">
        <thead><tr><th>ID</th><th>Öğe</th><th>Sahip</th><th>RICE</th></tr></thead>
        <tbody>${queueRows || '<tr><td colspan="4">—</td></tr>'}</tbody>
      </table>
    </div>

    <h3 style="margin:0 0 12px">Karar günlüğü</h3>
    <div class="table-wrap" style="margin-bottom:12px;overflow-x:auto">
      <table class="admin-table">
        <thead><tr><th>ID</th><th>Durum</th><th>Tip</th><th>Başlık</th><th>Sahip</th></tr></thead>
        <tbody>${decisionRows}</tbody>
      </table>
    </div>
    <p class="text-muted-sm" style="margin:0;font-size:12px">
      Depolama: <code>data/ops/decision-log.json</code> ·
      ${snapshot.decisionStats?.proposed ?? 0} önerilen ·
      ${snapshot.decisionStats?.approved ?? 0} onaylı
    </p>
  `;
}
