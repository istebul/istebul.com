import test from 'node:test';
import assert from 'node:assert/strict';

import {
  renderProductFeedbackHtml,
  parseProductFeedbackSurfaceFromUrl
} from '../../js/features/moat/product-feedback.js';
import {
  PRODUCT_FEEDBACK_EVENTS,
  deriveProductIntelligenceEvents,
  mapProductFeedbackToSignals,
  hasMinimumProductFeedback,
  normalizeProductFeedbackAnswers,
  productFeedbackCooldownKey
} from '../../js/features/moat/product-feedback-shared.js';

test('renderProductFeedbackHtml includes four question groups', () => {
  const html = renderProductFeedbackHtml();
  assert.match(html, /Bu öneri faydalı mı\?/);
  assert.match(html, /Sonunda ne yaptınız\?/);
  assert.match(html, /Araç satın aldınız mı\?/);
  assert.match(html, /Başka seçenek mi seçtiniz\?/);
  assert.match(html, /data-pf-expand/);
});

test('deriveProductIntelligenceEvents emits success and submitted', () => {
  const events = deriveProductIntelligenceEvents({
    useful_rating: 'yes',
    outcome_action: 'purchased'
  });
  assert.ok(events.includes(PRODUCT_FEEDBACK_EVENTS.SUBMITTED));
  assert.ok(events.includes(PRODUCT_FEEDBACK_EVENTS.RECOMMENDATION_SUCCESS));
});

test('deriveProductIntelligenceEvents emits rejected when not useful', () => {
  const events = deriveProductIntelligenceEvents({
    useful_rating: 'no',
    chose_alternative: true
  });
  assert.ok(events.includes(PRODUCT_FEEDBACK_EVENTS.RECOMMENDATION_REJECTED));
});

test('mapProductFeedbackToSignals maps purchase to lead_closed', () => {
  const signals = mapProductFeedbackToSignals({ outcome_action: 'purchased' });
  assert.ok(signals.some((s) => s.signal_type === 'lead_closed'));
});

test('hasMinimumProductFeedback requires at least one answer', () => {
  assert.equal(hasMinimumProductFeedback({}), false);
  assert.equal(hasMinimumProductFeedback({ useful_rating: 'yes' }), true);
});

test('normalizeProductFeedbackAnswers infers purchase from outcome', () => {
  const a = normalizeProductFeedbackAnswers({ outcome_action: 'purchased' });
  assert.equal(a.bought_vehicle, true);
});

test('parseProductFeedbackSurfaceFromUrl reads email param', () => {
  assert.equal(parseProductFeedbackSurfaceFromUrl('?product_feedback=email'), 'email');
  assert.equal(parseProductFeedbackSurfaceFromUrl('?feedback=1'), 'email');
});

test('productFeedbackCooldownKey scopes by session and surface', () => {
  const key = productFeedbackCooldownKey('abc', 'history');
  assert.match(key, /history/);
  assert.match(key, /abc/);
});
