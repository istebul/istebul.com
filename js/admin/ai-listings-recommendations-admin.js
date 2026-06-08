/**
 * AI Listings Recommendations — admin UI builders (Sprint-16 v1).
 */

import { escapeHtml } from '../core/dom-safe.js';
import {
  runRecommendationEngine,
  parseUserIntent,
  PRIORITY_OPTIONS,
  USAGE_TYPE_OPTIONS,
  RISK_TOLERANCE_OPTIONS,
  CATEGORY_OPTIONS
} from '../ai-recommendation-engine/index.js';
import { buildRecommendationCardsGridHtml } from '../ai-recommendation-engine/recommendation-card-builder.js';
import { buildDecisionCoachShellHtml } from '../ai-decision-coach/coach-card-builder.js';
import { buildSimulatorShellHtml } from '../ai-decision-simulator/simulator-card-builder.js';
import { buildDecisionReportShellHtml } from '../ai-decision-report/report-card-builder.js';
import { buildOwnershipCostShellHtml } from '../ai-ownership-cost/cost-card-builder.js';
import { buildNegotiationShellHtml } from '../ai-negotiation-intelligence/negotiation-card-builder.js';
import { runDecisionFlow, buildCalibrationBlockHtml } from '../ai-decision-flow/index.js';
import {
  toSelectOptions,
  CATEGORY_LABELS,
  USAGE_TYPE_LABELS,
  RISK_TOLERANCE_LABELS,
  PRIORITY_LABELS
} from './ai-listings-admin-labels.js';
import { buildScenarioShellHtml } from '../ai-scenario-simulator/scenario-card-builder.js';

/**
 * @param {unknown} value
 * @returns {string}
 */
export function safeRenderText(value) {
  return escapeHtml(String(value ?? ''));
}

/**
 * @param {Record<string, unknown>} profile
 * @returns {string}
 */
export function buildRecommendationProfileFormHtml(profile = {}) {
  const categoryOptions = toSelectOptions(CATEGORY_OPTIONS, CATEGORY_LABELS)
    .map(
      (opt) =>
        `<option value="${safeRenderText(opt.value)}"${profile.category === opt.value ? ' selected' : ''}>${safeRenderText(opt.label)}</option>`
    )
    .join('');

  const usageOptions = toSelectOptions(USAGE_TYPE_OPTIONS, USAGE_TYPE_LABELS)
    .map(
      (opt) =>
        `<option value="${safeRenderText(opt.value)}"${profile.usage_type === opt.value ? ' selected' : ''}>${safeRenderText(opt.label)}</option>`
    )
    .join('');

  const riskOptions = toSelectOptions(RISK_TOLERANCE_OPTIONS, RISK_TOLERANCE_LABELS)
    .map(
      (opt) =>
        `<option value="${safeRenderText(opt.value)}"${profile.risk_tolerance === opt.value ? ' selected' : ''}>${safeRenderText(opt.label)}</option>`
    )
    .join('');

  const priorityOptions = toSelectOptions(PRIORITY_OPTIONS, PRIORITY_LABELS)
    .map(
      (opt) =>
        `<option value="${safeRenderText(opt.value)}"${profile.priority === opt.value ? ' selected' : ''}>${safeRenderText(opt.label)}</option>`
    )
    .join('');

  return `
    <form class="ai-rec-form" id="ai-rec-profile-form" aria-label="Kullanıcı profili">
      <div class="ai-rec-form__grid">
        <label class="ai-rec-form__field">
          <span>Kategori</span>
          <select name="category" data-rec-field="category">${categoryOptions}</select>
        </label>
        <label class="ai-rec-form__field">
          <span>Bütçe (TRY)</span>
          <input type="number" name="budget" data-rec-field="budget" value="${safeRenderText(profile.budget ?? '')}" placeholder="1800000" />
        </label>
        <label class="ai-rec-form__field">
          <span>Şehir</span>
          <input type="text" name="city" data-rec-field="city" value="${safeRenderText(profile.city ?? '')}" placeholder="İzmir" />
        </label>
        <label class="ai-rec-form__field">
          <span>Kullanım tipi</span>
          <select name="usage_type" data-rec-field="usage_type">${usageOptions}</select>
        </label>
        <label class="ai-rec-form__field">
          <span>Aile kişi sayısı</span>
          <input type="number" name="family_size" data-rec-field="family_size" value="${safeRenderText(profile.family_size ?? '')}" placeholder="4" />
        </label>
        <label class="ai-rec-form__field">
          <span>Yıllık km</span>
          <input type="number" name="annual_km" data-rec-field="annual_km" value="${safeRenderText(profile.annual_km ?? '')}" placeholder="15000" />
        </label>
        <label class="ai-rec-form__field">
          <span>Risk toleransı</span>
          <select name="risk_tolerance" data-rec-field="risk_tolerance">${riskOptions}</select>
        </label>
        <label class="ai-rec-form__field">
          <span>Öncelik</span>
          <select name="priority" data-rec-field="priority">${priorityOptions}</select>
        </label>
      </div>
      <button type="button" class="ai-listings-admin__btn ai-listings-admin__btn--primary" data-rec-action="generate">
        Öneri üret
      </button>
    </form>`;
}

