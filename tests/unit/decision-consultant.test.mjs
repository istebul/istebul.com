import test from 'node:test';
import assert from 'node:assert/strict';

const {
  scoreVehicleMatch,
  computeConfidenceMeta,
  buildExpertReasons,
  explainRankGap,
  sanitizeAiNarrative,
  buildMethodologyPanel
} = await import('../../js/engines/decision-consultant.js');

const sampleVehicle = {
  name: '2023 Toyota Corolla',
  price: 1200000,
  body: 'sedan',
  fuel: 'hybrid',
  family: 7,
  city: 8,
  long: 6,
  resale: 8
};

test('scoreVehicleMatch rewards budget and body match', () => {
  const form = { budget: 1500000, body: 'sedan', fuel: 'hybrid', usage: 'family' };
  const { score, scoreBreakdown } = scoreVehicleMatch(sampleVehicle, form);

  assert.ok(score >= 70);
  assert.ok(scoreBreakdown.some((f) => f.factor === 'BUDGET_FIT' && f.positive));
  assert.ok(scoreBreakdown.some((f) => f.factor === 'BODY_MATCH' && f.positive));
});

test('computeConfidenceMeta is not identical to match score', () => {
  const form = { budget: 1500000, body: 'sedan', fuel: 'hybrid' };
  const { score, scoreBreakdown } = scoreVehicleMatch(sampleVehicle, form);
  const meta = computeConfidenceMeta({
    score,
    scoreBreakdown,
    catalogSize: 12,
    costSource: 'estimate',
    budget: form.budget,
    vehiclePrice: sampleVehicle.price
  });

  assert.notEqual(meta.score, score);
  assert.ok(['high', 'medium', 'review'].includes(meta.tier));
  assert.ok(meta.disclaimer.length > 10);
});

test('buildExpertReasons prefers breakdown signals', () => {
  const form = { budget: 1500000, body: 'sedan', fuel: 'hybrid' };
  const { scoreBreakdown } = scoreVehicleMatch(sampleVehicle, form);
  const reasons = buildExpertReasons(sampleVehicle, form, form.budget, scoreBreakdown);

  assert.ok(reasons.length >= 1);
  assert.ok(reasons.every((r) => typeof r === 'string'));
});

test('explainRankGap describes leader advantage', () => {
  const winner = { name: 'A', score: 88, scoreBreakdown: [{ factor: 'BUDGET_FIT', positive: true }] };
  const runner = { name: 'B', score: 72, scoreBreakdown: [] };
  const gap = explainRankGap(winner, runner);

  assert.ok(gap.gap === 16);
  assert.match(gap.summary, /A/);
});

test('sanitizeAiNarrative strips risky financial claims', () => {
  const raw = '**Öneri** %3.19 faiz ile ₺12.500 aylık ödeme garanti.';
  const clean = sanitizeAiNarrative(raw, 200);

  assert.ok(!clean.includes('₺'));
  assert.ok(!/%\s*[\d.,]+/.test(clean));
  assert.match(clean, /örnek oran/i);
});

test('buildMethodologyPanel documents limits', () => {
  const panel = buildMethodologyPanel();
  assert.equal(panel.title, 'Karar metodolojisi');
  assert.ok(panel.steps.length >= 3);
  assert.ok(panel.limits.some((l) => /canlı ilan/i.test(l)));
});
