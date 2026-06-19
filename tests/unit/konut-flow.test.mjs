import test from 'node:test';
import assert from 'node:assert/strict';

const {
  getKonutFlow,
  resetKonutFieldsOnPurposeChange,
  validateKonutStep,
  validateKonutAllSteps,
  applyKonutFinancingDefaults
} = await import('../../js/konut/konut-flow.js');

test('kiralama flow omits villa and does not require financing', () => {
  const flow = getKonutFlow('Kiralamak istiyorum');
  assert.ok(!flow.homeTypes.includes('Villa'));
  assert.equal(flow.requireFinancing, false);
  assert.match(flow.budgetTitle, /Kira/i);
});

test('yatirim flow prioritizes yield risks', () => {
  const flow = getKonutFlow('Yatırım amaçlı düşünüyorum');
  assert.ok(flow.riskPrefs[0].includes('Kira getirisi'));
});

test('resetKonutFieldsOnPurposeChange drops incompatible home type', () => {
  const state = { purchasePurpose: 'Satın almak istiyorum', homeType: 'Villa', riskPreferences: [] };
  resetKonutFieldsOnPurposeChange(state, 'Satın almak istiyorum', 'Kiralamak istiyorum');
  assert.equal(state.homeType, '');
});

test('validateKonutAllSteps passes demo rental profile without financing pick', () => {
  const state = {
    purchasePurpose: 'Kiralamak istiyorum',
    totalBudget: 25_000,
    monthlyIncome: 50_000,
    monthlyCapacity: 20_000,
    useFinancing: '',
    city: 'Ankara',
    homeType: 'Daire'
  };
  assert.equal(validateKonutAllSteps(state), null);
  assert.equal(state.useFinancing, 'hayir');
});

test('validateKonutStep requires financing choice for purchase intent', () => {
  const state = {
    purchasePurpose: 'Satın almak istiyorum',
    totalBudget: 3_000_000,
    monthlyIncome: 80_000,
    monthlyCapacity: 45_000,
    useFinancing: '',
    city: 'Ankara',
    homeType: 'Daire'
  };
  assert.match(validateKonutStep(state, 1), /Kredi kullanım/i);
  state.useFinancing = 'hayir';
  assert.equal(validateKonutStep(state, 1), '');
});

test('applyKonutFinancingDefaults leaves purchase flow unchanged when unset', () => {
  const state = { purchasePurpose: 'Satın almak istiyorum', useFinancing: '' };
  applyKonutFinancingDefaults(state, getKonutFlow('Satın almak istiyorum'));
  assert.equal(state.useFinancing, '');
});
