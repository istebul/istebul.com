import test from 'node:test';
import assert from 'node:assert/strict';

const {
  getVacationFlowSteps,
  getOptionsForStep,
  resetFieldsOnGoalChange,
  applyGoalFlowDefaults,
  shouldShowChildrenFields
} = await import('../../js/tatil/tatil-flow.js');

test('balayi flow inserts type step and limits people options', () => {
  const steps = getVacationFlowSteps('balayi');
  const ids = steps.map((s) => s.id);
  assert.ok(ids.includes('type'));
  assert.equal(ids.indexOf('type'), ids.indexOf('goal') + 1);

  const people = getOptionsForStep('people', 'balayi').map((o) => o.value);
  assert.deepEqual(people, ['cift']);
  assert.ok(!people.includes('cocuklu-aile'));
  assert.ok(!people.includes('aile'));
});

test('cocuklu-aile goal keeps family people options only', () => {
  const people = getOptionsForStep('people', 'cocuklu-aile').map((o) => o.value);
  assert.deepEqual(people, ['cocuklu-aile', 'aile']);
  assert.ok(shouldShowChildrenFields({ vacation_goal: 'cocuklu-aile', people_type: '' }));
});

test('resetFieldsOnGoalChange clears incompatible people and applies balayi defaults', () => {
  const state = {
    vacation_goal: 'deniz',
    people_type: 'cocuklu-aile',
    travelers_count: '4',
    children_count: '2',
    vacation_type: 'cocuk-dostu',
    expectations: ['Çocuk dostu', 'Gece hayatı'],
    transport_preference: 'otobus',
    comfort_expectation: 'temel'
  };

  resetFieldsOnGoalChange(state, 'deniz', 'balayi');

  assert.equal(state.people_type, 'cift');
  assert.equal(state.travelers_count, '2');
  assert.equal(state.children_count, '');
  assert.ok(['villa-butik', 'luks', 'deniz-resort'].includes(state.vacation_type));
  assert.ok(!state.expectations.includes('Gece hayatı'));
  assert.equal(state.transport_preference, '');
  assert.equal(state.comfort_expectation, 'premium');
});

test('applyGoalFlowDefaults sets cocuklu-aile profile', () => {
  const state = { vacation_goal: 'cocuklu-aile', people_type: '', travelers_count: '' };
  applyGoalFlowDefaults(state, 'cocuklu-aile');
  assert.equal(state.people_type, 'cocuklu-aile');
});
