import test from 'node:test';
import assert from 'node:assert/strict';

const { getKaskoOptions, resetKaskoFieldsOnUsageChange } = await import('../../js/kasko/kasko-flow.js');

test('ticari usage limits vehicle category to ticari', () => {
  const opts = getKaskoOptions('vehicle_category', { usage_type: 'ticari' }).map((o) => o.value);
  assert.deepEqual(opts, ['ticari_arac']);
});

test('ozel usage excludes ticari commercial category', () => {
  const opts = getKaskoOptions('vehicle_category', { usage_type: 'ozel' }).map((o) => o.value);
  assert.ok(opts.includes('otomobil'));
  assert.ok(!opts.includes('ticari_arac'));
});

test('resetKaskoFieldsOnUsageChange clears mini coverage for ticari', () => {
  const state = { usage_type: 'ozel', vehicle_category: 'otomobil', coverage_level: 'mini' };
  state.usage_type = 'ticari';
  resetKaskoFieldsOnUsageChange(state, 'ozel', 'ticari');
  assert.equal(state.coverage_level, '');
});
