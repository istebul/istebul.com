import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
    buildKonutDecisionHistoryPayload,
    KONUT_DECISION_HISTORY_MAX
} from '../../js/real-estate/konut-decision-history-payload.js';
import {
    buildDecisionHistoryEntry,
    DECISION_HISTORY_SCHEMA_VERSION
} from '../../js/ui/decision-history-entry.js';

const sampleState = {
    purchasePurpose: 'Satın almak istiyorum',
    city: 'İstanbul',
    district: 'Kadıköy',
    homeType: 'Daire'
};

const sampleMetrics = {
    score: 89,
    ownership: {
        monthlyPayment: 24850,
        realTotal: 5250000
    },
    risk: {
        label: 'Düşük-Orta'
    }
};

test('buildKonutDecisionHistoryPayload maps existing metrics and state without new calculations', () => {
    const payload = buildKonutDecisionHistoryPayload(sampleMetrics, 'Konut AI özeti', sampleState);

    assert.equal(payload.categoryId, 'konut');
    assert.equal(payload.source, 'konut');
    assert.equal(payload.recommendations[0].score, 89);
    assert.equal(payload.recommendations[0].yearlyCost, 5250000);
    assert.equal(payload.recommendations[0].riskLevel, 'Düşük-Orta');
    assert.match(payload.recommendations[0].name, /İstanbul \/ Kadıköy/);
});

test('konut payload produces canonical history entry with schemaVersion and riskLevel', () => {
    const payload = buildKonutDecisionHistoryPayload(sampleMetrics, 'Konut AI özeti', sampleState);
    const entry = buildDecisionHistoryEntry(payload, { source: 'konut' });

    assert.ok(entry);
    assert.equal(entry.schemaVersion, DECISION_HISTORY_SCHEMA_VERSION);
    assert.equal(entry.categoryId, 'konut');
    assert.equal(entry.categoryName, 'Konut');
    assert.equal(entry.riskLevel, 'Düşük-Orta');
    assert.equal(entry.score, 89);
    assert.equal(entry.yearlyCost, 5250000);
    assert.equal(entry.source, 'konut');
    assert.equal(entry.topPick.riskLevel, 'Düşük-Orta');
    assert.ok(entry.resultSummary);
});

test('konut decision history max remains 80', () => {
    assert.equal(KONUT_DECISION_HISTORY_MAX, 80);
});

test('real-estate-app uses canonical save path instead of legacy direct history write', async () => {
    const src = await readFile(new URL('../../js/real-estate/real-estate-app.js', import.meta.url), 'utf8');

    assert.match(src, /saveDecisionHistory/);
    assert.match(src, /buildKonutDecisionHistoryPayload/);
    assert.match(src, /buildDecisionHistoryEntry/);
    assert.match(src, /maxEntries:\s*KONUT_DECISION_HISTORY_MAX/);
    assert.doesNotMatch(src, /history\.unshift\(record\)/);
    assert.doesNotMatch(src, /history\.slice\(0,\s*80\)/);
});

test('app-bridge forwards saveDecisionHistory options', async () => {
    const src = await readFile(new URL('../../js/core/app-bridge.js', import.meta.url), 'utf8');

    assert.match(src, /saveDecisionHistory\(entry,\s*options\s*=\s*\{\}\)/);
    assert.match(src, /app\.saveDecisionHistory\(entry,\s*options\)/);
});
