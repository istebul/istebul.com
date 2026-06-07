/**
 * Compare Intelligence v1 — admin panel HTML builder (Sprint-27).
 */

import { escapeHtml } from '../core/dom-safe.js';
import { COMPARE_LEVEL_LABELS } from './compare-summary.js';

/**
 * @param {unknown} value
 * @returns {string}
 */
function safe(value) {
  return escapeHtml(String(value ?? ''));
}

/**
 * @param {string[]} items
 * @param {string} listClass
 * @returns {string}
 */
function renderList(items, listClass) {
  if (!Array.isArray(items) || !items.length) {
    return '<p class="ai-cmp-panel__empty">Bilgi yok</p>';
  }
  return `<ul class="${listClass}">${items.map((item) => `<li>${safe(item)}</li>`).join('')}</ul>`;
}

/**
 * @param {Array<Record<string, unknown>>} ranking
 * @returns {string}
 */
function renderRanking(ranking) {
  if (!Array.isArray(ranking) || !ranking.length) {
    return '<p class="ai-cmp-panel__empty">Sıralama üretilemedi.</p>';
  }
  return `
    <ol class="ai-cmp-panel__ranking">
      ${ranking
        .map(
          (item) => `
        <li class="ai-cmp-panel__rank-item">
          <span class="ai-cmp-panel__rank-num">${safe(item.rank)}</span>
          <div class="ai-cmp-panel__rank-body">
            <span class="ai-cmp-panel__rank-title">${safe(item.title)}</span>
            <span class="ai-cmp-panel__rank-score">${safe(item.score)} puan</span>
            ${item.gapFromLeader > 0 ? `<span class="ai-cmp-panel__rank-gap">Liderden -${safe(item.gapFromLeader)}</span>` : ''}
          </div>
        </li>`
        )
        .join('')}
    </ol>`;
}

/**
 * @param {Record<string, unknown>} comparison
 * @param {string} valueKey
 * @returns {string}
 */
function renderComparisonTable(comparison, valueKey = 'value') {
  const items = Array.isArray(comparison?.items) ? comparison.items : [];
  if (!items.length) return '<p class="ai-cmp-panel__empty">Karşılaştırma verisi yok.</p>';

  return `
    <table class="ai-cmp-panel__table">
      <tbody>
        ${items
          .map(
            (item) => `
          <tr class="ai-cmp-panel__table-row${item.id === comparison.bestId ? ' ai-cmp-panel__table-row--best' : ''}">
            <td class="ai-cmp-panel__table-title">${safe(item.title)}</td>
            <td class="ai-cmp-panel__table-value">${safe(item[valueKey] ?? item.combined ?? item.decisionScore ?? item.compareScore ?? '—')}</td>
          </tr>`
          )
          .join('')}
      </tbody>
    </table>
    ${comparison.summary ? `<p class="ai-cmp-panel__table-summary">${safe(comparison.summary)}</p>` : ''}`;
}

/**
 * @param {number} selectedCount
 * @returns {string}
 */
export function buildCompareToolbarHtml(selectedCount = 0) {
  const disabled = selectedCount < 2 ? ' disabled' : '';
  return `
    <div class="ai-rec-compare-bar" id="ai-rec-compare-bar">
      <label class="ai-rec-compare-bar__label">
        <input type="checkbox" class="ai-rec-compare-bar__toggle" data-cmp-action="toggle-mode" />
        Karşılaştırma modu
      </label>
      <span class="ai-rec-compare-bar__count" data-cmp-count>${selectedCount} seçili</span>
      <button type="button" class="ai-rec-compare-bar__btn" data-cmp-action="compare"${disabled}>
        Seçilenleri Karşılaştır
      </button>
      <button type="button" class="ai-rec-compare-bar__clear" data-cmp-action="clear" hidden>
        Seçimi temizle
      </button>
    </div>`;
}

/**
 * @param {Record<string, unknown>} result
 * @param {{ title?: string }} [meta]
 * @returns {string}
 */
