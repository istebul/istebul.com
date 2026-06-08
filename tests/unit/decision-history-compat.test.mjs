import test from 'node:test';
import assert from 'node:assert/strict';

import {
    normalizeDecisionHistoryEntry,
    normalizeDecisionHistoryList,
    isDecisionHistorySchemaV1,
    findDecisionHistoryEntryByActionId,
    DECISION_HISTORY_LEGACY_CREATED_AT_FALLBACK
} from '../../js/ui/decision-history-compat.js';
import { DECISION_HISTORY_SCHEMA_VERSION } from '../../js/ui/decision-history-entry.js';
import {
    buildComparisonItemFromHistoryEntry,
    canAddHistoryEntryToComparison
} from '../../js/ui/decision-history-comparison.js';

const schemaV1Entry = {
    id: 'decision-v1',
    schemaVersion: DECISION_HISTORY_SCHEMA_VERSION,
    categoryId: 'auto',
    categoryName: 'Araba',
    createdAt: '2026-06-08T12:00:00.000Z',
    score: 88,
    riskLevel: 'Düşük risk',
    yearlyCost: 240000,
    decisionProfile: 'Toyota Corolla dengeli profil',
    topPick: {
        name: 'Toyota Corolla Hybrid',
        score: 88,
        price: 1850000,
        yearlyCost: 240000,
        riskLevel: 'Düşük risk'
    }
};

const legacyEntry = {
    categoryId: 'arac',
    categoryName: 'Araç',
    createdAt: '2026-01-15T10:00:00.000Z',
    summary: 'Toyota Corolla en güçlü eşleşme.',
    insight: { headline: 'Dengeli araç profili öne çıkıyor.' },
    recommendations: [{
        name: 'Toyota Corolla',
        score: 82,
        price: 1750000,
        yearlyCost: 210000,
        riskLevel: 'Orta risk'
    }]
};

function createComparisonItemFromRecommendation(recommendation, result) {
    return {
        signature: 'recommendation:' + result.categoryId + ':' + recommendation.name,
        categoryId: result.categoryId,
        categoryName: result.categoryName,
        title: recommendation.name,
        score: Number(recommendation.score || 0),
        periodicCost: Number(recommendation.yearlyCost || 0),
        riskLevel: recommendation.riskLevel || 'Kontrol gerekli'
    };
}

test('isDecisionHistorySchemaV1 detects canonical schema version', () => {
    assert.equal(isDecisionHistorySchemaV1(schemaV1Entry), true);
    assert.equal(isDecisionHistorySchemaV1(legacyEntry), false);
    assert.equal(isDecisionHistorySchemaV1(null), false);
});

test('normalizeDecisionHistoryEntry preserves schemaVersion=1 entry as-is', () => {
    const normalized = normalizeDecisionHistoryEntry(schemaV1Entry);

    assert.ok(normalized);
    assert.notEqual(normalized, schemaV1Entry);
    assert.deepEqual(normalized, schemaV1Entry);
    assert.equal(normalized.schemaVersion, DECISION_HISTORY_SCHEMA_VERSION);
    assert.equal(normalized.categoryId, 'auto');
});

test('normalizeDecisionHistoryEntry upgrades legacy entry to canonical read model', () => {
    const normalized = normalizeDecisionHistoryEntry(legacyEntry);

    assert.ok(normalized);
    assert.equal(normalized.id, 'legacy:arac:2026-01-15T10:00:00.000Z:Toyota Corolla');
    assert.equal(normalized.categoryId, 'auto');
    assert.equal(normalized.categoryName, 'Araba');
    assert.equal(normalized.originalCategoryId, 'arac');
    assert.equal(normalized.score, 82);
    assert.equal(normalized.riskLevel, 'Orta risk');
    assert.equal(normalized.yearlyCost, 210000);
    assert.equal(normalized.topPick.name, 'Toyota Corolla');
    assert.equal(normalized.decisionProfile, 'Dengeli araç profili öne çıkıyor.');
    assert.equal(normalized.source, 'auto');
    assert.equal(normalized.schemaVersion, undefined);
});

