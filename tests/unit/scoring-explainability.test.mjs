import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildScoringTransparency,
  buildWhyNumberOne,
  buildWhyNotRanked,
  buildTradeoffExplanations,
  buildRankIntelligence,
  computeConfidenceMeta,
  scoreVehicleMatch
} from '../../js/engines/decision-consultant.js';

const vehicleA = {
  name: 'Model A',
  price: 1200000,
  body: 'sedan',
  fuel: 'hybrid',
  family: 8,
  city: 7,
  long: 6,
  resale: 8,
  costs: { total: 180000, source: 'estimate' }
};

const vehicleB = {
  name: 'Model B',
  price: 1350000,
  body: 'sedan',
  fuel: 'gasoline',
  family: 6,
  city: 7,
  long: 6,
  resale: 7,
  costs: { total: 165000, source: 'estimate' }
};

test('buildScoringTransparency documents base and factor share', () => {
  const form = { budget: 1500000, body: 'sedan', fuel: 'hybrid' };
  const { score, scoreBreakdown } = scoreVehicleMatch(vehicleA, form);
  const t = buildScoringTransparency(score, scoreBreakdown);

  assert.equal(t.baseScore, 42);
  assert.ok(t.factors.some((f) => f.sharePct >= 0));
  assert.match(t.methodology, /deterministik/i);
});

test('buildWhyNumberOne explains leader gap', () => {
  const form = { budget: 1500000, body: 'sedan', fuel: 'hybrid' };
  const a = { ...vehicleA, ...scoreVehicleMatch(vehicleA, form), scoreBreakdown: scoreVehicleMatch(vehicleA, form).scoreBreakdown };
  const b = { ...vehicleB, ...scoreVehicleMatch(vehicleB, form), scoreBreakdown: scoreVehicleMatch(vehicleB, form).scoreBreakdown };
  a.score = scoreVehicleMatch(vehicleA, form).score;
  b.score = scoreVehicleMatch(vehicleB, form).score;

  const why = buildWhyNumberOne(a, b, form);
  assert.ok(why.gap >= 0);
  assert.match(why.summary, /Model A/);
});

test('buildWhyNotRanked explains runner position', () => {
  const form = { budget: 1500000, body: 'sedan', fuel: 'hybrid' };
  const leader = {
    name: 'L',
    score: 88,
    scoreBreakdown: [{ factor: 'BUDGET_FIT', label: 'Bütçe', status: 'İçinde', delta: 20, positive: true }],
    costs: { total: 200000 }
  };
  const runner = {
    name: 'R',
    score: 72,
    scoreBreakdown: [{ factor: 'BUDGET_FIT', label: 'Bütçe', status: 'Üstü', delta: -10, positive: false }],
    costs: { total: 150000 }
  };

  const contrast = buildWhyNotRanked(runner, 2, leader, form);
  assert.equal(contrast.rank, 2);
  assert.match(contrast.summary, /#2/);
});

test('buildTradeoffExplanations includes TCO when materially different', () => {
  const results = [
    { name: 'A', score: 90, costs: { total: 220000 } },
    { name: 'B', score: 78, costs: { total: 170000 } }
  ];
  const tradeoffs = buildTradeoffExplanations(results);
  assert.ok(tradeoffs.some((t) => /TCO/i.test(t.title)));
});

test('buildRankIntelligence bundles leader runners tradeoffs', () => {
  const form = { budget: 1500000, body: 'sedan', fuel: 'hybrid' };
  const a = { ...vehicleA, ...scoreVehicleMatch(vehicleA, form) };
  const b = { ...vehicleB, ...scoreVehicleMatch(vehicleB, form) };
  const intel = buildRankIntelligence([a, b], form);

  assert.ok(intel.leader);
  assert.equal(intel.runners.length, 1);
  assert.ok(intel.transparency.factors.length);
});

test('computeConfidenceMeta exposes signalExplanations', () => {
  const form = { budget: 1500000 };
  const { score, scoreBreakdown } = scoreVehicleMatch(vehicleA, form);
  const meta = computeConfidenceMeta({
    score,
    scoreBreakdown,
    catalogSize: 10,
    costSource: 'estimate',
    budget: form.budget,
    vehiclePrice: vehicleA.price
  });

  assert.ok(Array.isArray(meta.signalExplanations));
  assert.equal(meta.isMatchScore, false);
  assert.equal(meta.semanticVersion, 'p3.4');
});
