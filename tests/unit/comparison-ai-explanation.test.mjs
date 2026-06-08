import test from 'node:test';
import assert from 'node:assert/strict';

import { buildComparisonDecisionSummary } from '../../js/ui/comparison-decision-summary.js';
import {
    buildDeterministicComparisonExplanation,
    buildComparisonExplanationPrompt,
    containsPrescriptiveDecisionPhrase,
    mergeComparisonExplanation,
    parseComparisonExplanation,
    renderComparisonAiExplanationHtml,
    sanitizeComparisonExplanationText
} from '../../js/ui/comparison-ai-explanation.js';

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
    }
];

test('buildDeterministicComparisonExplanation references TCO, risk and uyum signals', () => {
    const summary = buildComparisonDecisionSummary(sampleItems);
    const explanation = buildDeterministicComparisonExplanation(summary, sampleItems);

    assert.ok(explanation);
    assert.match(explanation.tco_explanation, /TCO/i);
    assert.match(explanation.risk_explanation, /risk/i);
    assert.match(explanation.fit_explanation, /uyum/i);
    assert.match(explanation.synthesis, /skor/i);
    assert.match(explanation.synthesis, /Seçenek B/);
});

test('deterministic explanation avoids prescriptive decision language', () => {
    const summary = buildComparisonDecisionSummary(sampleItems);
    const explanation = buildDeterministicComparisonExplanation(summary, sampleItems);
    const combined = Object.values(explanation).join(' ');

    assert.equal(containsPrescriptiveDecisionPhrase(combined), false);
    assert.ok(!/bunu seçmelisiniz|en doğru karar/i.test(combined));
});

test('parseComparisonExplanation rejects prescriptive AI output', () => {
    const raw = JSON.stringify({
        tco_explanation: 'Bunu seçmelisiniz çünkü en düşük TCO.',
        risk_explanation: 'Risk düşük.',
        fit_explanation: 'Uyum yüksek.',
        balanced_explanation: 'Dengeli.',
        synthesis: 'En doğru karar budur.',
        disclaimer: 'Destek amaçlıdır.'
    });

    assert.equal(parseComparisonExplanation(raw), null);
});

test('parseComparisonExplanation accepts safe JSON explanation', () => {
    const raw = JSON.stringify({
        tco_explanation: 'Seçenek B TCO sinyalinde öne çıkar.',
        risk_explanation: 'Risk profili düşük bantta okunur.',
        fit_explanation: 'Uygunluk skoru en yüksek seçenek budur.',
        balanced_explanation: 'Çoklu sinyal dengesi görülür.',
        synthesis: 'Mevcut skor, TCO ve risk sinyalleri birlikte okunmalıdır.',
        disclaimer: 'Nihai karar kullanıcıya aittir.'
    });

    const parsed = parseComparisonExplanation(raw);
    assert.ok(parsed);
    assert.match(parsed.synthesis, /skor/i);
});

test('mergeComparisonExplanation keeps deterministic fallback fields', () => {
    const summary = buildComparisonDecisionSummary(sampleItems);
    const deterministic = buildDeterministicComparisonExplanation(summary, sampleItems);
    const ai = {
        ...deterministic,
        synthesis: 'AI sentez: skor ve TCO sinyalleri açıklanır.'
    };

    const merged = mergeComparisonExplanation(ai, deterministic);
    assert.equal(merged.source, 'ai');
    assert.match(merged.data.synthesis, /AI sentez/i);
    assert.ok(merged.data.tco_explanation);
});

test('renderComparisonAiExplanationHtml exposes commentary root and title', () => {
    const summary = buildComparisonDecisionSummary(sampleItems);
    const explanation = buildDeterministicComparisonExplanation(summary, sampleItems);
    const html = renderComparisonAiExplanationHtml(explanation, { source: 'rules' });

    assert.match(html, /data-comparison-ai-commentary/);
    assert.match(html, /AI destekli karar yorumu/);
    assert.match(html, /mevcut skor, TCO ve risk sinyallerini açıklar/i);
});

test('sanitizeComparisonExplanationText strips banned prescriptive phrases', () => {
    const cleaned = sanitizeComparisonExplanationText('Bunu seçmelisiniz; en doğru karar budur.');
    assert.equal(containsPrescriptiveDecisionPhrase(cleaned), false);
});

test('buildComparisonExplanationPrompt includes summary highlights only', () => {
    const summary = buildComparisonDecisionSummary(sampleItems);
    const prompt = buildComparisonExplanationPrompt(summary, sampleItems);

    assert.match(prompt, /lowest_tco/);
    assert.match(prompt, /highest_fit/);
    assert.match(prompt, /YASAK/);
    assert.match(prompt, /yeni skor, TCO, risk veya uygunluk üretmek/i);
});
