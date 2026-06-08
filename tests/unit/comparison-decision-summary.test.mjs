import test from 'node:test';
import assert from 'node:assert/strict';

const {
    buildComparisonDecisionSummary,
    renderComparisonDecisionSummaryHtml,
    resolveComparisonRiskRank,
    resolveComparisonTcoValue
} = await import('../../js/ui/comparison-decision-summary.js');

const sampleItems = [
    {
        id: 'a',
        title: 'Seçenek A',
        score: 78,
        periodicCost: 120000,
        price: 500000,
        riskLevel: 'Kontrollü risk'
    },
    {
        id: 'b',
        title: 'Seçenek B',
        score: 88,
        periodicCost: 95000,
        price: 450000,
        riskLevel: 'Düşük risk'
    },
    {
        id: 'c',
        title: 'Seçenek C',
        score: 82,
        periodicCost: 110000,
        price: 480000,
        riskLevel: 'Dikkat gerektirir'
    }
];

test('resolveComparisonRiskRank orders known Turkish risk labels', () => {
    assert.ok(resolveComparisonRiskRank('Düşük risk') < resolveComparisonRiskRank('Kontrollü risk'));
    assert.ok(resolveComparisonRiskRank('Kontrollü risk') < resolveComparisonRiskRank('Dikkat gerektirir'));
});

test('resolveComparisonTcoValue prefers periodicCost over price', () => {
    assert.equal(resolveComparisonTcoValue({ periodicCost: 120000, price: 500000 }), 120000);
    assert.equal(resolveComparisonTcoValue({ periodicCost: 0, price: 500000 }), 500000);
});

test('buildComparisonDecisionSummary picks four deterministic highlights', () => {
    const summary = buildComparisonDecisionSummary(sampleItems);
    assert.ok(summary);

    assert.equal(summary.lowestTco.item?.title, 'Seçenek B');
    assert.equal(summary.lowestRisk.item?.title, 'Seçenek B');
    assert.equal(summary.highestFit.item?.title, 'Seçenek B');
    assert.equal(summary.mostBalanced.item?.title, 'Seçenek B');
});

test('most balanced option uses score then risk then TCO ordering', () => {
    const items = [
        { id: '1', title: 'Alpha', score: 85, periodicCost: 100000, riskLevel: 'Kontrollü risk' },
        { id: '2', title: 'Beta', score: 85, periodicCost: 90000, riskLevel: 'Düşük risk' },
        { id: '3', title: 'Gamma', score: 84, periodicCost: 80000, riskLevel: 'Düşük risk' }
    ];

    const summary = buildComparisonDecisionSummary(items);
    assert.equal(summary.mostBalanced.item?.title, 'Beta');
});

test('renderComparisonDecisionSummaryHtml exposes summary labels and data attributes', () => {
    const summary = buildComparisonDecisionSummary(sampleItems);
    const html = renderComparisonDecisionSummaryHtml(summary, (value) => String(value));

    assert.match(html, /data-comparison-decision-summary/);
    assert.match(html, /En düşük TCO/);
    assert.match(html, /En düşük risk profili/);
    assert.match(html, /En yüksek ihtiyaç uyumu/);
    assert.match(html, /En dengeli seçenek/);
    assert.match(html, /data-summary-field="lowest-tco"/);
    assert.match(html, /data-summary-field="most-balanced"/);
});

test('buildComparisonDecisionSummary returns null for empty input', () => {
    assert.equal(buildComparisonDecisionSummary([]), null);
    assert.equal(buildComparisonDecisionSummary(null), null);
});
