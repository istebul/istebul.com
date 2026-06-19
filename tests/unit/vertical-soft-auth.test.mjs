import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

describe('vertical soft auth mount guard', () => {
  it('does not prepend banner to body when host is missing', () => {
    const src = fs.readFileSync(path.join(root, 'js/features/auth/vertical-soft-auth.js'), 'utf8');
    assert.match(src, /data-vertical-soft-auth-host/);
    assert.match(src, /if \(!host\) return null;/);
    assert.doesNotMatch(src, /document\\.body;/);
  });
});
