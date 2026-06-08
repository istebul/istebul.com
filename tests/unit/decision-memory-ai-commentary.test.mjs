import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildDecisionMemoryInsightsModel,
    DECISION_MEMORY_INSIGHTS_SOFT_STATE
} from '../../js/ui/decision-memory-insights.js';
import { DECISION_HISTORY_SCHEMA_VERSION } from '../../js/ui/decision-history-entry.js';
import {
    buildDeterministicDecisionMemoryCommentary,
    buildDecisionMemoryCommentaryPrompt,
    containsPrescriptiveMemoryCommentaryPhrase,
    mergeDecisionMemoryCommentary,
    parseDecisionMemoryCommentary,
    renderDecisionMemoryAiCommentaryHtml,
    sanitizeDecisionMemoryCommentaryText,
    shouldRenderDecisionMemoryAiCommentary,
    fetchDecisionMemoryAiCommentary
} from '../../js/ui/decision-memory-ai-commentary.js';

const schemaV1Entries = [
    {
        id: 'mem-1',
        schemaVersion: DECISION_HISTORY_SCHEMA_VERSION,
        categoryId: 'auto',
        categoryName: 'Araba',
        originalCategoryId: 'arac',
        createdAt: '2026-06-08T12:00:00.000Z',
        score: 88,
        riskLevel: 'Düşük risk',
        decisionProfile: 'Dengeli araç profili',
        topPick: { name: 'Toyota Corolla Hybrid', score: 88, riskLevel: 'Düşük risk' }
    },
    {
        id: 'mem-2',
        schemaVersion: DECISION_HISTORY_SCHEMA_VERSION,
        categoryId: 'auto',
        categoryName: 'Araba',
        originalCategoryId: 'arac',
        createdAt: '2026-06-07T12:00:00.000Z',
        score: 82,
        riskLevel: 'Orta risk',
        decisionProfile: 'Dengeli araç profili',
        topPick: { name: 'Honda Civic', score: 82, riskLevel: 'Orta risk' }
    }
];

const legacyEntries = [
    {
        categoryId: 'arac',
        categoryName: 'Araç',
        createdAt: '2026-01-15T10:00:00.000Z',
        recommendations: [{
            name: 'Toyota Corolla',
            score: 82,
            riskLevel: 'Orta risk'
        }],
        insight: { headline: 'Dengeli araç profili öne çıkıyor.' }
    },
    {
        categoryId: 'ev',
        categoryName: 'Ev',
        createdAt: '2026-01-14T10:00:00.000Z',
        topPick: { name: 'Kadıköy daire', score: 76, riskLevel: 'Orta risk' },
        decisionProfile: 'Konut yatırım odaklı'
    }
];

test('shouldRenderDecisionMemoryAiCommentary hides soft state and single-entry history', () => {
    const empty = buildDecisionMemoryInsightsModel([]);
    assert.equal(shouldRenderDecisionMemoryAiCommentary(empty), false);

    const single = buildDecisionMemoryInsightsModel([schemaV1Entries[0]]);
    assert.equal(single.softState, DECISION_MEMORY_INSIGHTS_SOFT_STATE);
    assert.equal(shouldRenderDecisionMemoryAiCommentary(single), false);
});

test('buildDeterministicDecisionMemoryCommentary explains schemaVersion=1 insight model', () => {
    const model = buildDecisionMemoryInsightsModel(schemaV1Entries);
    const commentary = buildDeterministicDecisionMemoryCommentary(model);

    assert.ok(commentary);
    assert.match(commentary.category_explanation, /Araba \(2 karar\)/i);
    assert.match(commentary.risk_explanation, /risk eğilimi/i);
    assert.match(commentary.fit_explanation, /85\/100/);
    assert.match(commentary.profile_explanation, /Dengeli araç profili/);
    assert.match(commentary.synthesis, /2 karar kaydı/i);
});

test('buildDeterministicDecisionMemoryCommentary works with legacy normalized entries', () => {
    const model = buildDecisionMemoryInsightsModel(legacyEntries);
    const commentary = buildDeterministicDecisionMemoryCommentary(model);

    assert.ok(commentary);
    assert.match(commentary.synthesis, /karar kaydı/i);
});

