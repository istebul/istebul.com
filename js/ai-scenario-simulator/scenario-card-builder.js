/**
 * Scenario Simulator v1 — admin panel HTML builder (Sprint-28).
 */

import { escapeHtml } from '../core/dom-safe.js';
import { SCENARIO_LEVEL_LABELS } from './scenario-summary.js';

/**
 * @param {unknown} value
 * @returns {string}
 */
function safe(value) {
  return escapeHtml(String(value ?? ''));
}

/**
 * @param {string[]} items
 * @returns {string}
 */
function renderList(items) {
  if (!Array.isArray(items) || !items.length) {
    return '<p class="ai-ss-panel__empty">Bilgi yok</p>';
  }
  return `<ul class="ai-ss-panel__list">${items.map((item) => `<li>${safe(item)}</li>`).join('')}</ul>`;
}

/**
 * @param {Record<string, unknown>} result
 * @param {{ title?: string }} [meta]
 * @returns {string}
 */
export function buildScenarioPanelHtml(result, meta = {}) {
  if (!result || typeof result !== 'object' || result.baseDecisionScore == null) {
    return `
    <aside class="ai-ss-panel" role="dialog" aria-label="Senaryo Simülasyonu">
      <header class="ai-ss-panel__head">
        <div>
          <p class="ai-ss-panel__eyebrow">Senaryo Simülasyonu</p>
          <h3 class="ai-ss-panel__title">${safe(meta.title ?? 'Senaryo')}</h3>
        </div>
        <button type="button" class="ai-ss-panel__close" data-ss-action="close" aria-label="Kapat">×</button>
      </header>
      <div class="ai-ss-panel__body">
        <p class="ai-ss-panel__empty">Bu ilan için senaryo simülasyonu üretilemedi.</p>
      </div>
    </aside>
    <div class="ai-ss-panel__backdrop" data-ss-backdrop></div>`;
  }

  const levelLabel = SCENARIO_LEVEL_LABELS[String(result.scenarioLevel)] ?? safe(result.scenarioLabel);
  const selected = /** @type {Record<string, unknown>|null} */ (result.selectedScenario ?? null);

  return `
    <aside class="ai-ss-panel" role="dialog" aria-label="Senaryo Simülasyonu">
      <header class="ai-ss-panel__head">
        <div>
          <p class="ai-ss-panel__eyebrow">Senaryo Simülasyonu</p>
          <h3 class="ai-ss-panel__title">${safe(meta.title ?? 'Senaryo Simülasyonu')}</h3>
        </div>
        <button type="button" class="ai-ss-panel__close" data-ss-action="close" aria-label="Kapat">×</button>
      </header>
      <div class="ai-ss-panel__body">
        <section class="ai-ss-panel__hero">
          <div class="ai-ss-panel__metric">
            <span class="ai-ss-panel__metric-label">Eski karar skoru</span>
            <span class="ai-ss-panel__metric-value">${safe(result.baseDecisionScore)}</span>
          </div>
          <div class="ai-ss-panel__metric">
            <span class="ai-ss-panel__metric-label">Yeni tahmini skor</span>
            <span class="ai-ss-panel__metric-value">${safe(result.simulatedDecisionScore)}</span>
          </div>
          <div class="ai-ss-panel__metric">
            <span class="ai-ss-panel__metric-label">Skor farkı</span>
            <span class="ai-ss-panel__metric-value">${Number(result.scoreDelta) >= 0 ? '+' : ''}${safe(result.scoreDelta)}</span>
          </div>
          <span class="ai-ss-panel__level">${safe(levelLabel)}</span>
        </section>

        <section class="ai-ss-panel__section">
          <h4>Karar etiketi değişimi</h4>
          <p class="ai-ss-panel__change">${safe(result.baseDecisionLabel)} → ${safe(result.simulatedDecisionLabel)}</p>
          ${selected?.explanation ? `<p class="ai-ss-panel__explain">${safe(selected.explanation)}</p>` : ''}
        </section>

        <section class="ai-ss-panel__section">
          <h4>Hazır senaryolar</h4>
          <div class="ai-ss-panel__presets">
            <button type="button" class="ai-ss-panel__preset" data-ss-scenario="price_minus_3">Fiyat -%3</button>
            <button type="button" class="ai-ss-panel__preset" data-ss-scenario="price_minus_5">Fiyat -%5</button>
            <button type="button" class="ai-ss-panel__preset" data-ss-scenario="price_minus_10">Fiyat -%10</button>
            <button type="button" class="ai-ss-panel__preset" data-ss-scenario="missing_info_completed">Eksik bilgi tamamlandı</button>
            <button type="button" class="ai-ss-panel__preset" data-ss-scenario="duplicate_risk_removed">Mükerrer risk kaldırıldı</button>
            <button type="button" class="ai-ss-panel__preset" data-ss-scenario="suspicious_price_verified">Fiyat doğrulandı</button>
          </div>
        </section>

        <section class="ai-ss-panel__section">
          <h4>Özet</h4>
          <p class="ai-ss-panel__summary">${safe(result.summary)}</p>
        </section>

        <section class="ai-ss-panel__section">
          <h4>Sonraki adımlar</h4>
          ${renderList(result.nextSteps)}
        </section>
      </div>
    </aside>
    <div class="ai-ss-panel__backdrop" data-ss-backdrop></div>`;
}

/**
 * @param {Record<string, unknown>} teaser
 * @returns {string}
 */
export function buildScenarioTeaserHtml(teaser = {}) {
  return `
    <section class="ai-ws-scenario" aria-label="Senaryo simülasyonu">
      <header class="ai-ws-scenario__head">
        <h4>Senaryo Simülasyonu</h4>
        <button type="button" class="ai-ws-scenario__btn" data-ws-action="scenario"${teaser.disabled ? ' disabled' : ''}>
          Senaryo aç
        </button>
      </header>
      <p class="ai-ws-scenario__text">${safe(teaser.summary ?? 'Fiyat, maliyet ve risk senaryolarını tahmini olarak değerlendirin.')}</p>
    </section>`;
}

/**
 * @returns {string}
 */
export function buildScenarioShellHtml() {
  return '<div id="ai-ss-panel-host" class="ai-ss-panel-host" hidden></div>';
}
