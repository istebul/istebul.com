import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeAnalyticsIngestBody } from '../../functions/api/_shared/analytics-ingest-normalize.js';

const root = process.cwd();

describe('analytics-ingest Pages API', () => {
  it('normalizeAnalyticsIngestBody maps manual_test single payload', () => {
    const out = normalizeAnalyticsIngestBody({
      event_name: 'manual_test',
      page_path: '/test',
      referrer: null,
      consent: true
    });
    assert.equal(out.events.length, 1);
    assert.equal(out.events[0].event_name, 'manual_test');
    assert.equal(out.session?.page_path, '/test');
    assert.equal(out.session?.consent_analytics, true);
  });

  it('preserves batch payload from analytics.js', () => {
    const batch = {
      session: { session_id: 's1', consent_analytics: true },
      events: [{ event_name: 'page_view', session_id: 's1' }]
    };
    const out = normalizeAnalyticsIngestBody(batch);
    assert.equal(out.events.length, 1);
    assert.equal(out.events[0].event_name, 'page_view');
    assert.equal(out.session?.session_id, 's1');
  });

  it('functions/api/analytics-ingest.js exports Pages handlers', () => {
    const src = fs.readFileSync(
      path.join(root, 'functions/api/analytics-ingest.js'),
      'utf8'
    );
    assert.match(src, /export async function onRequestPost/);
    assert.match(src, /export async function onRequestOptions/);
    assert.match(src, /export async function onRequestGet/);
    assert.match(src, /functions\/v1\/analytics-ingest/);
  });

  it('legacy functions/analytics-ingest.js re-exports canonical handler', () => {
    const src = fs.readFileSync(path.join(root, 'functions/analytics-ingest.js'), 'utf8');
    assert.match(src, /api\/analytics-ingest\.js/);
  });

  it('analytics.js flush uses /api/analytics-ingest', () => {
    const src = fs.readFileSync(path.join(root, 'js/core/analytics.js'), 'utf8');
    assert.match(src, /['"]\/api\/analytics-ingest['"]/);
    assert.doesNotMatch(src, /functions\/v1\/analytics-ingest/);
  });

  it('allowlist includes manual_test', () => {
    const src = fs.readFileSync(
      path.join(root, 'supabase/functions/_shared/platform-analytics.ts'),
      'utf8'
    );
    assert.match(src, /"manual_test"/);
  });
});
