/**
 * PR-568/569 — final-production-launch-audit follows EPIC-002 multi-entry cutover.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const audit = fs.readFileSync(
  path.join(root, 'scripts/final-production-launch-audit.cjs'),
  'utf8'
);

test('launch audit treats root as Platform Landing, not AI marketing', () => {
  assert.match(audit, /platform-landing/);
  assert.match(audit, /neden-istebul/);
  assert.match(audit, /must not keep AI Landing H1/);
  assert.match(audit, /ai\/index\.html/);
  // Root must not be the host of the AI social-proof contract.
  assert.match(audit, /index\.html does not require AI social-proof disclaimer/);
  assert.match(audit, /aiHtml\.includes\('data-social-proof-disclaimer'\)/);
  assert.doesNotMatch(
    audit,
    /const indexHtml[\s\S]{0,400}social proof disclaimer should be visible by default/
  );
});

test('launch audit keeps social-proof + hero metric guards on /ai', () => {
  assert.match(audit, /ai\/index\.html social proof disclaimer should be visible/);
  assert.match(audit, /ai\/index\.html hero metrics still show inflated/);
  assert.match(audit, /aiHtml\.includes\('data-social-proof-disclaimer'\)/);
});

test('source surfaces match audit expectations', () => {
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const ai = fs.readFileSync(path.join(root, 'ai/index.html'), 'utf8');
  assert.match(index, /id="platform-landing"/);
  assert.doesNotMatch(index, /data-social-proof-disclaimer/);
  assert.match(ai, /data-social-proof-disclaimer/);
  assert.doesNotMatch(ai, /data-social-proof-disclaimer[^>]*\bhidden\b/);
});
