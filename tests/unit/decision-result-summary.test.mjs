import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildDecisionResultSummary,
    renderDecisionResultSummaryHtml,
    shouldRenderDecisionResultSummary
} from '../../js/ui/decision-result-summary.js';

const sampleResult = {
    categoryId: 'arac',
    categoryName: 'Araç',
    summary: 'Araç kategorisinde en güçlü eşleşme Toyota Corolla.',
    answers: [
        { id: 'province', label: 'İl', value: 'İstanbul' },
        { id: 'usage', label: 'Kullanım', value: 'Şehir içi' }
    ],
    dataHealth: {
        confidenceLabel: 'Orta band'
    },
    insight: {
        headline: 'Toyota Corolla, araç kararınızda en dengeli seçenek olarak öne çıkıyor.'
    },
    recommendations: [
        {
            name: 'Toyota Corolla Hybrid',
            score: 88,
            scoreNote: 'Şehir içi hibrit kullanımına uygun.',
            yearlyCost: 240000,
            riskLevel: 'Düşük risk',
            decisionTags: ['Güçlü eşleşme', 'Düşük yan maliyet'],
            calculationTable: { totalLabel: 'Toplam dönemsel maliyet' }
        }
    ]
};

test('shouldRenderDecisionResultSummary is false without recommendations', () => {
    assert.equal(shouldRenderDecisionResultSummary(null), false);
    assert.equal(shouldRenderDecisionResultSummary({ recommendations: [] }), false);
    assert.equal(shouldRenderDecisionResultSummary(sampleResult), true);
});

test('buildDecisionResultSummary reads existing deterministic fields', () => {
    const summary = buildDecisionResultSummary(sampleResult);
    assert.ok(summary);

    assert.equal(summary.fit.value, '88/100');
    assert.match(summary.fit.detail, /Şehir içi hibrit/i);
    assert.equal(summary.risk.value, 'Düşük risk');
    assert.match(summary.risk.detail, /Orta band/i);
    assert.match(summary.tco.value, /₺|TL/);
    assert.equal(summary.tco.detail, 'Toplam dönemsel maliyet');
    assert.match(summary.profile.value, /Toyota Corolla/i);
    assert.match(summary.profile.detail, /Güçlü eşleşme/);
});

test('buildDecisionResultSummary returns null for empty result', () => {
    assert.equal(buildDecisionResultSummary({ recommendations: [] }), null);
});

test('renderDecisionResultSummaryHtml exposes four summary labels', () => {
    const summary = buildDecisionResultSummary(sampleResult);
    const html = renderDecisionResultSummaryHtml(summary, (value) => String(value));

    assert.match(html, /data-decision-result-summary/);
    assert.match(html, /Ön değerlendirme sonucu/);
    assert.match(html, /Ön değerlendirme sinyalleri tek bakışta/);
    assert.match(html, /Uygunluk özeti/);
    assert.match(html, /Risk özeti/);
    assert.match(html, /TCO özeti/);
    assert.match(html, /Karar profili özeti/);
    assert.match(html, /data-result-summary-field="fit-summary"/);
    assert.match(html, /data-result-summary-field="profile-summary"/);
});

test('renderDecisionResultSummaryHtml returns empty string for null summary', () => {
    assert.equal(renderDecisionResultSummaryHtml(null, (v) => v), '');
});
