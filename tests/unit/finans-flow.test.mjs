import test from 'node:test';
import assert from 'node:assert/strict';

const { getFinansOptions, resetFieldsOnPurposeChange, getFinansStepMeta } = await import(
  '../../js/finans/finans-flow.js'
);

test('konut purpose gets longer term options than tatil', () => {
  const konutTerms = getFinansOptions('term', 'konut').map((o) => o.value);
  const tatilTerms = getFinansOptions('term', 'tatil').map((o) => o.value);
  assert.ok(konutTerms.includes('60'));
  assert.ok(!tatilTerms.includes('60'));
});

test('resetFieldsOnPurposeChange clears incompatible amount band', () => {
  const state = { purpose: 'konut', amount_range: '2m', term_months: '60' };
  resetFieldsOnPurposeChange(state, 'konut', 'tatil');
  assert.equal(state.amount_range, '');
  assert.equal(state.term_months, '');
});

test('getFinansStepMeta overrides amount title for arac', () => {
  const meta = getFinansStepMeta('arac', { id: 'amount' });
  assert.match(meta.title, /Taşıt/i);
});
