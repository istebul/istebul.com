import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildDecisionMemoryInsightsModel
} from '../../js/ui/decision-memory-insights.js';
import { DECISION_HISTORY_SCHEMA_VERSION } from '../../js/ui/decision-history-entry.js';
import {
    buildDecisionMemoryContextModel,
    buildDecisionMemoryContextSummary,
    renderDecisionMemoryContextHtml,
    shouldRenderDecisionMemoryContext,
    DECISION_MEMORY_CONTEXT_DESCRIPTION,
    DECISION_MEMORY_CONTEXT_TITLE
} from '../../js/ui/decision-memory-context.js';

const twoEntries = [
    {
        id: 'ctx-1',
        schemaVersion: DECISION_HISTORY_SCHEMA_VERSION,
        categoryId: 'auto',
        categoryName: 'Araba',
        createdAt: '2026-06-08T12:00:00.000Z',
        score: 88,
        riskLevel: 'Düşük risk',
        decisionProfile: 'Dengeli araç profili',
        topPick: { name: 'Toyota Corolla Hybrid', score: 88, riskLevel: 'Düşük risk' }
    },
    {
        id: 'ctx-2',
        schemaVersion: DECISION_HISTORY_SCHEMA_VERSION,
        categoryId: 'auto',
        categoryName: 'Araba',
        createdAt: '2026-06-07T12:00:00.000Z',
        score: 82,
        riskLevel: 'Düşük risk',
        decisionProfile: 'Dengeli araç profili',
        topPick: { name: 'Honda Civic', score: 82, riskLevel: 'Düşük risk' }
    }
];

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

test('shouldRenderDecisionMemoryContext hides when fewer than 2 records', () => {
    const empty = buildDecisionMemoryInsightsModel([]);
    const single = buildDecisionMemoryInsightsModel([twoEntries[0]]);

    assert.equal(shouldRenderDecisionMemoryContext(empty), false);
    assert.equal(shouldRenderDecisionMemoryContext(single), false);
    assert.equal(buildDecisionMemoryContextModel([]), null);
    assert.equal(buildDecisionMemoryContextModel([twoEntries[0]]), null);
    assert.equal(renderDecisionMemoryContextHtml(null, escapeHtml), '');
});

test('buildDecisionMemoryContextModel exposes category, risk, and profile signals', () => {
    const model = buildDecisionMemoryContextModel(twoEntries);

    assert.ok(model);
    assert.equal(model.title, DECISION_MEMORY_CONTEXT_TITLE);
    assert.equal(model.description, DECISION_MEMORY_CONTEXT_DESCRIPTION);
    assert.match(model.summary, /düşük risk profili daha sık görülüyor/i);

    const keys = model.signals.map((item) => item.key);
    assert.ok(keys.includes('top-category'));
    assert.ok(keys.includes('risk-tendency'));
    assert.ok(keys.includes('top-profile'));
    assert.equal(keys.includes('average-fit'), false);
});

test('buildDecisionMemoryContextSummary prefers dominant risk tendency wording', () => {
    const insightsModel = buildDecisionMemoryInsightsModel(twoEntries);
    const summary = buildDecisionMemoryContextSummary(insightsModel);

    assert.match(summary, /Geçmiş kararlarınızda düşük risk profili daha sık görülüyor\./i);
});

test('renderDecisionMemoryContextHtml renders context panel', () => {
    const model = buildDecisionMemoryContextModel(twoEntries);
    const html = renderDecisionMemoryContextHtml(model, escapeHtml);

    assert.match(html, /data-decision-memory-context/);
    assert.match(html, /Karar hafızasından bağlam/);
    assert.match(html, /data-memory-context="top-category"/);
    assert.match(html, /data-memory-context-summary/);
});

test('buildDecisionMemoryContextModel does not write to localStorage', () => {
    const storage = createTrackingStorage();
    const previous = globalThis.localStorage;
    globalThis.localStorage = storage;

    try {
        buildDecisionMemoryContextModel(twoEntries);
        assert.equal(storage.writeCount, 0);
    } finally {
        globalThis.localStorage = previous;
    }
});

test('buildDecisionMemoryContextModel does not mutate history input', () => {
    const history = structuredClone(twoEntries);
    const before = JSON.stringify(history);

    buildDecisionMemoryContextModel(history);

    assert.equal(JSON.stringify(history), before);
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
