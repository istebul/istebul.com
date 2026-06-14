import test from 'node:test';
import assert from 'node:assert/strict';

const {
  blendEarthquakeRiskScore,
  applyAfadToDecisionContext,
  normalizeAfadRiskSnapshot,
  hasAfadData,
  injectAfadIntoMetrics,
  capAfadScoreImpact
} = await import('../../js/features/afad/afad-earthquake-engine.js');

const sampleAfad = {
  earthquakeRiskScore: 78,
  earthquakeActivityLevel: 'yüksek',
  earthquakeSummary: 'AFAD deprem istihbaratı: İstanbul yüksek deprem risk bandında.',
  riskLevel: 'yüksek',
  eventCount: 12,
  maxMagnitude: 3.4
};

test('normalizeAfadRiskSnapshot validates score payload', () => {
  const normalized = normalizeAfadRiskSnapshot(sampleAfad);
  assert.equal(normalized.earthquakeRiskScore, 78);
  assert.equal(normalized.earthquakeActivityLevel, 'yüksek');
  assert.equal(hasAfadData(normalized), true);
  assert.equal(hasAfadData(null), false);
});

test('blendEarthquakeRiskScore prefers AFAD with manual fallback blend', () => {
  assert.equal(blendEarthquakeRiskScore(40, normalizeAfadRiskSnapshot(sampleAfad)), 69);
  assert.equal(blendEarthquakeRiskScore(null, normalizeAfadRiskSnapshot(sampleAfad)), 78);
  assert.equal(blendEarthquakeRiskScore(55, null), 55);
  assert.ok(blendEarthquakeRiskScore(40, normalizeAfadRiskSnapshot(sampleAfad)) > 40);
});

test('applyAfadToDecisionContext enriches warnings and factors', () => {
  const context = {
    earthquakeRisk: 40,
    legacyScore: 72,
    scoreFactors: [],
    warnings: []
  };

  const updated = applyAfadToDecisionContext(context, normalizeAfadRiskSnapshot(sampleAfad));
  assert.equal(updated.earthquakeSource, 'afad');
  assert.ok(updated.earthquakeRisk >= 68);
  assert.ok(updated.scoreFactors.some((f) => /AFAD/i.test(f.label)));
  assert.ok(updated.warnings.length >= 1);
});

test('injectAfadIntoMetrics updates metrics in place', () => {
  const metrics = { earthquakeRiskScore: 40 };
  injectAfadIntoMetrics(metrics, normalizeAfadRiskSnapshot(sampleAfad), 40);
  assert.equal(metrics.earthquakeSource, 'afad');
  assert.ok(metrics.earthquakeRiskScore > 40);
});

test('capAfadScoreImpact limits adjustment band', () => {
  assert.ok(Math.abs(capAfadScoreImpact(80, 20)) <= 7);
});
