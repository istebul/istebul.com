import test from 'node:test';
import assert from 'node:assert/strict';

import {
  renderDecisionFeedbackHtml,
  DECISION_FEEDBACK_EVENTS
} from '../../js/features/moat/decision-feedback.js';

test('renderDecisionFeedbackHtml includes three feedback actions', () => {
  const html = renderDecisionFeedbackHtml();
  assert.match(html, /data-decision-feedback="helpful"/);
  assert.match(html, /data-decision-feedback="unclear"/);
  assert.match(html, /data-decision-feedback="contact"/);
});

test('DECISION_FEEDBACK_EVENTS use decision_feedback prefix', () => {
  assert.equal(DECISION_FEEDBACK_EVENTS.HELPFUL, 'decision_feedback_helpful');
});
