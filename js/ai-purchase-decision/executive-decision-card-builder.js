/**
 * Purchase Decision Intelligence — admin panel HTML builder (Sprint-24).
 */

import { escapeHtml } from '../core/dom-safe.js';
import { DECISION_LEVEL_LABELS } from './decision-summary.js';

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
  if (level === 'low') return 'ai-pd-panel__badge--low';
  if (level === 'high') return 'ai-pd-panel__badge--high';
  return 'ai-pd-panel__badge--mid';
}

/**
 * @param {string[]} items
 * @param {string} listClass
 * @returns {string}
 */
function renderList(items, listClass) {
  if (!Array.isArray(items) || !items.length) {
    return '<p class="ai-pd-panel__empty">Bilgi yok</p>';
  }
  return `<ul class="${listClass}">${items.map((item) => `<li>${safe(item)}</li>`).join('')}</ul>`;
}

/**
 * @param {Array<Record<string, unknown>>} scenarios
 * @returns {string}
 */
function renderNegotiationScenarios(scenarios) {
  if (!Array.isArray(scenarios) || !scenarios.length) {
    return '<p class="ai-pd-panel__empty">Pazarlık senaryosu üretilemedi.</p>';
  }

  return `
    <ul class="ai-pd-panel__scenario-list">
      ${scenarios
        .map(
          (scenario) => `
        <li class="ai-pd-panel__scenario-item">
          <div class="ai-pd-panel__scenario-head">
            <span class="ai-pd-panel__scenario-pct">%${safe(scenario.discountPct)} indirim</span>
            <span class="ai-pd-panel__scenario-score">${safe(scenario.estimatedDecisionScore)} puan</span>
          </div>
          <p class="ai-pd-panel__scenario-price">Düzeltilmiş fiyat: ${safe(scenario.adjustedPrice?.toLocaleString('tr-TR') ?? '—')} TRY</p>
          <p class="ai-pd-panel__scenario-text">${safe(scenario.explanation)}</p>
        </li>`
        )
        .join('')}
    </ul>`;
}

/**
 * @param {Record<string, unknown>} waitScenario
 * @returns {string}
 */
function renderWaitScenario(waitScenario) {
  if (!waitScenario || typeof waitScenario !== 'object') {
    return '<p class="ai-pd-panel__empty">Bekleme senaryosu üretilemedi.</p>';
  }

  return `
    <div class="ai-pd-panel__wait">
      <div class="ai-pd-panel__wait-badges">
        <span class="ai-pd-panel__badge ${riskClass(waitScenario.waitBenefitLevel)}">Bekleme faydası: ${safe(waitScenario.waitBenefitLevel)}</span>
        <span class="ai-pd-panel__badge ${riskClass(waitScenario.waitRiskLevel)}">Bekleme riski: ${safe(waitScenario.waitRiskLevel)}</span>
      </div>
      <p class="ai-pd-panel__wait-text">${safe(waitScenario.explanation)}</p>
      <div class="ai-pd-panel__wait-columns">
        <div>
          <h5>Ne zaman bekle</h5>
          ${renderList(waitScenario.whenToWait, 'ai-pd-panel__list')}
        </div>
        <div>
          <h5>Ne zaman bekleme</h5>
          ${renderList(waitScenario.whenNotToWait, 'ai-pd-panel__list')}
        </div>
      </div>
    </div>`;
}

/**
 * @param {Record<string, unknown>} impact
 * @returns {string}
 */
function renderMissingInfoImpact(impact) {
  if (!impact || typeof impact !== 'object') {
    return '<p class="ai-pd-panel__empty">Eksik bilgi etkisi üretilemedi.</p>';
  }

  const fields = Array.isArray(impact.missingCriticalFields) ? impact.missingCriticalFields : [];

  return `
    <div class="ai-pd-panel__impact">
      <span class="ai-pd-panel__badge ${riskClass(impact.impactLevel)}">Etki: ${safe(impact.impactLevel)}</span>
      <p class="ai-pd-panel__impact-lift">Potansiyel karar artışı: +${safe(impact.potentialDecisionLift)} puan</p>
      ${fields.length ? `<p class="ai-pd-panel__impact-fields">Eksik: ${fields.map((f) => safe(f)).join(', ')}</p>` : ''}
      <p class="ai-pd-panel__impact-text">${safe(impact.explanation)}</p>
    </div>`;
}

/**
 * @param {Record<string, unknown>} result
 * @param {{ title?: string, recordId?: string }} [meta]
 * @returns {string}
 */
