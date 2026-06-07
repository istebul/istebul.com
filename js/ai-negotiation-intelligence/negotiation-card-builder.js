/**
 * Negotiation Intelligence — admin panel HTML builder (Sprint-22).
 */

import { escapeHtml } from '../core/dom-safe.js';
import { mapNegotiationRiskClass } from './negotiation-risk-engine.js';

/**
 * @param {number} value
 * @returns {string}
 */
export function formatNegotiationTry(value) {
  const n = Math.round(Number(value) || 0);
  return `${n.toLocaleString('tr-TR')} TL`;
}

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
    return '<p class="ai-neg-panel__empty">Bilgi yok</p>';
  }
  return `<ul class="${listClass}">${items.map((item) => `<li>${safe(item)}</li>`).join('')}</ul>`;
}

/**
 * @param {ReturnType<import('./negotiation-engine.js').runNegotiationIntelligence>} result
 * @param {{ title?: string, recordId?: string }} [meta]
 * @returns {string}
 */
export function buildNegotiationPanelHtml(result, meta = {}) {
  const title = safe(meta.title ?? 'Pazarlık Zekâsı');
  const riskClass = mapNegotiationRiskClass(result.negotiation_risk_level);
  const offerRangeText = `${formatNegotiationTry(result.suggested_offer_low)} - ${formatNegotiationTry(result.suggested_offer_high)}`;

  return `
    <aside class="ai-neg-panel" data-neg-panel${meta.recordId ? ` data-neg-record-id="${safe(meta.recordId)}"` : ''} role="dialog" aria-label="Pazarlık Zekâsı">
      <header class="ai-neg-panel__head">
        <div>
          <p class="ai-neg-panel__eyebrow">Pazarlık Zekâsı</p>
          <h3 class="ai-neg-panel__title">${title}</h3>
        </div>
        <button type="button" class="ai-neg-panel__close" data-neg-action="close" aria-label="Kapat">×</button>
      </header>
      <div class="ai-neg-panel__body">
        <div class="ai-neg-panel__hero">
          <div class="ai-neg-panel__metric">
            <span class="ai-neg-panel__metric-label">İlan fiyatı</span>
            <span class="ai-neg-panel__metric-value">${safe(formatNegotiationTry(result.listing_price))}</span>
          </div>
          <div class="ai-neg-panel__metric">
            <span class="ai-neg-panel__metric-label">Önerilen teklif aralığı</span>
            <span class="ai-neg-panel__metric-value ai-neg-panel__metric-value--range">${safe(offerRangeText)}</span>
          </div>
          <div class="ai-neg-panel__metric-row">
            <div class="ai-neg-panel__metric ai-neg-panel__metric--sm">
              <span class="ai-neg-panel__metric-label">Hedef teklif</span>
              <span class="ai-neg-panel__metric-value">${safe(formatNegotiationTry(result.target_offer))}</span>
            </div>
            <div class="ai-neg-panel__metric ai-neg-panel__metric--sm">
              <span class="ai-neg-panel__metric-label">Pazarlık payı</span>
              <span class="ai-neg-panel__metric-value">%${safe(result.negotiation_room_pct)}</span>
            </div>
          </div>
          <span class="ai-neg-panel__risk ai-neg-panel__risk--${riskClass}">${safe(result.negotiation_risk_label ?? result.negotiation_risk_level)}</span>
          <span class="ai-neg-panel__confidence">${safe(result.confidence)}% güven</span>
        </div>

        <section class="ai-neg-panel__section">
          <h4>Özet</h4>
          <p class="ai-neg-panel__summary">${safe(result.negotiation_summary)}</p>
        </section>

        <section class="ai-neg-panel__section">
          <h4>Nedenler</h4>
          ${renderList(result.reasons, 'ai-neg-panel__list')}
        </section>

        <section class="ai-neg-panel__section">
          <h4>Teklif öncesi doğrulama</h4>
          ${renderList(result.verification_before_offer, 'ai-neg-panel__list ai-neg-panel__list--check')}
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
