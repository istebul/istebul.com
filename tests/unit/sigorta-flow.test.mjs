import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSigortaSteps,
  resetSigortaFieldsForTypeChange,
  syncSigortaStepIndexAfterTypeChange
} from '../../js/sigorta/sigorta-config.js';
import { buildSigortaResults, getSigortaProgress } from '../../js/features/sigorta/sigorta-engine.js';

test('getSigortaSteps branches by insurance type', () => {
  assert.deepEqual(
    getSigortaSteps('arac').map((s) => s.id),
    ['type', 'driver', 'vehicle', 'risk', 'budget']
  );
  assert.deepEqual(
    getSigortaSteps('konut').map((s) => s.id),
    ['type', 'property', 'occupancy', 'risk', 'budget']
  );
  assert.deepEqual(
    getSigortaSteps('saglik').map((s) => s.id),
    ['type', 'profile', 'dependents', 'risk', 'budget']
  );
  assert.deepEqual(
    getSigortaSteps('seyahat').map((s) => s.id),
    ['type', 'trip', 'risk', 'budget']
  );
  assert.deepEqual(getSigortaSteps().map((s) => s.id), ['type']);
});

test('resetSigortaFieldsForTypeChange clears cross-type fields', () => {
  const state = {
    insurance_type: 'arac',
    marital_status: 'evli',
    children_count: '2',
    residents_count: '3',
    traveler_count: '3'
  };
  state.insurance_type = 'seyahat';
  resetSigortaFieldsForTypeChange(state, 'arac');
  assert.equal(state.marital_status, '');
  assert.equal(state.children_count, '');
  assert.equal(state.residents_count, '');
  assert.equal(state.traveler_count, '');
});

test('syncSigortaStepIndexAfterTypeChange leaves arac on driver step', () => {
  const state = {
    insurance_type: 'saglik',
    stepIndex: 2
  };
  state.insurance_type = 'arac';
  resetSigortaFieldsForTypeChange(state, 'saglik');
  syncSigortaStepIndexAfterTypeChange(state, 'saglik');
  assert.equal(getSigortaSteps('arac')[state.stepIndex].id, 'driver');
});

test('buildSigortaResults completes arac flow without marital or children', () => {
  const results = buildSigortaResults({
    insurance_type: 'arac',
    age: 32,
    license_years: '3-10',
    usage_type: 'ozel',
    vehicle_category: 'otomobil',
    vehicle_year_band: '4-10',
    risk_perception: 'orta',
    budget_level: 'orta'
  });
  assert.ok(results.length >= 1);
  assert.ok(results[0].score >= 0 && results[0].score <= 100);
  assert.ok(results[0].estimatedCost.includes('₺'));
});

test('getSigortaProgress omits marital for arac', () => {
  const rows = getSigortaProgress({
    insurance_type: 'arac',
    age: 30,
    license_years: '3-10',
    usage_type: 'ozel',
    vehicle_category: 'otomobil',
    vehicle_year_band: '4-10',
    risk_perception: 'orta',
    budget_level: 'orta'
  });
  const keys = rows.map((r) => r.key);
  assert.ok(!keys.includes('Medeni durum'));
  assert.ok(keys.includes('Ehliyet'));
});
