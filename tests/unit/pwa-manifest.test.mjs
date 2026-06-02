import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '../..');
const manifestPath = path.join(root, 'manifest.json');

test('manifest.json is valid PWA manifest with shortcuts', () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.scope, '/');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2);
  assert.ok(Array.isArray(manifest.shortcuts) && manifest.shortcuts.length >= 2);
  assert.ok(manifest.shortcuts.some((s) => s.url === '/auto/'));
});

test('pwa-shell exports initPwaShell', async () => {
  const mod = await import('../../js/runtime/pwa-shell.js');
  assert.equal(typeof mod.initPwaShell, 'function');
});