export function buildExecutiveDecisionPanelHtml(result, meta = {}) {
  if (!result || typeof result !== 'object' || result.decisionScore == null) {
    return `
      <aside class="ai-pd-panel" role="dialog" aria-label="Al Kararı Analizi">
        <header class="ai-pd-panel__head">
          <div>
            <p class="ai-pd-panel__eyebrow">Al Kararı Analizi</p>
            <h3 class="ai-pd-panel__title">${safe(meta.title ?? 'Al Kararı Analizi')}</h3>
          </div>
          <button type="button" class="ai-pd-panel__close" data-pd-action="close" aria-label="Kapat">×</button>
        </header>
        <div class="ai-pd-panel__body">
          <p class="ai-pd-panel__empty">Bu öneri için al kararı analizi üretilemedi.</p>
        </div>
      </aside>
      <div class="ai-pd-panel__backdrop" data-pd-backdrop></div>`;
  }

  const title = safe(meta.title ?? 'Al Kararı Analizi');
  const decisionClass =
    result.decisionLevel === 'strong_buy_candidate'
      ? 'ai-pd-panel__decision--strong'
      : result.decisionLevel === 'avoid'
        ? 'ai-pd-panel__decision--avoid'
        : 'ai-pd-panel__decision--neutral';

  return `
    <aside class="ai-pd-panel" data-pd-panel${meta.recordId ? ` data-pd-record-id="${safe(meta.recordId)}"` : ''} role="dialog" aria-label="Al Kararı Analizi">
      <header class="ai-pd-panel__head">
        <div>
          <p class="ai-pd-panel__eyebrow">Al Kararı Analizi</p>
          <h3 class="ai-pd-panel__title">${title}</h3>
        </div>
        <button type="button" class="ai-pd-panel__close" data-pd-action="close" aria-label="Kapat">×</button>
      </header>
      <div class="ai-pd-panel__body">
        <div class="ai-pd-panel__hero">
          <div class="ai-pd-panel__metric">
            <span class="ai-pd-panel__metric-label">Karar skoru</span>
            <span class="ai-pd-panel__metric-value">${safe(result.decisionScore)}</span>
          </div>
          <span class="ai-pd-panel__decision ${decisionClass}">${safe(result.decisionLabel)}</span>
          <div class="ai-pd-panel__metric-row">
            <div class="ai-pd-panel__metric ai-pd-panel__metric--sm">
              <span class="ai-pd-panel__metric-label">Veri güveni</span>
              <span class="ai-pd-panel__metric-value">${safe(result.confidenceScore)}%</span>
            </div>
            <div class="ai-pd-panel__metric ai-pd-panel__metric--sm">
              <span class="ai-pd-panel__metric-label">Risk</span>
              <span class="ai-pd-panel__metric-value ai-pd-panel__badge ${riskClass(result.riskLevel)}">${safe(result.riskLabel)}</span>
            </div>
          </div>
          <div class="ai-pd-panel__action">
            <span class="ai-pd-panel__action-label">Önerilen aksiyon</span>
            <span class="ai-pd-panel__action-value">${safe(result.primaryActionLabel)}</span>
          </div>
        </div>

        <section class="ai-pd-panel__section">
          <h4>Olumlu faktörler</h4>
          ${renderList(result.positiveFactors, 'ai-pd-panel__list ai-pd-panel__list--positive')}
        </section>

        <section class="ai-pd-panel__section">
          <h4>Risk faktörleri</h4>
          ${renderList(result.riskFactors, 'ai-pd-panel__list ai-pd-panel__list--risk')}
        </section>

        <section class="ai-pd-panel__section">
          <h4>Pazarlık senaryoları</h4>
          ${renderNegotiationScenarios(result.negotiationScenario)}
        </section>

        <section class="ai-pd-panel__section">
          <h4>Bekleme senaryosu</h4>
          ${renderWaitScenario(result.waitScenario)}
        </section>

        <section class="ai-pd-panel__section">
          <h4>Eksik bilgi etkisi</h4>
          ${renderMissingInfoImpact(result.missingInfoImpact)}
        </section>

        <section class="ai-pd-panel__section">
          <h4>Sonraki adımlar</h4>
          ${renderList(result.nextSteps, 'ai-pd-panel__list')}
        </section>

        <section class="ai-pd-panel__section">
          <h4>Özet</h4>
          <p class="ai-pd-panel__summary">${safe(result.summary)}</p>
        </section>
      </div>
    </aside>
    <div class="ai-pd-panel__backdrop" data-pd-backdrop></div>`;
}

/**
 * @returns {string}
 */
export function buildExecutiveDecisionShellHtml() {
  return '<div id="ai-pd-panel-host" class="ai-pd-panel-host" hidden></div>';
}

export { DECISION_LEVEL_LABELS };
