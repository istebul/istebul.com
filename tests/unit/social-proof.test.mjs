import test from 'node:test';
import assert from 'node:assert/strict';

const { formatMetricLabel } = await import('../../js/runtime/social-proof.js');

test('formatMetricLabel passes through display strings', () => {
  assert.equal(formatMetricLabel('12.4K+'), '12.4K+');
  assert.equal(formatMetricLabel('Aktif'), 'Aktif');
  assert.equal(formatMetricLabel(null, '—'), '—');
});
