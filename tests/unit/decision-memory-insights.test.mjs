import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildDecisionMemoryInsightsModel,
    renderDecisionMemoryInsightsHtml,
    selectDecisionMemoryInsightEntries,
    DECISION_MEMORY_INSIGHTS_SOFT_STATE,
    DECISION_MEMORY_INSIGHTS_MAX
} from '../../js/ui/decision-memory-insights.js';
import { DECISION_HISTORY_SCHEMA_VERSION } from '../../js/ui/decision-history-entry.js';

const schemaV1Entries = [
    {
        id: 'mem-1',
        schemaVersion: DECISION_HISTORY_SCHEMA_VERSION,
        categoryId: 'auto',
        categoryName: 'Araba',
        originalCategoryId: 'arac',
        createdAt: '2026-06-08T12:00:00.000Z',
        score: 88,
        riskLevel: 'Düşük risk',
        decisionProfile: 'Dengeli araç profili',
        profileTags: ['budget-fit'],
        topPick: { name: 'Toyota Corolla Hybrid', score: 88, riskLevel: 'Düşük risk' }
    },
    {
        id: 'mem-2',
        schemaVersion: DECISION_HISTORY_SCHEMA_VERSION,
        categoryId: 'auto',
        categoryName: 'Araba',
        originalCategoryId: 'arac',
        createdAt: '2026-06-07T12:00:00.000Z',
        score: 82,
        riskLevel: 'Orta risk',
        decisionProfile: 'Dengeli araç profili',
        profileTags: ['low-cost'],
        topPick: { name: 'Honda Civic', score: 82, riskLevel: 'Orta risk' }
    },
    {
        id: 'mem-3',
        schemaVersion: DECISION_HISTORY_SCHEMA_VERSION,
        categoryId: 'konut',
        categoryName: 'Konut',
        originalCategoryId: 'ev',
        createdAt: '2026-06-06T12:00:00.000Z',
        score: 76,
        riskLevel: 'Orta risk',
        decisionProfile: 'Konut yatırım odaklı',
        topPick: { name: 'Kadıköy daire', score: 76, riskLevel: 'Orta risk' }
    }
];

const legacyEntries = [
    {
        categoryId: 'arac',
        categoryName: 'Araç',
        createdAt: '2026-01-15T10:00:00.000Z',
        recommendations: [{
            name: 'Toyota Corolla',
            score: 82,
            riskLevel: 'Orta risk'
        }],
        insight: { headline: 'Dengeli araç profili öne çıkıyor.' }
    },
    {
        categoryId: 'ev',
        categoryName: 'Ev',
        createdAt: '2026-01-14T10:00:00.000Z',
        topPick: { name: 'Kadıköy daire', score: 76, riskLevel: 'Orta risk' },
        decisionProfile: 'Konut yatırım odaklı'
    }
];

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

test('selectDecisionMemoryInsightEntries normalizes and caps at 12 records', () => {
    const entries = Array.from({ length: 15 }, (_, index) => ({
        categoryId: 'arac',
        categoryName: 'Araç',
        createdAt: '2026-06-0' + ((index % 9) + 1) + 'T12:00:00.000Z',
        topPick: { name: 'Kayıt ' + index, score: 70 + index, riskLevel: 'Orta risk' }
    }));

    const selected = selectDecisionMemoryInsightEntries(entries);
    assert.equal(selected.length, DECISION_MEMORY_INSIGHTS_MAX);
    assert.equal(selected[0].categoryId, 'auto');
});

test('buildDecisionMemoryInsightsModel aggregates schemaVersion=1 entries', () => {
    const model = buildDecisionMemoryInsightsModel(schemaV1Entries);

    assert.equal(model.softState, null);
    assert.equal(model.entryCount, 3);
    assert.ok(model.insights.length >= 4);

    const topCategory = model.insights.find((item) => item.key === 'top-category');
    assert.ok(topCategory);
    assert.match(topCategory.value, /Araba \(2 karar\)/);

    const risk = model.insights.find((item) => item.key === 'risk-tendency');
    assert.ok(risk);
    assert.match(risk.value, /Orta risk \(2\/3\)/);

    const average = model.insights.find((item) => item.key === 'average-fit');
    assert.ok(average);
    assert.equal(average.value, '82/100');

    const profile = model.insights.find((item) => item.key === 'top-profile');
    assert.ok(profile);
    assert.equal(profile.value, 'Dengeli araç profili');
});

test('buildDecisionMemoryInsightsModel works with legacy normalized entries', () => {
    const model = buildDecisionMemoryInsightsModel(legacyEntries);

    assert.equal(model.softState, null);
    assert.equal(model.entryCount, 2);

    const topCategory = model.insights.find((item) => item.key === 'top-category');
    assert.ok(topCategory);
    assert.match(topCategory.value, /Araba|Konut/);
});

test('buildDecisionMemoryInsightsModel ignores broken and null entries', () => {
    const model = buildDecisionMemoryInsightsModel([
        null,
        { categoryId: 'arac' },
        schemaV1Entries[0],
        schemaV1Entries[1]
    ]);

    assert.equal(model.entryCount, 2);
    assert.equal(model.softState, null);
});

test('buildDecisionMemoryInsightsModel shows soft state when data is insufficient', () => {
    const empty = buildDecisionMemoryInsightsModel([]);
    assert.equal(empty.softState, DECISION_MEMORY_INSIGHTS_SOFT_STATE);
    assert.deepEqual(empty.insights, []);

    const single = buildDecisionMemoryInsightsModel([schemaV1Entries[0]]);
    assert.equal(single.softState, DECISION_MEMORY_INSIGHTS_SOFT_STATE);
});

test('buildDecisionMemoryInsightsModel does not write to localStorage', () => {
    const storage = createTrackingStorage();
    const previous = globalThis.localStorage;
    globalThis.localStorage = storage;

    try {
        buildDecisionMemoryInsightsModel(schemaV1Entries);
        assert.equal(storage.writeCount, 0);
    } finally {
        globalThis.localStorage = previous;
    }
});

test('renderDecisionMemoryInsightsHtml renders insights panel and soft state', () => {
    const model = buildDecisionMemoryInsightsModel(schemaV1Entries);
    const html = renderDecisionMemoryInsightsHtml(model, escapeHtml);

    assert.match(html, /data-decision-memory-insights/);
    assert.match(html, /Karar hafızası içgörüleri/);
    assert.match(html, /data-memory-insight="top-category"/);
    assert.match(html, /Ortalama uygunluk skoru/);

    const softHtml = renderDecisionMemoryInsightsHtml(
        buildDecisionMemoryInsightsModel([]),
        escapeHtml
    );
    assert.match(softHtml, /data-memory-insights-soft/);
    assert.match(softHtml, /Henüz anlamlı içgörü oluşturmak için yeterli karar geçmişi yok/);
});

function createTrackingStorage() {
    let writeCount = 0;
    return {
        writeCount: 0,
        getItem() {
            return null;
        },
        setItem() {
            writeCount += 1;
            this.writeCount = writeCount;
        },
        removeItem() {
            writeCount += 1;
            this.writeCount = writeCount;
        }
    };
}
