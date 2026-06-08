import test from 'node:test';
import assert from 'node:assert/strict';

import {
    COMPARISON_DECISION_CTA,
    renderComparisonDecisionCtaHtml,
    shouldRenderComparisonDecisionCta
} from '../../js/ui/comparison-decision-cta.js';

test('shouldRenderComparisonDecisionCta is true only when items exist', () => {
    assert.equal(shouldRenderComparisonDecisionCta([]), false);
    assert.equal(shouldRenderComparisonDecisionCta(null), false);
    assert.equal(shouldRenderComparisonDecisionCta([{ id: '1' }]), true);
});

test('renderComparisonDecisionCtaHtml exposes decision journey CTAs', () => {
    const html = renderComparisonDecisionCtaHtml();

    assert.match(html, /data-comparison-decision-cta/);
    assert.match(html, /data-comparison-decision-cta-primary/);
    assert.match(html, /data-comparison-decision-cta-secondary/);
    assert.match(html, new RegExp(COMPARISON_DECISION_CTA.primary.label));
    assert.match(html, new RegExp(COMPARISON_DECISION_CTA.secondary.label));
    assert.match(html, /href="\/karar-asistani\/"/);
    assert.match(html, /href="\/secenekler\/"/);
    assert.match(html, /btn-primary/);
    assert.match(html, /btn-outline/);
});

test('CTA labels use decision language not marketplace wording', () => {
    const html = renderComparisonDecisionCtaHtml();

    assert.ok(!/ilanlara dön|listeye git/i.test(html));
    assert.match(html, /Karar analizine devam et/);
    assert.match(html, /Daha fazla seçenek incele/);
});
