/**
 * Learning Insights — admin panel HTML builder (Sprint-30 / Faz B).
 */

import { escapeHtml } from '../core/dom-safe.js';

/**
 * @param {unknown} value
 * @returns {string}
 */
function safe(value) {
  return escapeHtml(String(value ?? ''));
}

/**
 * @param {Record<string, unknown>} insights
 * @returns {string}
 */
export function buildLearningInsightsPanelHtml(insights) {
  const summary = /** @type {Record<string, unknown>} */ (insights?.summary ?? {});
  const learning = /** @type {Record<string, unknown>} */ (insights?.learning ?? {});
  const topModules = /** @type {Array<Record<string, unknown>>} */ (learning.topModules ?? []);
  const insightItems = /** @type {string[]} */ (summary.insights ?? []);

  const modulesHtml = topModules.length
    ? `<ul class="ai-learning-panel__list">${topModules
        .map(
          (item) =>
            `<li><span class="ai-learning-panel__label">${safe(item.label)}</span> <span class="ai-learning-panel__count">${safe(item.count)}</span></li>`
        )
        .join('')}</ul>`
    : '<p class="ai-learning-panel__empty">Henüz modül kullanım verisi yok.</p>';

  const insightsHtml = insightItems.length
    ? `<ul class="ai-learning-panel__insights">${insightItems
        .map((item) => `<li>${safe(item)}</li>`)
        .join('')}</ul>`
    : '';

  return `
    <section class="ai-learning-panel" aria-labelledby="ai-learning-panel-title">
      <header class="ai-learning-panel__header">
        <h3 id="ai-learning-panel-title">${safe(summary.titleTr ?? 'Öğrenme Öngörüleri')}</h3>
        <p class="ai-learning-panel__headline">${safe(summary.headline)}</p>
      </header>
      <div class="ai-learning-panel__grid">
        <div class="ai-learning-panel__card">
          <h4>Modül Kullanımı</h4>
          ${modulesHtml}
        </div>
        <div class="ai-learning-panel__card">
          <h4>Öngörüler</h4>
          ${insightsHtml || '<p class="ai-learning-panel__empty">Öngörü üretilemedi.</p>'}
        </div>
      </div>
      <p class="ai-learning-panel__disclaimer">${safe(summary.disclaimer ?? '')}</p>
    </section>`;
}
