/**
 * AI Recommendation Engine — recommendation card HTML builder (client).
 */

import { escapeHtml } from '../core/dom-safe.js';
import { ALTERNATIVE_TAG_LABELS_TR } from '../../supabase/functions/_shared/ai-listings/recommendation/alternative-ranker.js';

/**
 * @param {unknown} value
 * @returns {string}
 */
function safe(value) {
  return escapeHtml(String(value ?? ''));
}

/**
 * @param {Record<string, unknown>} item
 * @returns {string}
 */
export function buildRecommendationCardHtml(item) {
  const tags = Array.isArray(item.alternative_labels) ? item.alternative_labels : [];
  const tagHtml = tags
    .map((tag) => `<span class="ai-rec-card__alt-tag">${safe(tag)}</span>`)
    .join('');

  const labelClass =
    Number(item.fit_score) >= 90
      ? 'ai-rec-card__label--excellent'
      : Number(item.fit_score) >= 75
        ? 'ai-rec-card__label--good'
        : Number(item.fit_score) >= 60
          ? 'ai-rec-card__label--review'
          : Number(item.fit_score) >= 40
            ? 'ai-rec-card__label--caution'
            : 'ai-rec-card__label--avoid';

  return `
    <article class="ai-rec-card" data-rec-record-id="${safe(item.id)}" tabindex="0">
      <header class="ai-rec-card__head">
        <div class="ai-rec-card__score-wrap">
          <span class="ai-rec-card__score">${safe(item.fit_score)}</span>
          <span class="ai-rec-card__score-label">Uyum Skoru</span>
        </div>
        <div class="ai-rec-card__meta">
          <h3 class="ai-rec-card__title">${safe(item.title ?? '—')}</h3>
          <span class="ai-rec-card__label ${labelClass}">${safe(item.recommendation_label)}</span>
        </div>
      </header>
      ${tagHtml ? `<div class="ai-rec-card__tags">${tagHtml}</div>` : ''}
      <div class="ai-rec-card__metrics">
        <span>Kalite: ${safe(item.quality_score ?? '—')}</span>
        <span>Risk: ${safe(item.risk_score ?? '—')}</span>
        <span>AI: ${safe(item.decision_score ?? '—')}</span>
        <span>Kaynak: ${safe(item.source ?? '—')}</span>
      </div>
      <section class="ai-rec-card__explain">
        <p class="ai-rec-card__explain-title">Neden önerildi?</p>
        <pre class="ai-rec-card__explain-list">${safe(item.reasons_text ?? '')}</pre>
      </section>
      ${item.risks_text ? `
      <section class="ai-rec-card__risks">
        <p class="ai-rec-card__risks-title">Riskler</p>
        <pre class="ai-rec-card__risks-list">${safe(item.risks_text)}</pre>
      </section>` : ''}
      <footer class="ai-rec-card__actions">
        <button type="button" class="ai-rec-card__coach-btn" data-rec-coach-id="${safe(item.id)}" aria-label="Karar Koçu">
          Karar Koçu
        </button>
        <button type="button" class="ai-rec-card__sim-btn" data-rec-sim-id="${safe(item.id)}" aria-label="Karar Simülatörü">
          Karar Simülatörü
        </button>
        <button type="button" class="ai-rec-card__report-btn" data-rec-report-id="${safe(item.id)}" aria-label="AI Karar Raporu">
          AI Karar Raporu
        </button>
        <button type="button" class="ai-rec-card__cost-btn" data-rec-cost-id="${safe(item.id)}" aria-label="Sahip Olma Maliyeti">
          Sahip Olma Maliyeti
        </button>
        ${item.id ? `
        <button type="button" class="ai-rec-card__pd-btn" data-rec-pd-id="${safe(item.id)}" aria-label="Al Kararı">
          Al Kararı
        </button>
        <button type="button" class="ai-rec-card__exp-btn" data-rec-exp-id="${safe(item.id)}" aria-label="Neden Bu Karar">
          Neden Bu Karar?
        </button>` : ''}
      </footer>
    </article>`;
}

/**
 * @param {Array<Record<string, unknown>>} items
 * @returns {string}
 */
export function buildRecommendationCardsGridHtml(items) {
  if (!items.length) {
    return '<p class="ai-listings-admin__empty-state">Bu profil için öneri bulunamadı.</p>';
  }
  return `<div class="ai-rec-grid">${items.map((item) => buildRecommendationCardHtml(item)).join('')}</div>`;
}

export { ALTERNATIVE_TAG_LABELS_TR };
