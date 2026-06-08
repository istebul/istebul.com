/**
 * Listing Quality & Trust — admin panel HTML builder (Sprint-23).
 */

import { escapeHtml } from '../core/dom-safe.js';
import { mapRiskLevelClass } from './trust-signal-engine.js';

/**
 * @param {unknown} value
 * @returns {string}
 */
function safe(value) {
  return escapeHtml(String(value ?? ''));
}

/**
 * @param {Record<string, unknown>|null|undefined} item
 * @returns {boolean}
 */
export function shouldShowQualityButton(item) {
  return Boolean(item?.id);
}

/**
 * @param {string[]} items
 * @param {string} listClass
 * @param {string} [emptyText]
 * @returns {string}
 */
function renderList(items, listClass, emptyText = 'Bilgi yok') {
  if (!Array.isArray(items) || !items.length) {
    return `<p class="ai-lqt-panel__empty">${safe(emptyText)}</p>`;
  }
  return `<ul class="${listClass}">${items.map((item) => `<li>${safe(item)}</li>`).join('')}</ul>`;
}

/**
 * @param {ReturnType<import('./listing-quality-engine.js').runListingQualityTrust>} result
 * @param {{ title?: string, recordId?: string }} [meta]
 * @returns {string}
 */
export function buildQualityPanelHtml(result, meta = {}) {
  const title = safe(meta.title ?? 'Kalite ve Güven');
  const riskClass = mapRiskLevelClass(result.risk_level);

  if (result.empty) {
    return `
      <aside class="ai-lqt-panel" data-lqt-panel${meta.recordId ? ` data-lqt-record-id="${safe(meta.recordId)}"` : ''} role="dialog" aria-label="Kalite ve Güven">
        <header class="ai-lqt-panel__head">
          <div>
            <p class="ai-lqt-panel__eyebrow">Kalite ve Güven</p>
            <h3 class="ai-lqt-panel__title">${title}</h3>
          </div>
          <button type="button" class="ai-lqt-panel__close" data-lqt-action="close" aria-label="Kapat">×</button>
        </header>
        <div class="ai-lqt-panel__body">
          <p class="ai-lqt-panel__empty-state">${safe(result.quality_summary)}</p>
        </div>
      </aside>
      <div class="ai-lqt-panel__backdrop" data-lqt-backdrop></div>`;
  }

  return `
    <aside class="ai-lqt-panel" data-lqt-panel${meta.recordId ? ` data-lqt-record-id="${safe(meta.recordId)}"` : ''} role="dialog" aria-label="Kalite ve Güven">
      <header class="ai-lqt-panel__head">
        <div>
          <p class="ai-lqt-panel__eyebrow">Kalite ve Güven</p>
          <h3 class="ai-lqt-panel__title">${title}</h3>
        </div>
        <button type="button" class="ai-lqt-panel__close" data-lqt-action="close" aria-label="Kapat">×</button>
      </header>
      <div class="ai-lqt-panel__body">
        <div class="ai-lqt-panel__hero">
          <div class="ai-lqt-panel__metric-row">
            <div class="ai-lqt-panel__metric">
              <span class="ai-lqt-panel__metric-label">Kalite Skoru</span>
              <span class="ai-lqt-panel__metric-value">${safe(result.quality_score)}</span>
              <span class="ai-lqt-panel__badge">${safe(result.quality_label)}</span>
            </div>
            <div class="ai-lqt-panel__metric">
              <span class="ai-lqt-panel__metric-label">Güven Skoru</span>
              <span class="ai-lqt-panel__metric-value">${safe(result.trust_score)}</span>
              <span class="ai-lqt-panel__badge">${safe(result.trust_label)}</span>
            </div>
          </div>
          <span class="ai-lqt-panel__risk ai-lqt-panel__risk--${riskClass}">${safe(result.risk_label)}</span>
        </div>

        <section class="ai-lqt-panel__section">
          <h4>Özet</h4>
          <p class="ai-lqt-panel__summary">${safe(result.quality_summary)}</p>
        </section>

        <section class="ai-lqt-panel__section">
          <h4>Güçlü sinyaller</h4>
          ${renderList(result.strong_signals, 'ai-lqt-panel__list ai-lqt-panel__list--strong', 'Güçlü sinyal tespit edilmedi.')}
        </section>

        <section class="ai-lqt-panel__section">
          <h4>Zayıf / eksik sinyaller</h4>
          ${renderList(result.weak_signals, 'ai-lqt-panel__list ai-lqt-panel__list--weak', 'Belirgin zayıf sinyal yok.')}
        </section>

        <section class="ai-lqt-panel__section">
          <h4>Kontrol listesi</h4>
          ${renderList(result.checklist, 'ai-lqt-panel__list ai-lqt-panel__list--check')}
        </section>
      </div>
    </aside>
    <div class="ai-lqt-panel__backdrop" data-lqt-backdrop></div>`;
}

/**
 * @returns {string}
 */
export function buildQualityShellHtml() {
  return '<div id="ai-lqt-panel-host" class="ai-lqt-panel-host" hidden></div>';
}
