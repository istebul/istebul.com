import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDecisionResultSummary } from '../../js/ui/decision-result-summary.js';
import {
    buildDecisionResultShareText,
    containsMarketplaceSharePhrase,
    containsPrescriptiveSharePhrase,
    renderDecisionResultShareHtml,
    shouldRenderDecisionResultShare
} from '../../js/ui/decision-result-share.js';

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

test('buildDecisionResultShareText includes fit, risk, TCO and profile signals', () => {
    const summary = buildDecisionResultSummary(sampleResult);
    const text = buildDecisionResultShareText(summary);

    assert.ok(text);
    assert.match(text, /isteBul karar özeti:/);
    assert.match(text, /Uygunluk: 88\/100/);
    assert.match(text, /Risk: Düşük risk/);
    assert.match(text, /TCO:/);
    assert.match(text, /Karar profili:/);
    assert.match(text, /deterministik skor, risk ve maliyet sinyallerine dayanır/i);
});

test('buildDecisionResultShareText returns empty string for missing summary', () => {
    assert.equal(buildDecisionResultShareText(null), '');
    assert.equal(buildDecisionResultShareText({}), '');
    assert.equal(shouldRenderDecisionResultShare(null), false);
});

test('share text avoids prescriptive decision language', () => {
    const summary = buildDecisionResultSummary(sampleResult);
    const text = buildDecisionResultShareText(summary);

    assert.equal(containsPrescriptiveSharePhrase(text), false);
    assert.ok(!/bunu seçmelisiniz|en doğru karar|sizin için en iyi karar/i.test(text));
});

test('share text avoids marketplace language', () => {
    const summary = buildDecisionResultSummary(sampleResult);
    const text = buildDecisionResultShareText(summary);

    assert.equal(containsMarketplaceSharePhrase(text), false);
    assert.ok(!/ilan paylaş|liste paylaş|fiyat teklifi gönder/i.test(text));
});

test('renderDecisionResultShareHtml exposes share card title and copy action', () => {
    const html = renderDecisionResultShareHtml((value) => String(value));

    assert.match(html, /data-decision-result-share/);
    assert.match(html, /Karar özetini paylaş/);
    assert.match(html, /Karar özetini kopyala/);
    assert.match(html, /Uygunluk, risk ve maliyet sinyallerinden oluşan karar özetinizi paylaşabilirsiniz/i);
    assert.ok(!/ilan paylaş|liste paylaş|fiyat teklifi gönder/i.test(html));
});
