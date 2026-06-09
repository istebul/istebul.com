import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSigortaResults, buildEngineResult } from '../../js/features/sigorta/sigorta-engine.js';
import { adaptSigortaCard } from '../../js/features/decision-cards/adapters/sigorta-adapter.js';
import {
  isDecisionCategoryCardsEnabled,
  isDecisionCardsVertical,
  renderDecisionCategoryCardHtml,
  renderDecisionCategoryCardsGridHtml,
  resolveRecommendationLevelLabel,
  setDecisionCategoryCardsOverride
} from '../../js/features/decision-cards/decision-category-card-renderer.js';

const sampleState = {
  insurance_type: 'saglik',
  age: 38,
  children_count: '2',
  risk_perception: 'yuksek',
  budget_level: 'orta'
};

test('isDecisionCardsVertical gates sigorta kasko finans tatil only', () => {
  assert.equal(isDecisionCardsVertical('sigorta'), true);
  assert.equal(isDecisionCardsVertical('kasko'), true);
  assert.equal(isDecisionCardsVertical('finans'), true);
  assert.equal(isDecisionCardsVertical('tatil'), true);
  assert.equal(isDecisionCardsVertical('konut'), false);
  assert.equal(isDecisionCardsVertical('auto'), false);
});

test('isDecisionCategoryCardsEnabled respects override', () => {
  setDecisionCategoryCardsOverride(null);
  setDecisionCategoryCardsOverride(true);
  assert.equal(isDecisionCategoryCardsEnabled(), true);
  setDecisionCategoryCardsOverride(false);
  assert.equal(isDecisionCategoryCardsEnabled(), false);
  setDecisionCategoryCardsOverride(null);
});

test('renderDecisionCategoryCardHtml includes core decision card regions', () => {
  const results = buildSigortaResults(sampleState);
  const vm = adaptSigortaCard({
    scenario: results[0],
    engine: buildEngineResult(sampleState),
    state: sampleState
  });

  const html = renderDecisionCategoryCardHtml(vm, { isSelected: true });
  assert.match(html, /ib-decision-card__score-value/);
  assert.match(html, /ib-decision-card__level/);
  assert.match(html, /ib-decision-card__signals/);
  assert.match(html, /ib-decision-card__ai-summary/);
  assert.match(html, /ib-decision-card__pros/);
  assert.match(html, /ib-decision-card__cautions/);
  assert.match(html, /ib-decision-card-select/);
  assert.match(html, /ib-decision-card-secondary/);
  assert.match(html, new RegExp(`data-decision-score="${vm.decisionScore}"`));
  assert.match(html, /is-selected/);
});

test('renderDecisionCategoryCardsGridHtml renders list wrapper', () => {
  const results = buildSigortaResults(sampleState);
  const engine = buildEngineResult(sampleState);
  const viewModels = results.map((scenario) => adaptSigortaCard({ scenario, engine, state: sampleState }));
  const html = renderDecisionCategoryCardsGridHtml(viewModels, { selectedId: results[0].id });
  assert.match(html, /ib-decision-category-cards/);
  assert.equal((html.match(/class="ib-decision-category-card /g) || []).length, 3);
});

test('resolveRecommendationLevelLabel maps known levels', () => {
  assert.equal(resolveRecommendationLevelLabel('proceed'), 'İlerlenebilir');
  assert.equal(resolveRecommendationLevelLabel('avoid'), 'Şu an önerilmez');
});
