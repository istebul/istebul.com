import test from 'node:test';
import assert from 'node:assert/strict';

const {
  VERTICAL_CONTINUE_CATEGORY_LABELS,
  resolveVerticalContinueHandoff
} = await import('../../js/ui/assistant-ui.js');

test('resolveVerticalContinueHandoff returns model for supported categories', () => {
  const handoff = resolveVerticalContinueHandoff('arac', {
    budget: '900000',
    usage: 'city',
    fuel: 'hybrid',
    body: 'sedan'
  });

  assert.ok(handoff);
  assert.equal(handoff.sectionTitle, 'Tüm kriterlerinizle detaylı analiz');
  assert.equal(handoff.ctaLabel, 'Tam analize devam et');
  assert.equal(handoff.categoryLabel, VERTICAL_CONTINUE_CATEGORY_LABELS.arac);
  assert.match(handoff.href, /^\/auto\/?/);
});

test('resolveVerticalContinueHandoff maps all category labels', () => {
  assert.equal(VERTICAL_CONTINUE_CATEGORY_LABELS.arac, 'Araba Karar Analizi');
  assert.equal(VERTICAL_CONTINUE_CATEGORY_LABELS.ev, 'Konut Karar Analizi');
  assert.equal(VERTICAL_CONTINUE_CATEGORY_LABELS.finansman, 'Finansman Karar Analizi');
  assert.equal(VERTICAL_CONTINUE_CATEGORY_LABELS.sigorta, 'Sigorta Karar Analizi');
  assert.equal(VERTICAL_CONTINUE_CATEGORY_LABELS.kasko, 'Kasko Karar Analizi');
  assert.equal(VERTICAL_CONTINUE_CATEGORY_LABELS.tatil, 'Tatil Karar Analizi');
});

test('resolveVerticalContinueHandoff hides when href is unavailable', () => {
  assert.equal(resolveVerticalContinueHandoff('unknown-category', {}), null);
  assert.equal(resolveVerticalContinueHandoff('arac', {}), null);
});
