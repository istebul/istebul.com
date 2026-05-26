import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildExplanationBundle,
  buildDeterministicSynthesis,
  renderAiExplanationExperience
} from '../../js/features/moat/ai-explanation-experience.js';
import { sanitizeAiNarrative } from '../../js/engines/decision-consultant.js';

const sampleResults = [
  {
    name: 'Model Alpha',
    score: 88,
    reasons: ['Bütçe uyumu: Bütçe içinde'],
    risks: ['Finansman yükü dikkat'],
    confidenceMeta: { tier: 'medium', label: 'Orta veri güven bandı', disclaimer: 'Tahmini maliyet.' },
    costs: { total: 200000, source: 'estimate' },
    rankExplanation: { summary: 'Model Alpha 12 puan önde.' },
    rankIntelligence: {
      tradeoffs: [{ title: 'Uyum vs alternatif', summary: 'Yakın skor — TCO okunmalı.' }]
    }
  },
  {
    name: 'Model Beta',
    score: 76,
    reasons: ['Kasa eşleşmesi'],
    risks: [],
    confidenceMeta: { tier: 'medium', label: 'Orta band' },
    costs: { total: 170000, source: 'estimate' },
    runnerContrast: { summary: '#2 yakın alternatif.' }
  }
];

test('buildExplanationBundle includes structured sections', () => {
  const bundle = buildExplanationBundle(sampleResults, { budget: 1500000, body: 'sedan', fuel: 'hybrid' });
  assert.equal(bundle.identity.title, 'Karar asistanı');
  assert.ok(bundle.reasoning.length >= 4);
  assert.equal(bundle.financial.rows.length, 2);
  assert.equal(bundle.rationales.length, 2);
  assert.ok(bundle.expertCommentary?.facts);
  assert.ok(bundle.expertCommentary?.interpretation);
  assert.ok(bundle.uncertainty.bullets.length >= 2);
});

test('buildDeterministicSynthesis avoids false certainty tone', () => {
  const bundle = buildExplanationBundle(sampleResults, { budget: 1500000 });
  const text = buildDeterministicSynthesis(bundle);
  assert.match(text, /Model Alpha/);
  assert.ok(!/kesinlikle|garanti/i.test(text));
});

test('renderAiExplanationExperience uses decision assistant framing', () => {
  const html = renderAiExplanationExperience(buildExplanationBundle(sampleResults, {}), { pro: true });
  assert.match(html, /Karar asistanı/);
  assert.match(html, /Tahmin makinesi değil/);
  assert.match(html, /Yapılandırılmış akıl yürütme/);
  assert.match(html, /data-ai-synthesis/);
  assert.match(html, /data-ai-commentary-mount|data-ai-commentary-root/);
});

test('renderAiExplanationExperience shows full panels for free users', () => {
  const html = renderAiExplanationExperience(buildExplanationBundle(sampleResults, {}), { pro: false });
  assert.doesNotMatch(html, /ib-ai-experience--locked/);
  assert.match(html, /Finansal bağlam/);
  assert.match(html, /Öneri gerekçeleri/);
  assert.match(html, /data-ai-refine-upsell/);
});

test('sanitizeAiNarrative strips false certainty claims', () => {
  const clean = sanitizeAiNarrative('Kesinlikle garanti ediyoruz %3.19 faiz ile ₺5000.');
  assert.ok(!/kesinlikle|garanti/i.test(clean));
  assert.ok(!/₺/.test(clean));
});
