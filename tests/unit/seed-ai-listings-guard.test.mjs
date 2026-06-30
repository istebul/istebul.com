import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = process.cwd();
const scriptPath = path.join(root, 'scripts/seed-ai-listings.cjs');

const {
  PUBLISH_APPROVAL_ENV,
  PUBLISH_APPROVAL_VALUE,
  PUBLISH_GATE_ERROR,
  checkPublishApproval
} = require(scriptPath);

/**
 * @param {string[]} args
 * @param {Record<string, string | undefined>} envOverrides
 */
function runSeedScript(args, envOverrides = {}) {
  const env = { ...process.env, ...envOverrides };
  for (const [key, value] of Object.entries(envOverrides)) {
    if (value === undefined) {
      delete env[key];
    }
  }

  return spawnSync('node', [scriptPath, ...args], {
    cwd: root,
    encoding: 'utf8',
    env
  });
}

test('checkPublishApproval allows non-publish runs without env', () => {
  assert.deepEqual(checkPublishApproval(false, {}), { ok: true });
});

test('checkPublishApproval blocks publish without approval env', () => {
  const result = checkPublishApproval(true, {});
  assert.equal(result.ok, false);
  assert.equal(result.message, PUBLISH_GATE_ERROR);
});

test('checkPublishApproval blocks publish when approval is HAYIR', () => {
  const result = checkPublishApproval(true, { [PUBLISH_APPROVAL_ENV]: 'HAYIR' });
  assert.equal(result.ok, false);
  assert.equal(result.message, PUBLISH_GATE_ERROR);
});

test('checkPublishApproval allows publish when approval is EVET', () => {
  const result = checkPublishApproval(true, { [PUBLISH_APPROVAL_ENV]: PUBLISH_APPROVAL_VALUE });
  assert.deepEqual(result, { ok: true });
});

test('CLI: --publish without env exits 1 before seed/publish', () => {
  const res = runSeedScript(['--publish', '--dry-run'], {
    [PUBLISH_APPROVAL_ENV]: undefined
  });

  assert.equal(res.status, 1);
  assert.match(res.stderr, /PRODUCTION_AI_LISTINGS_PUBLISH_ONAY=EVET/);
  assert.match(res.stderr, /Seed\/publish durduruldu/);
  assert.doesNotMatch(res.stdout, /Dry run complete/);
});

test('CLI: --publish with HAYIR exits 1 and stops publish', () => {
  const res = runSeedScript(['--publish', '--dry-run'], {
    [PUBLISH_APPROVAL_ENV]: 'HAYIR'
  });

  assert.equal(res.status, 1);
  assert.match(res.stderr, /PRODUCTION_AI_LISTINGS_PUBLISH_ONAY=EVET/);
  assert.doesNotMatch(res.stdout, /Dry run complete/);
});

test('CLI: --publish with EVET passes gate and --dry-run completes without mutation', () => {
  const res = runSeedScript(['--publish', '--dry-run'], {
    [PUBLISH_APPROVAL_ENV]: PUBLISH_APPROVAL_VALUE
  });

  assert.equal(res.status, 0, res.stderr || res.stdout);
  assert.match(res.stdout, /Dry run complete/);
  assert.match(res.stdout, /\[dry-run\]/);
});

test('CLI: --dry-run without --publish keeps existing behavior', () => {
  const res = runSeedScript(['--dry-run'], {
    [PUBLISH_APPROVAL_ENV]: undefined
  });

  assert.equal(res.status, 0, res.stderr || res.stdout);
  assert.match(res.stdout, /Dry run complete/);
  assert.match(res.stdout, /10 records/);
});
