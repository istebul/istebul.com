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
  assert.equal(normalizeTatilGoal('luxury'), 'luks-resort');
});

test('bootstrapTatilFromAssistantQuery applies goal budget and travelers', async () => {
  const { bootstrapTatilFromAssistantQuery } = await import(
    '../../js/features/assistant/assistant-vertical-bootstrap.js'
  );
  const state = { vacation_goal: '', budget_range: '', travelers_count: '', people_type: '' };
  bootstrapTatilFromAssistantQuery(
    state,
    new URLSearchParams('goal=culture&budget=95000&travelers=couple&priority=premium')
  );
  assert.equal(state.vacation_goal, 'kultur');
  assert.equal(state.budget_range, 'manuel');
  assert.equal(state.budget_total, 95000);
  assert.equal(state.people_type, 'cift');
  assert.equal(state.travelers_count, '2');
  assert.equal(state.comfort_expectation, 'luks');
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

test('bootstrapAutoFromAssistantQuery applies usage budget fuel and body', async () => {
  const { bootstrapAutoFromAssistantQuery } = await import(
    '../../js/features/assistant/assistant-vertical-bootstrap.js'
  );
  const state = { budget: '', usage: '', fuel: '', body: '' };
  bootstrapAutoFromAssistantQuery(
    state,
    new URLSearchParams('budget=1800000&usage=longRoad&fuel=hybrid&body=suv')
  );
  assert.equal(state.usage, 'long');
  assert.equal(state.budget, 'custom');
  assert.equal(state.budget_custom, '1800000');
  assert.equal(state.fuel, 'hybrid');
  assert.equal(state.body, 'suv');
});

test('buildVerticalContinueHref carries finansman query params with purpose-aware term', () => {
  const href = buildVerticalContinueHref('finansman', {
    purpose: 'konut',
    budget: '1200000',
    term: '60'
  });
  assert.match(href, /purpose=konut/);
  assert.match(href, /amount=1200000/);
  assert.match(href, /term=60/);
});
