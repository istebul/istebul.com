import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildComparisonItemFromHistoryEntry,
    canAddHistoryEntryToComparison,
    resolveHistoryPick
} from '../../js/ui/decision-history-comparison.js';

const canonicalEntry = {
    id: 'decision-123',
    schemaVersion: 1,
    categoryId: 'arac',
    categoryName: 'Araç',
    score: 88,
    riskLevel: 'Düşük risk',
    yearlyCost: 240000,
    decisionProfile: 'Toyota Corolla dengeli profil',
    summary: 'Toyota Corolla en güçlü eşleşme.',
    topPick: {
        name: 'Toyota Corolla Hybrid',
        score: 88,
        price: 1850000,
        yearlyCost: 240000,
        monthlyPayment: 18500,
        riskLevel: 'Düşük risk'
    }
};

const legacyEntry = {
    id: 'legacy-1',
    categoryId: 'arac',
    categoryName: 'Araç',
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

test('buildComparisonItemFromHistoryEntry works with canonical entry', () => {
    const item = buildComparisonItemFromHistoryEntry(canonicalEntry, createComparisonItemFromRecommendation);

    assert.ok(item);
    assert.equal(item.title, 'Toyota Corolla Hybrid');
    assert.equal(item.score, 88);
    assert.equal(item.riskLevel, 'Düşük risk');
    assert.equal(item.periodicCost, 240000);
    assert.equal(item.categoryId, 'auto');
    assert.equal(item.categoryName, 'Araba');
    assert.equal(item.signature, 'recommendation:auto:Toyota Corolla Hybrid');
});

test('buildComparisonItemFromHistoryEntry falls back to legacy recommendations[0]', () => {
    const item = buildComparisonItemFromHistoryEntry(legacyEntry, createComparisonItemFromRecommendation);

    assert.ok(item);
    assert.equal(item.title, 'Toyota Corolla');
    assert.equal(item.score, 82);
    assert.equal(item.riskLevel, 'Orta risk');
    assert.equal(item.periodicCost, 210000);
});

test('buildComparisonItemFromHistoryEntry returns null without topPick or recommendation name', () => {
    assert.equal(buildComparisonItemFromHistoryEntry(null, createComparisonItemFromRecommendation), null);
    assert.equal(buildComparisonItemFromHistoryEntry({ id: 'x', categoryId: 'arac' }, createComparisonItemFromRecommendation), null);
    assert.equal(canAddHistoryEntryToComparison({ id: 'x', categoryId: 'arac' }), false);
});

test('resolveHistoryPick prefers canonical fields over legacy topPick', () => {
    const pick = resolveHistoryPick(canonicalEntry);

    assert.ok(pick);
    assert.equal(pick.recommendation.name, 'Toyota Corolla Hybrid');
    assert.equal(pick.recommendation.score, 88);
    assert.equal(pick.result.categoryId, 'auto');
    assert.equal(pick.result.categoryName, 'Araba');
});
