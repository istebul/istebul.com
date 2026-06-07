/**
 * AI Decision Coach — admin panel HTML builder (Sprint-17).
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
 * @param {string[]} items
 * @param {string} listClass
 * @returns {string}
 */
function renderList(items, listClass) {
  if (!Array.isArray(items) || !items.length) {
    return '<p class="ai-coach-panel__empty">Bilgi yok</p>';
  }
  return `<ul class="${listClass}">${items.map((item) => `<li>${safe(item)}</li>`).join('')}</ul>`;
}

/**
 * @param {string} coachLabel
 * @returns {string}
 */
function coachLabelClass(coachLabel) {
  const label = String(coachLabel).toLowerCase();
  if (label.includes('güçlü')) return 'ai-coach-panel__label--strong';
  if (label.includes('incelenebilir')) return 'ai-coach-panel__label--review';
  if (label.includes('dikkatli')) return 'ai-coach-panel__label--caution';
  if (label.includes('önce doğrula')) return 'ai-coach-panel__label--verify';
  return 'ai-coach-panel__label--avoid';
}

/**
 * @param {number} confidence
 * @returns {string}
 */
function confidenceClass(confidence) {
  if (confidence >= 75) return 'ai-coach-panel__confidence--high';
  if (confidence >= 50) return 'ai-coach-panel__confidence--mid';
  return 'ai-coach-panel__confidence--low';
}

/**
 * @param {ReturnType<import('./decision-coach.js').runDecisionCoach>} coach
 * @param {{ title?: string, recordId?: string }} [meta]
 * @returns {string}
 */
export function buildDecisionCoachPanelHtml(coach, meta = {}) {
  const title = safe(meta.title ?? 'Karar Koçu');
  const recordId = safe(meta.recordId ?? '');

  return `
    <aside class="ai-coach-panel" data-coach-panel${recordId ? ` data-coach-record-id="${recordId}"` : ''} role="dialog" aria-label="Karar Koçu">
      <header class="ai-coach-panel__head">
        <div>
          <p class="ai-coach-panel__eyebrow">Karar Koçu</p>
          <h3 class="ai-coach-panel__title">${title}</h3>
        </div>
        <button type="button" class="ai-coach-panel__close" data-coach-action="close" aria-label="Kapat">×</button>
      </header>
      <div class="ai-coach-panel__body">
        <div class="ai-coach-panel__hero">
          <span class="ai-coach-panel__label ${coachLabelClass(coach.coach_label)}">${safe(coach.coach_label)}</span>
          <span class="ai-coach-panel__confidence ${confidenceClass(coach.confidence)}">${safe(coach.confidence)}% güven</span>
        </div>
        <section class="ai-coach-panel__section">
          <h4>Özet</h4>
          <p class="ai-coach-panel__summary">${safe(coach.coach_summary)}</p>
        </section>
        <section class="ai-coach-panel__section">
          <h4>Neden değerlendirilmeli?</h4>
          ${renderList(coach.should_consider, 'ai-coach-panel__list ai-coach-panel__list--positive')}
        </section>
        <section class="ai-coach-panel__section">
          <h4>Hangi durumda vazgeçilmeli?</h4>
          ${renderList(coach.should_avoid_if, 'ai-coach-panel__list ai-coach-panel__list--avoid')}
        </section>
        <section class="ai-coach-panel__section">
          <h4>Doğrulama soruları</h4>
          ${renderList(coach.verification_questions, 'ai-coach-panel__list')}
        </section>
        <section class="ai-coach-panel__section">
          <h4>Kırmızı bayraklar</h4>
          ${renderList(coach.red_flags, 'ai-coach-panel__list ai-coach-panel__list--flags')}
        </section>
        <section class="ai-coach-panel__section">
          <h4>Sonraki adımlar</h4>
          ${renderList(coach.next_steps, 'ai-coach-panel__list ai-coach-panel__list--steps')}
        </section>
        <section class="ai-coach-panel__section">
          <h4>Alternatif karşılaştırma</h4>
          <p class="ai-coach-panel__comparison">${safe(coach.comparison_notes)}</p>
        </section>
      </div>
    </aside>
    <div class="ai-coach-panel__backdrop" data-coach-backdrop hidden></div>`;
}

/**
 * @returns {string}
 */
export function buildDecisionCoachShellHtml() {
  return '<div id="ai-coach-panel-host" class="ai-coach-panel-host" hidden></div>';
}
