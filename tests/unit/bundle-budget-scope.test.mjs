import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const analyzeSource = fs.readFileSync(path.join(root, 'scripts/analyze-bundle.cjs'), 'utf8');

test('bundle budget excludes vertical-only entry surfaces from main SPA', () => {
  assert.match(analyzeSource, /js\\\/runtime\\\/vertical-locale-shell\\.js/);
  assert.match(analyzeSource, /js\\\/decision\\\/ai-decision-engine-v3\\.js/);
  assert.match(analyzeSource, /js\\\/decision\\\/decision-v3-mount\\.js/);
  assert.match(analyzeSource, /js\\\/runtime\\\/site-analytics-boot\\.js/);
});

test('bundle budget excludes independent /ai product entry from homepage SPA (EPIC-002)', () => {
  assert.match(analyzeSource, /js\\\/ai\\\//);
  assert.match(analyzeSource, /css\\\/ai\\\//);
  assert.match(analyzeSource, /AI_LANDING_SURFACE/);
  assert.match(analyzeSource, /surfaces:\s*\{[\s\S]*aiLanding/);
  // Hard gate limit must stay; multi-entry fix is exclude/reporting only.
  assert.match(analyzeSource, /maxTotalBytes\s*=\s*5000\s*\*\s*1024/);
});
