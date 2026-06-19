import test from 'node:test';
import assert from 'node:assert/strict';

const {
  UPSELL_OFFERS,
  shouldShowUpsell,
  renderContextualUpsellCard,
  rememberUpsellClick,
  trackUpsellConversion
} = await import('../../js/features/monetization/upsell-engine.js');

test('UPSELL_OFFERS includes six contextual surfaces', () => {
  assert.equal(Object.keys(UPSELL_OFFERS).length, 6);
  assert.ok(UPSELL_OFFERS.advanced_ai_summary);
  assert.ok(UPSELL_OFFERS.premium_finance);
});

test('renderContextualUpsellCard returns markup when allowed', () => {
  const html = renderContextualUpsellCard('advanced_ai_summary', 'test_placement');
  if (html) {
    assert.match(html, /data-contextual-upsell/);
    assert.match(html, /Detaylı AI danışman özeti/);
  }
});

test('rememberUpsellClick stores attribution payload shape', () => {
  if (typeof sessionStorage === 'undefined') return;
  rememberUpsellClick('comparison_unlimited', 'unit_test');
  const raw = sessionStorage.getItem('istebul_upsell:last_click');
  assert.ok(raw);
  const parsed = JSON.parse(raw);
  assert.equal(parsed.offer_id, 'comparison_unlimited');
});
