import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildDecisionHistoryEntry,
    mergeDecisionHistoryEntry,
    DECISION_HISTORY_SCHEMA_VERSION,
    resolveDecisionHistorySource
} from '../../js/ui/decision-history-entry.js';

const fullResult = {
    id: 'decision-123',
    categoryId: 'arac',
    categoryName: 'Araç',
    createdAt: '2026-06-08T12:00:00.000Z',
    summary: 'Toyota Corolla en güçlü eşleşme.',
    rawAnswers: { province: 'İstanbul', budget: '1850000' },
    answers: [
        { id: 'province', label: 'İl', value: 'İstanbul' },
        { id: 'budget', label: 'Bütçe', value: '1.850.000 ₺' }
    ],
    dataHealth: {
        confidenceLabel: 'Orta band',
        confidenceScore: 72
    },
    insight: {
        headline: 'Toyota Corolla, araç kararınızda en dengeli seçenek olarak öne çıkıyor.'
    },
    recommendations: [
        {
            name: 'Toyota Corolla Hybrid',
            score: 88,
            price: 1850000,
            yearlyCost: 240000,
            riskLevel: 'Düşük risk',
            scoreNote: 'Şehir içi hibrit kullanımına uygun.',
            decisionTags: ['Güçlü eşleşme', 'Düşük yan maliyet'],
            calculationTable: { totalLabel: 'Toplam dönemsel maliyet' },
            financeComparisons: [{ monthlyPayment: 18500 }]
        }
    ]
};

test('buildDecisionHistoryEntry produces canonical fields from full result', () => {
    const entry = buildDecisionHistoryEntry(fullResult);

    assert.ok(entry);
    assert.equal(entry.schemaVersion, DECISION_HISTORY_SCHEMA_VERSION);
    assert.equal(entry.id, 'decision-123');
    assert.equal(entry.categoryId, 'auto');
    assert.equal(entry.categoryName, 'Araba');
    assert.equal(entry.originalCategoryId, 'arac');
    assert.equal(entry.score, 88);
    assert.equal(entry.riskLevel, 'Düşük risk');
    assert.equal(entry.yearlyCost, 240000);
    assert.match(entry.decisionProfile, /Toyota Corolla/i);
    assert.deepEqual(entry.profileTags, ['Güçlü eşleşme', 'Düşük yan maliyet']);
    assert.equal(entry.confidenceLabel, 'Orta band');
    assert.equal(entry.tcoLabel, 'Toplam dönemsel maliyet');
    assert.equal(entry.source, 'auto');
    assert.equal(entry.topPick.riskLevel, 'Düşük risk');
    assert.ok(entry.summary);
    assert.ok(Array.isArray(entry.recommendations));
    assert.ok(entry.resultSummary);
    assert.equal(entry.resultSummary.fit.value, '88/100');
    assert.equal(entry.resultSummary.risk.value, 'Düşük risk');
    assert.match(entry.resultSummary.profile.value, /Toyota Corolla/i);
});

test('buildDecisionHistoryEntry persists Faz 2C resultSummary snapshot', () => {
    const entry = buildDecisionHistoryEntry(fullResult);

    assert.ok(entry?.resultSummary);
    assert.equal(entry.resultSummary.tco.label, 'TCO özeti');
    assert.equal(entry.resultSummary.risk.label, 'Risk özeti');
    assert.match(entry.resultSummary.tco.detail, /Toplam dönemsel maliyet/i);
});

