import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { fetchOpsJson } from '../../js/admin/fetch-ops-json.js';

describe('fetchOpsJson', () => {
  it('falls back to embed when fetch returns HTML', async () => {
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      text: async () => '<!DOCTYPE html><html></html>'
    }));

    const config = await fetchOpsJson(
      '/data/ops/strategic-partnership-roadmap.json',
      'strategic-partnership-roadmap',
      null
    );
    assert.ok(config.partnerTypes?.length > 0, 'embedded strategic partnership config should load');
  });
});
