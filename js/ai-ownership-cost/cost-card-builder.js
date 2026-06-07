/**
 * Ownership Cost — admin panel HTML builder (Sprint-21).
 */

import { escapeHtml } from '../core/dom-safe.js';
import { formatCostTry } from './cost-breakdown.js';
import { buildCostRiskLabel } from './cost-summary.js';

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
function riskClass(level) {
  if (level === 'low') return 'ai-cost-panel__risk--low';
  if (level === 'high') return 'ai-cost-panel__risk--high';
  return 'ai-cost-panel__risk--mid';
}

/**
 * @param {Array<{ label: string, amount: number, period?: string }>} items
 * @returns {string}
 */
function renderBreakdown(items) {
  if (!Array.isArray(items) || !items.length) {
    return '<p class="ai-cost-panel__empty">Maliyet kırılımı üretilemedi.</p>';
  }

  return `
    <ul class="ai-cost-panel__breakdown">
      ${items
        .map(
          (item) => `
        <li class="ai-cost-panel__breakdown-item">
          <span class="ai-cost-panel__breakdown-label">${safe(item.label)}</span>
          <span class="ai-cost-panel__breakdown-value">${safe(formatCostTry(item.amount))}</span>
        </li>`
        )
        .join('')}
    </ul>`;
}

/**
 * @param {string[]} items
 * @param {string} listClass
 * @returns {string}
 */
function renderList(items, listClass) {
  if (!Array.isArray(items) || !items.length) {
    return '<p class="ai-cost-panel__empty">Bilgi yok</p>';
  }
  return `<ul class="${listClass}">${items.map((item) => `<li>${safe(item)}</li>`).join('')}</ul>`;
}

/**
 * @param {ReturnType<import('./ownership-cost-engine.js').runOwnershipCostSimulator>} result
 * @param {{ title?: string, recordId?: string }} [meta]
 * @returns {string}
 */
export function buildOwnershipCostPanelHtml(result, meta = {}) {
  const title = safe(meta.title ?? 'Sahip Olma Maliyeti');
  const riskLabel = buildCostRiskLabel(result.cost_risk_level);

  return `
    <aside class="ai-cost-panel" data-cost-panel${meta.recordId ? ` data-cost-record-id="${safe(meta.recordId)}"` : ''} role="dialog" aria-label="Sahip Olma Maliyeti">
      <header class="ai-cost-panel__head">
        <div>
          <p class="ai-cost-panel__eyebrow">Sahip Olma Maliyeti</p>
          <h3 class="ai-cost-panel__title">${title}</h3>
        </div>
        <button type="button" class="ai-cost-panel__close" data-cost-action="close" aria-label="Kapat">×</button>
      </header>
      <div class="ai-cost-panel__body">
        <div class="ai-cost-panel__hero">
          <div class="ai-cost-panel__metric">
            <span class="ai-cost-panel__metric-label">Toplam tahmini maliyet</span>
            <span class="ai-cost-panel__metric-value">${safe(formatCostTry(result.total_cost))}</span>
          </div>
          <div class="ai-cost-panel__metric-row">
            <div class="ai-cost-panel__metric ai-cost-panel__metric--sm">
              <span class="ai-cost-panel__metric-label">Aylık tahmin</span>
              <span class="ai-cost-panel__metric-value">${safe(formatCostTry(result.monthly_estimate))}</span>
            </div>
            <div class="ai-cost-panel__metric ai-cost-panel__metric--sm">
              <span class="ai-cost-panel__metric-label">Yıllık tahmin</span>
              <span class="ai-cost-panel__metric-value">${safe(formatCostTry(result.annual_estimate))}</span>
            </div>
          </div>
          <span class="ai-cost-panel__risk ${riskClass(result.cost_risk_level)}">${safe(riskLabel)}</span>
          <span class="ai-cost-panel__confidence">${safe(result.confidence)}% güven</span>
        </div>

        <section class="ai-cost-panel__section">
          <h4>Maliyet kırılımı</h4>
          ${renderBreakdown(result.cost_breakdown)}
        </section>

        <section class="ai-cost-panel__section">
          <h4>Özet</h4>
          <p class="ai-cost-panel__summary">${safe(result.cost_summary)}</p>
        </section>

        <section class="ai-cost-panel__section">
          <h4>Varsayımlar</h4>
          ${renderList(result.assumptions, 'ai-cost-panel__list')}
        </section>

        <section class="ai-cost-panel__section">
          <h4>Uyarılar</h4>
          ${renderList(result.warnings, 'ai-cost-panel__list ai-cost-panel__list--warn')}
        </section>
      </div>
    </aside>
    <div class="ai-cost-panel__backdrop" data-cost-backdrop></div>`;
}

/**
 * @returns {string}
 */
export function buildOwnershipCostShellHtml() {
  return '<div id="ai-cost-panel-host" class="ai-cost-panel-host" hidden></div>';
}
