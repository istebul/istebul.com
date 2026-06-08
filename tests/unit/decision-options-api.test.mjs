import test from 'node:test';
import assert from 'node:assert/strict';

const {
  UI_TO_AI_CATEGORY,
  AI_TO_UI_CATEGORY,
  toAiCategory,
  toUiCategory,
  normalizeAiListingToOption,
  filterDecisionOptions
} = await import('../../js/core/decision-options-api.js');

test('toAiCategory maps SPA categories to ai_listings ids', () => {
  assert.equal(toAiCategory('arac'), 'vehicle');
  assert.equal(toAiCategory('ev'), 'housing');
  assert.equal(toAiCategory('tatil'), 'vacation');
});

test('toUiCategory maps ai_listings ids to SPA categories', () => {
  assert.equal(toUiCategory('vehicle'), 'arac');
  assert.equal(toUiCategory('housing'), 'ev');
});

test('normalizeAiListingToOption marks ai_listings source and external url', () => {
  const option = normalizeAiListingToOption({
    id: 'abc',
    category: 'vehicle',
    title: 'Test',
    source_url: 'https://example.com/listing',
    attributes: { vehicleBrand: 'Toyota' },
    latest_analysis: { ai_score: 82, risk_score: 20, pros: ['Düşük km'] }
  });

  assert.equal(option.category, 'arac');
  assert.equal(option.external_url, 'https://example.com/listing');
  assert.equal(option.metadata.source, 'ai_listings');
  assert.equal(option.metadata.ai_score, 82);
});

test('filterDecisionOptions applies search and category filters', () => {
  const rows = [
    normalizeAiListingToOption({ id: '1', category: 'vehicle', title: 'Toyota Corolla', price: 500000 }),
    normalizeAiListingToOption({ id: '2', category: 'housing', title: 'Kadıköy daire', price: 8000000 })
  ];

  const vehicleOnly = filterDecisionOptions(rows, { category: 'arac' });
  assert.equal(vehicleOnly.length, 1);
  assert.equal(vehicleOnly[0].title, 'Toyota Corolla');

  const search = filterDecisionOptions(rows, { search: 'kadıköy' });
  assert.equal(search.length, 1);
});

test('UI_TO_AI_CATEGORY and AI_TO_UI_CATEGORY are frozen maps', () => {
  assert.ok(Object.isFrozen(UI_TO_AI_CATEGORY));
  assert.ok(Object.isFrozen(AI_TO_UI_CATEGORY));
});