export function buildComparePanelHtml(result, meta = {}) {
  if (!result || typeof result !== 'object' || result.compareScore == null) {
    return `
    <aside class="ai-cmp-panel" role="dialog" aria-label="Karşılaştırma Analizi">
      <header class="ai-cmp-panel__head">
        <div>
          <p class="ai-cmp-panel__eyebrow">Karşılaştırma Analizi</p>
          <h3 class="ai-cmp-panel__title">${safe(meta.title ?? 'Karşılaştırma')}</h3>
        </div>
        <button type="button" class="ai-cmp-panel__close" data-cmp-panel-action="close" aria-label="Kapat">×</button>
      </header>
      <div class="ai-cmp-panel__body">
        <p class="ai-cmp-panel__empty">Seçilen öneriler için karşılaştırma analizi üretilemedi.</p>
      </div>
    </aside>
    <div class="ai-cmp-panel__backdrop" data-cmp-backdrop></div>`;
  }

  const levelLabel = COMPARE_LEVEL_LABELS[String(result.compareLevel)] ?? safe(result.compareLabel);
  const winner = /** @type {Record<string, unknown>|null} */ (result.winner ?? null);

  return `
    <aside class="ai-cmp-panel" role="dialog" aria-label="Karşılaştırma Analizi">
      <header class="ai-cmp-panel__head">
        <div>
          <p class="ai-cmp-panel__eyebrow">Karşılaştırma Analizi</p>
          <h3 class="ai-cmp-panel__title">${safe(meta.title ?? 'Karşılaştırma Analizi')}</h3>
        </div>
        <button type="button" class="ai-cmp-panel__close" data-cmp-panel-action="close" aria-label="Kapat">×</button>
      </header>
      <div class="ai-cmp-panel__body">
        <section class="ai-cmp-panel__hero">
          <div class="ai-cmp-panel__hero-score">
            <span class="ai-cmp-panel__hero-value">${safe(result.compareScore)}</span>
            <span class="ai-cmp-panel__hero-label">Karşılaştırma Skoru</span>
          </div>
          <span class="ai-cmp-panel__hero-level">${safe(levelLabel)}</span>
        </section>

        <section class="ai-cmp-panel__section">
          <h4>${winner ? 'Kazanan seçenek' : 'Yakın karar durumu'}</h4>
          ${winner
            ? `<div class="ai-cmp-panel__winner">
                <span class="ai-cmp-panel__winner-title">${safe(winner.title)}</span>
                <span class="ai-cmp-panel__winner-score">${safe(winner.score)} puan</span>
              </div>`
            : '<p class="ai-cmp-panel__close-call">Seçenekler birbirine yakın; net avantaj belirlenemedi.</p>'}
          <p class="ai-cmp-panel__winner-reason">${safe(result.winnerReason)}</p>
        </section>

        <section class="ai-cmp-panel__section">
          <h4>Sıralama</h4>
          ${renderRanking(/** @type {Array<Record<string, unknown>>} */ (result.ranking))}
        </section>

        <section class="ai-cmp-panel__section">
          <h4>Skor karşılaştırması</h4>
          ${renderComparisonTable(/** @type {Record<string, unknown>} */ (result.scoreComparison), 'compareScore')}
        </section>

        <section class="ai-cmp-panel__section">
          <h4>Maliyet karşılaştırması</h4>
          ${renderComparisonTable(/** @type {Record<string, unknown>} */ (result.costComparison), 'totalCost')}
        </section>

        <section class="ai-cmp-panel__section">
          <h4>Kalite ve güven</h4>
          ${renderComparisonTable(/** @type {Record<string, unknown>} */ (result.qualityTrustComparison), 'combined')}
        </section>

        <section class="ai-cmp-panel__section">
          <h4>Pazarlık karşılaştırması</h4>
          ${renderComparisonTable(/** @type {Record<string, unknown>} */ (result.negotiationComparison))}
        </section>

        <section class="ai-cmp-panel__section">
          <h4>Satın alma kararı</h4>
          ${renderComparisonTable(/** @type {Record<string, unknown>} */ (result.purchaseDecisionComparison), 'decisionScore')}
        </section>

        <section class="ai-cmp-panel__section">
          <h4>Risk karşılaştırması</h4>
          ${renderComparisonTable(/** @type {Record<string, unknown>} */ (result.riskComparison), 'riskScore')}
        </section>

        <section class="ai-cmp-panel__section">
          <h4>Açıklanabilirlik</h4>
          ${renderComparisonTable(/** @type {Record<string, unknown>} */ (result.explainabilityComparison))}
        </section>

        <section class="ai-cmp-panel__section">
          <h4>Trade-off'lar</h4>
          ${renderList(result.tradeoffs, 'ai-cmp-panel__list')}
        </section>

        <section class="ai-cmp-panel__section">
          <h4>Özet</h4>
          <p class="ai-cmp-panel__summary">${safe(result.summary)}</p>
        </section>

        <section class="ai-cmp-panel__section">
          <h4>Sonraki adımlar</h4>
          ${renderList(result.nextSteps, 'ai-cmp-panel__list')}
        </section>
      </div>
    </aside>
    <div class="ai-cmp-panel__backdrop" data-cmp-backdrop></div>`;
}

/**
 * @returns {string}
 */
export function buildCompareShellHtml() {
  return '<div id="ai-cmp-panel-host" class="ai-cmp-panel-host" hidden></div>';
}
