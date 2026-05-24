import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLeadStatus, countLeadsByNormalizedStatus } from '../../js/core/lead-status.js';

test('normalizeLeadStatus maps legacy values', () => {
  assert.equal(normalizeLeadStatus('called'), 'first_contact');
  assert.equal(normalizeLeadStatus('interested'), 'proposal_sent');
  assert.equal(normalizeLeadStatus('closed'), 'won');
  assert.equal(normalizeLeadStatus('rejected'), 'lost');
  assert.equal(normalizeLeadStatus('new'), 'new');
});

test('countLeadsByNormalizedStatus aggregates pipeline', () => {
  const counts = countLeadsByNormalizedStatus([
    { status: 'called' },
    { status: 'called' },
    { status: 'new' }
  ]);
  assert.equal(counts.first_contact, 2);
  assert.equal(counts.new, 1);
});
