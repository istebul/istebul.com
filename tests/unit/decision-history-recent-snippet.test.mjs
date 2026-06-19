import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildRecentDecisionHistorySnippetModel,
    renderRecentDecisionHistorySnippetHtml,
    selectRecentDecisionHistoryEntries,
    RECENT_DECISION_HISTORY_MAX
} from '../../js/ui/decision-history-recent-snippet.js';

const history = Array.from({ length: 5 }, (_, index) => ({
    id: 'decision-' + index,
    categoryId: 'arac',
    categoryName: 'Araç',
    createdAt: '2026-06-0' + (index + 1) + 'T10:00:00.000Z',
    score: 70 + index,
    riskLevel: 'Düşük risk',
    yearlyCost: 200000 + index * 1000,
    topPick: {
        name: 'Seçenek ' + index,
        score: 70 + index,
        yearlyCost: 200000 + index * 1000,
        riskLevel: 'Düşük risk'
    }
}));

const legacyHistory = [{
    id: 'legacy-1',
    categoryId: 'ev',
    categoryName: 'Konut',
    createdAt: '2026-01-01T00:00:00.000Z',
    summary: 'Eski kayıt özeti',
    topPick: {
        name: 'Eski konut',
        score: 75,
        yearlyCost: 120000
    }
}];

test('selectRecentDecisionHistoryEntries returns at most 3 records', () => {
    const selected = selectRecentDecisionHistoryEntries(history, RECENT_DECISION_HISTORY_MAX);
    assert.equal(selected.length, 3);
    assert.equal(selected[0].id, 'decision-0');
});

test('buildRecentDecisionHistorySnippetModel returns null for empty history', () => {
    assert.equal(buildRecentDecisionHistorySnippetModel([]), null);
});

test('buildRecentDecisionHistorySnippetModel includes decision signals for canonical and legacy entries', () => {
    const model = buildRecentDecisionHistorySnippetModel([history[0], ...legacyHistory]);
    assert.ok(model);
    assert.equal(model.title, 'Son kararlarınız');
    assert.equal(model.ctaHref, '/gecmis/');
    assert.equal(model.items.length, 2);
    assert.match(model.items[0].fit, /70\/100/);
    assert.equal(model.items[1].title, 'Eski konut');
    assert.equal(model.items[1].risk, '—');
});

test('renderRecentDecisionHistorySnippetHtml renders CTA and signal labels', () => {
    const html = renderRecentDecisionHistorySnippetHtml(
        buildRecentDecisionHistorySnippetModel(history),
        (value) => String(value ?? ''),
        () => '8 Haz 2026'
    );

    assert.match(html, /data-decision-history-recent-snippet/);
    assert.match(html, /Son kararlarınız/);
    assert.match(html, /Tüm karar geçmişini gör/);
    assert.match(html, /href="\/gecmis\/"/);
    assert.match(html, /Uygunluk/);
    assert.match(html, /Risk/);
    assert.match(html, /TCO/);
});

test('renderRecentDecisionHistorySnippetHtml returns empty string without model', () => {
    assert.equal(renderRecentDecisionHistorySnippetHtml(null, (v) => v), '');
});
