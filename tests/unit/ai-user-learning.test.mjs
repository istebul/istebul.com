import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  LEARNING_EVENT_TYPES,
  clearUserLearningMemoCache,
  normalizeLearningEvent,
  runUserLearningEngine,
  clearFeedbackLearningMemoCache,
  runFeedbackLearningEngine,
  clearDecisionOutcomeAnalyticsMemoCache,
  runDecisionOutcomeAnalytics,
  buildLearningInsightsSummary,
  runLearningInsightsEngine,
  buildLearningInsightsPanelHtml,
  sanitizeLearningText,
  containsForbiddenLearningPhrase
} = await import('../../js/ai-user-learning/index.js');

const sampleEvents = [
  { event_type: 'recommendation_viewed', listing_id: 'a1', timestamp: '2026-06-01T10:00:00Z' },
  { event_type: 'report_viewed', report_id: 'r1', listing_id: 'a1', timestamp: '2026-06-01T11:00:00Z' },
  { event_type: 'report_viewed', report_id: 'r1', listing_id: 'a1', timestamp: '2026-06-01T12:00:00Z' },
  { event_type: 'scenario_viewed', scenario_id: 's1', timestamp: '2026-06-01T13:00:00Z' },
  { event_type: 'decision_center_viewed', timestamp: '2026-06-01T14:00:00Z' },
  {
    event_type: 'feedback_submitted',
    helpful: true,
    reasons: ['helpful_explanation'],
    timestamp: '2026-06-01T15:00:00Z'
  },
  {
    event_type: 'feedback_submitted',
    helpful: false,
    reasons: ['too_expensive'],
    timestamp: '2026-06-01T16:00:00Z'
  }
];

test('LEARNING_EVENT_TYPES includes all required events', () => {
  for (const type of [
    'recommendation_viewed',
    'report_viewed',
    'compare_viewed',
    'scenario_viewed',
    'decision_center_viewed',
    'feedback_submitted'
  ]) {
    assert.ok(LEARNING_EVENT_TYPES.includes(type));
  }
});

test('normalizeLearningEvent rejects invalid events', () => {
  assert.equal(normalizeLearningEvent(null), null);
  assert.equal(normalizeLearningEvent({ event_type: 'invalid' }), null);
  const event = normalizeLearningEvent(sampleEvents[0]);
  assert.equal(event?.module, 'recommendation');
});

test('runUserLearningEngine aggregates module usage deterministically', () => {
  clearUserLearningMemoCache();
  const first = runUserLearningEngine(sampleEvents);
  const second = runUserLearningEngine(sampleEvents);
  assert.deepEqual(first, second);
  assert.equal(first.eventCount, 7);
  assert.ok(first.topModules.length > 0);
  assert.equal(first.topReports[0].report_id, 'r1');
  assert.equal(first.topReports[0].count, 2);
});

test('runFeedbackLearningEngine derives explainable preference signals', () => {
  clearFeedbackLearningMemoCache();
  const feedback = runFeedbackLearningEngine(
    sampleEvents.filter((e) => e.event_type === 'feedback_submitted')
  );
  assert.equal(feedback.feedbackCount, 2);
  assert.ok(feedback.preferenceSignals.costSensitivity >= 50);
  assert.equal(feedback.explainable, true);
});

test('runDecisionOutcomeAnalytics aggregates outcomes by module', () => {
  clearDecisionOutcomeAnalyticsMemoCache();
  const outcomes = [
    { module: 'report', viewed: true, helpful: true, decision_score: 80 },
    { module: 'scenario', viewed: true, helpful: false, decision_score: 65 }
  ];
  const result = runDecisionOutcomeAnalytics(outcomes);
  assert.equal(result.totalViews, 2);
  assert.ok(result.byModule.report);
});

test('runLearningInsightsEngine produces Learning Insights summary', () => {
  clearUserLearningMemoCache();
  clearFeedbackLearningMemoCache();
  clearDecisionOutcomeAnalyticsMemoCache();
  const insights = runLearningInsightsEngine(sampleEvents);
  assert.equal(insights.summary.titleTr, 'Öğrenme Öngörüleri');
  assert.ok(insights.summary.insights.length > 0);
});

test('learning summary sanitizes forbidden phrases', () => {
  assert.equal(containsForbiddenLearningPhrase('garanti kazanç'), true);
  const cleaned = sanitizeLearningText('Bu garanti bir sonuçtur');
  assert.ok(!cleaned.toLocaleLowerCase('tr-TR').includes('garanti'));
});

test('buildLearningInsightsPanelHtml is XSS-safe', () => {
  clearUserLearningMemoCache();
  const insights = runLearningInsightsEngine(sampleEvents);
  insights.summary.headline = '<script>alert(1)</script>';
  const html = buildLearningInsightsPanelHtml(insights);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('ai-learning-panel'));
});

test('user-learning module files exist in shared and client layers', () => {
  const shared = [
    'supabase/functions/_shared/ai-listings/user-learning/user-learning-engine.js',
    'supabase/functions/_shared/ai-listings/user-learning/feedback-learning-engine.js',
    'supabase/functions/_shared/ai-listings/user-learning/decision-outcome-analytics.js',
    'supabase/functions/_shared/ai-listings/user-learning/learning-summary.js'
  ];
  for (const rel of shared) {
    assert.ok(fs.existsSync(path.join(process.cwd(), rel)), rel);
  }
});
