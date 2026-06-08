import test from 'node:test';
import assert from 'node:assert/strict';

import {
    normalizeDecisionCategory,
    normalizeHistoryEntryCategory,
    resolveDecisionCategoryLabel,
    resolveDecisionCategorySource,
    resolveAssistantCategoryFromHistoryEntry,
    shouldRedirectHistoryEntryToAutoVertical,
    DECISION_CATEGORY_UNKNOWN_ID,
    DECISION_CATEGORY_UNKNOWN_LABEL
} from '../../js/ui/decision-history-category.js';
import { buildDecisionHistoryEntry } from '../../js/ui/decision-history-entry.js';
import { buildComparisonItemFromHistoryEntry } from '../../js/ui/decision-history-comparison.js';

test('normalizeDecisionCategory maps auto group aliases to auto', () => {
    for (const id of ['auto', 'arac', 'araba', 'vehicle']) {
        const normalized = normalizeDecisionCategory({ categoryId: id });
        assert.equal(normalized.categoryId, 'auto', id);
        assert.equal(normalized.label, 'Araba', id);
    }
});

test('normalizeDecisionCategory maps konut group aliases to konut', () => {
    for (const id of ['konut', 'ev', 'home', 'housing']) {
        const normalized = normalizeDecisionCategory({ categoryId: id });
        assert.equal(normalized.categoryId, 'konut', id);
        assert.equal(normalized.label, 'Konut', id);
    }
});

test('normalizeDecisionCategory preserves supported standalone categories', () => {
    const cases = [
        ['tatil', 'Tatil'],
        ['finansman', 'Finansman'],
        ['sigorta', 'Sigorta'],
        ['kasko', 'Kasko']
    ];

    for (const [id, label] of cases) {
        const normalized = normalizeDecisionCategory({ categoryId: id });
        assert.equal(normalized.categoryId, id);
        assert.equal(normalized.label, label);
    }
});

test('normalizeDecisionCategory falls back to unknown category', () => {
    const normalized = normalizeDecisionCategory({ categoryId: 'mystery', categoryName: 'Foo' });
    assert.equal(normalized.categoryId, DECISION_CATEGORY_UNKNOWN_ID);
    assert.equal(normalized.label, DECISION_CATEGORY_UNKNOWN_LABEL);
});

test('resolveDecisionCategoryLabel and source use normalized ids', () => {
    assert.equal(resolveDecisionCategoryLabel('arac'), 'Araba');
    assert.equal(resolveDecisionCategoryLabel('ev'), 'Konut');
    assert.equal(resolveDecisionCategorySource('arac'), 'auto');
    assert.equal(resolveDecisionCategorySource('ev'), 'konut');
    assert.equal(resolveDecisionCategorySource('tatil'), 'assistant');
});

test('buildDecisionHistoryEntry stores normalized category with originals', () => {
    const entry = buildDecisionHistoryEntry({
        id: 'decision-arac',
        categoryId: 'arac',
        categoryName: 'Araç',
        createdAt: '2026-06-08T12:00:00.000Z',
        recommendations: [{ name: 'Toyota Corolla', score: 80, price: 1, yearlyCost: 2 }]
    });

    assert.ok(entry);
    assert.equal(entry.categoryId, 'auto');
    assert.equal(entry.categoryName, 'Araba');
    assert.equal(entry.originalCategoryId, 'arac');
    assert.equal(entry.originalCategoryName, 'Araç');
    assert.equal(entry.source, 'auto');
});

test('normalizeHistoryEntryCategory normalizes legacy history entries at read time', () => {
    const legacy = normalizeHistoryEntryCategory({
        categoryId: 'ev',
        categoryName: 'Konut analizi'
    });

    assert.equal(legacy.categoryId, 'konut');
    assert.equal(legacy.categoryName, 'Konut');
    assert.equal(legacy.isKonut, true);
});

test('buildComparisonItemFromHistoryEntry uses normalized comparison category', () => {
    const item = buildComparisonItemFromHistoryEntry(
        {
            id: 'legacy-ev',
            categoryId: 'ev',
            categoryName: 'Ev',
            topPick: { name: 'Kadıköy daire', score: 76, yearlyCost: 180000 }
        },
        (recommendation, result) => ({
            categoryId: result.categoryId,
            categoryName: result.categoryName,
            title: recommendation.name
        })
    );

    assert.ok(item);
    assert.equal(item.categoryId, 'konut');
    assert.equal(item.categoryName, 'Konut');
    assert.equal(item.title, 'Kadıköy daire');
});

test('resolveAssistantCategoryFromHistoryEntry maps canonical and legacy ids to assistant keys', () => {
    assert.equal(resolveAssistantCategoryFromHistoryEntry({
        categoryId: 'auto',
        originalCategoryId: 'arac'
    }), 'arac');
    assert.equal(resolveAssistantCategoryFromHistoryEntry({
        categoryId: 'konut',
        originalCategoryId: 'ev'
    }), 'ev');
    assert.equal(resolveAssistantCategoryFromHistoryEntry({
        categoryId: 'arac',
        categoryName: 'Araç'
    }), 'arac');
    assert.equal(resolveAssistantCategoryFromHistoryEntry({
        categoryId: 'ev',
        categoryName: 'Ev'
    }), 'ev');
    assert.equal(resolveAssistantCategoryFromHistoryEntry({
        categoryId: 'tatil',
        categoryName: 'Tatil'
    }), 'tatil');
});

test('shouldRedirectHistoryEntryToAutoVertical distinguishes Auto vertical from assistant arac', () => {
    assert.equal(shouldRedirectHistoryEntryToAutoVertical({
        id: 'auto-123',
        categoryId: 'auto',
        categoryName: 'Araç Karar Analizi'
    }), true);
    assert.equal(shouldRedirectHistoryEntryToAutoVertical({
        categoryId: 'auto',
        originalCategoryId: 'arac',
        categoryName: 'Araba'
    }), false);
    assert.equal(shouldRedirectHistoryEntryToAutoVertical({
        categoryId: 'arac',
        categoryName: 'Araç'
    }), false);
});