test('normalizeDecisionHistoryEntry fills safe fallbacks for missing score risk and TCO', () => {
    const normalized = normalizeDecisionHistoryEntry({
        id: 'legacy-minimal',
        categoryId: 'ev',
        categoryName: 'Ev',
        topPick: { name: 'Kadıköy daire', price: 5000000 }
    });

    assert.ok(normalized);
    assert.equal(normalized.categoryId, 'konut');
    assert.equal(normalized.categoryName, 'Konut');
    assert.equal(normalized.createdAt, DECISION_HISTORY_LEGACY_CREATED_AT_FALLBACK);
    assert.equal(normalized.score, null);
    assert.equal(normalized.riskLevel, null);
    assert.equal(normalized.yearlyCost, null);
    assert.equal(normalized.topPick.name, 'Kadıköy daire');
});

test('normalizeDecisionHistoryEntry drops broken and null entries', () => {
    assert.equal(normalizeDecisionHistoryEntry(null), null);
    assert.equal(normalizeDecisionHistoryEntry(undefined), null);
    assert.equal(normalizeDecisionHistoryEntry('bad'), null);
    assert.equal(normalizeDecisionHistoryEntry([]), null);
    assert.equal(normalizeDecisionHistoryEntry({ categoryId: 'arac' }), null);
});

test('normalizeDecisionHistoryList preserves ordering and filters invalid entries', () => {
    const ordered = normalizeDecisionHistoryList([
        schemaV1Entry,
        legacyEntry,
        null,
        { id: 'valid-legacy', categoryId: 'tatil', categoryName: 'Tatil', topPick: { name: 'Antalya otel' } }
    ]);

    assert.equal(ordered.length, 3);
    assert.equal(ordered[0].id, 'decision-v1');
    assert.equal(ordered[1].categoryId, 'auto');
    assert.equal(ordered[2].categoryId, 'tatil');
});

test('normalizeDecisionHistoryList does not enforce max length', () => {
    const entries = Array.from({ length: 15 }, (_, index) => ({
        id: 'legacy-' + index,
        categoryId: 'arac',
        topPick: { name: 'Kayıt ' + index, score: index }
    }));

    const normalized = normalizeDecisionHistoryList(entries);
    assert.equal(normalized.length, 15);
    assert.equal(normalized[0].id, 'legacy-0');
    assert.equal(normalized[14].id, 'legacy-14');
});

test('normalizeDecisionHistoryEntry works with category normalization aliases', () => {
    const normalized = normalizeDecisionHistoryEntry({
        id: 'legacy-home',
        categoryId: 'home',
        categoryName: 'Home',
        topPick: { name: 'Bostancı daire', score: 71, yearlyCost: 150000 }
    });

    assert.ok(normalized);
    assert.equal(normalized.categoryId, 'konut');
    assert.equal(normalized.categoryName, 'Konut');
});

test('findDecisionHistoryEntryByActionId resolves legacy entries by normalized id', () => {
    const found = findDecisionHistoryEntryByActionId([legacyEntry], 'legacy:arac:2026-01-15T10:00:00.000Z:Toyota Corolla');
    assert.equal(found, legacyEntry);
    assert.equal(findDecisionHistoryEntryByActionId([legacyEntry], 'missing-id'), null);
});

test('buildComparisonItemFromHistoryEntry works with normalized legacy entry', () => {
    const item = buildComparisonItemFromHistoryEntry(legacyEntry, createComparisonItemFromRecommendation);

    assert.ok(item);
    assert.equal(item.title, 'Toyota Corolla');
    assert.equal(item.categoryId, 'auto');
    assert.equal(item.categoryName, 'Araba');
    assert.equal(item.score, 82);
    assert.equal(item.riskLevel, 'Orta risk');
    assert.equal(item.periodicCost, 210000);
    assert.equal(canAddHistoryEntryToComparison(legacyEntry), true);
});
