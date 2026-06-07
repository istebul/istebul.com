/**
 * Decision Explainability — admin panel HTML builder (Sprint-25).
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
 * @param {'positive'|'neutral'|'warning'|'negative'|string} status
 * @returns {string}
 */
function pathStatusClass(status) {
  if (status === 'positive') return 'ai-exp-panel__path--positive';
  if (status === 'negative') return 'ai-exp-panel__path--negative';
  if (status === 'warning') return 'ai-exp-panel__path--warning';
  return 'ai-exp-panel__path--neutral';
}

/**
 * @param {'low'|'medium'|'high'|string} level
 * @returns {string}
 */
function badgeClass(level) {
  if (level === 'low' || level === 'positive') return 'ai-exp-panel__badge--low';
  if (level === 'high' || level === 'negative') return 'ai-exp-panel__badge--high';
  return 'ai-exp-panel__badge--mid';
}

/**
 * @param {string[]} items
 * @param {string} listClass
 * @returns {string}
 */
function renderList(items, listClass) {
  if (!Array.isArray(items) || !items.length) {
    return '<p class="ai-exp-panel__empty">Bilgi yok</p>';
  }
  return `<ul class="${listClass}">${items.map((item) => `<li>${safe(item)}</li>`).join('')}</ul>`;
}

/**
 * @param {Array<Record<string, unknown>>} drivers
 * @returns {string}
 */
function renderDrivers(drivers) {
  if (!Array.isArray(drivers) || !drivers.length) {
    return '<p class="ai-exp-panel__empty">Faktör bulunamadı.</p>';
  }
  return `
    <ul class="ai-exp-panel__driver-list">
      ${drivers
        .map(
          (d) => `
        <li class="ai-exp-panel__driver-item">
          <span class="ai-exp-panel__driver-label">${safe(d.label)}</span>
          <span class="ai-exp-panel__badge ${badgeClass(d.impact)}">${safe(d.impact)}</span>
          <p class="ai-exp-panel__driver-text">${safe(d.explanation)}</p>
        </li>`
        )
        .join('')}
    </ul>`;
}

/**
 * @param {Array<Record<string, unknown>>} path
 * @returns {string}
 */
function renderDecisionPath(path) {
  if (!Array.isArray(path) || !path.length) {
    return '<p class="ai-exp-panel__empty">Karar yolu üretilemedi.</p>';
  }
  return `
    <ol class="ai-exp-panel__timeline">
      ${path
        .map(
          (step) => `
        <li class="ai-exp-panel__timeline-item ${pathStatusClass(step.status)}">
          <div class="ai-exp-panel__timeline-head">
            <span class="ai-exp-panel__timeline-label">${safe(step.label)}</span>
            <span class="ai-exp-panel__badge ${badgeClass(step.impact)}">${safe(step.impact)}</span>
          </div>
          <p class="ai-exp-panel__timeline-text">${safe(step.explanation)}</p>
        </li>`
        )
        .join('')}
    </ol>`;
}

/**
 * @param {Array<Record<string, unknown>>} contributions
 * @returns {string}
 */
function renderContributions(contributions) {
  if (!Array.isArray(contributions) || !contributions.length) {
    return '<p class="ai-exp-panel__empty">Skor katkısı üretilemedi.</p>';
  }
  return `
    <ul class="ai-exp-panel__contrib-list">
      ${contributions
        .map(
          (c) => `
        <li class="ai-exp-panel__contrib-item ai-exp-panel__contrib--${safe(c.direction)}">
          <div class="ai-exp-panel__contrib-head">
            <span class="ai-exp-panel__contrib-label">${safe(c.label)}</span>
            <span class="ai-exp-panel__contrib-value">${c.contribution >= 0 ? '+' : ''}${safe(c.contribution)}</span>
          </div>
          <p class="ai-exp-panel__contrib-text">${safe(c.explanation)}</p>
        </li>`
        )
        .join('')}
    </ul>`;
}

/**
 * @param {Record<string, unknown>} confidence
 * @returns {string}
 */
function renderConfidenceExplanation(confidence) {
  if (!confidence || typeof confidence !== 'object') {
    return '<p class="ai-exp-panel__empty">Veri güveni açıklaması üretilemedi.</p>';
  }
  return `
    <div class="ai-exp-panel__confidence">
      <div class="ai-exp-panel__metric-row">
        <span class="ai-exp-panel__metric-label">Veri güveni</span>
        <span class="ai-exp-panel__metric-value">${safe(confidence.confidenceScore)}% — ${safe(confidence.confidenceLabel)}</span>
      </div>
      <p class="ai-exp-panel__confidence-why">${safe(confidence.whyThisConfidence)}</p>
      <h5>Güveni artıracak adımlar</h5>
      ${renderList(confidence.whatWouldIncreaseConfidence, 'ai-exp-panel__list')}
    </div>`;
}

