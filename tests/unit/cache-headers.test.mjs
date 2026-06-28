import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();

describe('cache headers policy', () => {
  it('cache-headers-audit.cjs exits 0 with PASS', () => {
    const res = spawnSync('node', ['scripts/cache-headers-audit.cjs'], {
      cwd: root,
      encoding: 'utf8'
    });
    assert.equal(res.status, 0, res.stderr || res.stdout);
    assert.match(res.stdout, /PASS/);
  });
});
