import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  PREFERENCE_KEYS,
  PREFERENCE_LABELS,
  clearPreferenceProfileMemoCache,
  runPreferenceProfileEngine,
  clearDecisionStyleMemoCache,
  runDecisionStyleEngine,
  clearPersonalizationMemoCache,
  runPersonalizationEngine,
  runPersonalizationSuite,
  buildPreferenceProfilePanelHtml,
  sanitizePersonalizationText,
  containsForbiddenPersonalizationPhrase
} = await import('../../js/ai-personalization/index.js');

const { runPurchaseDecisionEngine, clearPurchaseDecisionMemoCache } = await import(
  '../../js/ai-purchase-decision/index.js'
);

const recommendation = {
  id: '11111111-1111-1111-1111-111111111111',
  category: 'vehicle',
  title: '2022 BMW 320i',
  price: 1780000,
  fit_score: 82,
  quality_score: 88,
  listing_quality: { score: 88 },
  latest_analysis: { decision_score: 82, quality_score: 88 }
};

const decisionResult = {
  decisionScore: 78,
  confidenceScore: 72,
  positiveFactors: ['Düşük risk profili', 'Kalite skoru yüksek', 'Aile kullanımına uygun'],
  riskFactors: ['Fiyat baskısı', 'Eksik servis kaydı']
};

test('PREFERENCE_KEYS includes all required preferences', () => {
  for (const key of [
    'lowRiskPreference',
    'costSensitivity',
    'qualitySensitivity',
    'familyUsagePreference',
    'cityUsagePreference',
    'comfortPreference',
    'performancePreference'
  ]) {
    assert.ok(PREFERENCE_KEYS.includes(key));
    assert.ok(PREFERENCE_LABELS[key]);
  }
});

test('runPreferenceProfileEngine returns explainable Turkish disclaimer', () => {
  clearPreferenceProfileMemoCache();
  const profile = runPreferenceProfileEngine(
    { costSensitivity: 70 },
    { usage_type: 'family', costSensitivity: 65 }
  );
  assert.equal(profile.items.length, 7);
  assert.ok(profile.disclaimer.includes('Tercihlerinizi istediğiniz zaman değiştirebilirsiniz'));
});

test('runDecisionStyleEngine resolves primary style', () => {
  clearDecisionStyleMemoCache();
  const style = runDecisionStyleEngine({
    lowRiskPreference: 80,
    costSensitivity: 40,
    qualitySensitivity: 60,
    familyUsagePreference: 55,
    comfortPreference: 50
  });
  assert.equal(style.primaryStyle, 'riskFirst');
});

test('runPersonalizationEngine does not mutate core scores', () => {
  clearPersonalizationMemoCache();
  clearPreferenceProfileMemoCache();
  clearDecisionStyleMemoCache();

  const result = runPersonalizationEngine(
    recommendation,
    decisionResult,
    { costSensitivity: 75 },
    { usage_type: 'family' }
  );

  assert.ok(result);
  assert.equal(result.scoresUnchanged, true);
  assert.equal(result.originalScores.decisionScore, 78);
  assert.equal(result.originalScores.fitScore, 82);
  assert.equal(result.originalScores.qualityScore, 88);
  assert.ok(result.display.prioritizedPositiveFactors.length > 0);
});

test('personalization reorders display factors without changing purchase decision scores', () => {
  clearPurchaseDecisionMemoCache();
  clearPersonalizationMemoCache();

  const purchase = runPurchaseDecisionEngine({
    recommendation,
    user_intent: { category: 'vehicle' },
    category: 'vehicle',
    fit_score: 82
  });

  const originalScore = purchase.decisionScore;
  const personalized = runPersonalizationEngine(recommendation, purchase, { costSensitivity: 90 });

  assert.equal(purchase.decisionScore, originalScore);
  assert.equal(personalized.originalScores.decisionScore, originalScore);
});

test('runPersonalizationSuite orchestrates profile, style, and display', () => {
  clearPersonalizationMemoCache();
  const suite = runPersonalizationSuite(recommendation, decisionResult);
  assert.ok(suite.profile);
  assert.ok(suite.style);
  assert.ok(suite.personalization);
});

test('buildPreferenceProfilePanelHtml is accessible and XSS-safe', () => {
  const suite = runPersonalizationSuite(recommendation, decisionResult);
  suite.profile.items[0].label = '<script>x</script>';
  const html = buildPreferenceProfilePanelHtml(suite.profile, suite);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('role="progressbar"'));
  assert.ok(html.includes('Tercih Profili'));
});

test('personalization summary sanitizes forbidden phrases', () => {
  assert.equal(containsForbiddenPersonalizationPhrase('garanti'), true);
  const cleaned = sanitizePersonalizationText('garanti sonuç');
  assert.ok(!cleaned.toLocaleLowerCase('tr-TR').includes('garanti'));
});

test('personalization module files exist', () => {
  const files = [
    'personalization-engine.js',
    'preference-profile-engine.js',
    'decision-style-engine.js',
    'personalization-summary.js'
  ];
  for (const file of files) {
    const rel = `supabase/functions/_shared/ai-listings/personalization/${file}`;
    assert.ok(fs.existsSync(path.join(process.cwd(), rel)), rel);
  }
});
