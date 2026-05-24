/**
 * P3.4 Scoring explainability — UI rendering only.
 * All numbers come from decision-consultant.js (deterministic); no LLM overrides.
 */

import { escapeHtml } from '../../core/security.js';

export function renderConfidenceSemanticsPanel(meta) {
  if (!meta) return '';
  const rows = Array.isArray(meta.signalExplanations) ? meta.signalExplanations : [];

  return `
    <div class="ib-confidence-semantics" role="note">
      <p class="ib-confidence-semantics-title">Veri güven bandı ≠ uyum skoru</p>
      <ul class="ib-confidence-signal-list">
        ${rows
          .map(
            (row) => `
          <li>
            <span class="ib-confidence-signal-label">${escapeHtml(row.label)}</span>
            <span class="ib-confidence-signal-bar" aria-hidden="true">
              <span style="width:${Math.min(100, Math.max(8, row.value))}%"></span>
            </span>
            <span class="ib-confidence-signal-value">${row.value}/100</span>
            <small>${escapeHtml(row.hint)}</small>
          </li>`
          )
          .join('')}
      </ul>
    </div>`;
}

export function renderScoringTransparencyPanel(transparency) {
  if (!transparency?.factors?.length) return '';

  return `
    <details class="ib-scoring-transparency">
      <summary>Şeffaf skorlama (${transparency.matchScore}/100)</summary>
      <p class="ib-scoring-transparency-lead">${escapeHtml(transparency.methodology || '')}</p>
      <p class="text-muted-sm">Taban puan ${transparency.baseScore} → normalize ${escapeHtml(transparency.capNote || '')}</p>
      <ul class="ib-scoring-factor-list">
        ${transparency.factors
          .slice(0, 8)
          .map(
            (f) => `
          <li class="${f.positive ? 'positive' : 'negative'}">
            <span>${escapeHtml(f.label)}</span>
            <span>${escapeHtml(f.status)} <strong>${f.delta > 0 ? '+' : ''}${f.delta}</strong>${f.sharePct != null ? ` · %${f.sharePct} etki` : ''}</span>
          </li>`
          )
          .join('')}
      </ul>
    </details>`;
}

export function renderLeaderRankPanel(rankIntel) {
  if (!rankIntel?.leader) return '';

  const leader = rankIntel.leader;
  const tradeoffs = Array.isArray(rankIntel.tradeoffs) ? rankIntel.tradeoffs : [];

  return `
    <section class="ib-rank-intelligence ib-rank-intelligence--leader" aria-label="Neden birinci sırada">
      <p class="kicker">Skor şeffaflığı</p>
      <h3>${escapeHtml(leader.headline || 'Neden #1?')}</h3>
      <p class="lead">${escapeHtml(leader.summary || '')}</p>
      ${
        leader.advantages?.length
          ? `<ul class="ib-rank-bullets">${leader.advantages.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}</ul>`
          : ''
      }
      ${
        tradeoffs.length
          ? `<div class="ib-tradeoff-grid">
          ${tradeoffs
            .slice(0, 2)
            .map(
              (t) => `
            <div class="ib-tradeoff-card">
              <strong>${escapeHtml(t.title)}</strong>
              <p>${escapeHtml(t.summary)}</p>
            </div>`
            )
            .join('')}
        </div>`
          : ''
      }
      <p class="ib-rank-disclaimer text-muted-sm">Sıralama kural tabanlıdır; AI skoru değiştirmez — yalnızca yorum üretir.</p>
    </section>`;
}

export function renderRunnerRankContrast(contrast) {
  if (!contrast?.summary) return '';

  return `
    <aside class="ib-runner-contrast" aria-label="Sıralama karşılaştırması">
      <p class="ib-runner-contrast-kicker">#${contrast.rank} — neden lider değil?</p>
      <p>${escapeHtml(contrast.summary)}</p>
      ${
        contrast.gaps?.length
          ? `<ul>${contrast.gaps.slice(0, 3).map((g) => `<li>${escapeHtml(g)}</li>`).join('')}</ul>`
          : ''
      }
      ${
        contrast.strengths?.length
          ? `<p class="ib-runner-strengths"><strong>Güçlü yön:</strong> ${escapeHtml(contrast.strengths[0])}</p>`
          : ''
      }
    </aside>`;
}
