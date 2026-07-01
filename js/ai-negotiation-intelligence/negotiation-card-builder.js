/**
 * Negotiation Intelligence — client panel HTML builder (Faz N-3).
 */

import { escapeHtml } from '../core/dom-safe.js';
import { buildNegotiationDisplayModel } from './negotiation-view-model.js';

/** @type {Readonly<Record<string, string>>} */
const CHECKLIST_STATUS_LABELS_TR = Object.freeze({
  pending: 'Beklemede',
  ok: 'Tamam',
  warn: 'Uyarı'
});

/**
 * @param {unknown} value
 * @returns {string}
 */
function safe(value) {
  return escapeHtml(String(value ?? ''));
}

/**
 * @param {'low'|'medium'|'high'|string} level
 * @returns {string}
 */
function riskBadgeClass(level) {
  if (level === 'low') return 'ai-neg-panel__badge--low';
  if (level === 'high') return 'ai-neg-panel__badge--high';
  return 'ai-neg-panel__badge--medium';
}

/**
 * @param {string[]} items
 * @returns {string}
 */
function renderWarnings(items) {
  if (!items.length) {
    return '<p class="ai-neg-panel__empty">Uyarı bulunmuyor.</p>';
  }
  return `<ul class="ai-neg-panel__warnings">${items.map((item) => `<li>${safe(item)}</li>`).join('')}</ul>`;
}

/**
 * @param {Array<Record<string, unknown>>} checklist
 * @returns {string}
 */
function renderChecklist(checklist) {
  if (!checklist.length) {
    return '<p class="ai-neg-panel__empty">Kontrol listesi üretilemedi.</p>';
  }

  return `
    <ul class="ai-neg-panel__checklist">
      ${checklist
        .map((item) => {
          const status = String(item.status ?? 'pending').toLowerCase();
          const statusLabel = CHECKLIST_STATUS_LABELS_TR[status] ?? CHECKLIST_STATUS_LABELS_TR.pending;
          return `
        <li class="ai-neg-panel__checklist-item ai-neg-panel__checklist-item--${safe(status)}">
          <span class="ai-neg-panel__checklist-label">${safe(item.label)}</span>
          <span class="ai-neg-panel__checklist-status">${safe(statusLabel)}</span>
        </li>`;
        })
        .join('')}
    </ul>`;
}

/**
 * @param {Array<Record<string, unknown>>} signals
 * @returns {string}
 */
function renderEvidenceSignals(signals) {
  if (!signals.length) {
    return '<p class="ai-neg-panel__empty">Kanıt sinyali bulunmuyor.</p>';
  }

  return `
    <ul class="ai-neg-panel__evidence">
      ${signals
        .map((signal) => {
          const impact = String(signal.impact ?? 'neutral').toLowerCase();
          return `
        <li class="ai-neg-panel__evidence-item ai-neg-panel__evidence-item--${safe(impact)}">
          <span class="ai-neg-panel__evidence-signal">${safe(signal.signal)}</span>
          <span class="ai-neg-panel__evidence-impact">${safe(impact)}</span>
          <span class="ai-neg-panel__evidence-weight">${safe(signal.weight)}</span>
        </li>`;
        })
        .join('')}
    </ul>`;
}

/**
 * @param {Record<string, unknown>} model
 * @returns {string}
 */
function renderEmptyPanel(model) {
  return `
    <aside class="ai-neg-panel" role="dialog" aria-modal="true" aria-labelledby="ai-neg-panel-title" aria-label="Pazarlık Analizi">
      <header class="ai-neg-panel__head">
        <div>
          <p class="ai-neg-panel__eyebrow">Pazarlık Analizi</p>
          <h3 id="ai-neg-panel-title" class="ai-neg-panel__title">${safe(model.title)}</h3>
        </div>
        <button type="button" class="ai-neg-panel__close" data-neg-action="close" aria-label="Kapat">×</button>
      </header>
      <div class="ai-neg-panel__body">
        <p class="ai-neg-panel__empty">${safe(model.emptyMessage)}</p>
      </div>
    </aside>
    <div class="ai-neg-panel__backdrop" data-neg-backdrop></div>`;
}

/**
 * @param {Record<string, unknown>|null|undefined} result
 * @param {{ title?: string }} [meta]
 * @returns {string}
 */
export function buildNegotiationPanelHtml(result, meta = {}) {
  const model = buildNegotiationDisplayModel(result, meta);

  if (!model.hasData) {
    return renderEmptyPanel(model);
  }

  return `
    <aside class="ai-neg-panel" role="dialog" aria-modal="true" aria-labelledby="ai-neg-panel-title" aria-label="Pazarlık Analizi">
      <header class="ai-neg-panel__head">
        <div>
          <p class="ai-neg-panel__eyebrow">Pazarlık Analizi</p>
          <h3 id="ai-neg-panel-title" class="ai-neg-panel__title">${safe(model.title)}</h3>
        </div>
        <button type="button" class="ai-neg-panel__close" data-neg-action="close" aria-label="Kapat">×</button>
      </header>
      <div class="ai-neg-panel__body">
        <section class="ai-neg-panel__hero">
          <div class="ai-neg-panel__metric">
            <span class="ai-neg-panel__metric-label">Hedef teklif</span>
            <span class="ai-neg-panel__metric-value">${safe(model.targetOfferText)}</span>
          </div>
          <div class="ai-neg-panel__metric">
            <span class="ai-neg-panel__metric-label">Teklif bandı</span>
            <span class="ai-neg-panel__metric-value">${safe(model.bandText)}</span>
          </div>
          <div class="ai-neg-panel__metric">
            <span class="ai-neg-panel__metric-label">Hedef indirim</span>
            <span class="ai-neg-panel__metric-value">${safe(model.discountPercentText)}</span>
          </div>
          <span class="ai-neg-panel__badge ${riskBadgeClass(String(model.riskLevel))}">Pazarlık riski: ${safe(model.riskLabel)}</span>
        </section>

        <section class="ai-neg-panel__section">
          <h4>Güven</h4>
          <p class="ai-neg-panel__confidence">%${safe(model.confidencePercent)}</p>
        </section>

        <section class="ai-neg-panel__section">
          <h4>Özet</h4>
          <p class="ai-neg-panel__summary">${safe(model.summary)}</p>
        </section>

        <section class="ai-neg-panel__section">
          <h4>Kontrol listesi</h4>
          ${renderChecklist(/** @type {Array<Record<string, unknown>>} */ (model.checklist))}
        </section>

        <section class="ai-neg-panel__section">
          <h4>Uyarılar</h4>
          ${renderWarnings(/** @type {string[]} */ (model.warnings))}
        </section>

        <section class="ai-neg-panel__section">
          <h4>Kanıt sinyalleri</h4>
          ${renderEvidenceSignals(/** @type {Array<Record<string, unknown>>} */ (model.evidenceSignals))}
        </section>
      </div>
    </aside>
    <div class="ai-neg-panel__backdrop" data-neg-backdrop></div>`;
}

/**
 * @returns {string}
 */
export function buildNegotiationShellHtml() {
  return '<div id="ai-neg-panel-host" class="ai-neg-panel-host" hidden></div>';
}
