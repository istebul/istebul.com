/**
 * Phase 3A-2 — Decision Category Card renderer (feature-flagged UI).
 * Renders ViewModels only; scores come from adapters unchanged.
 */
import { escapeHtml } from '../../core/security.js';

/** @typedef {import('./decision-category-card-contract.js').DecisionCategoryCardViewModel} DecisionCategoryCardViewModel */

export const DECISION_CARDS_URL_PARAM = 'decision_cards';

export const RECOMMENDATION_LEVEL_LABELS = Object.freeze({
  proceed: 'İlerlenebilir',
  proceed_with_caution: 'Dikkatli ilerle',
  wait: 'Ertelenmeli / revize edilmeli',
  avoid: 'Şu an önerilmez'
});

/** @type {boolean | null} */
let runtimeOverride = null;

function readUrlFlag() {
  try {
    if (typeof window === 'undefined' || !window.location?.search) return null;
    const value = new URLSearchParams(window.location.search).get(DECISION_CARDS_URL_PARAM);
    if (value === '0' || value === 'false') return false;
    if (value === '1' || value === 'true') return true;
  } catch {
    // ignore
  }
  return null;
}

/**
 * Feature flag: ?decision_cards=1
 * @returns {boolean}
 */
export function isDecisionCategoryCardsEnabled() {
  if (runtimeOverride === false) return false;
  if (runtimeOverride === true) return true;
  return readUrlFlag() === true;
}

/**
 * @param {boolean | null} enabled
 */
export function setDecisionCategoryCardsOverride(enabled) {
  runtimeOverride = enabled === null ? null : Boolean(enabled);
}

/**
 * Sync `data-decision-cards` on documentElement for CSS hooks.
 * @param {boolean} enabled
 */
export function syncDecisionCardsFlagToDocument(enabled = isDecisionCategoryCardsEnabled()) {
  if (typeof document === 'undefined') return;
  if (enabled) {
    document.documentElement.dataset.decisionCards = '1';
  } else {
    delete document.documentElement.dataset.decisionCards;
  }
}

/**
 * @param {'sigorta'|'kasko'} vertical
 * @returns {boolean}
 */
export function isDecisionCardsVertical(vertical) {
  return vertical === 'sigorta' || vertical === 'kasko';
}

/**
 * @param {string} level
 * @returns {string}
 */
export function resolveRecommendationLevelLabel(level) {
  return RECOMMENDATION_LEVEL_LABELS[level] || RECOMMENDATION_LEVEL_LABELS.wait;
}

/**
 * @param {import('./decision-category-card-contract.js').DecisionCardSignal} signal
 * @param {(value: string) => string} esc
 * @returns {string}
 */
function renderSignalHtml(signal, esc) {
  const tone = signal.tone || 'neutral';
  return `
    <div class="ib-decision-card__signal ib-decision-card__signal--${esc(tone)}" data-signal="${esc(signal.key)}">
      <span class="ib-decision-card__signal-label">${esc(signal.label)}</span>
      <strong class="ib-decision-card__signal-value">${esc(signal.value)}</strong>
    </div>`;
}

/**
 * @param {DecisionCategoryCardViewModel} vm
 * @param {object} [options]
 * @param {boolean} [options.isSelected]
 * @param {(key: string, fallback?: string) => string} [options.t]
 * @returns {string}
 */
