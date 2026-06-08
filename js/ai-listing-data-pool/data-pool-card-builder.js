/**
 * Listing Data Pool — admin panel HTML builder (Sprint-31 / Faz C).
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
 * @param {Record<string, unknown>} poolResult
 * @returns {string}
 */
export function buildDataPoolPanelHtml(poolResult) {
  const avgCompleteness = safe(poolResult.avgDataCompleteness ?? 0);
  const avgConfidence = safe(poolResult.avgEntityConfidence ?? 0);
  const duplicateClusters = /** @type {Record<string, unknown>} */ (
    poolResult.duplicateClusters ?? {}
  );
  const exactCount = safe(duplicateClusters.exactCount ?? 0);
  const similarCount = safe(duplicateClusters.similarCount ?? 0);
  const lowQuality = safe(
    /** @type {Record<string, unknown>} */ (poolResult.qualityEnrichment ?? {}).lowQualityCount ?? 0
  );

  return `
    <section class="ai-data-pool-panel" aria-labelledby="ai-data-pool-title">
      <header class="ai-data-pool-panel__header">
        <h3 id="ai-data-pool-title">İlan Veri Havuzu</h3>
        <p class="ai-data-pool-panel__subtitle">Normalize edilmiş ilan kalitesi ve varlık güveni</p>
      </header>
      <div class="ai-data-pool-panel__kpi">
        <div class="ai-data-pool-panel__kpi-card">
          <span class="ai-data-pool-panel__kpi-label">Veri Tamlığı</span>
          <span class="ai-data-pool-panel__kpi-value">${avgCompleteness}%</span>
        </div>
        <div class="ai-data-pool-panel__kpi-card">
          <span class="ai-data-pool-panel__kpi-label">Varlık Güveni</span>
          <span class="ai-data-pool-panel__kpi-value">${avgConfidence}%</span>
        </div>
        <div class="ai-data-pool-panel__kpi-card">
          <span class="ai-data-pool-panel__kpi-label">Yinelenen</span>
          <span class="ai-data-pool-panel__kpi-value">${exactCount} / ${similarCount}</span>
        </div>
        <div class="ai-data-pool-panel__kpi-card">
          <span class="ai-data-pool-panel__kpi-label">Düşük Kalite</span>
          <span class="ai-data-pool-panel__kpi-value">${lowQuality}</span>
        </div>
      </div>
    </section>`;
}
