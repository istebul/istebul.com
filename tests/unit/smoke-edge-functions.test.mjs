import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const script = fs.readFileSync(path.join(root, 'scripts/smoke-edge-functions.cjs'), 'utf8');

test('smoke-edge-functions covers lifecycle boot probes', () => {
  assert.match(script, /auto-intake/);
  assert.match(script, /lifecycle-cron/);
  assert.match(script, /lifecycle-enroll/);
  assert.match(script, /LOAD_FUNCTION_ERROR/);
  assert.match(script, /503/);
  assert.match(script, /flow_id_required/);
  assert.match(script, /method:\s*'POST'/);
  assert.match(script, /body:\s*'\{\}'/);
});

test('smoke-edge-functions keeps gateway boot failure statuses', () => {
  assert.match(script, /502/);
  assert.match(script, /504/);
  assert.match(script, /404/);
});
