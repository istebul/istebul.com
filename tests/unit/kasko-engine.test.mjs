import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEngineResult,
  buildKaskoResults,
  computeOverallDecisionScore
} from '../../js/features/kasko/kasko-engine.js';

test('kasko engine produces decision score in range', () => {
  const state = {
    age: 35,
    vehicle_category: 'otomobil',
    vehicle_year_band: '4-10',
    license_years: '3-10',
    usage_type: 'ozel',
    coverage_level: 'standard',
    risk_perception: 'orta',
    budget_level: 'orta'
  };
  const scores = computeOverallDecisionScore(state);
  assert.ok(scores.overall >= 40 && scores.overall <= 100);
  const engine = buildEngineResult(state);
  assert.equal(engine.decisionScore, scores.overall);
  assert.ok(engine.riskAnalysis.length >= 1);
});

test('buildKaskoResults returns scenario', () => {
  const results = buildKaskoResults({
    vehicle_category: 'suv',
    vehicle_year_band: '0-3',
    license_years: '11plus',
    usage_type: 'ozel',
    coverage_level: 'full',
    risk_perception: 'yuksek',
    budget_level: 'yuksek'
  });
  assert.equal(results.length, 1);
  assert.ok(results[0].score >= 40);
});
