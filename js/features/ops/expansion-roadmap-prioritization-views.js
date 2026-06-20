/**
 * P25 — Admin views for expansion roadmap prioritization.
 */

/**
 * @param {object} snapshot
 * @param {(s: string) => string} escapeHtml
 */
export function renderExpansionPrioritizationCenter(snapshot, escapeHtml) {
  const esc = escapeHtml || ((s) => String(s ?? ''));

  const criteriaRows = (snapshot.prioritizationCriteria || [])
    .map(
      (c) =>
        `<tr><td>${esc(c.name)}</td><td>${Math.round((c.weight || 0) * 100)}%</td><td class="text-muted-sm">${esc(c.description)}</td></tr>`
    )
    .join('');

  const catRows = (snapshot.categories || [])
    .map((cat) => {
      const scores = cat.scores || {};
      return `
    <tr>
      <td>${cat.rank}</td>
      <td><strong>${esc(cat.displayName)}</strong></td>
      <td>Dalga ${cat.wave}</td>
      <td><strong>${cat.compositeScore}%</strong></td>
      <td>${scores.monetization}</td>
      <td>${scores.data_availability}</td>
      <td>${scores.user_pain}</td>
      <td>${scores.repeat_usage}</td>
      <td>${scores.ai_differentiation}</td>
      <td>${scores.partner_economics}</td>
      <td class="text-muted-sm">${esc(cat.whyNow?.[0])}</td>
    </tr>`;
    })
    .join('');

  const sequence = (snapshot.recommendedSequence || [])
    .map((s) => `<li><strong>${s.order}. ${esc(s.name)}</strong> — ${esc(s.rationale)}</li>`)
    .join('');

  return `
    <p class="text-muted-sm" style="margin:0 0 16px">
      P25 Genişleme önceliklendirme · <code>npm run metrics:expansion:prioritization</code> ·
      <a href="/${esc(snapshot.docPath)}" target="_blank" rel="noopener">Tam yol haritası</a>
    </p>

    <div class="stat-card" style="margin-bottom:16px;padding:14px 16px;border-left:4px solid var(--success)">
      <strong>Önce: ${esc(snapshot.firstCategory?.displayName || snapshot.verdict?.firstCategoryDisplay)}</strong>
      <span class="text-muted-sm"> · skor ${snapshot.firstCategory?.compositeScore || '—'}% · beachhead ${esc(snapshot.beachhead?.name)}</span>
      <ul style="margin:10px 0 0;padding-left:18px;font-size:13px;line-height:1.55">
        ${(snapshot.executiveSummary || []).map((line) => `<li>${esc(line)}</li>`).join('')}
        ${(snapshot.firstCategory?.whyNow || []).map((w) => `<li>${esc(w)}</li>`).join('')}
      </ul>
    </div>

    <h3 style="margin:0 0 12px">Önceliklendirme kriterleri</h3>
    <div class="table-wrap" style="margin-bottom:18px;overflow-x:auto">
      <table class="admin-table">
        <thead><tr><th>Kriter</th><th>Ağırlık</th><th>Açıklama</th></tr></thead>
        <tbody>${criteriaRows}</tbody>
      </table>
    </div>

    <h3 style="margin:0 0 12px">Yedi kategori (puanlı)</h3>
    <div class="table-wrap" style="margin-bottom:18px;overflow-x:auto">
      <table class="admin-table">
        <thead>
          <tr>
            <th>#</th><th>Kategori</th><th>Dalga</th><th>Bileşik</th>
            <th>Gelir</th><th>Veri</th><th>Acı</th><th>Tekrar</th><th>AI</th><th>Partner</th><th>Neden</th>
          </tr>
        </thead>
        <tbody>${catRows}</tbody>
      </table>
    </div>

    <h3 style="margin:0 0 12px">Önerilen sıra</h3>
    <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.55">${sequence}</ul>
  `;
}
