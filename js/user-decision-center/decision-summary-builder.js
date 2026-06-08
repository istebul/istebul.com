/**
 * User Decision Center — decision explanation builder (Sprint-30).
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
 * @param {Record<string, unknown>} ctx
 * @returns {string}
 */
export function buildDecisionSummaryHtml(ctx) {
  if (!ctx?.ready) {
    return `
      <section class="udc-summary udc-summary--empty" aria-label="Karar açıklaması">
        <h4>Karar Açıklaması</h4>
        <p class="udc-muted">${safe(ctx?.emptyMessage)}</p>
      </section>`;
  }

  const summary = safe(ctx.decisionSummary || 'Mevcut verilerle sınırlı bir değerlendirme sunulmaktadır.');
  const explanation = safe(ctx.explainability?.userFriendlyExplanation ?? '');

  return `
    <section class="udc-summary" aria-label="Karar açıklaması">
      <h4>Karar Açıklaması</h4>
      <p class="udc-summary__text">${summary}</p>
      ${explanation ? `<p class="udc-summary__detail">${explanation}</p>` : ''}
      <p class="udc-disclaimer">Bu bilgiler yalnızca karar sürecinize yardımcı olmak içindir; nihai karar size aittir.</p>
    </section>`;
}
