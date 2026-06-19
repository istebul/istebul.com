import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();

describe('analytics deploy readiness', () => {
  it('audit script exits 0', () => {
    const res = spawnSync('node', ['scripts/analytics-deploy-readiness-audit.cjs'], {
      cwd: root,
      encoding: 'utf8'
    });
    assert.equal(res.status, 0, res.stderr || res.stdout);
    assert.match(res.stdout, /OK/);
  });
});
