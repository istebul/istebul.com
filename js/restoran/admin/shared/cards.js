import { escapeHtml } from './format.js';

/**
 * @typedef {Object} MetricCard
 * @property {string} id
 * @property {string} label
 * @property {string} value
 * @property {string} [hint]
 * @property {string} [tone]
 */

/**
 * @param {MetricCard} card
 * @returns {string}
 */
export function renderMetricCard(card) {
  const toneClass = card.tone ? ` gai-admin-metric--${card.tone}` : '';
  return `
    <article class="gai-admin-metric gai-card${toneClass}" id="gai-admin-metric-${escapeHtml(card.id)}">
      <p class="gai-admin-metric__label">${escapeHtml(card.label)}</p>
      <p class="gai-admin-metric__value">${escapeHtml(card.value)}</p>
      ${card.hint ? `<p class="gai-admin-metric__hint">${escapeHtml(card.hint)}</p>` : ''}
    </article>
  `.trim();
}

/**
 * @param {MetricCard[]} cards
 * @returns {string}
 */
export function renderMetricGrid(cards) {
  if (!cards.length) {
    return '<p class="gai-admin-empty">Gösterilecek veri bulunamadı.</p>';
  }
  return `<div class="gai-admin-metrics">${cards.map(renderMetricCard).join('')}</div>`;
}
