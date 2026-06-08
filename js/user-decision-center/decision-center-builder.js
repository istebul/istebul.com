/**
 * User Decision Center — full section builder (Sprint-30).
 */

import { escapeHtml } from '../core/dom-safe.js';
import { buildDecisionOverviewHtml } from './decision-overview-builder.js';
import { buildDecisionChecklistHtml } from './decision-checklist-builder.js';
import { buildDecisionSummaryHtml } from './decision-summary-builder.js';
import { buildDecisionScenarioHtml } from './decision-scenario-builder.js';

/**
 * @param {unknown} value
 * @returns {string}
 */
function safe(value) {
  return escapeHtml(String(value ?? ''));
}

/**
 * @param {Record<string, unknown>} ctx
 * @param {{ showScenario?: boolean, scenarioLoading?: boolean }} [options]
 * @returns {string}
 */
export function buildUserDecisionCenterHtml(ctx, options = {}) {
  const listingId = safe(ctx?.listing?.id ?? '');
  const title = safe(ctx?.listing?.title ?? 'İlan');

  return `
    <section class="udc-root" data-udc-listing-id="${listingId}" aria-label="Karar Merkezi">
      <header class="udc-head">
        <p class="udc-kicker">Karar Merkezi</p>
        <h3 class="udc-title">${title}</h3>
      </header>
      ${buildDecisionOverviewHtml(ctx)}
      ${buildDecisionSummaryHtml(ctx)}
      ${buildDecisionChecklistHtml(ctx?.checklist ?? [])}
      ${buildDecisionScenarioHtml(
        options.showScenario !== false ? ctx?.scenario : null,
        { loading: options.scenarioLoading }
      )}
    </section>`;
}

/**
 * @param {string} [message]
 * @returns {string}
 */
export function buildUserDecisionCenterEmptyHtml(message) {
  return `
    <section class="udc-root udc-root--empty" aria-label="Karar Merkezi">
      <header class="udc-head">
        <p class="udc-kicker">Karar Merkezi</p>
        <h3 class="udc-title">Karar analizi</h3>
      </header>
      <p class="udc-empty">${safe(message ?? 'Bu ilan için karar analizi henüz hazır değil.')}</p>
    </section>`;
}
