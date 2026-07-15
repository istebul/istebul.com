import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(process.cwd());

test('final enterprise release assets exist', () => {
  assert.ok(fs.existsSync(path.join(root, 'css/final-enterprise-release.css')));
  assert.ok(fs.existsSync(path.join(root, 'css/hero-v4.css')));
  assert.ok(fs.existsSync(path.join(root, 'scripts/final-enterprise-release-audit.cjs')));
});

test('style.css imports enterprise release layers', () => {
  const style = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
  assert.match(style, /final-enterprise-release\.css/);
  assert.match(style, /hero-v4\.css/);
});

test('Platform root mounts Platform Landing; AI Landing keeps hero V4 CTAs', () => {
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const ai = fs.readFileSync(path.join(root, 'ai/index.html'), 'utf8');
  const categories = fs.readFileSync(path.join(root, 'js/runtime/home-categories.js'), 'utf8');
  assert.match(index, /id="platform-landing"/);
  assert.match(index, /Ön değerlendirmeye başla/);
  assert.match(ai, /ib-hero-v4/);
  assert.match(ai, /data-preview-title/);
  assert.match(categories, /ib-soon-badge/);
});