/**
 * @param {string} summary
 * @returns {string}
 */
export function buildRecommendationSummaryHtml(summary) {
  return `
    <section class="ai-rec-summary" aria-label="AI öneri özeti">
      <h3>AI Öneri Özeti</h3>
      <p class="ai-rec-summary__text">${safeRenderText(summary)}</p>
    </section>`;
}

/**
 * @param {Array<Record<string, unknown>>} listings
 * @param {Record<string, unknown>} [profile]
 * @param {{ generated?: boolean, compareMode?: boolean, compareSelectedIds?: string[] }} [options]
 * @returns {{ html: string, result: ReturnType<typeof runRecommendationEngine>|null }}
 */
export function buildRecommendationsDashboardHtml(listings, profile = {}, options = {}) {
  const parsedProfile = parseUserIntent(profile);
  const result = options.generated ? runRecommendationEngine(listings, parsedProfile) : null;

  const summaryHtml = result ? buildRecommendationSummaryHtml(result.summary) : '';
  const calibrationHtml =
    result && result.top?.length
      ? buildCalibrationBlockHtml(
          runDecisionFlow(listings, parsedProfile, { selectedId: String(result.top[0].id) }).calibration
        )
      : '';
  const cardsHtml = result
    ? buildRecommendationCardsGridHtml(result.top, {
        compareMode: Boolean(options.compareMode),
        compareSelectedIds: options.compareSelectedIds ?? []
      })
    : '';
  const countLabel = result
    ? `${result.top.length} öneri · ${result.total_evaluated} kayıt değerlendirildi`
    : 'Profil bilgilerini doldurup öneri üretin';

  const compareModeClass = options.compareMode ? ' ai-rec-dashboard--compare-mode' : '';
  const selectedCount = (options.compareSelectedIds ?? []).length;

  const html = `
    <div class="ai-rec-dashboard${compareModeClass}">
      <header class="ai-rec-dashboard__head">
        <h2>Öneriler</h2>
        <p class="ai-listings-admin__muted">Mevcut veri havuzu kayıtlarından profil bazlı karar önerileri</p>
      </header>
      ${buildRecommendationProfileFormHtml(parsedProfile)}
      <p class="ai-rec-dashboard__count">${safeRenderText(countLabel)}</p>
      ${summaryHtml}
      ${calibrationHtml}
      ${result ? buildCompareToolbarHtml(selectedCount) : ''}
      ${cardsHtml}
      ${buildDecisionCoachShellHtml()}
      ${buildSimulatorShellHtml()}
      ${buildDecisionReportShellHtml()}
      ${buildOwnershipCostShellHtml()}
      ${buildNegotiationShellHtml()}
    </div>`;

  return { html, result };
}

/**
 * @param {HTMLElement} root
 * @returns {Record<string, unknown>}
 */
export function readRecommendationProfileFromForm(root) {
  /** @type {Record<string, unknown>} */
  const profile = {};
  root.querySelectorAll('[data-rec-field]').forEach((field) => {
    const key = field.getAttribute('data-rec-field');
    if (!key) return;
    profile[key] = /** @type {HTMLInputElement|HTMLSelectElement} */ (field).value;
  });
  return profile;
}
