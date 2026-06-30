import test from 'node:test';
import assert from 'node:assert/strict';

const {
  PUBLISH_CHECKLIST_INCOMPLETE_MESSAGE,
  PUBLISH_CONFIRM_PROMPT,
  buildPublishConfirmFormHtml,
  buildQaActionsHtml,
  getAvailableQaActions,
  isPublishChecklistComplete,
  resolvePublishAttempt
} = await import('../../js/admin/ai-listings-admin-core.js');

const { QA_ACTIONS } = await import(
  '../../supabase/functions/_shared/ai-listings/status-workflow.js'
);

const COMPLETE_LISTING = Object.freeze({
  title: '2022 Toyota Corolla',
  description: 'Tam açıklama metni ile test ilanı.',
  location: 'İstanbul',
  price: 950000,
  attributes: { year: 2022 },
  images: ['https://cdn.example/img.jpg'],
  status: 'approved'
});

const COMPLETE_ANALYSIS = Object.freeze({ ai_score: 82 });

const INCOMPLETE_LISTING = Object.freeze({
  ...COMPLETE_LISTING,
  images: []
});

/**
 * Admin publish akışını API çağrısı olmadan simüle eder.
 * @param {Record<string, unknown>} listing
 * @param {Record<string, unknown>|null} analysis
 * @param {Array<'click-publish'|'cancel-publish'|'confirm-publish'>} steps
 */
function simulateAdminPublishFlow(listing, analysis, steps) {
  const apiCalls = [];

  for (const step of steps) {
    if (step === 'click-publish') {
      const attempt = resolvePublishAttempt(listing, analysis, { confirmed: false });
      if (!attempt.proceed && attempt.showConfirm) {
        continue;
      }
      if (!attempt.proceed) {
        return { apiCalls, blocked: true, message: attempt.message };
      }
    }

    if (step === 'cancel-publish') {
      continue;
    }

    if (step === 'confirm-publish') {
      const attempt = resolvePublishAttempt(listing, analysis, { confirmed: true });
      if (!attempt.proceed) {
        return { apiCalls, blocked: true, message: attempt.message };
      }
      apiCalls.push({ action: QA_ACTIONS.PUBLISH });
    }
  }

  return { apiCalls, blocked: false, message: null };
}

test('isPublishChecklistComplete requires all quality checklist items', () => {
  assert.equal(isPublishChecklistComplete(COMPLETE_LISTING, COMPLETE_ANALYSIS), true);
  assert.equal(isPublishChecklistComplete(INCOMPLETE_LISTING, COMPLETE_ANALYSIS), false);
});

test('resolvePublishAttempt blocks publish when checklist is incomplete', () => {
  const result = resolvePublishAttempt(INCOMPLETE_LISTING, COMPLETE_ANALYSIS, { confirmed: false });
  assert.equal(result.proceed, false);
  assert.equal(result.showConfirm, false);
  assert.equal(result.message, PUBLISH_CHECKLIST_INCOMPLETE_MESSAGE);
});

test('resolvePublishAttempt requires confirm before proceed on complete listing', () => {
  const withoutConfirm = resolvePublishAttempt(COMPLETE_LISTING, COMPLETE_ANALYSIS, { confirmed: false });
  assert.equal(withoutConfirm.proceed, false);
  assert.equal(withoutConfirm.showConfirm, true);
  assert.equal(withoutConfirm.message, PUBLISH_CONFIRM_PROMPT);

  const withConfirm = resolvePublishAttempt(COMPLETE_LISTING, COMPLETE_ANALYSIS, { confirmed: true });
  assert.deepEqual(withConfirm, { proceed: true, showConfirm: false, message: null });
});

test('approved listing publish without confirm does not call API', () => {
  assert.ok(getAvailableQaActions('approved').includes(QA_ACTIONS.PUBLISH));

  const flow = simulateAdminPublishFlow(COMPLETE_LISTING, COMPLETE_ANALYSIS, ['click-publish']);
  assert.equal(flow.apiCalls.length, 0);
  assert.equal(flow.blocked, false);
});

test('publish confirm cancel does not call API', () => {
  const flow = simulateAdminPublishFlow(COMPLETE_LISTING, COMPLETE_ANALYSIS, [
    'click-publish',
    'cancel-publish'
  ]);
  assert.equal(flow.apiCalls.length, 0);
});

test('incomplete checklist blocks publish API call even after confirm click', () => {
  const flow = simulateAdminPublishFlow(INCOMPLETE_LISTING, COMPLETE_ANALYSIS, [
    'click-publish',
    'confirm-publish'
  ]);
  assert.equal(flow.apiCalls.length, 0);
  assert.equal(flow.blocked, true);
  assert.equal(flow.message, PUBLISH_CHECKLIST_INCOMPLETE_MESSAGE);
});

test('complete checklist and confirm triggers publish API call', () => {
  const flow = simulateAdminPublishFlow(COMPLETE_LISTING, COMPLETE_ANALYSIS, [
    'click-publish',
    'confirm-publish'
  ]);
  assert.deepEqual(flow.apiCalls, [{ action: QA_ACTIONS.PUBLISH }]);
  assert.equal(flow.blocked, false);
});

test('buildPublishConfirmFormHtml renders Turkish confirm copy', () => {
  const html = buildPublishConfirmFormHtml();
  assert.match(html, /Bu kaydı production.*yayınlamak üzeresiniz/);
  assert.match(html, /Kalite kontrol tamamlandı mı/);
  assert.match(html, /Yayınlamayı onayla/);
  assert.match(html, /id="ai-listings-confirm-publish-btn"/);
  assert.match(html, /id="ai-listings-cancel-publish-btn"/);
});

test('reject QA flow remains available and unchanged in action html', () => {
  const html = buildQaActionsHtml('pending_review');
  assert.match(html, /data-qa-action="reject"/);
  assert.match(html, />Reddet</);
  assert.doesNotMatch(html, /data-qa-action="publish"/);
});
