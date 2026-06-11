import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDecisionHistoryResultSummaryHtml } from '../../js/ui/decision-result-summary.js';

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

const summary = {
    fit: {
        label: 'Uyum',
        value: '88/100',
        detail: 'Profil ile güçlü eşleşme'
    },
    risk: {
        label: 'Risk',
        value: 'Düşük risk',
        detail: 'Yan maliyetler dengeli'
    },
    tco: {
        label: 'TCO özeti',
        value: '240.000 TL/yıl',
        detail: 'Toplam dönemsel maliyet kontrol altında'
    },
    profile: {
        label: 'Profil',
        value: 'Toyota Corolla Hybrid',
        detail: 'Şehir içi hibrit kullanımına uygun'
    }
};

test('renderDecisionHistoryResultSummaryHtml returns empty string without summary', () => {
    assert.equal(renderDecisionHistoryResultSummaryHtml(null, escapeHtml), '');
    assert.equal(renderDecisionHistoryResultSummaryHtml(undefined, escapeHtml), '');
    assert.equal(renderDecisionHistoryResultSummaryHtml({}, escapeHtml), '');
});

test('renderDecisionHistoryResultSummaryHtml renders history result summary wrapper', () => {
    const html = renderDecisionHistoryResultSummaryHtml(summary, escapeHtml);

    assert.match(html, /data-decision-history-result-summary/);
    assert.match(html, /Kayıtlı karar sinyalleri/);
});

test('renderDecisionHistoryResultSummaryHtml renders fit risk tco and profile fields', () => {
    const html = renderDecisionHistoryResultSummaryHtml(summary, escapeHtml);

    assert.match(html, /88\/100/);
    assert.match(html, /Düşük risk/);
    assert.match(html, /240\.000 TL\/yıl/);
    assert.match(html, /Toyota Corolla Hybrid/);
    assert.match(html, /Toplam dönemsel maliyet kontrol altında/);
});

test('renderDecisionHistoryResultSummaryHtml escapes unsafe html', () => {
    const html = renderDecisionHistoryResultSummaryHtml({
        fit: {
            label: '<script>label</script>',
            value: '<img src=x onerror=alert(1)>',
            detail: 'A&B'
        },
        risk: {
            label: 'Risk',
            value: 'Düşük',
            detail: 'Güvenli'
        },
        tco: {
            label: 'TCO',
            value: '100',
            detail: 'Detay'
        },
        profile: {
            label: 'Profil',
            value: 'Araç',
            detail: 'Profil detayı'
        }
    }, escapeHtml);

    assert.doesNotMatch(html, /<script>/);
    assert.doesNotMatch(html, /<img/);
    assert.match(html, /&lt;script&gt;label&lt;\/script&gt;/);
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
    assert.match(html, /A&amp;B/);
});