test('deterministic commentary avoids prescriptive decision language', () => {
    const model = buildDecisionMemoryInsightsModel(schemaV1Entries);
    const commentary = buildDeterministicDecisionMemoryCommentary(model);
    const combined = Object.values(commentary).join(' ');

    assert.equal(containsPrescriptiveMemoryCommentaryPhrase(combined), false);
    assert.ok(!/bunu seçmelisiniz|en doğru karar|bundan sonra böyle yapın/i.test(combined));
});

test('parseDecisionMemoryCommentary rejects prescriptive AI output', () => {
    const raw = JSON.stringify({
        category_explanation: 'Kategori deseni okunur.',
        risk_explanation: 'Risk eğilimi orta.',
        fit_explanation: 'Uygunluk ortalaması 85.',
        profile_explanation: 'Profil dengeli.',
        synthesis: 'Bundan sonra böyle yapın; en doğru karar budur.',
        disclaimer: 'Destek amaçlıdır.'
    });

    assert.equal(parseDecisionMemoryCommentary(raw), null);
});

test('parseDecisionMemoryCommentary accepts safe JSON commentary', () => {
    const raw = JSON.stringify({
        category_explanation: 'Araba kategorisi geçmişte daha sık görülüyor.',
        risk_explanation: 'Orta risk etiketi baskın okunuyor.',
        fit_explanation: 'Ortalama uygunluk 85/100 düzeyinde.',
        profile_explanation: 'Dengeli profil tekrar ediyor.',
        synthesis: 'Geçmiş kayıtlardaki sinyaller birlikte okunmalıdır.',
        disclaimer: 'Nihai karar kullanıcıya aittir.'
    });

    const parsed = parseDecisionMemoryCommentary(raw);
    assert.ok(parsed);
    assert.match(parsed.synthesis, /sinyaller/i);
});

test('mergeDecisionMemoryCommentary keeps deterministic fallback fields', () => {
    const model = buildDecisionMemoryInsightsModel(schemaV1Entries);
    const deterministic = buildDeterministicDecisionMemoryCommentary(model);
    const ai = {
        ...deterministic,
        synthesis: 'AI sentez: geçmiş sinyaller açıklanır.'
    };

    const merged = mergeDecisionMemoryCommentary(ai, deterministic);
    assert.equal(merged.source, 'ai');
    assert.match(merged.data.synthesis, /AI sentez/i);
    assert.ok(merged.data.risk_explanation);
});

test('renderDecisionMemoryAiCommentaryHtml exposes commentary root and title', () => {
    const model = buildDecisionMemoryInsightsModel(schemaV1Entries);
    const commentary = buildDeterministicDecisionMemoryCommentary(model);
    const html = renderDecisionMemoryAiCommentaryHtml(commentary, { source: 'rules' });

    assert.match(html, /data-decision-memory-ai-commentary/);
    assert.match(html, /AI destekli geçmiş yorumu/);
    assert.match(html, /mevcut içgörü sinyallerini açıklar/i);
});

test('sanitizeDecisionMemoryCommentaryText strips banned prescriptive phrases', () => {
    const cleaned = sanitizeDecisionMemoryCommentaryText('Bunu seçmelisiniz; bundan sonra böyle yapın.');
    assert.equal(containsPrescriptiveMemoryCommentaryPhrase(cleaned), false);
});

test('buildDecisionMemoryCommentaryPrompt includes insight context only', () => {
    const model = buildDecisionMemoryInsightsModel(schemaV1Entries);
    const prompt = buildDecisionMemoryCommentaryPrompt(model);

    assert.match(prompt, /top-category/);
    assert.match(prompt, /YASAK/);
    assert.match(prompt, /yeni skor, TCO, risk veya uygunluk üretmek/i);
    assert.match(prompt, /bundan sonra böyle yapın/i);
});

test('fetchDecisionMemoryAiCommentary returns deterministic fallback when proxy skipped', async () => {
    const model = buildDecisionMemoryInsightsModel(schemaV1Entries);
    const result = await fetchDecisionMemoryAiCommentary(model, { skipProxy: true });

    assert.equal(result.source, 'rules');
    assert.match(result.commentary.synthesis, /karar kaydı/i);
});
