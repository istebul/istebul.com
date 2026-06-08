/**
 * User Decision Center — scenario simulation builder (Sprint-30).
 */

import { escapeHtml } from '../core/dom-safe.js';
import { SCENARIO_LEVEL_LABELS } from '../ai-scenario-simulator/scenario-summary.js';

/**
 * @param {unknown} value
 * @returns {string}
 */
function safe(value) {
  return escapeHtml(String(value ?? ''));
}

/**
 * @param {Record<string, unknown>|null} scenario
 * @param {{ loading?: boolean }} [meta]
 * @returns {string}
 */
export function buildDecisionScenarioHtml(scenario, meta = {}) {
  if (meta.loading) {
    return `
      <section class="udc-scenario udc-scenario--loading" aria-label="Senaryo simülasyonu" aria-busy="true">
        <h4>Senaryo Simülasyonu</h4>
        <p class="udc-muted" role="status">Senaryo hesaplanıyor…</p>
      </section>`;
  }

  if (!scenario || scenario.baseDecisionScore == null) {
    return `
      <section class="udc-scenario udc-scenario--empty" aria-label="Senaryo simülasyonu">
        <h4>Senaryo Simülasyonu</h4>
        <p class="udc-muted">Bu ilan için senaryo simülasyonu henüz hazır değil.</p>
      </section>`;
  }

  const levelLabel = SCENARIO_LEVEL_LABELS[String(scenario.scenarioLevel)] ?? safe(scenario.scenarioLabel);
  const selected = /** @type {Record<string, unknown>|null} */ (scenario.selectedScenario ?? null);
  const delta = Number(scenario.scoreDelta ?? 0);

  return `
    <section class="udc-scenario" aria-label="Senaryo simülasyonu">
      <h4>Senaryo Simülasyonu</h4>
      <div class="udc-scenario__metrics">
        <div class="udc-scenario__metric">
          <span>Mevcut skor</span>
          <strong>${safe(scenario.baseDecisionScore)}</strong>
        </div>
        <div class="udc-scenario__metric">
          <span>Tahmini yeni skor</span>
          <strong>${safe(scenario.simulatedDecisionScore)}</strong>
        </div>
        <div class="udc-scenario__metric">
          <span>Fark</span>
          <strong>${delta >= 0 ? '+' : ''}${safe(scenario.scoreDelta)}</strong>
        </div>
      </div>
      <p class="udc-scenario__level">${safe(levelLabel)}</p>
      ${
        selected
          ? `<p class="udc-scenario__selected">${safe(selected.title ?? selected.label ?? 'Seçili senaryo')}: ${safe(selected.explanation ?? selected.summary ?? '')}</p>`
          : ''
      }
      <p class="udc-disclaimer">Senaryo sonuçları tahminidir; gerçek piyasa koşulları farklılık gösterebilir.</p>
    </section>`;
}
