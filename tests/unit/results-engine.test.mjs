import test from 'node:test';
import assert from 'node:assert/strict';

const {
  clampScore,
  resolveScoreLabel,
  buildConfidenceScore,
  buildRiskItem,
  buildPdfReportData,
  safeTrackEvent,
  normalizeRiskLevel,
  riskLevelToTone
} = await import('../../js/features/results/results-engine.js');

test('clampScore clamps negative values to 0', () => {
  assert.equal(clampScore(-12), 0);
});

test('clampScore clamps values above 100 to 100', () => {
  assert.equal(clampScore(142), 100);
});

test('resolveScoreLabel returns category-specific labels', () => {
  assert.equal(resolveScoreLabel(90, 'konut'), 'Çok uygun');
  assert.equal(resolveScoreLabel(48, 'finansman'), 'Riskli finansman');
  assert.equal(resolveScoreLabel(48, 'tatil'), 'Riskli tatil planı');
  assert.equal(resolveScoreLabel(48, 'auto'), 'Riskli seçim');
});

test('buildConfidenceScore returns lower score with missing fields', () => {
  const low = buildConfidenceScore(
    { purpose: 'konut' },
    [
      { field: 'purpose', weight: 10 },
      { field: 'amount_range', weight: 10 },
      { field: 'term_months', weight: 10 }
    ]
  );
  const high = buildConfidenceScore(
    { purpose: 'konut', amount_range: '1m', term_months: '36' },
    [
      { field: 'purpose', weight: 10 },
      { field: 'amount_range', weight: 10 },
      { field: 'term_months', weight: 10 }
    ]
  );
  assert.ok(low < high);
  assert.ok(low >= 32 && low <= 98);
});

test('buildConfidenceScore returns higher score with complete weighted fields', () => {
  const score = buildConfidenceScore(
    {
      a: 1,
      b: 2,
      c: 3
    },
    [
      { ok: true, weight: 10 },
      { ok: true, weight: 10 },
      { ok: true, weight: 10 }
    ]
  );
  assert.ok(score >= 90);
});

test('buildRiskItem returns standard risk object', () => {
  const item = buildRiskItem('budget', 'HIGH', 'Bütçe', 'Açıklama', 'Öneri');
  assert.equal(item.key, 'budget');
  assert.equal(item.level, 'yüksek');
  assert.equal(item.title, 'Bütçe');
  assert.equal(item.description, 'Açıklama');
  assert.equal(item.recommendation, 'Öneri');
});

test('buildPdfReportData includes required fields', () => {
  const data = buildPdfReportData({
    category: 'tatil',
    decisionScore: 77,
    confidenceScore: 81,
    overallRisk: 'Orta',
    totalCost: { totalBudget: 100_000 },
    riskAnalysis: [{ key: 'a' }],
    strengths: ['x'],
    weaknesses: ['y'],
    alternatives: [{ title: 'alt' }],
    nextSteps: ['step'],
    executiveSummary: 'Özet'
  });
  assert.equal(data.category, 'tatil');
  assert.ok(data.generatedAt);
  assert.equal(data.decisionScore, 77);
  assert.equal(data.confidenceScore, 81);
  assert.equal(data.riskAnalysis.length, 1);
  assert.equal(data.strengths[0], 'x');
  assert.equal(data.weaknesses[0], 'y');
  assert.equal(data.executiveSummary, 'Özet');
});

test('safeTrackEvent does not throw when track fails', () => {
  assert.doesNotThrow(() => {
    safeTrackEvent(() => {
      throw new Error('track failed');
    }, 'test_event', { ok: true });
  });
  assert.doesNotThrow(() => {
    safeTrackEvent(null, 'test_event');
  });
});

test('normalizeRiskLevel and riskLevelToTone align', () => {
  assert.equal(normalizeRiskLevel('high', { locale: 'en' }), 'high');
  assert.equal(normalizeRiskLevel('Yüksek'), 'yüksek');
  assert.equal(riskLevelToTone('orta'), 'mid');
});
