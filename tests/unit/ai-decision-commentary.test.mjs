import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDeterministicDecisionCommentary,
  parseStructuredCommentary,
  mergeCommentary,
  buildCommentaryPrompt,
  COMMENTARY_SCHEMA_KEYS
} from '../../js/auto/ai-decision-commentary.js';

const sampleResults = [
  {
    name: 'Toyota Corolla Hybrid',
    score: 86,
    price: 1400000,
    reasons: ['Bütçe uyumu'],
    risks: ['Finansman yükü'],
    confidenceMeta: { tier: 'medium', label: 'Orta band' },
    costs: {
      total: 240000,
      fuel: 45000,
      insurance: 18000,
      kasko: 12000,
      maintenance: 15000,
      depreciation: 35000,
      ownership: { totals: { months12: 240000 }, depreciation: { liquidityScore: 72 } }
    },
    rankExplanation: { summary: 'Lider 8 puan önde.' }
  }
];

test('buildDeterministicDecisionCommentary fills schema keys', () => {
  const c = buildDeterministicDecisionCommentary(sampleResults, { budget: 1500000, loan: 'yes', usage: 'city' });
  for (const key of COMMENTARY_SCHEMA_KEYS) {
    assert.ok(key in c, `missing ${key}`);
  }
  assert.ok(c.executive_summary.includes('Toyota'));
  assert.equal(c.confidence_level, 'orta');
  assert.ok(Array.isArray(c.main_risks));
});

test('parseStructuredCommentary accepts JSON object', () => {
  const raw = JSON.stringify({
    executive_summary: 'Profil için dengeli bir senaryo.',
    profile_fit: 'Şehir kullanımı.',
    budget_assessment: 'Bütçe bandı dar.',
    ownership_cost_commentary: 'TCO ekranda gösterilen tahminlere dayanır.',
    maintenance_commentary: 'Bakım orta.',
    insurance_kasko_commentary: 'Prim teklifle netleşir.',
    fuel_energy_commentary: 'Yakıt kalemi belirleyici olabilir.',
    depreciation_commentary: 'Kısa vadede değer kaybı önemli.',
    financing_commentary: 'Finansman simülasyondur.',
    main_risks: ['Belirsizlik'],
    why_recommended: ['Uyum'],
    why_not_alternatives: ['Alternatif yakın'],
    alternative_considerations: ['Test sürüşü'],
    next_best_action: 'Teklif alın.',
    confidence_level: 'orta',
    disclaimer: 'Karar desteği.'
  });
  const parsed = parseStructuredCommentary(raw);
  assert.ok(parsed);
  assert.equal(parsed.confidence_level, 'orta');
  assert.equal(parsed.main_risks.length, 1);
});

test('parseStructuredCommentary rejects hallucination-heavy claims', () => {
  const raw = JSON.stringify({
    executive_summary: 'Kesinlikle garanti %3.19 faiz ile ₺5000 bankadan alın.',
    confidence_level: 'yüksek'
  });
  const parsed = parseStructuredCommentary(raw);
  assert.ok(parsed);
  assert.ok(!/kesinlikle|garanti|₺/i.test(parsed.executive_summary));
});

test('mergeCommentary prefers AI fields when present', () => {
  const det = buildDeterministicDecisionCommentary(sampleResults, {});
  const ai = { ...det, executive_summary: 'AI sentez metni.' };
  const { data, source } = mergeCommentary(ai, det);
  assert.equal(source, 'ai');
  assert.equal(data.executive_summary, 'AI sentez metni.');
});

test('buildCommentaryPrompt forbids invented offers in instructions', () => {
  const bundle = { profileSummary: 'test', leaderName: 'X', tradeoffs: [], uncertainty: { bullets: [] } };
  const prompt = buildCommentaryPrompt(sampleResults, { budget: 1 }, bundle);
  assert.match(prompt, /YASAK/);
  assert.match(prompt, /JSON/);
});
