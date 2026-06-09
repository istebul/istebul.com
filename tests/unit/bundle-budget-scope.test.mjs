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
