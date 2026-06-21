/**
 * P24 — Admin views for competitor attack scenario.
 */

/**
 * @param {object} snapshot
 * @param {(s: string) => string} escapeHtml
 */
export function renderCompetitorAttackCenter(snapshot, escapeHtml) {
  const esc = escapeHtml || ((s) => String(s ?? ''));
  const scoreColor =
    snapshot.defenseReadinessPct >= 60
      ? 'var(--success)'
      : snapshot.defenseReadinessPct >= 45
        ? 'var(--warning)'
        : 'var(--danger)';

  const attackRows = (snapshot.attackScenarios || [])
    .map(
      (a) => `
    <tr>
      <td><strong>${esc(a.name)}</strong></td>
      <td>${esc(a.likelihood)}</td>
      <td>${esc(a.timeToMarket)}</td>
      <td>${esc(a.copyDepth)}</td>
      <td>${esc(a.priorityResponse)}</td>
      <td class="text-muted-sm" style="max-width:220px">${esc(a.counterNarrative?.slice(0, 80))}…</td>
    </tr>`
    )
    .join('');

  const defenseRows = (snapshot.defensePlans || [])
    .map(
      (p) => `
    <tr>
      <td>${esc(p.name)}</td>
      <td>${esc(p.status)}</td>
      <td>${p.strengthPct}%</td>
      <td class="text-muted-sm">${esc(p.plays?.[0])}</td>
    </tr>`
    )
    .join('');

  const matrixRows = (snapshot.warGameMatrix || [])
    .map(
      (w) => `
    <tr>
      <td><code>${esc(w.attackId)}</code></td>
      <td>${esc(w.primaryDefense)}</td>
      <td>${esc(w.secondaryDefense)}</td>
      <td class="text-muted-sm">${esc(w.doNotDo)}</td>
    </tr>`
    )
    .join('');

  const playbook = (snapshot.responsePlaybook || [])
    .map((p) => `<li><strong>${esc(p.phase)}</strong> — ${esc(p.name)}</li>`)
    .join('');

  return `
    <p class="text-muted-sm" style="margin:0 0 16px">
      P24 Rakip saldırısı · <code>npm run metrics:competitor:attack</code> ·
      <a href="/${esc(snapshot.docPath)}" target="_blank" rel="noopener">Savunma oyun planı</a>
    </p>

    <div class="stat-card" style="margin-bottom:16px;padding:14px 16px;border-left:4px solid ${scoreColor}">
      <strong>Savunma hazırlığı: ${snapshot.defenseReadinessPct}%</strong>
      <span class="text-muted-sm"> · ort. sütun ${snapshot.avgDefensePillarPct}%</span>
      <p class="text-muted-sm" style="margin:8px 0 0;font-size:13px">${esc(snapshot.strategicThesis)}</p>
      <ul style="margin:10px 0 0;padding-left:18px;font-size:13px;line-height:1.55">
        ${(snapshot.executiveSummary || []).map((line) => `<li>${esc(line)}</li>`).join('')}
      </ul>
    </div>

    <h3 style="margin:0 0 12px">Saldırı senaryoları (büyük oyuncular kopyası)</h3>
    <div class="table-wrap" style="margin-bottom:18px;overflow-x:auto">
      <table class="admin-table">
        <thead><tr><th>Senaryo</th><th>Olasılık</th><th>ETA</th><th>Kopya derinliği</th><th>Öncelikli savunma</th><th>Karşı hamle</th></tr></thead>
        <tbody>${attackRows}</tbody>
      </table>
    </div>

    <h3 style="margin:0 0 12px">Savunma planı (6 sütun)</h3>
    <div class="table-wrap" style="margin-bottom:18px;overflow-x:auto">
      <table class="admin-table">
        <thead><tr><th>Sütun</th><th>Durum</th><th>Skor</th><th>Öncelikli hamle</th></tr></thead>
        <tbody>${defenseRows}</tbody>
      </table>
    </div>

    <h3 style="margin:0 0 12px">Savaş oyunu matrisi</h3>
    <div class="table-wrap" style="margin-bottom:18px;overflow-x:auto">
      <table class="admin-table">
        <thead><tr><th>Saldırı</th><th>Birincil</th><th>İkincil</th><th>Yapılmaması gereken</th></tr></thead>
        <tbody>${matrixRows}</tbody>
      </table>
    </div>

    <h3 style="margin:0 0 12px">Yanıt oyun planı</h3>
    <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.55">${playbook}</ul>
  `;
}