test('buildDecisionHistoryEntry produces canonical entry from auto-like minimal payload', () => {
    const entry = buildDecisionHistoryEntry({
        id: 'auto-123',
        categoryId: 'auto',
        categoryName: 'Araç Karar Analizi',
        source: 'auto',
        createdAt: '2026-06-11T12:00:00.000Z',
        summary: 'Toyota Corolla en güçlü eşleşme.',
        insight: { headline: 'Şehir içi hibrit kullanımına uygun profil.' },
        dataHealth: {
            confidenceLabel: 'Orta veri güven bandı — teklif doğrulaması önerilir',
            confidenceScore: 68,
            tier: 'medium'
        },
        rawAnswers: { budget: '1850000' },
        answers: [],
        recommendations: [{
            name: 'Toyota Corolla Hybrid',
            score: 88,
            price: 1850000,
            yearlyCost: 240000,
            riskLevel: 'Orta veri güven bandı — teklif doğrulaması önerilir',
            decisionTags: ['Güçlü eşleşme', 'Hibrit'],
            scoreNote: 'Şehir içi hibrit kullanımına uygun.',
            calculationTable: { totalLabel: '12 aylık TCO' },
            financeComparisons: [{ monthlyPayment: 18500 }]
        }]
    });

    assert.ok(entry);
    assert.equal(entry.schemaVersion, DECISION_HISTORY_SCHEMA_VERSION);
    assert.equal(entry.source, 'auto');
    assert.equal(entry.riskLevel, 'Orta veri güven bandı — teklif doğrulaması önerilir');
    assert.equal(entry.confidenceLabel, 'Orta veri güven bandı — teklif doğrulaması önerilir');
    assert.equal(entry.tcoLabel, '12 aylık TCO');
    assert.deepEqual(entry.profileTags, ['Güçlü eşleşme', 'Hibrit']);
    assert.ok(entry.resultSummary);
    assert.equal(entry.resultSummary.fit.value, '88/100');
});

test('buildDecisionHistoryEntry returns null without primary recommendation', () => {
    assert.equal(buildDecisionHistoryEntry(null), null);
    assert.equal(buildDecisionHistoryEntry({ recommendations: [] }), null);
});

test('buildDecisionHistoryEntry uses safe fallbacks for missing risk, TCO and profile tags', () => {
    const entry = buildDecisionHistoryEntry({
        id: 'decision-min',
        categoryId: 'ev',
        categoryName: 'Konut',
        createdAt: '2026-06-08T12:00:00.000Z',
        answers: [],
        rawAnswers: {},
        recommendations: [
            {
                name: 'Örnek konut',
                score: 70,
                price: 5000000
            }
        ]
    });

    assert.ok(entry);
    assert.equal(entry.categoryId, 'konut');
    assert.equal(entry.categoryName, 'Konut');
    assert.equal(entry.originalCategoryId, 'ev');
    assert.equal(entry.riskLevel, null);
    assert.equal(entry.yearlyCost, null);
    assert.deepEqual(entry.profileTags, []);
    assert.equal(entry.confidenceLabel, null);
    assert.equal(entry.topPick.riskLevel, null);
});

test('resolveDecisionHistorySource maps category and explicit source', () => {
    assert.equal(resolveDecisionHistorySource('auto'), 'auto');
    assert.equal(resolveDecisionHistorySource('konut'), 'konut');
    assert.equal(resolveDecisionHistorySource('arac'), 'auto');
    assert.equal(resolveDecisionHistorySource('ev'), 'konut');
    assert.equal(resolveDecisionHistorySource('arac', 'bridge'), 'bridge');
});

test('mergeDecisionHistoryEntry preserves old records and enforces max 12', () => {
    const legacy = {
        id: 'legacy-1',
        categoryId: 'arac',
        categoryName: 'Araç',
        createdAt: '2026-01-01T00:00:00.000Z',
        topPick: { name: 'Eski kayıt', score: 75, price: 1, yearlyCost: 2 }
    };
    const history = Array.from({ length: 12 }, (_, index) => ({
        id: `old-${index}`,
        categoryId: 'arac',
        topPick: { name: `Kayıt ${index}`, score: index, price: 0, yearlyCost: 0 }
    }));

    const entry = buildDecisionHistoryEntry(fullResult);
    const merged = mergeDecisionHistoryEntry([legacy, ...history], entry, 12);

    assert.equal(merged.length, 12);
    assert.equal(merged[0].id, 'decision-123');
    assert.equal(merged[0].schemaVersion, 1);
    assert.ok(merged.some((item) => item.id === 'legacy-1'));
    assert.ok(!merged.some((item) => item.id === 'old-11'));
});

test('mergeDecisionHistoryEntry replaces duplicate id', () => {
    const existing = buildDecisionHistoryEntry(fullResult);
    const updated = buildDecisionHistoryEntry({
        ...fullResult,
        score: 90,
        recommendations: [{ ...fullResult.recommendations[0], score: 90 }]
    });

    const merged = mergeDecisionHistoryEntry([existing], updated, 12);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].score, 90);
});
