import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifySupportIntent,
  routeSupportRequest
} from '../../js/features/customer/support-router.js';

describe('support-router', () => {
  it('classifies billing intent', () => {
    const out = classifySupportIntent('faturamı güncellemek istiyorum ödeme');
    assert.equal(out.intent, 'billing');
    assert.ok(out.confidence > 0.4);
  });

  it('routes billing to deflection with articles', () => {
    const articles = [
      {
        id: 'billing-portal',
        category: 'billing',
        keywords: ['fatura'],
        question: 'Fatura?',
        answer: 'Stripe panel'
      }
    ];
    const route = routeSupportRequest({
      message: 'ödeme hatası',
      articles
    });
    assert.equal(route.intent, 'billing');
    assert.ok(route.actions.some((a) => a.href?.includes('subscription')));
  });
});
