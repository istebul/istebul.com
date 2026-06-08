import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDecisionResultSummary } from '../../js/ui/decision-result-summary.js';
import {
    buildDeterministicDecisionResultRationale,
    buildDecisionResultRationalePrompt,
    containsPrescriptiveRationalePhrase,
    mergeDecisionResultRationale,
    parseDecisionResultRationale,
    renderDecisionResultAiRationaleHtml,
    sanitizeDecisionResultRationaleText
} from '../../js/ui/decision-result-ai-rationale.js';

const sampleResult = {
    categoryId: 'arac',
    categoryName: 'Araç',
    summary: 'Araç kategorisinde en güçlü eşleşme Toyota Corolla.',
    answers: [
        { id: 'province', label: 'İl', value: 'İstanbul' },
        { id: 'usage', label: 'Kullanım', value: 'Şehir içi' }
    ],
    dataHealth: {
        confidenceLabel: 'Orta band'
    },
    insight: {
        headline: 'Toyota Corolla, araç kararınızda en dengeli seçenek olarak öne çıkıyor.'
    },
    recommendations: [
        {
            name: 'Toyota Corolla Hybrid',
            score: 88,
            scoreNote: 'Şehir içi hibrit kullanımına uygun.',
            yearlyCost: 240000,
            riskLevel: 'Düşük risk',
            decisionTags: ['Güçlü eşleşme', 'Düşük yan maliyet'],
            calculationTable: { totalLabel: 'Toplam dönemsel maliyet' }
        }
    ]
};

test('buildDeterministicDecisionResultRationale references fit, risk, TCO and profile signals', () => {
    const summary = buildDecisionResultSummary(sampleResult);
    const rationale = buildDeterministicDecisionResultRationale(summary);

    assert.ok(rationale);
    assert.match(rationale.fit_explanation, /uygunluk|Uygunluk/i);
    assert.match(rationale.risk_explanation, /risk/i);
    assert.match(rationale.tco_explanation, /TCO/i);
    assert.match(rationale.profile_explanation, /profil/i);
    assert.match(rationale.synthesis, /88\/100/);
    assert.match(rationale.synthesis, /Düşük risk/);
});

test('deterministic rationale avoids prescriptive decision language', () => {
    const summary = buildDecisionResultSummary(sampleResult);
    const rationale = buildDeterministicDecisionResultRationale(summary);
    const combined = Object.values(rationale).join(' ');

    assert.equal(containsPrescriptiveRationalePhrase(combined), false);
    assert.ok(!/bunu seçmelisiniz|en doğru karar|sizin için en iyi karar/i.test(combined));
});

test('parseDecisionResultRationale rejects prescriptive AI output', () => {
    const raw = JSON.stringify({
        fit_explanation: 'Uygunluk yüksek.',
        risk_explanation: 'Risk düşük.',
        tco_explanation: 'TCO kontrollü.',
        profile_explanation: 'Profil dengeli.',
        synthesis: 'Kesinlikle bunu alın; sizin için en iyi karar budur.',
        disclaimer: 'Destek amaçlıdır.'
    });

    assert.equal(parseDecisionResultRationale(raw), null);
});

test('parseDecisionResultRationale accepts safe JSON rationale', () => {
    const raw = JSON.stringify({
        fit_explanation: 'Uygunluk skoru 88/100 olarak okunur.',
        risk_explanation: 'Risk özeti düşük bantta görünür.',
        tco_explanation: 'TCO sinyali dönemsel maliyetten türetilir.',
        profile_explanation: 'Profil girdileri karar bağlamını özetler.',
        synthesis: 'Mevcut skor, risk, TCO ve uygunluk sinyalleri birlikte okunmalıdır.',
        disclaimer: 'Nihai karar kullanıcıya aittir.'
    });

    const parsed = parseDecisionResultRationale(raw);
    assert.ok(parsed);
    assert.match(parsed.synthesis, /skor/i);
});

test('mergeDecisionResultRationale keeps deterministic fallback fields', () => {
    const summary = buildDecisionResultSummary(sampleResult);
    const deterministic = buildDeterministicDecisionResultRationale(summary);
    const ai = {
        ...deterministic,
        synthesis: 'AI sentez: skor, risk ve TCO sinyalleri açıklanır.'
    };

    const merged = mergeDecisionResultRationale(ai, deterministic);
    assert.equal(merged.source, 'ai');
    assert.match(merged.data.synthesis, /AI sentez/i);
    assert.ok(merged.data.tco_explanation);
});

test('renderDecisionResultAiRationaleHtml exposes rationale root and title', () => {
    const summary = buildDecisionResultSummary(sampleResult);
    const rationale = buildDeterministicDecisionResultRationale(summary);
    const html = renderDecisionResultAiRationaleHtml(rationale, { source: 'rules' });

    assert.match(html, /data-decision-result-ai-rationale/);
    assert.match(html, /AI destekli karar gerekçesi/);
    assert.match(html, /mevcut skor, risk, TCO ve uygunluk sinyallerini açıklar/i);
});

test('sanitizeDecisionResultRationaleText strips banned prescriptive phrases', () => {
    const cleaned = sanitizeDecisionResultRationaleText('Bunu seçmelisiniz; tek doğru seçenek budur.');
    assert.equal(containsPrescriptiveRationalePhrase(cleaned), false);
});

test('buildDeterministicDecisionResultRationale returns null for missing summary', () => {
    assert.equal(buildDeterministicDecisionResultRationale(null), null);
});

test('buildDecisionResultRationalePrompt includes summary signals only', () => {
    const summary = buildDecisionResultSummary(sampleResult);
    const prompt = buildDecisionResultRationalePrompt(summary);

    assert.match(prompt, /signals/);
    assert.match(prompt, /fit/);
    assert.match(prompt, /YASAK/);
    assert.match(prompt, /yeni skor, TCO, risk veya uygunluk üretmek/i);
});
