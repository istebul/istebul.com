/**
 * AI Decision Simulator — admin panel HTML builder (Sprint-18).
 */

import { escapeHtml } from '../core/dom-safe.js';
import {
  SIMULATOR_BUDGET_DELTAS,
  SIMULATOR_RISK_OPTIONS,
  SIMULATOR_USAGE_OPTIONS,
  SIMULATOR_ANNUAL_KM_OPTIONS,
  SIMULATOR_PRIORITY_OPTIONS,
  buildDefaultScenario
} from './scenario-builder.js';

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
    return '<p class="ai-sim-panel__empty">Bilgi yok</p>';
  }
  return `<ul class="${listClass}">${items.map((item) => `<li>${safe(item)}</li>`).join('')}</ul>`;
}

/**
 * @param {string} label
 * @returns {string}
 */
function labelClass(label) {
  const lower = String(label).toLowerCase();
  if (lower.includes('çok uygun')) return 'ai-sim-panel__label--excellent';
  if (lower.includes('uygun')) return 'ai-sim-panel__label--good';
  if (lower.includes('incelenebilir')) return 'ai-sim-panel__label--review';
  if (lower.includes('dikkatli')) return 'ai-sim-panel__label--caution';
  return 'ai-sim-panel__label--avoid';
}

/**
 * @param {Record<string, unknown>} scenario
 * @returns {string}
 */
export function buildSimulatorFormHtml(scenario = {}) {
  const resolved = { ...buildDefaultScenario({}), ...scenario };

  const budgetOptions = SIMULATOR_BUDGET_DELTAS.map((delta) => {
    const label = delta === 0 ? 'Mevcut' : `${delta > 0 ? '+' : ''}${delta}%`;
    return `<option value="${delta}"${Number(resolved.budget_delta_pct) === delta ? ' selected' : ''}>${safe(label)}</option>`;
  }).join('');

  const riskOptions = SIMULATOR_RISK_OPTIONS.map(
    (opt) =>
      `<option value="${safe(opt.value)}"${resolved.risk_tolerance === opt.value ? ' selected' : ''}>${safe(opt.label)}</option>`
  ).join('');

  const usageOptions = SIMULATOR_USAGE_OPTIONS.map(
    (opt) =>
      `<option value="${safe(opt.value)}"${resolved.usage_type === opt.value ? ' selected' : ''}>${safe(opt.label)}</option>`
  ).join('');

  const kmOptions = SIMULATOR_ANNUAL_KM_OPTIONS.map(
    (km) =>
      `<option value="${km}"${Number(resolved.annual_km) === km ? ' selected' : ''}>${safe(km.toLocaleString('tr-TR'))}</option>`
  ).join('');

  const priorityOptions = SIMULATOR_PRIORITY_OPTIONS.map(
    (opt) =>
      `<option value="${safe(opt.value)}"${resolved.priority === opt.value ? ' selected' : ''}>${safe(opt.label)}</option>`
  ).join('');

  return `
    <form class="ai-sim-form" id="ai-sim-scenario-form" aria-label="Senaryo parametreleri">
      <div class="ai-sim-form__grid">
        <label class="ai-sim-form__field">
          <span>Bütçe</span>
          <select name="budget_delta_pct" data-sim-field="budget_delta_pct">${budgetOptions}</select>
        </label>
        <label class="ai-sim-form__field">
          <span>Risk toleransı</span>
          <select name="risk_tolerance" data-sim-field="risk_tolerance">${riskOptions}</select>
        </label>
        <label class="ai-sim-form__field">
          <span>Kullanım amacı</span>
          <select name="usage_type" data-sim-field="usage_type">${usageOptions}</select>
        </label>
        <label class="ai-sim-form__field">
          <span>Yıllık km</span>
          <select name="annual_km" data-sim-field="annual_km">${kmOptions}</select>
        </label>
        <label class="ai-sim-form__field ai-sim-form__field--wide">
          <span>Öncelik</span>
          <select name="priority" data-sim-field="priority">${priorityOptions}</select>
        </label>
      </div>
      <button type="button" class="ai-listings-admin__btn ai-listings-admin__btn--primary" data-sim-action="run">
        Simüle et
      </button>
    </form>`;
}

/**
 * @param {ReturnType<import('./simulator-engine.js').runDecisionSimulator>} result
 * @param {{ coachLabel?: string }} [meta]
 * @returns {string}
 */
