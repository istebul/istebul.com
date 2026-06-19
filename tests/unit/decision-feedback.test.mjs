import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  renderDecisionFeedbackHtml,
  DECISION_FEEDBACK_EVENTS
} from '../../js/features/moat/decision-feedback.js';

test('moat renderDecisionFeedbackHtml includes three feedback actions', () => {
  const html = renderDecisionFeedbackHtml();
  assert.match(html, /data-decision-feedback="helpful"/);
  assert.match(html, /data-decision-feedback="unclear"/);
  assert.match(html, /data-decision-feedback="contact"/);
});

test('moat DECISION_FEEDBACK_EVENTS use decision_feedback prefix', () => {
  assert.equal(DECISION_FEEDBACK_EVENTS.HELPFUL, 'decision_feedback_helpful');
});

const {
  FEEDBACK_HELPFULNESS_OPTIONS,
  FEEDBACK_FINAL_DECISION_OPTIONS,
  isValidHelpfulness,
  isValidFinalDecision,
  validateFeedbackInput,
  buildDecisionOutcome,
  computeOutcomeAnalytics,
  captureFeedback,
  buildFeedbackFormHtml,
  buildOutcomeAnalyticsHtml
} = await import('../../js/decision-feedback/index.js');

const evil = '<script>alert(1)</script>';

// --- OPTIONS ---

test('three helpfulness options', () => {
  assert.equal(FEEDBACK_HELPFULNESS_OPTIONS.length, 3);
});

test('four final decision options', () => {
  assert.equal(FEEDBACK_FINAL_DECISION_OPTIONS.length, 4);
});

test('helpfulness labels Turkish', () => {
  const labels = FEEDBACK_HELPFULNESS_OPTIONS.map((o) => o.label);
  assert.deepEqual(labels, ['Evet', 'Kısmen', 'Hayır']);
});

test('final decision labels Turkish', () => {
  const labels = FEEDBACK_FINAL_DECISION_OPTIONS.map((o) => o.label);
  assert.ok(labels.includes('Satın aldım'));
  assert.ok(labels.includes('Vazgeçtim'));
  assert.ok(labels.includes('Kararsızım'));
  assert.ok(labels.includes('Daha sonra karar vereceğim'));
});

for (const opt of FEEDBACK_HELPFULNESS_OPTIONS) {
  test(`valid helpfulness ${opt.value}`, () => {
    assert.equal(isValidHelpfulness(opt.value), true);
  });
}

for (const opt of FEEDBACK_FINAL_DECISION_OPTIONS) {
  test(`valid final decision ${opt.value}`, () => {
    assert.equal(isValidFinalDecision(opt.value), true);
  });
}

// --- VALIDATE ---

test('validateFeedbackInput requires helpfulness', () => {
  const result = validateFeedbackInput({});
  assert.equal(result.valid, false);
});

test('validateFeedbackInput accepts valid input', () => {
  const result = validateFeedbackInput({ helpfulness: 'yes', final_decision: 'purchased' });
  assert.equal(result.valid, true);
  assert.equal(result.data.helpfulness, 'yes');
});

test('validateFeedbackInput rejects long note', () => {
  const result = validateFeedbackInput({ helpfulness: 'yes', note: 'x'.repeat(2001) });
  assert.equal(result.valid, false);
});

test('validateFeedbackInput allows empty final decision', () => {
  const result = validateFeedbackInput({ helpfulness: 'partial' });
  assert.equal(result.valid, true);
});

// --- OUTCOME ---

test('buildDecisionOutcome maps fields', () => {
  const outcome = buildDecisionOutcome(
    { user_id: 'u', listing_id: 'l', helpfulness: 'yes', final_decision: 'purchased' },
    { category: 'vehicle', decisionScore: 72 }
  );
  assert.equal(outcome.helpfulness, 'yes');
  assert.equal(outcome.decision_score, 72);
});

// --- ANALYTICS ---

test('computeOutcomeAnalytics empty', () => {
  const analytics = computeOutcomeAnalytics([]);
  assert.equal(analytics.total, 0);
});