export function renderDecisionCategoryCardHtml(vm, options = {}) {
  const esc = escapeHtml;
  const isSelected = Boolean(options.isSelected);
  const t = options.t || ((key, fallback) => fallback || key);
  const badge = vm._source?.badge;
  const levelLabel = resolveRecommendationLevelLabel(vm.recommendationLevel);
  const selectLabel = isSelected
    ? t('common.selected', '✓ Seçildi')
    : vm.cta?.primary?.label || t('common.selectOption', 'Bu seçeneği seç');
  const secondaryLabel =
    vm.cta?.secondary?.label || t('common.compareOption', 'Karşılaştır');

  const signalsHtml = (vm.signals || [])
    .map((signal) => renderSignalHtml(signal, esc))
    .join('');

  const prosHtml = (vm.pros || [])
    .map((item) => `<li>${esc(item)}</li>`)
    .join('');
  const cautionsHtml = (vm.cautions || [])
    .map((item) => `<li>${esc(item)}</li>`)
    .join('');

  const ai = vm.aiExplanation || {};

  return `
    <article
      class="ib-decision-category-card ib-decision-category-card--${esc(vm.categoryId)} ${isSelected ? 'is-selected' : ''}"
      data-option="${esc(vm.scenarioId)}"
      data-decision-score="${esc(String(vm.decisionScore))}"
      role="listitem"
      aria-pressed="${isSelected ? 'true' : 'false'}"
    >
      <header class="ib-decision-card__header">
        ${
          badge?.label
            ? `<span class="ib-decision-card__badge ${esc(badge.className || '')}">${esc(badge.label)}</span>`
            : ''
        }
        <div class="ib-decision-card__score" aria-label="${esc(t('common.decisionScore', 'Karar skoru'))}">
          <span class="ib-decision-card__score-value">${esc(String(vm.decisionScore))}</span>
          <span class="ib-decision-card__score-suffix">/100</span>
        </div>
      </header>

      <p class="ib-decision-card__level ib-decision-card__level--${esc(vm.recommendationLevel)}" role="status">
        ${esc(levelLabel)}
      </p>

      <h3 class="ib-decision-card__title">${esc(vm.title)}</h3>

      ${
        signalsHtml
          ? `<div class="ib-decision-card__signals" aria-label="${esc(t('common.decisionSignals', 'Karar sinyalleri'))}">${signalsHtml}</div>`
          : ''
      }

      <section class="ib-decision-card__ai" aria-label="${esc(t('common.aiRationale', 'AI karar gerekçesi'))}">
        ${
          ai.summary
            ? `<p class="ib-decision-card__ai-summary">${esc(ai.summary)}</p>`
            : ''
        }
        ${
          ai.why
            ? `<p class="ib-decision-card__ai-why"><strong>${esc(t('common.whyRecommended', 'Neden önerildi?'))}</strong> ${esc(ai.why)}</p>`
            : ''
        }
        ${
          ai.risk
            ? `<p class="ib-decision-card__ai-risk"><strong>${esc(t('common.riskNote', 'Risk notu'))}</strong> ${esc(ai.risk)}</p>`
            : ''
        }
      </section>

      ${
        prosHtml
          ? `<div class="ib-decision-card__pros"><strong>${esc(t('common.pros', 'Artılar'))}</strong><ul>${prosHtml}</ul></div>`
          : ''
      }
      ${
        cautionsHtml
          ? `<div class="ib-decision-card__cautions"><strong>${esc(t('common.cautions', 'Dikkat'))}</strong><ul>${cautionsHtml}</ul></div>`
          : ''
      }

      <footer class="ib-decision-card__actions">
        <button
          type="button"
          class="btn btn-sm ib-decision-card-select vacation-select-card-btn ${isSelected ? 'btn-primary' : 'btn-outline'}"
          data-option="${esc(vm.scenarioId)}"
          aria-label="${esc(selectLabel)}: ${esc(vm.title)}"
        >
          ${esc(selectLabel)}
        </button>
        ${
          vm.cta?.secondary
            ? `<button type="button" class="btn btn-sm btn-ghost ib-decision-card-secondary" data-action="${esc(vm.cta.secondary.action || 'compare')}" data-option="${esc(vm.scenarioId)}">
                ${esc(secondaryLabel)}
              </button>`
            : ''
        }
      </footer>
    </article>`;
}

/**
 * @param {DecisionCategoryCardViewModel[]} viewModels
 * @param {object} [options]
 * @param {string} [options.selectedId]
 * @param {string} [options.ariaLabel]
 * @param {(key: string, fallback?: string) => string} [options.t]
 * @returns {string}
 */
export function renderDecisionCategoryCardsGridHtml(viewModels = [], options = {}) {
  const esc = escapeHtml;
  const cards = Array.isArray(viewModels) ? viewModels : [];
  const ariaLabel = options.ariaLabel || 'Karar senaryoları';

  return `
    <div class="ib-decision-category-cards" role="list" aria-label="${esc(ariaLabel)}">
      ${cards
        .map((vm) =>
          renderDecisionCategoryCardHtml(vm, {
            isSelected: options.selectedId === vm.scenarioId,
            t: options.t
          })
        )
        .join('')}
    </div>`;
}