export function buildSimulatorResultBodyHtml(result, meta = {}) {
  const coachLabel = safe(meta.coachLabel ?? '—');
  const deltaSign = result.delta > 0 ? '+' : '';
  const deltaClass =
    result.delta > 0 ? 'ai-sim-panel__delta--up' : result.delta < 0 ? 'ai-sim-panel__delta--down' : 'ai-sim-panel__delta--flat';

  return `
        <div class="ai-sim-panel__timeline">
          <div class="ai-sim-timeline__step">
            <span class="ai-sim-timeline__badge">1</span>
            <div>
              <p class="ai-sim-timeline__label">Recommendation</p>
              <span class="ai-sim-panel__label ${labelClass(result.old_label)}">${safe(result.old_label)}</span>
            </div>
          </div>
          <div class="ai-sim-timeline__arrow">↓</div>
          <div class="ai-sim-timeline__step">
            <span class="ai-sim-timeline__badge">2</span>
            <div>
              <p class="ai-sim-timeline__label">Decision Coach</p>
              <span class="ai-sim-panel__coach">${coachLabel}</span>
            </div>
          </div>
          <div class="ai-sim-timeline__arrow">↓</div>
          <div class="ai-sim-timeline__step">
            <span class="ai-sim-timeline__badge">3</span>
            <div>
              <p class="ai-sim-timeline__label">Scenario Change</p>
              <p class="ai-sim-timeline__changes">${safe((result.scenario_changes ?? []).join(' · ') || 'Parametre değişikliği')}</p>
            </div>
          </div>
          <div class="ai-sim-timeline__arrow">↓</div>
          <div class="ai-sim-timeline__step ai-sim-timeline__step--final">
            <span class="ai-sim-timeline__badge">4</span>
            <div>
              <p class="ai-sim-timeline__label">New Decision</p>
              <span class="ai-sim-panel__label ${labelClass(result.new_label)}">${safe(result.new_label)}</span>
            </div>
          </div>
        </div>

        <section class="ai-sim-panel__section">
          <h4>Skor farkı</h4>
          <p class="ai-sim-panel__scores">
            <span>${safe(result.old_fit_score)}</span>
            <span class="ai-sim-panel__delta ${deltaClass}">${deltaSign}${safe(result.delta)}</span>
            <span>${safe(result.new_fit_score)}</span>
            <span class="ai-sim-panel__confidence">${safe(result.confidence)}% güven</span>
          </p>
        </section>

        <section class="ai-sim-panel__section">
          <h4>Neden değişti</h4>
          <pre class="ai-sim-panel__explanation">${safe(result.explanation)}</pre>
        </section>

        <section class="ai-sim-panel__section">
          <h4>Olumlu etkiler</h4>
          ${renderList(result.positive_reasons, 'ai-sim-panel__list ai-sim-panel__list--positive')}
        </section>

        <section class="ai-sim-panel__section">
          <h4>Olumsuz etkiler</h4>
          ${renderList(result.negative_reasons, 'ai-sim-panel__list ai-sim-panel__list--negative')}
        </section>

        <section class="ai-sim-panel__section">
          <h4>Yeni öneri</h4>
          <p class="ai-sim-panel__recommendation">${safe(result.recommendation)}</p>
          <p class="ai-sim-panel__summary">${safe(result.summary)}</p>
        </section>`;
}

/**
 * @param {ReturnType<import('./simulator-engine.js').runDecisionSimulator>} result
 * @param {{ title?: string, coachLabel?: string, recordId?: string, scenario?: Record<string, unknown> }} [meta]
 * @returns {string}
 */
export function buildSimulatorPanelHtml(result, meta = {}) {
  const title = safe(meta.title ?? 'Decision Simulator');
  const scenario = meta.scenario ?? result.scenario ?? {};

  return `
    <aside class="ai-sim-panel" data-sim-panel${meta.recordId ? ` data-sim-record-id="${safe(meta.recordId)}"` : ''} role="dialog" aria-label="Decision Simulator">
      <header class="ai-sim-panel__head">
        <div>
          <p class="ai-sim-panel__eyebrow">Karar Simülatörü</p>
          <h3 class="ai-sim-panel__title">${title}</h3>
        </div>
        <button type="button" class="ai-sim-panel__close" data-sim-action="close" aria-label="Kapat">×</button>
      </header>
      <div class="ai-sim-panel__body">
        ${buildSimulatorResultBodyHtml(result, meta)}
        ${buildSimulatorFormHtml(scenario)}
      </div>
    </aside>
    <div class="ai-sim-panel__backdrop" data-sim-backdrop></div>`;
}

/**
 * @param {{ title?: string, recordId?: string, scenario?: Record<string, unknown> }} [meta]
 * @returns {string}
 */
export function buildSimulatorDrawerPanelHtml(meta = {}) {
  const title = safe(meta.title ?? 'Decision Simulator');
  const scenario = meta.scenario ?? {};

  return `
    <aside class="ai-sim-panel ai-sim-panel--drawer" data-sim-panel${meta.recordId ? ` data-sim-record-id="${safe(meta.recordId)}"` : ''} role="dialog" aria-label="Decision Simulator">
      <header class="ai-sim-panel__head">
        <div>
          <p class="ai-sim-panel__eyebrow">Karar Simülatörü</p>
          <h3 class="ai-sim-panel__title">${title}</h3>
        </div>
        <button type="button" class="ai-sim-panel__close" data-sim-action="close" aria-label="Kapat">×</button>
      </header>
      <div class="ai-sim-panel__body">
        <div id="ai-sim-result-host" class="ai-sim-result-host" hidden></div>
        ${buildSimulatorFormHtml(scenario)}
      </div>
    </aside>
    <div class="ai-sim-panel__backdrop" data-sim-backdrop></div>`;
}

/**
 * @param {Record<string, unknown>} scenario
 * @returns {string}
 */
export function buildSimulatorDrawerHtml(scenario = {}) {
  return `
    <div class="ai-sim-drawer">
      ${buildSimulatorFormHtml(scenario)}
      <div id="ai-sim-result-host" class="ai-sim-result-host" hidden></div>
    </div>`;
}

/**
 * @returns {string}
 */
export function buildSimulatorShellHtml() {
  return '<div id="ai-sim-panel-host" class="ai-sim-panel-host" hidden></div>';
}
