/**
 * P18 — Admin HTML for Startup Operating Center.
 */

/**
 * @param {object} snapshot buildStartupOperatingSnapshot output
 * @param {(s: string) => string} escapeHtml
 */
export function renderStartupOperatingCenter(snapshot, escapeHtml) {
  const esc = escapeHtml || ((s) => String(s ?? ''));
  const stageColor =
    snapshot.scaleStage === 'scale_ready'
      ? 'var(--success)'
      : snapshot.scaleStage === 'scaling'
        ? 'var(--warning)'
        : 'var(--text-muted)';

  const pillarCards = (snapshot.pillars || [])
    .map(
      (p) => `
    <div class="stat-card">
      <div class="stat-label">${esc(p.name)}</div>
      <div class="stat-value">${p.readinessPct}%</div>
      <div class="text-muted-sm" style="font-size:12px">${esc(p.owner)} · ${esc(p.targetState?.slice(0, 80))}…</div>
    </div>`
    )
    .join('');

  const bottleneckRows = (snapshot.bottlenecks || [])
    .slice(0, 8)
    .map(
      (b) => `
    <tr>
      <td><code>${esc(b.id)}</code></td>
      <td>${esc(b.severity)}</td>
      <td>${esc(b.pillar)}</td>
      <td>${esc(b.status)}</td>
      <td>${b.urgencyScore ?? '—'}</td>
      <td class="text-muted-sm" style="max-width:220px">${esc(b.mitigation?.slice(0, 100))}</td>
    </tr>`
    )
    .join('');

  const cadenceRows = (snapshot.decisionCadence || [])
    .map(
      (c) => `
    <tr>
      <td>${esc(c.id)}</td>
      <td>${esc(c.owner)}</td>
      <td>${esc(c.cadence)}</td>
      <td><code>${esc(c.npm)}</code></td>
    </tr>`
    )
    .join('');

  const quickWinList = (snapshot.quickWins || [])
    .map(
      (q) => `
    <li>
      <strong>${esc(q.title)}</strong>
      <span class="text-muted-sm"> · ${esc(q.owner)} · ${esc(q.status)}</span>
    </li>`
    )
    .join('');

  const roleGrid = (snapshot.executiveRoles || [])
    .map(
      (r) => `
    <div class="stat-card" style="padding:10px 12px">
      <div class="stat-label">${esc(r.title)}</div>
      <div class="text-muted-sm" style="font-size:12px;line-height:1.45">${esc(r.accountability)}</div>
    </div>`
    )
    .join('');

  return `
    <p class="text-muted-sm" style="margin:0 0 16px">
      P18 Startup operasyon modu · <code>npm run metrics:startup:operating</code> ·
      <a href="/docs/STARTUP_OPERATING_MODE.md" target="_blank" rel="noopener">Oyun planı</a>
    </p>

    <div class="stat-card" style="margin-bottom:16px;padding:14px 16px;border-left:4px solid ${stageColor}">
      <strong>Ölçek aşaması: ${esc(snapshot.scaleStage)}</strong>
      <span class="text-muted-sm"> · ${snapshot.scaleReadinessPct}% hazırlık · ops: ${esc(snapshot.opsHealth || '—')}</span>
      <ul style="margin:10px 0 0;padding-left:18px;font-size:13px;line-height:1.55">
        ${(snapshot.executiveSummary || []).map((line) => `<li>${esc(line)}</li>`).join('')}
      </ul>
    </div>

    <h3 style="margin:0 0 12px">Yönetici sorumlulukları (6 rol)</h3>
    <div class="stat-grid" style="margin-bottom:18px">${roleGrid}</div>

    <h3 style="margin:0 0 12px">Ölçek sütunları</h3>
    <div class="stat-grid" style="margin-bottom:18px">${pillarCards}</div>

    <h3 style="margin:0 0 12px">Darboğaz kaydı (sıralı)</h3>
    <div class="table-wrap" style="margin-bottom:18px;overflow-x:auto">
      <table class="admin-table">
        <thead>
          <tr><th>ID</th><th>Şiddet</th><th>Sütun</th><th>Durum</th><th>Aciliyet</th><th>Azaltma</th></tr>
        </thead>
        <tbody>${bottleneckRows || '<tr><td colspan="6">—</td></tr>'}</tbody>
      </table>
    </div>

    <h3 style="margin:0 0 12px">Karar ritmi</h3>
    <div class="table-wrap" style="margin-bottom:18px;overflow-x:auto">
      <table class="admin-table">
        <thead><tr><th>Ritüel</th><th>Sahip</th><th>Ritim</th><th>npm</th></tr></thead>
        <tbody>${cadenceRows}</tbody>
      </table>
    </div>

    <h3 style="margin:0 0 12px">Hızlı kazanımlar</h3>
    <ul style="margin:0 0 18px;padding-left:18px;font-size:13px;line-height:1.55">${quickWinList}</ul>

    <p class="text-muted-sm" style="margin:0">
      Fazlar: ${(snapshot.implementationPhases || []).map((p) => esc(p.id)).join(' → ')} ·
      Yol haritaları: automation P9, expansion P8, infra P16, unit economics P17
    </p>
  `;
}
