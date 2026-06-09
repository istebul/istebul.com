/**
 * Phase 3A — Decision category card adapters (shadow mode registry).
 */
import { createFallbackViewModel, DECISION_CATEGORY_IDS } from '../decision-category-card-contract.js';
import { adaptAutoCard } from './auto-adapter.js';
import { adaptFinansmanCard } from './finansman-adapter.js';
import { adaptKaskoCard } from './kasko-adapter.js';
import { adaptKonutCard } from './konut-adapter.js';
import { adaptSigortaCard } from './sigorta-adapter.js';
import { adaptTatilCard } from './tatil-adapter.js';

export { adaptAutoCard } from './auto-adapter.js';
export { adaptFinansmanCard } from './finansman-adapter.js';
export { adaptKaskoCard } from './kasko-adapter.js';
export { adaptKonutCard } from './konut-adapter.js';
export { adaptSigortaCard } from './sigorta-adapter.js';
export { adaptTatilCard } from './tatil-adapter.js';

/** @type {Record<string, (input?: import('../decision-category-card-contract.js').DecisionCardAdapterInput) => import('../decision-category-card-contract.js').DecisionCategoryCardViewModel>} */
const ADAPTERS = Object.freeze({
  araba: adaptAutoCard,
  auto: adaptAutoCard,
  konut: adaptKonutCard,
  tatil: adaptTatilCard,
  finansman: adaptFinansmanCard,
  sigorta: adaptSigortaCard,
  kasko: adaptKaskoCard
});

/**
 * @param {string} categoryId
 * @param {import('../decision-category-card-contract.js').DecisionCardAdapterInput} [input]
 * @returns {import('../decision-category-card-contract.js').DecisionCategoryCardViewModel}
 */
export function adaptCategoryCard(categoryId, input = {}) {
  const key = String(categoryId || '').toLowerCase();
  const adapter = ADAPTERS[key];
  if (!adapter) {
    const normalized =
      key === 'arac' ? 'araba' : key === 'ev' || key === 'housing' ? 'konut' : key === 'vacation' ? 'tatil' : key;
    const fallbackAdapter = ADAPTERS[normalized];
    if (fallbackAdapter) return fallbackAdapter(input);
    return createFallbackViewModel('konut', input.scenario || {});
  }
  return adapter(input);
}

/**
 * Map an array of engine scenarios to ViewModels.
 * @param {string} categoryId
 * @param {object[]} scenarios
 * @param {Omit<import('../decision-category-card-contract.js').DecisionCardAdapterInput, 'scenario'>} [context]
 * @returns {import('../decision-category-card-contract.js').DecisionCategoryCardViewModel[]}
 */
export function adaptCategoryCardList(categoryId, scenarios = [], context = {}) {
  if (!Array.isArray(scenarios)) return [];
  return scenarios.map((scenario) =>
    adaptCategoryCard(categoryId, {
      ...context,
      scenario
    })
  );
}

export { DECISION_CATEGORY_IDS };
