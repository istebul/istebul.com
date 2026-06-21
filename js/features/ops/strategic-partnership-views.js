/**
 * P26 — Admin views for strategic partnership roadmap.
 */

/**
 * @param {object} snapshot
 * @param {(s: string) => string} escapeHtml
 */
export function renderStrategicPartnershipCenter(snapshot, escapeHtml) {
  const esc = escapeHtml || ((s) => String(s ?? ''));
  const v = snapshot.accelerationVerdict || {};

  const typeRows = (snapshot.partnerTypes || [])
    .map(
      (t) => `
    <tr>
      <td>${t.rank}</td>
      <td><strong>${esc(t.name)}</strong></td>
      <td>${esc(t.maturity)}</td>
      <td>Dalga ${t.wave}</td>
      <td><strong>${t.compositeScore}%</strong></td>
      <td>${esc(t.lane)}</td>
      <td class="text-muted-sm">${esc(t.monetizationPlays?.[0])}</td>
      <td class="text-muted-sm">${esc(t.distributionPlays?.[0])}</td>
    </tr>`
    )
    .join('');

  const phaseList = (snapshot.roadmapPhases || [])
    .map(
      (p) =>
        `<li><strong>${esc(p.id)}</strong> — ${esc(p.name)}${p.monetizationGoal ? ` · ${esc(p.monetizationGoal)}` : ''}</li>`
    )
    .join('');

  const dimRows = (snapshot.scoringDimensions || [])
    .map((d) => `<tr><td>${esc(d.name)}</td><td>${Math.round((d.weight || 0) * 100)}%</td></tr>`)
    .join('');

  return `
    <p class="text-muted-sm" style="margin:0 0 16px">
      P26 Stratejik ortaklıklar · <code>npm run metrics:partnerships:roadmap</code> ·
      <a href="/${esc(snapshot.docPath)}" target="_blank" rel="noopener">BD oyun planı</a>
    </p>

    <div class="stat-card" style="margin-bottom:16px;padding:14px 16px;border-left:4px solid var(--success)">
      <strong>Hızlandırma: Dalga 1 = ${esc((v.wave1Focus || []).join(' + '))}</strong>
      <p class="text-muted-sm" style="margin:8px 0 0;font-size:13px">${esc(snapshot.mission)}</p>
      <ul style="margin:10px 0 0;padding-left:18px;font-size:13px;line-height:1.55">
        ${(snapshot.executiveSummary || []).map((line) => `<li>${esc(line)}</li>`).join('')}
      </ul>
    </div>

    <h3 style="margin:0 0 12px">Puanlama boyutları</h3>
    <div class="table-wrap" style="margin-bottom:18px;overflow-x:auto">
      <table class="admin-table">
        <thead><tr><th>Boyut</th><th>Ağırlık</th></tr></thead>
        <tbody>${dimRows}</tbody>
      </table>
    </div>

    <h3 style="margin:0 0 12px">Yedi ortak türü</h3>
    <div class="table-wrap" style="margin-bottom:18px;overflow-x:auto">
      <table class="admin-table">
        <thead>
          <tr><th>#</th><th>Tür</th><th>Olgunluk</th><th>Dalga</th><th>Skor</th><th>Şerit</th><th>Gelirleştirme</th><th>Dağıtım</th></tr>
        </thead>
        <tbody>${typeRows}</tbody>
      </table>
    </div>

    <h3 style="margin:0 0 12px">Yol haritası fazları</h3>
    <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.55">${phaseList}</ul>
  `;
}