test('computeOutcomeAnalytics with data', () => {
  const outcomes = [
    { helpfulness: 'yes', final_decision: 'purchased', decision_score: 80 },
    { helpfulness: 'no', final_decision: 'declined', decision_score: 40 },
    { helpfulness: 'partial', final_decision: 'undecided', decision_score: 60 }
  ];
  const analytics = computeOutcomeAnalytics(outcomes);
  assert.equal(analytics.total, 3);
  assert.ok(analytics.helpfulnessRate >= 0);
  assert.equal(analytics.avgDecisionScore, 60);
});

test('analytics purchase rate', () => {
  const analytics = computeOutcomeAnalytics([
    { helpfulness: 'yes', final_decision: 'purchased' },
    { helpfulness: 'yes', final_decision: 'declined' }
  ]);
  assert.equal(analytics.purchaseRate, 50);
});

// --- CAPTURE ---

test('captureFeedback success', () => {
  const result = captureFeedback({ helpfulness: 'yes', final_decision: 'later' });
  assert.equal(result.success, true);
  assert.ok(result.feedback);
  assert.ok(result.outcome);
});

test('captureFeedback failure', () => {
  const result = captureFeedback({ helpfulness: 'invalid' });
  assert.equal(result.success, false);
});

// --- BUILDER ---

test('feedback form renders question', () => {
  assert.match(buildFeedbackFormHtml({}), /Bu analiz faydalı oldu mu/);
});

test('feedback form renders final decision question', () => {
  assert.match(buildFeedbackFormHtml({}), /Nihai kararınız ne oldu/);
});

test('feedback form has optional note', () => {
  assert.match(buildFeedbackFormHtml({}), /Opsiyonel not/);
});

test('feedback form XSS safe listing id', () => {
  const html = buildFeedbackFormHtml({ listingId: evil });
  assert.ok(!html.includes('<script>'));
});

test('feedback form has radiogroup', () => {
  assert.match(buildFeedbackFormHtml({}), /role="radiogroup"/);
});

test('outcome analytics empty state', () => {
  assert.match(buildOutcomeAnalyticsHtml({ total: 0 }), /yeterli geri bildirim verisi yok/);
});

test('outcome analytics with data', () => {
  const html = buildOutcomeAnalyticsHtml(computeOutcomeAnalytics([
    { helpfulness: 'yes', final_decision: 'purchased', decision_score: 75 }
  ]));
  assert.match(html, /Decision Outcome Analytics/);
  assert.match(html, /Faydalılık oranı/);
});

// --- MIGRATION ---

test('decision_feedback table in migration', () => {
  const sql = fs.readFileSync('supabase/migrations/20260702_user_decision_platform_v1.sql', 'utf8');
  assert.match(sql, /decision_feedback/);
  assert.match(sql, /decision_outcomes/);
});

// --- PARAMETERIZED ---

for (const h of ['yes', 'partial', 'no']) {
  test(`analytics helpfulness ${h}`, () => {
    const analytics = computeOutcomeAnalytics([{ helpfulness: h }]);
    assert.equal(analytics.total, 1);
  });
}

for (const d of ['purchased', 'declined', 'undecided', 'later']) {
  test(`analytics decision ${d}`, () => {
    const analytics = computeOutcomeAnalytics([{ helpfulness: 'yes', final_decision: d }]);
    assert.equal(analytics.total, 1);
  });
}

for (let n = 1; n <= 30; n++) {
  test(`analytics batch ${n}`, () => {
    const outcomes = Array.from({ length: n }, (_, i) => ({
      helpfulness: ['yes', 'partial', 'no'][i % 3],
      final_decision: ['purchased', 'declined', 'undecided', 'later'][i % 4],
      decision_score: 50 + (i % 40)
    }));
    const analytics = computeOutcomeAnalytics(outcomes);
    assert.equal(analytics.total, n);
  });
}

for (const helpfulness of ['yes', 'partial', 'no']) {
  for (const decision of ['purchased', 'declined', 'undecided', 'later', null]) {
    test(`capture ${helpfulness} + ${decision}`, () => {
      const result = captureFeedback({
        helpfulness,
        final_decision: decision,
        userId: 'u1',
        listingId: 'l1'
      });
      assert.equal(result.success, true);
    });
  }
}

for (let score = 30; score <= 95; score += 5) {
  test(`analytics avg score ${score}`, () => {
    const analytics = computeOutcomeAnalytics([
      { helpfulness: 'yes', decision_score: score },
      { helpfulness: 'yes', decision_score: score }
    ]);
    assert.equal(analytics.avgDecisionScore, score);
  });
}
