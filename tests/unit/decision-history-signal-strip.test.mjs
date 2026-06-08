import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildDecisionHistorySignalStrip,
    renderDecisionHistorySignalStripHtml,
    DECISION_HISTORY_SIGNAL_PLACEHOLDER,
    DECISION_HISTORY_SIGNAL_FIELDS
} from '../../js/ui/decision-history-signal-strip.js';

const canonicalEntry = {
    id: 'decision-123',
    schemaVersion: 1,
    categoryId: 'arac',
    categoryName: 'Araç',
    score: 88,
    riskLevel: 'Düşük risk',
    yearlyCost: 240000,
    decisionProfile: 'Toyota Corolla, araç kararınızda en dengeli seçenek olarak öne çıkıyor.',
    topPick: {
        name: 'Toyota Corolla Hybrid',
        score: 88,
        yearlyCost: 240000,
        riskLevel: 'Düşük risk'
    }
};

const legacyEntry = {
    id: 'legacy-1',
    categoryId: 'arac',
    categoryName: 'Araç',
    summary: 'Toyota Corolla en güçlü eşleşme.',
    insight: {
        headline: 'Dengeli araç profili öne çıkıyor.'
    },
    topPick: {
        name: 'Toyota Corolla',
        score: 82,
        yearlyCost: 210000,
        riskLevel: 'Orta risk'
    }
};

test('buildDecisionHistorySignalStrip produces four canonical signals', () => {
    const signals = buildDecisionHistorySignalStrip(canonicalEntry);

    assert.ok(signals);
    assert.equal(signals.fit.value, '88/100');
    assert.equal(signals.risk.value, 'Düşük risk');
    assert.match(signals.tco.value, /240/);
    assert.match(signals.profile.value, /Toyota Corolla/i);
    assert.equal(DECISION_HISTORY_SIGNAL_FIELDS.length, 4);
});

test('buildDecisionHistorySignalStrip falls back to legacy topPick and insight fields', () => {
    const signals = buildDecisionHistorySignalStrip(legacyEntry);

    assert.ok(signals);
    assert.equal(signals.fit.value, '82/100');
    assert.equal(signals.risk.value, 'Orta risk');
    assert.match(signals.tco.value, /210/);
    assert.equal(signals.profile.value, 'Dengeli araç profili öne çıkıyor.');
});

test('buildDecisionHistorySignalStrip uses safe placeholders for missing fields', () => {
    const signals = buildDecisionHistorySignalStrip({
        id: 'sparse',
        categoryName: 'Tatil',
        topPick: { name: 'Antalya paketi', score: 65 }
    });

    assert.ok(signals);
    assert.equal(signals.fit.value, '65/100');
    assert.equal(signals.risk.value, DECISION_HISTORY_SIGNAL_PLACEHOLDER);
    assert.equal(signals.tco.value, DECISION_HISTORY_SIGNAL_PLACEHOLDER);
    assert.equal(signals.profile.value, 'Tatil');
});

test('renderDecisionHistorySignalStripHtml renders decision signal labels', () => {
    const html = renderDecisionHistorySignalStripHtml(
        buildDecisionHistorySignalStrip(canonicalEntry),
        (value) => String(value ?? '')
    );

    assert.match(html, /data-decision-history-signal-strip/);
    assert.match(html, /data-history-signal="history-fit"/);
    assert.match(html, /Uygunluk/);
    assert.match(html, /Risk/);
    assert.match(html, /TCO/);
    assert.match(html, /Profil/);
    assert.match(html, /88\/100/);
    assert.match(html, /Düşük risk/);
});

test('renderDecisionHistorySignalStripHtml returns empty string without signals', () => {
    assert.equal(renderDecisionHistorySignalStripHtml(null, (v) => v), '');
    assert.equal(renderDecisionHistorySignalStripHtml(buildDecisionHistorySignalStrip(null), (v) => v), '');
});
