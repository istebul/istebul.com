/**
 * PR-561 — Homepage #pricing section scoped to İSTEBUL AI (copy only).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

test('index.html pricing teaser states İSTEBUL AI scope without price changes', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const start = html.indexOf('id="pricing"');
  const end = html.indexOf('id="partner-enterprise"');
  assert.ok(start > 0 && end > start);
  const block = html.slice(start, end);

  assert.match(block, /İSTEBUL AI · Planlar/);
  assert.match(block, /Yanlış seçim, doğru analizden pahalı/);
  assert.match(block, /yalnızca İSTEBUL AI/);
  assert.match(block, /GarsonAI/);
  assert.match(block, /İSTEBUL Business/);
  assert.match(block, /İSTEBUL AI Pro/);
  assert.match(block, /İSTEBUL AI ile başla/);
  assert.match(block, /İSTEBUL AI planlarını gör/);
  assert.match(block, />Ücretsiz</);
  assert.match(block, /Erken erişim/);
  assert.doesNotMatch(block, /GarsonAI.*₺|Business.*₺/i);
});
