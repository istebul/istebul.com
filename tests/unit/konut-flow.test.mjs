import test from 'node:test';
import assert from 'node:assert/strict';

const { getKonutFlow, resetKonutFieldsOnPurposeChange } = await import('../../js/konut/konut-flow.js');

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