/**
 * @param {Record<string, unknown>} result
 * @param {{ title?: string, recordId?: string }} [meta]
 * @returns {string}
 */
export function buildExplainabilityPanelHtml(result, meta = {}) {
  if (!result || typeof result !== 'object' || result.explanationScore == null) {
    return `
      <aside class="ai-exp-panel" role="dialog" aria-label="Karar Açıklaması">
        <header class="ai-exp-panel__head">
          <div>
            <p class="ai-exp-panel__eyebrow">Karar Açıklaması</p>
            <h3 class="ai-exp-panel__title">${safe(meta.title ?? 'Karar Açıklaması')}</h3>
          </div>
          <button type="button" class="ai-exp-panel__close" data-exp-action="close" aria-label="Kapat">×</button>
        </header>
        <div class="ai-exp-panel__body">
          <p class="ai-exp-panel__empty">Bu öneri için karar açıklaması üretilemedi.</p>
        </div>
      </aside>
      <div class="ai-exp-panel__backdrop" data-exp-backdrop></div>`;
  }

  const title = safe(meta.title ?? 'Karar Açıklaması');
  const levelClass =
    result.explanationLevel === 'very_clear'
      ? 'ai-exp-panel__level--strong'
      : result.explanationLevel === 'weak'
        ? 'ai-exp-panel__level--weak'
        : 'ai-exp-panel__level--neutral';

  return `
    <aside class="ai-exp-panel" data-exp-panel${meta.recordId ? ` data-exp-record-id="${safe(meta.recordId)}"` : ''} role="dialog" aria-label="Karar Açıklaması">
      <header class="ai-exp-panel__head">
        <div>
          <p class="ai-exp-panel__eyebrow">Karar Açıklaması</p>
          <h3 class="ai-exp-panel__title">${title}</h3>
        </div>
        <button type="button" class="ai-exp-panel__close" data-exp-action="close" aria-label="Kapat">×</button>
      </header>
      <div class="ai-exp-panel__body">
        <div class="ai-exp-panel__hero">
          <div class="ai-exp-panel__metric">
            <span class="ai-exp-panel__metric-label">Açıklama skoru</span>
            <span class="ai-exp-panel__metric-value">${safe(result.explanationScore)}</span>
          </div>
          <span class="ai-exp-panel__level ${levelClass}">${safe(result.explanationLabel)}</span>
        </div>

        <section class="ai-exp-panel__section">
          <h4>Karar oluşum yolu</h4>
          ${renderDecisionPath(result.decisionPath)}
        </section>

        <section class="ai-exp-panel__section">
          <h4>Olumlu faktörler</h4>
          ${renderDrivers(result.topPositiveDrivers)}
        </section>

        <section class="ai-exp-panel__section">
          <h4>Risk / olumsuz faktörler</h4>
          ${renderDrivers(result.topNegativeDrivers)}
        </section>

        <section class="ai-exp-panel__section">
          <h4>Skor katkıları</h4>
          ${renderContributions(result.scoreContributions)}
        </section>

        <section class="ai-exp-panel__section">
          <h4>Veri güveni açıklaması</h4>
          ${renderConfidenceExplanation(result.confidenceExplanation)}
        </section>

        <section class="ai-exp-panel__section">
          <h4>Eksik veri etkileri</h4>
          ${renderList(result.dataGaps, 'ai-exp-panel__list ai-exp-panel__list--gap')}
        </section>

        <section class="ai-exp-panel__section">
          <h4>Kullanıcı dostu açıklama</h4>
          <p class="ai-exp-panel__summary">${safe(result.userFriendlyExplanation)}</p>
        </section>

        <section class="ai-exp-panel__section">
          <h4>Doğrulama adımları</h4>
          ${renderList(result.nextVerificationSteps, 'ai-exp-panel__list')}
        </section>

        <section class="ai-exp-panel__section">
          <h4>Özet</h4>
          <p class="ai-exp-panel__summary">${safe(result.reasoningSummary)}</p>
        </section>
      </div>
    </aside>
    <div class="ai-exp-panel__backdrop" data-exp-backdrop></div>`;
}

/**
 * @returns {string}
 */
export function buildExplainabilityShellHtml() {
  return '<div id="ai-exp-panel-host" class="ai-exp-panel-host" hidden></div>';
}
