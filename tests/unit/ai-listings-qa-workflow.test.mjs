import test from 'node:test';
import assert from 'node:assert/strict';

const {
  LISTING_STATUSES,
  QA_ACTIONS,
  QA_EVENT_TYPES,
  STATUS_FILTER_CHIPS,
  isValidListingStatus,
  resolveStatusTransition,
  eventTypeForAction,
  normalizeStatusFilter,
  isListingPubliclyVisible
} = await import('../../supabase/functions/_shared/ai-listings/status-workflow.js');

const { buildQualityChecklist, countChecklistPassed } = await import(
  '../../supabase/functions/_shared/ai-listings/quality-checklist.js'
);

const { validateRejectBody } = await import('../../supabase/functions/_shared/ai-listings/validation.js');

test('isValidListingStatus accepts only supported statuses', () => {
  for (const status of LISTING_STATUSES) {
    assert.equal(isValidListingStatus(status), true);
  }
  assert.equal(isValidListingStatus('published'), true);
  assert.equal(isValidListingStatus(''), false);
  assert.equal(isValidListingStatus(null), false);
});

test('resolveStatusTransition allows valid workflow paths', () => {
  assert.deepEqual(resolveStatusTransition('draft', QA_ACTIONS.SUBMIT_REVIEW), {
    ok: true,
    nextStatus: 'pending_review'
  });
  assert.deepEqual(resolveStatusTransition('rejected', QA_ACTIONS.SUBMIT_REVIEW), {
    ok: true,
    nextStatus: 'pending_review'
  });
  assert.deepEqual(resolveStatusTransition('pending_review', QA_ACTIONS.APPROVE), {
    ok: true,
    nextStatus: 'approved'
  });
  assert.deepEqual(resolveStatusTransition('pending_review', QA_ACTIONS.REJECT), {
    ok: true,
    nextStatus: 'rejected'
  });
  assert.deepEqual(resolveStatusTransition('approved', QA_ACTIONS.ARCHIVE), {
    ok: true,
    nextStatus: 'archived'
  });
  assert.deepEqual(resolveStatusTransition('approved', QA_ACTIONS.REANALYZE), {
    ok: true,
    nextStatus: 'approved'
  });
  assert.deepEqual(resolveStatusTransition('approved', QA_ACTIONS.PUBLISH), {
    ok: true,
    nextStatus: 'published'
  });
  assert.deepEqual(resolveStatusTransition('published', QA_ACTIONS.UNPUBLISH), {
    ok: true,
    nextStatus: 'approved'
  });
});

test('resolveStatusTransition rejects invalid workflow paths', () => {
  assert.equal(resolveStatusTransition('draft', QA_ACTIONS.APPROVE).ok, false);
  assert.equal(resolveStatusTransition('approved', QA_ACTIONS.APPROVE).ok, false);
  assert.equal(resolveStatusTransition('pending_review', QA_ACTIONS.SUBMIT_REVIEW).ok, false);
  assert.equal(resolveStatusTransition('archived', QA_ACTIONS.REANALYZE).ok, false);
  assert.equal(resolveStatusTransition('archived', QA_ACTIONS.ARCHIVE).ok, false);
});

test('eventTypeForAction maps QA actions to event types', () => {
  assert.equal(eventTypeForAction(QA_ACTIONS.SUBMIT_REVIEW), QA_EVENT_TYPES.SUBMIT_REVIEW);
  assert.equal(eventTypeForAction(QA_ACTIONS.APPROVE), QA_EVENT_TYPES.APPROVED);
  assert.equal(eventTypeForAction(QA_ACTIONS.REJECT), QA_EVENT_TYPES.REJECTED);
  assert.equal(eventTypeForAction(QA_ACTIONS.ARCHIVE), QA_EVENT_TYPES.ARCHIVED);
  assert.equal(eventTypeForAction(QA_ACTIONS.REANALYZE), QA_EVENT_TYPES.REANALYZED);
});

test('validateRejectBody requires reason in payload', () => {
  const missing = validateRejectBody({});
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.match(missing.message, /reason/i);

  const ok = validateRejectBody({ reason: 'Missing images' });
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.value.reason, 'Missing images');

  const tooLong = validateRejectBody({ reason: 'x'.repeat(2001) });
  assert.equal(tooLong.ok, false);
});

test('buildQualityChecklist is deterministic from listing data', () => {
  const full = buildQualityChecklist(
    {
      title: 'Toyota',
      price: 950000,
      location: 'İstanbul',
      description: 'Clean car',
      attributes: { year: 2020 },
      images: ['https://cdn.example/img.jpg']
    },
    { ai_score: 78, summary: 'Good value' }
  );

  assert.deepEqual(full, {
    has_title: true,
    has_price: true,
    has_location: true,
    has_description: true,
    has_attributes: true,
    has_analysis: true,
    has_images: true
  });
  assert.equal(countChecklistPassed(full), 7);

  const sparse = buildQualityChecklist({ title: 'Only title' }, null);
  assert.equal(sparse.has_title, true);
  assert.equal(sparse.has_price, false);
  assert.equal(sparse.has_analysis, false);
});

test('normalizeStatusFilter maps filter chip values safely', () => {
  assert.equal(normalizeStatusFilter(''), '');
  assert.equal(normalizeStatusFilter('draft'), 'draft');
  assert.equal(normalizeStatusFilter('pending_review'), 'pending_review');
  assert.equal(normalizeStatusFilter('invalid'), '');
});

test('STATUS_FILTER_CHIPS includes All and each status', () => {
  assert.equal(STATUS_FILTER_CHIPS[0].value, '');
  assert.equal(STATUS_FILTER_CHIPS[0].label, 'All');
  const values = STATUS_FILTER_CHIPS.slice(1).map((chip) => chip.value);
  assert.deepEqual(values, LISTING_STATUSES);
});

test('only published listings are publicly visible when publish flag is enabled', () => {
  const env = { AI_LISTINGS_PUBLIC_PUBLISH_ENABLED: 'true' };
  for (const status of LISTING_STATUSES) {
    const visible = isListingPubliclyVisible(status, env);
    assert.equal(visible, status === 'published');
  }
  assert.equal(isListingPubliclyVisible('approved', env), false);
  assert.equal(isListingPubliclyVisible('published', {}), false);
});
