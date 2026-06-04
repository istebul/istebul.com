import test from 'node:test';
import assert from 'node:assert/strict';

const {
  normalizeAutoUsage,
  normalizeTatilGoal,
  buildAssistantInsightInput,
  buildVerticalContinueHref
} = await import('../../js/features/assistant/assistant-category-bridge.js');

test('normalizeAutoUsage maps assistant enums to vertical', () => {
  assert.equal(normalizeAutoUsage('longRoad'), 'long');
  assert.equal(normalizeAutoUsage('prestige'), 'business');
  assert.equal(normalizeAutoUsage('city'), 'city');
});

test('normalizeTatilGoal maps vacation types', () => {
  assert.equal(normalizeTatilGoal('familyResort'), 'deniz');
  assert.equal(normalizeTatilGoal('culture'), 'kultur');
});

test('buildAssistantInsightInput enriches finansman costs', () => {
  const input = buildAssistantInsightInput(
    'finansman',
    { name: 'Finansman' },
    {
      name: 'Dengeli vade',
      score: 82,
      price: 500000,
      financeComparisons: [{ monthlyPayment: 18500, term: 36 }]
    },
    { purpose: 'arac', term: '36', budget: '500000' },
    []
  );
  assert.equal(input.vertical, 'finansman');
  assert.equal(input.costs.monthlyPayment, 18500);
  assert.equal(input.answers.term_months, '36');
});

test('buildVerticalContinueHref carries finansman query params', () => {
  const href = buildVerticalContinueHref('finansman', {
    purpose: 'konut',
    budget: '1200000',
    term: '120'
  });
  assert.match(href, /purpose=konut/);
  assert.match(href, /amount=1200000/);
  assert.match(href, /term=120/);
});
