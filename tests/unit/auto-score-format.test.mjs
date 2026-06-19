import test from 'node:test';
import assert from 'node:assert/strict';
import { formatScore, formatScoreOutOf100 } from '../../js/features/results/results-engine.js';
import {
  isTechnicalPreferenceValue,
  preferencePhrase,
  stripTechnicalTokensFromCopy
} from '../../js/core/user-facing-text.js';
import { buildDecisionInsight, sanitizeInsightText } from '../../js/features/ai/ai-insight-engine.js';
import { renderComparisonMatrix } from '../../js/auto/recommendation-intelligence.js';

test('formatScore clamps and formats floats', () => {
  assert.equal(formatScore(40.199999999999996), '40.2');
  assert.equal(formatScore(94), '94');
  assert.equal(formatScore(94.04), '94');
  assert.equal(formatScoreOutOf100(40.199999999999996), '40.2/100');
  assert.equal(formatScoreOutOf100(94), '94/100');
  assert.equal(formatScore(Number.NaN), '—');
});

test('technical preference values never surface as raw tokens in auto insight', () => {
  const insight = buildDecisionInsight({
    vertical: 'auto',
    answers: { fuel: 'any', usage: 'family', km: 15000, budget: 1200000, loan: 'no' },
    costs: { budget: 1200000, tco12: 1400000 },
    scores: { decision: 72, confidence: 80, overallRisk: 'Orta' },
    recommendation: { name: 'Test Araç' }
  });
  const blob = [insight.summary, insight.why, insight.risk, insight.nextStep].join(' ');
  assert.doesNotMatch(blob, /\bany\b/i);
  assert.doesNotMatch(blob, /\bundefined\b/i);
  assert.doesNotMatch(blob, /\bnull\b/i);
  assert.match(insight.why, /Araç tercihiniz|Seçimleriniz|Profiliniz/);
});

test('sanitizeInsightText strips leaked any tercihiniz', () => {
  const out = sanitizeInsightText('any tercihiniz, yıllık 15.000 km planı');
  assert.doesNotMatch(out, /\bany\b/i);
  assert.match(out, /Seçimleriniz/);
});

test('comparison matrix does not emit raw float scores', () => {
  const html = renderComparisonMatrix(
    [
      {
        name: 'A',
        score: 94,
        costs: { total: 200000, ownership: { totals: { months12: 220000 } } },
        confidenceMeta: { score: 40.199999999999996 }
      },
      {
        name: 'B',
        score: 94,
        costs: { total: 190000, ownership: { totals: { months12: 210000 } } },
        confidenceMeta: { score: 72 }
      }
    ],
    { budget: 1500000 }
  );
  assert.doesNotMatch(html, /40\.199999999999996/);
  assert.match(html, /40\.2\/100/);
  assert.match(html, /94\/100/);
});

test('preferencePhrase maps any to Turkish fallback', () => {
  assert.ok(isTechnicalPreferenceValue('any'));
  assert.equal(preferencePhrase('any', 'fuel'), 'Araç tercihiniz');
  assert.equal(stripTechnicalTokensFromCopy('any tercihiniz'), 'Seçimleriniz');
});
