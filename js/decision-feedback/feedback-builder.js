/**
 * Decision Feedback — form HTML builder (Sprint-33).
 */

import { escapeHtml } from '../core/dom-safe.js';
import {
  FEEDBACK_HELPFULNESS_OPTIONS,
  FEEDBACK_FINAL_DECISION_OPTIONS,
  computeOutcomeAnalytics
} from './feedback-engine.js';

/**
 * @param {unknown} value
 * @returns {string}
 */
function safe(value) {
  return escapeHtml(String(value ?? ''));
}

/**
 * @param {Record<string, unknown>} data
 * @returns {string}
 */
export function buildFeedbackFormHtml(data = {}) {
  const listingId = safe(data.listingId ?? data.listing_id ?? '');
  const analytics = computeOutcomeAnalytics(Array.isArray(data.outcomes) ? data.outcomes : []);

  return `
    <section class="udc-feedback" aria-label="Geri Bildirim" data-udc-feedback-listing="${listingId}">
      <h4>Geri Bildirim</h4>
      <p class="udc-muted">Karar analizinin size ne kadar yardımcı olduğunu paylaşın.</p>

      <form class="udc-feedback__form" data-udc-feedback-form novalidate>
        <fieldset class="udc-feedback__fieldset">
          <legend>Bu analiz faydalı oldu mu?</legend>
          <div class="udc-feedback__options" role="radiogroup" aria-label="Faydalılık">
            ${FEEDBACK_HELPFULNESS_OPTIONS.map(
              (opt) => `
              <label class="udc-feedback__option">
                <input type="radio" name="helpfulness" value="${safe(opt.value)}" required />
                <span>${safe(opt.label)}</span>
              </label>`
            ).join('')}
          </div>
        </fieldset>

        <fieldset class="udc-feedback__fieldset">
          <legend>Nihai kararınız ne oldu?</legend>
          <div class="udc-feedback__options" role="radiogroup" aria-label="Nihai karar">
            ${FEEDBACK_FINAL_DECISION_OPTIONS.map(
              (opt) => `
              <label class="udc-feedback__option">
                <input type="radio" name="final_decision" value="${safe(opt.value)}" />
                <span>${safe(opt.label)}</span>
              </label>`
            ).join('')}
          </div>
        </fieldset>

        <label class="udc-feedback__note">
          <span>Opsiyonel not</span>
          <textarea name="note" rows="3" maxlength="2000" placeholder="Deneyiminizi kısaca paylaşın"></textarea>
        </label>

        <button type="submit" class="btn btn-primary btn-sm">Geri bildirimi gönder</button>
      </form>

      ${buildOutcomeAnalyticsHtml(analytics)}
    </section>`;
}

/**
 * @param {Record<string, unknown>} analytics
 * @returns {string}
 */
export function buildOutcomeAnalyticsHtml(analytics = {}) {
  if (!analytics.total) {
    return `
      <aside class="udc-feedback__analytics" aria-label="Decision Outcome Analytics">
        <h5>Decision Outcome Analytics</h5>
        <p class="udc-muted">Henüz yeterli geri bildirim verisi yok.</p>
      </aside>`;
  }

  return `
    <aside class="udc-feedback__analytics" aria-label="Decision Outcome Analytics">
      <h5>Decision Outcome Analytics</h5>
      <div class="udc-feedback__stats">
        <div><span>Toplam geri bildirim</span><strong>${safe(analytics.total)}</strong></div>
        <div><span>Faydalılık oranı</span><strong>%${safe(analytics.helpfulnessRate)}</strong></div>
        <div><span>Satın alma oranı</span><strong>%${safe(analytics.purchaseRate)}</strong></div>
        <div><span>Vazgeçme oranı</span><strong>%${safe(analytics.declineRate)}</strong></div>
        ${
          analytics.avgDecisionScore != null
            ? `<div><span>Ort. karar skoru</span><strong>${safe(analytics.avgDecisionScore)}</strong></div>`
            : ''
        }
      </div>
    </aside>`;
}
